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
    const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
    const dbRes = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=stripe_subscription_id`, {
        headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` }
    });
    
    const dbData = await dbRes.json();
    const subscriptionId = dbData[0]?.stripe_subscription_id;

    if (!subscriptionId) {
        return new Response(JSON.stringify({ error: "No active subscription found mathematically linked to this account." }), { status: 400 });
    }

    // 3. Command Stripe to hard-delete the subscription
    const stripeRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }
    });

    if (!stripeRes.ok) {
        const errDump = await stripeRes.text();
        throw new Error("Stripe API failed to terminate the sequence. " + errDump);
    }

    // 4. Cleanse Local Database Tracking
    await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': serviceRole, 'Authorization': `Bearer ${serviceRole}` },
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
