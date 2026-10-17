import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key-not-configured';

export const supabase = createClient(url, anonKey, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
