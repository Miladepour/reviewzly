export async function onRequestPost({ request, env }) {
  try {
    // 1. Verify User Authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing military-grade Authentication Bearer token." }), { status: 401 });
    }

    const payload = await request.json();
    const { creditAmount, customInvites } = payload;

    // Determine pricing + checkout mode. Plans are monthly subscriptions; a
    // custom top-up is a one-time payment at £1 per invite.
    let unitAmount;      // pence
    let planName;
    let inviteAmount;    // invites granted on payment
    let isCustom = false;

    if (customInvites !== undefined && customInvites !== null) {
      // Custom one-time top-up (£1 / invite)
      const n = Math.floor(Number(customInvites));
      if (!Number.isFinite(n) || n < 1 || n > 10000) {
        return new Response(JSON.stringify({ error: "Enter a whole number of invites between 1 and 10000." }), { status: 400 });
      }
      isCustom = true;
      inviteAmount = n;
      unitAmount = n * 100;   // £1.00 each
      planName = 'Custom Top-Up';
    } else {
      // Fixed monthly plans, keyed by invite count (prevents client-side price manipulation)
      const pricingMap = {
        50:  { price: 3500,  name: 'Starter Spark' },     // £35.00
        150: { price: 9000,  name: 'Growth Rocket' },     // £90.00
        500: { price: 29000, name: 'Enterprise Titan' }   // £290.00
      };
      const tierData = pricingMap[creditAmount];
      if (!tierData) {
        return new Response(JSON.stringify({ error: "Invalid plan selection." }), { status: 400 });
      }
      inviteAmount = creditAmount;
      unitAmount = tierData.price;
      planName = tierData.name;
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
    formData.append('mode', isCustom ? 'payment' : 'subscription');
    formData.append('line_items[0][price_data][currency]', 'gbp');
    if (!isCustom) {
      formData.append('line_items[0][price_data][recurring][interval]', 'month');
    }
    formData.append('line_items[0][price_data][product_data][name]', `Reviewzly ${planName} (${inviteAmount} invites)`);
    formData.append('line_items[0][price_data][unit_amount]', unitAmount.toString());
    formData.append('line_items[0][quantity]', '1');
    formData.append('client_reference_id', businessId);

    // Inject metadata so the webhook can grant invites. Subscriptions carry it on
    // subscription_data; one-time payments carry it on payment_intent_data.
    const metaTarget = isCustom ? 'payment_intent_data' : 'subscription_data';
    formData.append(`${metaTarget}[metadata][business_id]`, businessId);
    formData.append(`${metaTarget}[metadata][credit_amount]`, inviteAmount.toString());
    formData.append(`${metaTarget}[metadata][plan_tier]`, planName);
    // Also stamp the session itself so checkout.session.completed can read it directly.
    formData.append('metadata[business_id]', businessId);
    formData.append('metadata[credit_amount]', inviteAmount.toString());
    formData.append('metadata[plan_tier]', planName);

    // Auto-return the user back to the native dashboard instantly
    formData.append('success_url', `${new URL(request.url).origin}/dashboard/plan?payment=success`);
    formData.append('cancel_url', `${new URL(request.url).origin}/dashboard/plan?payment=cancelled`);

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
        console.error("Stripe checkout rejected:", errorDetails);
        return new Response(JSON.stringify({ error: "Payment gateway rejected the checkout." }), { status: 502 });
    }

    const sessionData = await stripeResponse.json();
    
    return new Response(JSON.stringify({ url: sessionData.url }), { status: 200, headers: {'Content-Type': 'application/json'} });

  } catch (err) {
    console.error("Checkout init error:", err?.message);
    return new Response(JSON.stringify({ error: "Could not start checkout" }), { status: 500 });
  }
}
