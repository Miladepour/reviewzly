export async function onRequestPost({ request, env }) {
  try {
    const rawPayload = await request.clone().text();
    let event;
    try {
        event = JSON.parse(rawPayload);
    } catch(e) {
        return new Response(JSON.stringify({ error: "Malformed payload structure" }), { status: 400 });
    }

    if (!env.STRIPE_SECRET_KEY) {
        return new Response(JSON.stringify({ error: "API Misconfiguration. Webhook receiver offline." }), { status: 500 });
    }

    if (!event.id) {
        return new Response(JSON.stringify({ error: "No Event Identifier. Suspicious connection blocked." }), { status: 400 });
    }

    // NATIVE VALIDATION: Rather than computing cryptographically heavy edge hashes,
    // we query Stripe natively. If Stripe returns the event under our Secret Key, it's 100% authentic and un-spoofable.
    const verifyRes = await fetch(`https://api.stripe.com/v1/events/${event.id}`, {
        headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }
    });

    if (!verifyRes.ok) {
        return new Response(JSON.stringify({ error: "Fraudulent Webhook Event: Event sequence unrecognized by Stripe HQ." }), { status: 403 });
    }

    const verifiedEvent = await verifyRes.json();

    // Now safely process the authentically validated workflow
    if (verifiedEvent.type === 'invoice.payment_succeeded') {
        const invoice = verifiedEvent.data.object;
        
        // Skip invoices not bound to a subscription (e.g. one-offs)
        if (invoice.subscription) {
            
            // Query Stripe for the parent subscription to retrieve our secure metadata variables
            const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${invoice.subscription}`, {
                headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` }
            });
            const subscriptionObj = await subRes.json();
            
            const businessId = subscriptionObj.metadata?.business_id;
            const creditAmount = parseInt(subscriptionObj.metadata?.credit_amount || '0', 10);
            const planTier = subscriptionObj.metadata?.plan_tier || 'Active Tier';
            
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

                // 2. PATCH IDENTITY into the exact Business Profile
                await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'apikey': serviceRole, 'Authorization': `Bearer ${serviceRole}` },
                    body: JSON.stringify({ 
                        stripe_customer_id: invoice.customer,
                        stripe_subscription_id: invoice.subscription,
                        active_plan: planTier
                    })
                });
                
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
    return new Response(JSON.stringify({ error: "Critical Webhook System Failure", details: err.message }), { status: 500 });
  }
}
