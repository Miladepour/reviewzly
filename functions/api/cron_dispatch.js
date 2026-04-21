export async function onRequestPost({ request, env }) {
  try {
    // 1. HARD SECURITY LOCK
    // This strictly prevents the public or scrapers from hijacking the Cron and blasting fake sequences
    const authHeader = request.headers.get("Authorization");
    const expectedSecret = `Bearer ${env.CRON_SECRET || 'REVIEWZLY_CRON_LOCK_123'}`;
    
    if (authHeader !== expectedSecret) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED CRON INVOCATION" }), { status: 401 });
    }

    const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
    const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRole) {
        throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
    }

    // 2. FETCH ALL READY CLIENTS (Globally across every account)
    // next_action_time <= NOW
    // AND is_unsubscribed = FALSE
    // AND drip_step > 0
    const nowUtc = new Date().toISOString();
    
    // We request the business attached to each client so we have their unique templates and SMS credits!
    const queryUrl = `${supabaseUrl}/rest/v1/clients?next_action_time=lte.${nowUtc}&is_unsubscribed=is.false&drip_step=gt.0&select=*,businesses(*)&limit=50`;
    
    const fetchRes = await fetch(queryUrl, {
        method: 'GET',
        headers: { 'apikey': serviceRole, 'Authorization': `Bearer ${serviceRole}` }
    });
    
    if (!fetchRes.ok) throw new Error("Failed to fetch cron targets: " + await fetchRes.text());
    
    const targets = await fetchRes.json();
    let processed = 0;

    // 3. EXECUTE THE SEQUENCE LINEARLY
    for (const client of targets) {
        const bData = client.businesses;
        if (!bData) continue; // Orphan safety

        const currentStep = client.drip_step;
        
        let smsTemplate = null;
        let nextStepIndex = 0;
        let nextActionTime = null;

        if (currentStep === 1) {
            smsTemplate = bData.review_sms;
            // Schedule the upcoming Follow Up
            nextStepIndex = 2;
            const followDays = bData.follow_up_days || 7;
            const dateCalc = new Date();
            dateCalc.setDate(dateCalc.getDate() + followDays);
            nextActionTime = dateCalc.toISOString();
        } else if (currentStep === 2) {
            smsTemplate = bData.follow_up_sms;
            // End the sequence completely
            nextStepIndex = 0;
            nextActionTime = null;
        }

        // If template doesn't exist natively, we just bump the queue forward to avoid hard locking
        if (!smsTemplate || smsTemplate.trim() === '') {
             await pushClientQueue(supabaseUrl, serviceRole, client.id, nextStepIndex, nextActionTime);
             continue;
        }

        // 4. CHECK BALANCE SECURITY
        if (bData.sms_credits <= 0) {
            // Cannot send -> leave them in queue to trigger later if credits applied,
            // OR auto-kill sequence if you want (we will leave in queue for recovery)
            await logComm(supabaseUrl, serviceRole, client.id, bData.id, `[CRON BLOCKED] Insufficient credits to send Step ${currentStep}`);
            continue;
        }

        // 5. PARSE SMS & DEDUCT EXACTLY 1 CREDIT NATIVELY
        const finalSms = smsTemplate
            .replace(/{{business_name}}/g, bData.name || 'Our Business')
            .replace(/{{client_name}}/g, client.name || 'there')
            .replace(/{{review_link}}/g, `https://${new URL(request.url).hostname}/r/${client.short_code}`);

        const deductRes = await fetch(`${supabaseUrl}/rest/v1/rpc/add_sms_credits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': serviceRole, 'Authorization': `Bearer ${serviceRole}` },
            body: JSON.stringify({ p_biz_id: bData.id, p_amount: -1 })
        });
        
        if (!deductRes.ok) continue;

        // 6. VOODOO NETWORK HANDOFF
        if (!bData.voodoo_api_key) {
             await logComm(supabaseUrl, serviceRole, client.id, bData.id, `[CRON ERROR] Voodoo API credentials missing.`);
             await pushClientQueue(supabaseUrl, serviceRole, client.id, nextStepIndex, nextActionTime);
             continue;
        }

        const cleanDest = client.phone.replace(/[^0-9]/g, '');
        const voodooPayload = {
             from: bData.voodoo_sender_id || 'Reviewzly',
             to: cleanDest,
             msg: finalSms
        };

        const voodooResponse = await fetch("https://api.voodoosms.com/sendsms", {
             method: "POST",
             headers: { "Content-Type": "application/json", "Authorization": `Bearer ${bData.voodoo_api_key}` },
             body: JSON.stringify(voodooPayload)
        });

        if (voodooResponse.ok) {
             await logComm(supabaseUrl, serviceRole, client.id, bData.id, `[CRON SUCCESS Step ${currentStep}] ${finalSms}`);
        } else {
             await logComm(supabaseUrl, serviceRole, client.id, bData.id, `[CRON FAIL Step ${currentStep}] Telecom rejected delivery.`);
        }

        // Successfully sent, advance their specific timer
        await pushClientQueue(supabaseUrl, serviceRole, client.id, nextStepIndex, nextActionTime);
        processed++;
    }

    return new Response(JSON.stringify({ success: true, processed_count: processed }), { status: 200, headers: { 'Content-Type': 'application/json' }});

  } catch (error) {
    console.error("Cron Dispatcher Edge Fallback:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' }});
  }
}

// === HELPER FUNCTIONS (Service Role Overrides) ===

async function pushClientQueue(supabaseUrl, serviceRole, clientId, stepIndex, nextTime) {
    const payload = { drip_step: stepIndex };
    if (nextTime === null) {
        payload.next_action_time = null; // Explicit nulling stops infinite loops
    } else {
        payload.next_action_time = nextTime;
    }
    
    await fetch(`${supabaseUrl}/rest/v1/clients?id=eq.${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': serviceRole, 'Authorization': `Bearer ${serviceRole}` },
        body: JSON.stringify(payload)
    });
}

async function logComm(supabaseUrl, serviceRole, clientId, businessId, text) {
    await fetch(`${supabaseUrl}/rest/v1/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': serviceRole, 'Authorization': `Bearer ${serviceRole}`, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
             client_id: clientId,
             business_id: businessId,
             type: 'AUTOMATION_CRON',
             text: text,
             is_outbound: true
        })
    });
}
