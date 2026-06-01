export async function onRequestPost({ request, env }) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
    }

    const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

    // Identify the user
    const userValidation = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: authHeader }
    });
    if (!userValidation.ok) {
      return new Response(JSON.stringify({ error: "Session invalid or expired." }), { status: 403 });
    }
    const businessId = (await userValidation.json()).id;

    // Look up the Stripe customer id for this business (user's own row via RLS)
    const dbRes = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=stripe_customer_id`, {
      headers: { apikey: supabaseKey, Authorization: authHeader }
    });
    const dbData = await dbRes.json().catch(() => []);
    const customerId = dbData?.[0]?.stripe_customer_id;

    if (!customerId) {
      return new Response(JSON.stringify({ error: "No billing account found. Subscribe to a plan first." }), { status: 400 });
    }
    if (!env.STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: "Billing not configured." }), { status: 500 });
    }

    // Create a Billing Portal session
    const origin = new URL(request.url).origin;
    const form = new URLSearchParams();
    form.append('customer', customerId);
    form.append('return_url', `${origin}/dashboard/plan`);

    const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`
      },
      body: form.toString()
    });

    if (!portalRes.ok) {
      const errText = await portalRes.text();
      console.error("Billing portal error:", errText);
      return new Response(JSON.stringify({ error: "Could not open billing portal." }), { status: 502 });
    }

    const session = await portalRes.json();
    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error("Portal init error:", err?.message);
    return new Response(JSON.stringify({ error: "Could not open billing portal." }), { status: 500 });
  }
}
