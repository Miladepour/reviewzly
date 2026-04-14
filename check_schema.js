import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('businesses').select('*').limit(1);
  if (data) {
    console.log(Object.keys(data[0] || {}));
  } else {
    console.error(error);
  }
}
check();
