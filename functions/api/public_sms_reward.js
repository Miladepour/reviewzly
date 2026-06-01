// Lightweight Edge memory cache against bot loops per node
const ipBlocklist = new Map();

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
    // 0. IP Rate Limiting Firewall
    const ip = request.headers.get('cf-connecting-ip');
    if (ip) {
      const hits = ipBlocklist.get(ip) || 0;
      if (hits >= 10) {
        return new Response(JSON.stringify({ error: "STRICT RATE LIMIT EXCEEDED. Remote brute-force blocked." }), { 
            status: 429, headers: { 'Content-Type': 'application/json' } 
        });
      }
      ipBlocklist.set(ip, hits + 1);
      setTimeout(() => ipBlocklist.delete(ip), 60000); // 60-second moving window
    }

    // 1. Parse Incoming Payload (NO AUTH HEADER REQUIRED - THIS IS A PUBLIC LINK)
    let payload;
    try {
      payload = await request.json();
    } catch(e) {
      return new Response(JSON.stringify({ error: "Invalid JSON payload." }), { status: 400, headers: { 'Content-Type': 'application/json' }});
    }

    const { uid } = payload;
    if (!uid) {
      return new Response(JSON.stringify({ error: "Unauthorized Public Event: Missing tracking token." }), { status: 401, headers: { 'Content-Type': 'application/json' }});
    }

    const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
    const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Cloudflare Supabase Environment Keys");
    }

    // 2. TRIGGER SECURE SUPABASE VALIDATION (Bypass RLS via SECURITY DEFINER)
    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_public_sms_reward`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}` // Generic anon token
      },
      body: JSON.stringify({ p_client_id: uid })
    });

    if (!rpcResponse.ok) {
        const errorText = await rpcResponse.text();
        return new Response(JSON.stringify({ error: "Internal Gateway Refusals", details: errorText }), { status: 500, headers: { 'Content-Type': 'application/json' }});
    }

    const rpcData = await rpcResponse.json();
    
    // The RPC returns { error: "..." } independently if the logic fails (e.g., zero credits, replay attack)
    if (rpcData.error) {
        return new Response(JSON.stringify({ error: "SECURITY BLOCK", details: rpcData.error }), { status: 403, headers: { 'Content-Type': 'application/json' }});
    }

    // 3. SECURE PAYLOAD PREPARATION
    const destPhone = rpcData.dest;
    const gmbUrl = rpcData.gmb_url;
    const clientName = rpcData.client_name;
    const businessId = rpcData.business_id || '';
    const customTemplate = rpcData.reward_sms || 'Hi {{client_name}}! Thanks so much for the 5 stars! As promised, here is the official link to post it on Google. It takes 10 seconds and means the world to us! {{google_link}}';

    const optUrl = `https://reviewzly.com/opt-out?b=${businessId}`;
    let finalSms = customTemplate
       .replace(/{{client_name}}/g, clientName || 'there')
       .replace(/{{google_link}}/g, gmbUrl || 'https://google.com')
       .replace(/{{unsubscribe_link}}/g, optUrl);

    // Resolve the correct sender ID. Public endpoint has no user JWT, and the
    // anon key cannot bypass RLS on businesses, so use the service role key to
    // read sms_sender_id directly. Resolve business_id from the client (uid) if
    // the RPC didn't return it, so this never depends on the RPC's shape.
    let senderId = (rpcData.sender_id && rpcData.sender_id.trim()) || 'Reviewzly';
    const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRole && supabaseUrl) {
      try {
        let bizId = businessId;
        if (!bizId) {
          const cRes = await fetch(
            `${supabaseUrl}/rest/v1/clients?id=eq.${uid}&select=business_id`,
            { headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` } }
          );
          const cRows = await cRes.json().catch(() => []);
          bizId = cRows?.[0]?.business_id || '';
        }
        if (bizId) {
          const bizRes = await fetch(
            `${supabaseUrl}/rest/v1/businesses?id=eq.${bizId}&select=sms_sender_id`,
            { headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` } }
          );
          const bizRows = await bizRes.json().catch(() => []);
          const configured = bizRows?.[0]?.sms_sender_id?.trim();
          if (configured && configured.length >= 3) senderId = configured;
          console.log('Reward sender resolution:', JSON.stringify({ bizId, configured, finalSender: senderId, hadServiceRole: !!serviceRole }));
        } else {
          console.log('Reward sender: no business_id resolved; using', senderId);
        }
      } catch (e) {
        console.error('Reward sender resolution error:', e?.message);
      }
    } else {
      console.log('Reward sender: SUPABASE_SERVICE_ROLE_KEY missing; using', senderId);
    }

    // Shorten the unsubscribe link via vsms.io so it passes UK carrier filters
    if (businessId && env.VOODOO_API_KEY && finalSms.includes(optUrl)) {
      const optName = `opt${businessId.replace(/-/g, '').substring(0, 20)}`;
      const vsmsOpt = await shortenVoodooLink(optUrl, optName, env.VOODOO_API_KEY);
      if (vsmsOpt) finalSms = finalSms.replace(optUrl, vsmsOpt);
    }

    // 4. VOODOO SMS NETWORK HANDOFF
    if (!env.VOODOO_API_KEY) {
         throw new Error("VOODOO_API_KEY missing from Cloudflare.");
    }

    const voodooResponse = await fetch("https://api.voodoosms.com/sendsms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.VOODOO_API_KEY}`
      },
      body: JSON.stringify({
        from: senderId,
        to: destPhone,
        msg: finalSms
      })
    });

    if (!voodooResponse.ok) {
       console.error("Voodoo Frame Error");
       return new Response(JSON.stringify({ error: "Telecom network rejection." }), { status: 502, headers: { 'Content-Type': 'application/json' }});
    }

    return new Response(JSON.stringify({ success: true, message: "Reward SMS Deployed." }), { status: 200, headers: { 'Content-Type': 'application/json' }});

  } catch (error) {
    console.error("Cloudflare Public Pipeline Crash:", error);
    return new Response(JSON.stringify({ error: "Internal Crash", details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' }});
  }
}
