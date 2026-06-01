import { normalizeReviewLinksInMessage } from './smsLinkUtils.js';

// Recursively scan any JSON value for the vsms short-URL string. This is robust
// against unknown field names and nesting in the Voodoo response.
function findVsmsUrl(value) {
  if (typeof value === 'string') {
    const m = value.match(/(?:https?:\/\/)?vsms\.(?:io|co)\/[A-Za-z0-9]+/i);
    return m ? m[0] : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findVsmsUrl(item);
      if (found) return found;
    }
  } else if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const found = findVsmsUrl(value[key]);
      if (found) return found;
    }
  }
  return null;
}

// Ensure the short URL carries an https:// scheme (carriers/clients need it; the
// dashboard displays it bare as "vsms.io/Jqkx").
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
    console.log('Voodoo shorturl create response:', JSON.stringify(data));
    const created = findVsmsUrl(data);
    if (created) return ensureHttps(created);

    // Name already exists on this account — fetch the existing short URL by name.
    const listRes = await fetch('https://api.voodoosms.com/shorturl', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    const list = await listRes.json().catch(() => null);
    console.log('Voodoo shorturl list response:', JSON.stringify(list)?.slice(0, 800));
    // Find the entry whose name (or long URL) matches, then pull the vsms URL
    // from that specific entry only — never blindly grab another client's link.
    const entries = Array.isArray(list) ? list : (list?.data || list?.shorturls || []);
    const entry = Array.isArray(entries)
      ? entries.find(u => u?.name === name || findVsmsUrl(u) && JSON.stringify(u).includes(longUrl))
      : null;
    const found = findVsmsUrl(entry);
    if (found) return ensureHttps(found);
  } catch (err) {
    console.error('shortenVoodooLink error:', err?.message);
  }
  return null;
}

export async function onRequestPost({ request, env }) {
  try {
    // 1. Verify Authorization Header (Ensure user is logged in)
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing military-grade Authentication Bearer token." }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

    // 2. Parse Incoming Payload
    let payload;
    try {
      payload = await request.json();
    } catch(e) {
      return new Response(JSON.stringify({ error: "Invalid JSON payload structure." }), { status: 400, headers: { 'Content-Type': 'application/json' }});
    }

    const { dest, msg, clientName, shortCode } = payload;
    if (!dest || !msg) {
      return new Response(JSON.stringify({ error: "Destination phone number and message content are strictly required." }), { status: 400, headers: { 'Content-Type': 'application/json' }});
    }

    const normalizedMsg = normalizeReviewLinksInMessage(msg, shortCode || null);

    // Shorten the reviewzly.com review link via Voodoo's vsms.co shortener so it
    // passes UK carrier filters. Falls back to the original URL if the API fails.
    let finalMsg = normalizedMsg;
    if (shortCode && env.VOODOO_API_KEY) {
      const longUrl = `https://reviewzly.com/review/${shortCode}`;
      if (finalMsg.includes(longUrl)) {
        const vsmsUrl = await shortenVoodooLink(longUrl, shortCode, env.VOODOO_API_KEY);
        if (vsmsUrl) finalMsg = finalMsg.replace(longUrl, vsmsUrl);
      }
    }

    // 3. SECURE SUPABASE TRANSACTION
    // Call the RPC function 'execute_sms_transaction' using the user's specific JWT token.
    // By passing their actual Auth Header, Supabase's RLS inherently knows EXACTLY who is trying to send a text.
    const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL; // Fallback supports both Vite variables and generic Server vars
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error("CRITICAL FAILURE: Cloudflare Environment Variables (Supabase Keys) not configured in Cloudflare Dashboard.");
    }

    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_sms_transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader, // CRITICAL: This is the user's token!
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        client_name_param: clientName || 'Unknown Client',
        client_mobile_param: dest
      })
    });

    if (!rpcResponse.ok) {
        const errorText = await rpcResponse.text();
        if (errorText.includes('Insufficient SMS credits')) {
            return new Response(JSON.stringify({ error: "PAYMENT_REQUIRED", message: "Insufficient SMS Network Credits." }), { status: 402, headers: { 'Content-Type': 'application/json' }});
        }
        return new Response(JSON.stringify({ error: errorText }), { status: 500, headers: { 'Content-Type': 'application/json' }});
    }

    // Capture the Sender ID returned from the Database Row-Lock successfully
    const rpcData = await rpcResponse.json();
    // Use RPC sender_id; override only when THIS business has configured sms_sender_id in Sms Hub
    let senderId = rpcData.sender_id || 'Reviewzly';

    // Identify the calling user from their JWT (sub === businesses.id). Without
    // this filter the query returned ALL businesses and used row [0], so one
    // account's sender ID (e.g. "Stockholm") leaked onto everyone's SMS.
    let businessId = null;
    try {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const claims = JSON.parse(atob(token.split('.')[1]));
      businessId = claims?.sub || null;
    } catch {
      /* malformed token — fall back to default sender below */
    }

    if (businessId) {
      const bizRes = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${businessId}&select=sms_sender_id`, {
        method: 'GET',
        headers: { Authorization: authHeader, apikey: supabaseKey },
      });
      if (bizRes.ok) {
        const bizRows = await bizRes.json();
        const configured = bizRows?.[0]?.sms_sender_id?.trim();
        if (configured && configured.length >= 3) {
          senderId = configured;
        }
      }
    }

    // 4. VOODOO SMS NETWORK HANDOFF
    // Now that we 100% confirmed they have credits AND we permanently deducted 1...
    // We physically initiate the text message using your hidden Master Key.
    if (!env.VOODOO_API_KEY) {
         throw new Error("CRITICAL FAILURE: VOODOO_API_KEY missing from Cloudflare Dashboard.");
    }

    const voodooPayload = {
      from: senderId,
      to: dest,
      msg: finalMsg
    };

    const voodooResponse = await fetch("https://api.voodoosms.com/sendsms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.VOODOO_API_KEY}`
      },
      body: JSON.stringify(voodooPayload)
    });

    const voodooBodyText = await voodooResponse.text();
    if (!voodooResponse.ok) {
       console.error("Voodoo API Frame Error:", voodooBodyText);
       return new Response(JSON.stringify({ error: "Telecom network rejection.", details: voodooBodyText }), { status: 502, headers: { 'Content-Type': 'application/json' }});
    }

    let voodooMessageId = null;
    let voodooStatus = null;
    try {
      const parsed = JSON.parse(voodooBodyText);
      voodooMessageId = parsed?.messages?.[0]?.id || parsed?.reference_id?.[0] || null;
      // Surface whatever per-message status/error Voodoo reports so a future
      // "Not Delivered" is visible instead of being logged as success.
      voodooStatus = parsed?.messages?.[0]?.status || parsed?.status || parsed?.error || null;
    } catch {
      /* non-JSON Voodoo payloads still count as ok when HTTP succeeded */
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Transmission submitted to Voodoo.",
      voodooMessageId,
      voodooStatus,
    }), { status: 200, headers: { 'Content-Type': 'application/json' }});

  } catch (error) {
    console.error("Cloudflare Edge Pipeline Crash:", error);
    return new Response(JSON.stringify({ error: "Internal Server Edge Crash", details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' }});
  }
}
