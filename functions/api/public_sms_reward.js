export async function onRequestPost({ request, env }) {
  try {
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
    const senderId = rpcData.sender_id || 'Reviewzly';
    const clientName = rpcData.client_name;
    const customTemplate = rpcData.reward_sms || 'Hi {{client_name}}! Thanks so much for the 5 stars! As promised, here is the official link to post it on Google. It takes 10 seconds and means the world to us! {{google_link}}';

    const finalSms = customTemplate
       .replace(/{{client_name}}/g, clientName || 'there')
       .replace(/{{google_link}}/g, gmbUrl || 'https://google.com');

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
