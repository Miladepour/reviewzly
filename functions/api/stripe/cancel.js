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

    // 3. Cancel the subscription via Stripe's current API (POST .../cancel)
    const stripeRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }
    });

    if (!stripeRes.ok) {
        const errBody = await stripeRes.json().catch(() => ({}));
        // If Stripe says the subscription doesn't exist (e.g. it was created in test
        // mode but we're now in live mode), treat it as already cancelled and clean
        // up the DB so the user isn't stuck.
        const noSuchSub = errBody?.error?.code === 'resource_missing' ||
                          errBody?.error?.message?.toLowerCase().includes('no such subscription');
        if (!noSuchSub) {
            throw new Error("Stripe API failed: " + (errBody?.error?.message || stripeRes.status));
        }
        // Fall through — subscription not found in this environment, clean up DB anyway
    }

    // 4. Cleanse Local Database Tracking
    const patchKey = serviceRole || supabaseKey;
    const patchAuth = serviceRole ? `Bearer ${serviceRole}` : authHeader;
    await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': patchKey, 'Authorization': patchAuth },
        body: JSON.stringify({
            stripe_subscription_id: null,
            active_plan: null
        })
    });

    return new Response(JSON.stringify({ success: true, message: "Subscription successfully and permanently terminated." }), { status: 200, headers: {'Content-Type': 'application/json'} });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal crash during cancellation protocol", details: err.message }), { status: 500 });
  }
}
