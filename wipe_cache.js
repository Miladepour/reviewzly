import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function wipeCache() {
  const { data, error } = await supabase.from('businesses').update({ google_last_synced_at: null }).neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Cache wiped:", error ? error : "Success!");
}

wipeCache();
