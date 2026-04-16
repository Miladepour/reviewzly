import { createClient } from '@supabase/supabase-js';

// Setup Mock Environment
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

import fs from 'fs';
// We'll read the env dynamically
const envFile = fs.readFileSync('.env', 'utf-8');
const envUrl = envFile.split('VITE_SUPABASE_URL=')[1]?.split('\n')[0]?.trim();
const envKey = envFile.split('VITE_SUPABASE_ANON_KEY=')[1]?.split('\n')[0]?.trim();

const supabase = createClient(envUrl, envKey);

async function testRpc() {
  console.log("Fetching test client...");
  const { data: client, error: clientErr } = await supabase.from('clients').select('id').limit(1).single();
  if (clientErr) {
     console.error("Failed to find a client", clientErr);
     return;
  }
  
  console.log("Testing with Client ID:", client.id);

  console.log("Option A: Testing via standard JS Client...");
  const { data, error } = await supabase.rpc('execute_public_sms_reward', { p_client_id: client.id });
  
  if (error) {
     console.error("RPC FAILED natively:", error);
  } else {
     console.log("RPC Succeeded! Returned Data:", data);
  }
  
  console.log("\nOption B: Testing via REST HTTP Simulation...");
  const rpcResponse = await fetch(`${envUrl}/rest/v1/rpc/execute_public_sms_reward`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': envKey,
        'Authorization': `Bearer ${envKey}`
      },
      body: JSON.stringify({ p_client_id: client.id })
  });
  
  const restData = await rpcResponse.json();
  console.log("REST Response:", restData);
}

testRpc();
