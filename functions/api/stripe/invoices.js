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
    const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
    const dbRes = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=stripe_customer_id`, {
        headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` }
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

    // Map into a clean, lightweight array for the React Frontend
    const safeInvoices = stripeData.data.map(inv => ({
        id: inv.id,
        created: inv.created,
        amount_paid: inv.amount_paid,
        currency: inv.currency,
        status: inv.status,
        hosted_invoice_url: inv.hosted_invoice_url,
        invoice_pdf: inv.invoice_pdf
    }));

    return new Response(JSON.stringify({ invoices: safeInvoices }), { status: 200, headers: {'Content-Type': 'application/json'} });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal crash compiling historical billing data", details: err.message }), { status: 500 });
  }
}
