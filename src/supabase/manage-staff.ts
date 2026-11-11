// Supabase Edge Function: manage-staff
// Only an ACTIVE SUPER_ADMIN may create SUPPORT_ADMIN accounts or activate/deactivate them.
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected automatically
// by Supabase into every Edge Function. You do not need to set them yourself.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1) Identify the caller from their JWT
    const authHeader = req.headers.get('Authorization') ?? '';
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData.user) return json({ error: 'Not authenticated' }, 401);

    // 2) Privileged client (service role) - used only after the role check below
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const { data: me } = await admin
      .from('profiles')
      .select('role, is_active')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (!me || me.role !== 'SUPER_ADMIN' || !me.is_active) {
      return json({ error: 'Only an active Super Admin can manage staff accounts' }, 403);
    }

    const body = await req.json();

    // ---------- CREATE SUPPORT ACCOUNT ----------
    if (body.action === 'create') {
      const name = String(body.name ?? '').trim();
      const email = String(body.email ?? '').trim().toLowerCase();
      const phone = String(body.phone ?? '').trim();
      const password = String(body.password ?? '');

      if (!name) return json({ error: 'Name is required' }, 400);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'A valid email is required' }, 400);
      if (password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // staff do not need to confirm by email
        user_metadata: { name, phone },
      });
      if (createErr || !created.user) {
        return json({ error: createErr?.message ?? 'Could not create user' }, 400);
      }

      // The signup trigger made a USER profile; promote it to SUPPORT_ADMIN
      const { error: roleErr } = await admin
        .from('profiles')
        .update({ role: 'SUPPORT_ADMIN', tier: 'ENTERPRISE', created_by: userData.user.id })
        .eq('id', created.user.id);

      if (roleErr) {
        await admin.auth.admin.deleteUser(created.user.id); // roll back, never leave a half-made account
        return json({ error: 'Could not assign staff role: ' + roleErr.message }, 500);
      }

      return json({ ok: true, id: created.user.id });
    }

    // ---------- ACTIVATE / DEACTIVATE ----------
    if (body.action === 'set_active') {
      const targetId = String(body.userId ?? '');
      const active = Boolean(body.active);

      if (!targetId) return json({ error: 'userId is required' }, 400);
      if (targetId === userData.user.id) return json({ error: 'You cannot change your own account' }, 400);

      const { data: target } = await admin.from('profiles').select('role').eq('id', targetId).maybeSingle();
      if (!target) return json({ error: 'Account not found' }, 404);
      if (target.role !== 'SUPPORT_ADMIN') {
        return json({ error: 'Only support staff accounts can be changed here' }, 400);
      }

      const { error: updErr } = await admin.from('profiles').update({ is_active: active }).eq('id', targetId);
      if (updErr) return json({ error: updErr.message }, 500);

      // Ban/unban also blocks login and token refresh at the auth layer
      await admin.auth.admin.updateUserById(targetId, { ban_duration: active ? 'none' : '876000h' });

      return json({ ok: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return json({ error: (e as Error).message ?? 'Unexpected error' }, 500);
  }
});
