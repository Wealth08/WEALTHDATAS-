// Supabase Edge Function: sync-tickets
// The app calls this every few minutes while a customer (or staff member) has open provider-linked tickets.
// Customers only sync their own tickets; staff sync everyone's. Each ticket is checked at most once per 2 minutes.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { UPSTREAM, syncTicket, corsHeaders, json } from '../_shared/upstream.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'Not authenticated' }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: me } = await admin
      .from('profiles')
      .select('role, is_active')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (!me || !me.is_active) return json({ error: 'Account is not active' }, 403);
    const staff = me.role === 'SUPPORT_ADMIN' || me.role === 'SUPER_ADMIN';

    const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    let q = admin
      .from('tickets')
      .select('upstream_ref, service_id')
      .in('status', ['OPEN', 'IN_PROGRESS'])
      .not('upstream_ref', 'is', null)
      .or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`)
      .limit(15);
    if (!staff) q = q.eq('user_id', userData.user.id);

    const { data: open } = await q;
    let updated = 0;
    for (const t of open ?? []) {
      if (!UPSTREAM[t.service_id]) continue;
      try {
        if (await syncTicket(admin, t)) updated++;
      } catch (e) {
        console.error('sync failed', t.service_id, (e as Error).message);
      }
    }
    return json({ ok: true, checked: open?.length ?? 0, updated });
  } catch (e) {
    console.error('sync-tickets error', (e as Error).message);
    return json({ ok: false, error: 'Sync failed' });
  }
});
