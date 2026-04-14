export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    // Attempt Token Header Decryption First, fallback to query arg if exposed
    const tokenHeader = context.request.headers.get('x-voodoo-token');
    const url = new URL(context.request.url);
    let bid = url.searchParams.get('bid');

    if (tokenHeader) {
      try {
        bid = atob(tokenHeader).trim();
      } catch(e) {
        // failed to decode base64
      }
    }

    if (!bid) {
      return new Response(JSON.stringify({ error: "Missing Security Token or Params" }), { 
          status: 400, headers: { "Content-Type": "application/json" } 
      });
    }

    const payload = await context.request.json();
    
    // Abstracted parsing to handle potential Voodoo payload syntax variants
    const originator = payload.Originator || payload.originator || payload.from || payload.orig;
    const messageText = payload.Message || payload.message || payload.msg || payload.text;

    if (!originator || !messageText) {
        return new Response(JSON.stringify({ error: "Malformed payload structure" }), { 
            status: 400, headers: { "Content-Type": "application/json" } 
        });
    }

    const supabaseUrl = context.env.VITE_SUPABASE_URL;
    const supabaseKey = context.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return new Response(JSON.stringify({ error: "Edge Configuration Missing" }), { status: 500 });
    }

    // 1. Fetch Client ID based on phone match within isolated Directory
    const cleanPhone = originator.replace(/[^0-9]/g, '');
    let clientId = null;

    const fetchClientReq = await fetch(`${supabaseUrl}/rest/v1/clients?business_id=eq.${bid}&select=id,phone`, {
        headers: {
           apikey: supabaseKey,
           Authorization: `Bearer ${supabaseKey}`
        }
    });

    if (fetchClientReq.ok) {
        const clients = await fetchClientReq.json();
        const matchedClient = clients.find(c => c.phone.replace(/[^0-9]/g, '').includes(cleanPhone) || cleanPhone.includes(c.phone.replace(/[^0-9]/g, '')));
        if (matchedClient) clientId = matchedClient.id;
    }

    // 2. If client does not exist, autonomously capture inbound
    if (!clientId) {
        const createClientReq = await fetch(`${supabaseUrl}/rest/v1/clients`, {
            method: 'POST',
            headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                business_id: bid,
                name: 'Unknown Number',
                phone: originator,
                tags: ['Inbound SMS Capture']
            })
        });

        if (createClientReq.ok) {
            const newClientData = await createClientReq.json();
            if (newClientData && newClientData.length > 0) {
                clientId = newClientData[0].id;
            }
        }
    }

    // 3. Inject Communication Log cleanly as INBOUND onto Postgres
    if (clientId) {
        await fetch(`${supabaseUrl}/rest/v1/communications`, {
            method: 'POST',
            headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                business_id: bid,
                client_id: clientId,
                type: 'HUMAN_CHAT',
                text: messageText,
                is_outbound: false
            })
        });
    }

    // Always 200 OK
    return new Response(JSON.stringify({ success: true }), { 
        status: 200, headers: { "Content-Type": "application/json" } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, headers: { "Content-Type": "application/json" } 
    });
  }
}
