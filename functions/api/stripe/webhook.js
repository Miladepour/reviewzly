// Verify Stripe's signature header using HMAC-SHA256 (Web Crypto, edge-compatible).
async function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(
    sigHeader.split(',').map(kv => kv.split('=').map(s => s.trim()))
  );
  const timestamp = parts.t;
  const expected = parts.v1;
  if (!timestamp || !expected) return false;

  // Reject events older than 5 minutes (replay window).
  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (!Number.isFinite(age) || Math.abs(age) > 300) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${rawBody}`));
  const computed = [...new Uint8Array(sigBuf)].map(b => b.toString(16).padStart(2, '0')).join('');

  // Constant-time-ish comparison
  if (computed.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

// Module-scope replay cache (best-effort per edge instance).
const processedEvents = new Set();

export async function onRequestPost({ request, env }) {
  try {
    const rawPayload = await request.clone().text();

    if (!env.STRIPE_SECRET_KEY) {
        return new Response(JSON.stringify({ error: "Webhook receiver offline." }), { status: 500 });
    }

    // 1. PRIMARY: verify the HMAC signature against the raw body.
    const sigHeader = request.headers.get('stripe-signature');
    const sigOk = await verifyStripeSignature(rawPayload, sigHeader, env.STRIPE_WEBHOOK_SECRET);
    if (!sigOk) {
        return new Response(JSON.stringify({ error: "Invalid webhook signature." }), { status: 400 });
    }

    let event;
    try {
        event = JSON.parse(rawPayload);
    } catch(e) {
        return new Response(JSON.stringify({ error: "Malformed payload structure" }), { status: 400 });
    }

    if (!event.id) {
        return new Response(JSON.stringify({ error: "No event identifier." }), { status: 400 });
    }

    // 2. REPLAY GUARD: ignore an event ID we've already processed this instance.
    if (processedEvents.has(event.id)) {
        return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }

    // 3. SECONDARY: re-fetch the authentic event from Stripe so we act on Stripe's
    // copy (not the request body) — defends against any tampering past the signature.
    const verifyRes = await fetch(`https://api.stripe.com/v1/events/${event.id}`, {
        headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }
    });

    if (!verifyRes.ok) {
        return new Response(JSON.stringify({ error: "Event not recognized by Stripe." }), { status: 403 });
    }

    const verifiedEvent = await verifyRes.json();
    processedEvents.add(event.id);

    // Now safely process the authentically validated workflow
    if (verifiedEvent.type === 'invoice.payment_succeeded') {
        const invoice = verifiedEvent.data.object;
        
        // Unify Subscription ID Extraction (handles both modern 2026 Stripe API & legacy root structures)
        const subId = invoice.subscription || invoice.parent?.subscription_details?.subscription;
        
        // Skip invoices not bound to a subscription (e.g. one-offs)
        if (subId) {
            // Query Stripe for the parent subscription to retrieve our secure metadata variables
            const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, {
                headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }
            });
            const subscriptionObj = await subRes.json();
            
            const businessId = subscriptionObj.metadata?.business_id;
            const creditAmount = parseInt(subscriptionObj.metadata?.credit_amount || '0', 10);
            const planTier = subscriptionObj.metadata?.plan_tier || 'Active Tier';
            
            if (!businessId) {
                throw new Error("CRITICAL: Stripe Webhook cannot find business_id in the subscription metadata! Metadata missing.");
            }
            
            if (businessId && creditAmount > 0) {
                // Unlock the global master key for background ledger upgrades
                const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
                const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
                
                if (!supabaseUrl || !serviceRole) {
                    throw new Error("Cannot append credits: SUPABASE_SERVICE_ROLE_KEY is missing on Edge");
                }
                
                // 1. ADD CREDITS via additive RPC (Natively executes monthly rollover logic)
                const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/add_sms_credits`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': serviceRole, 'Authorization': `Bearer ${serviceRole}` },
                    body: JSON.stringify({ p_biz_id: businessId, p_amount: creditAmount })
                });

                if (!rpcRes.ok) {
                    const rpcErr = await rpcRes.text();
                    throw new Error("Supabase RPC failed to add credits: " + rpcErr);
                }

                // 2. PATCH IDENTITY into the exact Business Profile
                const patchRes = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'apikey': serviceRole, 'Authorization': `Bearer ${serviceRole}` },
                    body: JSON.stringify({ 
                        stripe_customer_id: invoice.customer,
                        stripe_subscription_id: subId,
                        active_plan: planTier
                    })
                });

                if (!patchRes.ok) {
                    const patchErr = await patchRes.text();
                    throw new Error("Supabase PATCH failed to bind identity: " + patchErr);
                }
                
                // 3. DISPATCH RECEIPT VIA RESEND
                if (env.RESEND_API_KEY && invoice.customer_email) {
                    await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            from: 'Reviewzly Billing <billing@reviewzly.com>',
                            to: [invoice.customer_email],
                            subject: `Reviewzly Invoice - ${planTier}`,
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                                  <h2 style="color: #2e7d32;">Payment Received</h2>
                                  <p>Hello,</p>
                                  <p>Thank you for choosing Reviewzly. We have successfully processed your payment of <b>£${(invoice.amount_paid / 100).toFixed(2)}</b> for the ${planTier} plan. Your ${creditAmount} credits have instantly loaded and rolled over securely.</p>
                                  <p style="margin-top: 2rem;">
                                      <a href="${invoice.hosted_invoice_url}" style="background-color: #2e7d32; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View or Download Official Invoice</a>
                                  </p>
                                  <p style="margin-top: 2rem; font-size: 0.85rem; color: #888;">If you have any questions, reach out to our network team.</p>
                                </div>
                            `
                        })
                    });
                }
            }
        }
    }

    // Fast acknowledgement return
    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err) {
    console.error("Webhook processing crash:", err);
    return new Response(JSON.stringify({ error: "Webhook processing error" }), { status: 500 });
  }
}
