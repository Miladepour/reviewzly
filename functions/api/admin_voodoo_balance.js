export async function onRequestGet({ request, env }) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  // Decode JWT to get the caller's user ID
  let sub = null;
  try {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    sub = JSON.parse(atob(token.split('.')[1]))?.sub;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  // Verify the caller is in the super_admins table
  const adminRes = await fetch(
    `${supabaseUrl}/rest/v1/super_admins?user_id=eq.${sub}&select=user_id`,
    { headers: { Authorization: authHeader, apikey: supabaseKey } }
  );
  const admins = await adminRes.json().catch(() => []);
  if (!Array.isArray(admins) || admins.length === 0) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  if (!env.VOODOO_API_KEY) {
    return new Response(JSON.stringify({ credits: null, error: 'VOODOO_API_KEY not configured' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Fetch the Voodoo platform credit balance server-side
  const vRes = await fetch('https://api.voodoosms.com/credits', {
    headers: { Authorization: `Bearer ${env.VOODOO_API_KEY}` },
  });
  const vData = await vRes.json().catch(() => null);

  // Voodoo may return credits under different field names — check all
  const credits = vData?.credits ?? vData?.balance ?? vData?.data?.credits ?? vData?.credit ?? null;

  return new Response(JSON.stringify({ credits }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
