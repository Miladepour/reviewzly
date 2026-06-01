import { normalizeReviewLinksInMessage } from './smsLinkUtils.js';

// Shorten reviewzly.com links via vsms.io so follow-up + birthday SMS pass
// UK carrier filters — same logic as send_sms.js.
function findVsmsUrl(value) {
  if (typeof value === 'string') {
    const m = value.match(/(?:https?:\/\/)?vsms\.(?:io|co)\/[A-Za-z0-9]+/i);
    return m ? m[0] : null;
  }
  if (Array.isArray(value)) { for (const item of value) { const f = findVsmsUrl(item); if (f) return f; } }
  else if (value && typeof value === 'object') { for (const k of Object.keys(value)) { const f = findVsmsUrl(value[k]); if (f) return f; } }
  return null;
}
function ensureHttps(url) {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url.replace(/^http:\/\//i, 'https://') : `https://${url}`;
}
async function shortenVoodooLink(longUrl, name, apiKey) {
  try {
    const res = await fetch('https://api.voodoosms.com/shorturl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ name, url: longUrl, method: 'simple' }),
    });
    const data = await res.json().catch(() => null);
    const created = findVsmsUrl(data);
    if (created) return ensureHttps(created);
    const listRes = await fetch('https://api.voodoosms.com/shorturl', { headers: { 'Authorization': `Bearer ${apiKey}` } });
    const list = await listRes.json().catch(() => null);
    const entries = Array.isArray(list) ? list : (list?.data || []);
    const entry = Array.isArray(entries) ? entries.find(u => u?.name === name || JSON.stringify(u).includes(longUrl)) : null;
    const found = findVsmsUrl(entry);
    if (found) return ensureHttps(found);
  } catch { /* fall through */ }
  return null;
}

export async function onRequestPost({ request, env }) {
  try {
    // 1. HARD SECURITY LOCK
    // Prevents the public or scrapers from hijacking the cron and blasting SMS.
    // Fail closed: if CRON_SECRET isn't configured, reject everything (no public default).
    const authHeader = request.headers.get("Authorization");
    if (!env.CRON_SECRET) {
      return new Response(JSON.stringify({ error: "Cron secret not configured." }), { status: 503 });
    }
    if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
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
            // Step 1: review invite (fallback for clients queued before invite refactor)
            smsTemplate = bData.invite_sms || bData.review_sms;
            nextStepIndex = 2;
            const followDays = bData.follow_up_days || 7;
            const dateCalc = new Date();
            dateCalc.setDate(dateCalc.getDate() + followDays);
            nextActionTime = dateCalc.toISOString();
        } else if (currentStep === 2) {
            // Step 2: follow-up reminder
            smsTemplate = bData.follow_up_sms;
            nextStepIndex = 0;
            nextActionTime = null;
        } else if (currentStep === 3) {
            // Step 3: birthday SMS (drip_step set to 3 by birthday scheduler)
            smsTemplate = bData.birthday_sms;
            nextStepIndex = 0;
            nextActionTime = null;
        }

        // If template doesn't exist, bump the queue forward to avoid hard locking
        if (!smsTemplate || smsTemplate.trim() === '') {
             await pushClientQueue(supabaseUrl, serviceRole, client.id, nextStepIndex, nextActionTime);
             continue;
        }

        // 4. CHECK BALANCE SECURITY
        if (bData.sms_credits <= 0) {
            await logComm(supabaseUrl, serviceRole, client.id, bData.id, `[CRON BLOCKED] Insufficient credits to send Step ${currentStep}`);
            continue;
        }

        // 5. PARSE SMS & SHORTEN REVIEW LINK VIA VSMS.IO
        let builtSms = normalizeReviewLinksInMessage(
            smsTemplate
                .replace(/{{business_name}}/g, bData.name || 'Our Business')
                .replace(/{{client_name}}/g, client.name || 'there')
                .replace(/{{review_link}}/g, `https://reviewzly.com/review/${client.short_code}`)
                .replace(/{{unsubscribe_link}}/g, `https://reviewzly.com/opt-out?b=${bData.id}`),
            client.short_code
        );

        // Shorten reviewzly.com links so they pass UK carrier filters
        if (env.VOODOO_API_KEY) {
            // Review link
            if (client.short_code) {
                const reviewUrl = `https://reviewzly.com/review/${client.short_code}`;
                if (builtSms.includes(reviewUrl)) {
                    const vsmsUrl = await shortenVoodooLink(reviewUrl, client.short_code, env.VOODOO_API_KEY);
                    if (vsmsUrl) builtSms = builtSms.replace(reviewUrl, vsmsUrl);
                }
            }
            // Unsubscribe link
            const optUrl = `https://reviewzly.com/opt-out?b=${bData.id}`;
            if (builtSms.includes(optUrl)) {
                const optName = `opt${bData.id.replace(/-/g, '').substring(0, 20)}`;
                const vsmsOpt = await shortenVoodooLink(optUrl, optName, env.VOODOO_API_KEY);
                if (vsmsOpt) builtSms = builtSms.replace(optUrl, vsmsOpt);
            }
        }
        const finalSms = builtSms;

        const deductRes = await fetch(`${supabaseUrl}/rest/v1/rpc/add_sms_credits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': serviceRole, 'Authorization': `Bearer ${serviceRole}` },
            body: JSON.stringify({ p_biz_id: bData.id, p_amount: -1 })
        });

        if (!deductRes.ok) continue;

        // 6. VOODOO NETWORK HANDOFF
        if (!env.VOODOO_API_KEY) {
             await logComm(supabaseUrl, serviceRole, client.id, bData.id, `[CRON ERROR] Voodoo API credentials missing in Edge ENV.`);
             await pushClientQueue(supabaseUrl, serviceRole, client.id, nextStepIndex, nextActionTime);
             continue;
        }

        const cleanDest = client.phone.replace(/[^0-9]/g, '');
        const voodooPayload = {
             from: bData.sms_sender_id || bData.voodoo_sender_id || 'Reviewzly',
             to: cleanDest,
             msg: finalSms
        };

        const voodooResponse = await fetch("https://api.voodoosms.com/sendsms", {
             method: "POST",
             headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.VOODOO_API_KEY}` },
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
