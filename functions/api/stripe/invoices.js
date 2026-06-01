export async function onRequestGet({ request, env }) {
  try {
    // 1. Verify Authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized access blocked." }), { status: 401 });
    }

    const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
    
    // Send token natively to get User metadata
    const userValidation = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: supabaseKey, Authorization: authHeader }
    });
    
    if (!userValidation.ok) {
        return new Response(JSON.stringify({ error: "Session invalid or expired." }), { status: 403 });
    }
    
    const userEntity = await userValidation.json();
    const businessId = userEntity.id;

    // 2. Fetch the Stripe Customer ID from the Database
    // Use the user's own auth token — RLS allows them to read their own row.
    const dbRes = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=stripe_customer_id`, {
        headers: { apikey: supabaseKey, Authorization: authHeader }
    });
    
    const dbData = await dbRes.json();
    const stripeCustomerId = dbData[0]?.stripe_customer_id;

    if (!stripeCustomerId) {
        // Safe fallback - they haven't bought anything yet
        return new Response(JSON.stringify({ invoices: [] }), { status: 200, headers: {'Content-Type': 'application/json'} });
    }

    // 3. Query Stripe Native Historical API
    const stripeRes = await fetch(`https://api.stripe.com/v1/invoices?customer=${stripeCustomerId}&limit=20`, {
        headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }
    });

    if (!stripeRes.ok) {
        throw new Error("Stripe API failed to proxy the historical array.");
    }

    const stripeData = await stripeRes.json();

    // Map into a clean, lightweight array for the React Frontend.
    // description = what they bought (the first line item's description).
    const safeInvoices = stripeData.data.map(inv => ({
        id: inv.id,
        created: inv.created,
        amount_paid: inv.amount_paid,
        currency: inv.currency,
        status: inv.status,
        description: inv.lines?.data?.[0]?.description || inv.lines?.data?.[0]?.plan?.nickname || '—',
        hosted_invoice_url: inv.hosted_invoice_url,
        invoice_pdf: inv.invoice_pdf
    }));

    // 4. Also report the current subscription's cancellation state so the app can
    // show "active until / cancels on <date>".
    let subscription = null;
    const subListRes = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${stripeCustomerId}&status=active&limit=1`, {
        headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }
    });
    if (subListRes.ok) {
        const subList = await subListRes.json().catch(() => ({}));
        const sub = subList.data?.[0];
        if (sub) {
            subscription = {
                status: sub.status,
                cancel_at_period_end: !!sub.cancel_at_period_end,
                current_period_end: sub.current_period_end || null,
                cancel_at: sub.cancel_at || null
            };
        }
    }

    return new Response(JSON.stringify({ invoices: safeInvoices, subscription }), { status: 200, headers: {'Content-Type': 'application/json'} });

  } catch (err) {
    console.error("Invoices fetch error:", err?.message);
    return new Response(JSON.stringify({ error: "Could not load billing history" }), { status: 500 });
  }
}
