import { normalizeReviewLinksInMessage } from './smsLinkUtils.js';

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

    const { dest, msg, clientName, scheduledDateTime, shortCode } = payload;
    if (!dest || !msg) {
      return new Response(JSON.stringify({ error: "Destination phone number and message content are strictly required." }), { status: 400, headers: { 'Content-Type': 'application/json' }});
    }

    const normalizedMsg = normalizeReviewLinksInMessage(msg, shortCode || null);

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
    let senderId = rpcData.sender_id || 'Reviewzly';

    // Prefer the business-configured SMS sender mask (Sms Hub → Transmission Identity)
    const bizRes = await fetch(`${supabaseUrl}/rest/v1/businesses?select=sms_sender_id`, {
      method: 'GET',
      headers: { Authorization: authHeader, apikey: supabaseKey },
    });
    if (bizRes.ok) {
      const bizRows = await bizRes.json();
      if (bizRows?.[0]?.sms_sender_id) {
        senderId = bizRows[0].sms_sender_id;
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
      msg: normalizedMsg
    };
    // Voodoo request param is "schedule" (UNIX ts or e.g. "3 minutes") — NOT scheduledDateTime
    if (scheduledDateTime && Number(scheduledDateTime) > Math.floor(Date.now() / 1000)) {
      voodooPayload.schedule = Number(scheduledDateTime);
    }

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
    let voodooScheduledAt = null;
    try {
      const parsed = JSON.parse(voodooBodyText);
      voodooMessageId = parsed?.messages?.[0]?.id || parsed?.reference_id?.[0] || null;
      voodooScheduledAt = parsed?.scheduledDateTime || null;
    } catch {
      /* non-JSON Voodoo payloads still count as ok when HTTP succeeded */
    }

    const wasScheduled = !!voodooPayload.schedule;
    return new Response(JSON.stringify({
      success: true,
      message: wasScheduled
        ? "Message scheduled with Voodoo."
        : "Transmission submitted to Voodoo.",
      voodooMessageId,
      scheduled: wasScheduled,
      voodooScheduledAt,
    }), { status: 200, headers: { 'Content-Type': 'application/json' }});

  } catch (error) {
    console.error("Cloudflare Edge Pipeline Crash:", error);
    return new Response(JSON.stringify({ error: "Internal Server Edge Crash", details: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' }});
  }
}
