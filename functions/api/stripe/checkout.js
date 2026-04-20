export async function onRequestPost({ request, env }) {
  try {
    // 1. Verify User Authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing military-grade Authentication Bearer token." }), { status: 401 });
    }

    const payload = await request.json();
    const { creditAmount } = payload;
    
    // Map Pricing Tiers Programmatically (prevent client-side manipulation)
    const pricingMap = {
      100: 500,    // $5.00
      250: 1000,   // $10.00
      500: 1800    // $18.00
    };

    const unitAmount = pricingMap[creditAmount];
    if (!unitAmount) {
      return new Response(JSON.stringify({ error: "Invalid configuration. That tier does not exist natively." }), { status: 400 });
    }

    // 2. Validate Identity using Supabase Auth (Ensure we get their accurate Business ID)
    const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
    
    // Send token natively to get User metadata
    const userValidation = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: supabaseKey, Authorization: authHeader }
    });
    
    if (!userValidation.ok) {
        return new Response(JSON.stringify({ error: "Unauthorized session tampering detected." }), { status: 403 });
    }
    
    const userEntity = await userValidation.json();
    const businessId = userEntity.id;

    // 3. Initiate Connection to Stripe
    if (!env.STRIPE_SECRET_KEY) {
        throw new Error("Missing Stripe Master Secret configured in Cloudflare.");
    }

    // URL Encode payload perfectly for native Stripe REST Form Data
    const formData = new URLSearchParams();
    formData.append('payment_method_types[0]', 'card');
    formData.append('mode', 'payment');
    formData.append('line_items[0][price_data][currency]', 'usd');
    formData.append('line_items[0][price_data][product_data][name]', `Reviewzly ${creditAmount} SMS Credits`);
    formData.append('line_items[0][price_data][unit_amount]', unitAmount.toString());
    formData.append('line_items[0][quantity]', '1');
    formData.append('client_reference_id', businessId);
    formData.append('metadata[credit_amount]', creditAmount.toString());
    // Auto-return the user back to the native dashboard instantly
    formData.append('success_url', `${new URL(request.url).origin}/dashboard/sms?payment=success`);
    formData.append('cancel_url', `${new URL(request.url).origin}/dashboard/sms?payment=cancelled`);

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`
        },
        body: formData.toString()
    });

    if (!stripeResponse.ok) {
        const errorDetails = await stripeResponse.text();
        return new Response(JSON.stringify({ error: "Upstream gateway rejected checkout configuration.", details: errorDetails }), { status: 502 });
    }

    const sessionData = await stripeResponse.json();
    
    return new Response(JSON.stringify({ url: sessionData.url }), { status: 200, headers: {'Content-Type': 'application/json'} });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal crash on Checkout Initialization", details: err.message }), { status: 500 });
  }
}
