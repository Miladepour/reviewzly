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
    if (verifiedEvent.type === 'checkout.session.completed') {
        const session = verifiedEvent.data.object;
        
        // Ensure this transaction was paid
        if (session.payment_status === 'paid') {
            const businessId = session.client_reference_id;
            const creditAmount = parseInt(session.metadata.credit_amount || '0', 10);
            
            if (businessId && creditAmount > 0) {
                // Unlock the global master key for background ledger upgrades
                const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
                const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
                
                if (!supabaseUrl || !serviceRole) {
                    throw new Error("Cannot append credits: SUPABASE_SERVICE_ROLE_KEY is missing on Edge");
                }
                
                // Directly blast the SQL RPC we created
                const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/add_sms_credits`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': serviceRole,
                        'Authorization': `Bearer ${serviceRole}`
                    },
                    body: JSON.stringify({ p_biz_id: businessId, p_amount: creditAmount })
                });

                if (!rpcRes.ok) {
                    const rpcErr = await rpcRes.text();
                    console.error("RPC Error applying webhook funds:", rpcErr);
                    return new Response(JSON.stringify({ error: "Internal processing logic failure.", details: rpcErr }), { status: 500 });
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
