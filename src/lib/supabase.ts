import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env ?? {};
const url = env.VITE_SUPABASE_URL as string | undefined;
const anonKey = env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.'
  );
}

// Only the public anon key ever lives in the browser. Never put the service_role key here.
export const supabase = createClient(url || 'http://localhost', anonKey || 'missing-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
