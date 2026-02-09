import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;
let _initialized = false;

function getClient(): SupabaseClient | null {
  if (_initialized) return _supabase;
  _initialized = true;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY - archive features disabled');
    return null;
  }

  _supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  console.log('[Supabase] Connected to', url);
  return _supabase;
}

export { getClient as supabaseClient };

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getClient();
    if (!client) throw new Error('Supabase not configured');
    return (client as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export function isSupabaseConfigured(): boolean {
  return getClient() !== null;
}
