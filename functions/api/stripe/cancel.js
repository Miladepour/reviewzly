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

    // 2. Fetch the Stripe Subscription ID from Database
    // Use the user's own auth token — RLS allows them to read their own row.
    const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
    const dbRes = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=stripe_subscription_id`, {
        headers: { apikey: supabaseKey, Authorization: authHeader }
    });
    
    const dbData = await dbRes.json();
    const subscriptionId = dbData[0]?.stripe_subscription_id;

    if (!subscriptionId) {
        return new Response(JSON.stringify({ error: "No active subscription found mathematically linked to this account." }), { status: 400 });
    }

    // 3. Cancel the subscription via Stripe's current API (POST .../cancel).
    // The user's intent is to cancel; if Stripe can't find/act on the sub
    // (test-vs-live mismatch, already cancelled, missing key), we still clear
    // the local DB so the user is never stuck. We only log Stripe's reason.
    let stripeNote = null;
    if (env.STRIPE_SECRET_KEY) {
        const stripeRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}/cancel`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }
        });
        if (!stripeRes.ok) {
            const errBody = await stripeRes.json().catch(() => ({}));
            stripeNote = errBody?.error?.message || `Stripe HTTP ${stripeRes.status}`;
            console.error('Stripe cancel non-OK:', stripeRes.status, JSON.stringify(errBody));
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
        message: "Subscription cancelled.",
        stripeNote
    }), { status: 200, headers: {'Content-Type': 'application/json'} });

  } catch (err) {
    console.error("Cancellation error:", err?.message);
    return new Response(JSON.stringify({ error: "Cancellation could not be completed." }), { status: 500 });
  }
}
