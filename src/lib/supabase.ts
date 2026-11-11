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
// TESTING ONLY: set VITE_PER_TAB_LOGIN=true in your local .env so each browser tab has its own login
// (you can be admin in one tab and a customer in another). Never set it on the live site.
const perTab = env.VITE_PER_TAB_LOGIN === 'true';

export const supabase = createClient(url || 'http://localhost', anonKey || 'missing-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    ...(perTab ? { storage: window.sessionStorage } : {}),
  },
});
