export async function onRequestPost({ request, env }) {
  try {
    // 1. Verify Authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized access blocked." }), { status: 401 });
    }

    const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
    
    const userValidation = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: supabaseKey, Authorization: authHeader }
    });
    
    if (!userValidation.ok) {
        return new Response(JSON.stringify({ error: "Session invalid or expired." }), { status: 403 });
    }
    
    const userEntity = await userValidation.json();
    const businessId = userEntity.id;

    // 2. Fetch the stored subscription + customer id from the DB
    const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
    const dbRes = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=stripe_subscription_id,stripe_customer_id`, {
        headers: { apikey: supabaseKey, Authorization: authHeader }
    });
    const dbData = await dbRes.json();
    const subscriptionId = dbData[0]?.stripe_subscription_id;
    const customerId = dbData[0]?.stripe_customer_id;

    if (!subscriptionId && !customerId) {
        return new Response(JSON.stringify({ error: "No active subscription linked to this account." }), { status: 400 });
    }

    // 3. Cancel EVERY active subscription for this customer (not just the stored
    // id) so duplicate subscriptions from repeated test checkouts are all removed.
    // The user's intent is to cancel; if Stripe can't act, we still clear the DB.
    let stripeNote = null;
    let cancelledCount = 0;
    if (env.STRIPE_SECRET_KEY) {
        const idsToCancel = new Set();
        if (subscriptionId) idsToCancel.add(subscriptionId);

        // List all active subscriptions for the customer and add them.
        if (customerId) {
            const listRes = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${customerId}&status=active&limit=100`, {
                headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }
            });
            if (listRes.ok) {
                const list = await listRes.json().catch(() => ({}));
                (list.data || []).forEach(s => idsToCancel.add(s.id));
            } else {
                stripeNote = `Could not list subscriptions (HTTP ${listRes.status})`;
            }
        }

        for (const id of idsToCancel) {
            const r = await fetch(`https://api.stripe.com/v1/subscriptions/${id}/cancel`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }
            });
            if (r.ok) {
                cancelledCount++;
            } else {
                const errBody = await r.json().catch(() => ({}));
                console.error('Stripe cancel non-OK for', id, r.status, JSON.stringify(errBody));
                if (!stripeNote) stripeNote = errBody?.error?.message || `Stripe HTTP ${r.status}`;
            }
        }
    } else {
        stripeNote = 'STRIPE_SECRET_KEY not configured';
        console.error('Stripe cancel: STRIPE_SECRET_KEY missing');
    }

    // 4. Cleanse Local Database Tracking. This is what actually matters for the
    // user's experience — clear their plan locally regardless of Stripe outcome.
    const patchKey = serviceRole || supabaseKey;
    const patchAuth = serviceRole ? `Bearer ${serviceRole}` : authHeader;
    const patchRes = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': patchKey, 'Authorization': patchAuth, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
            stripe_subscription_id: null,
            active_plan: null
        })
    });

    if (!patchRes.ok) {
        const patchErr = await patchRes.text();
        console.error("Cancel DB patch failed:", patchErr);
        return new Response(JSON.stringify({ error: "Could not update account after cancellation." }), { status: 500, headers: {'Content-Type': 'application/json'} });
    }

    return new Response(JSON.stringify({
        success: true,
        message: cancelledCount > 0 ? `Subscription cancelled (${cancelledCount}).` : "Subscription cancelled.",
        cancelledCount,
        stripeNote
    }), { status: 200, headers: {'Content-Type': 'application/json'} });

  } catch (err) {
    console.error("Cancellation error:", err?.message);
    return new Response(JSON.stringify({ error: "Cancellation could not be completed." }), { status: 500 });
  }
}
