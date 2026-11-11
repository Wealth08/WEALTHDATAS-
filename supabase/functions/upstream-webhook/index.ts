// Supabase Edge Function: upstream-webhook
// Give the provider this URL as your Webhook URL (their dashboard):
//   https://YOUR-PROJECT-REF.supabase.co/functions/v1/upstream-webhook?token=YOUR_WEBHOOK_TOKEN
// Deploy this one with JWT verification OFF (the provider has no Supabase login):
//   supabase functions deploy upstream-webhook --no-verify-jwt
//
// The provider's webhooks are not signed, so this function does NOT trust the payload.
// It only uses the transaction id, then asks the provider's status API for the real answer.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { syncTicket, json } from '../_shared/upstream.ts';

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const expected = Deno.env.get('WEBHOOK_TOKEN') ?? '';
  const given = new URL(req.url).searchParams.get('token') ?? '';
  if (!expected || !safeEqual(given, expected)) return json({ error: 'Unauthorized' }, 401);

  try {
    const event = await req.json();
    const txnId = String(event?.data?.transaction_id ?? '');
    if (!txnId) return json({ status: 'success', message: 'ignored' });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });
    const { data: ticket } = await admin
      .from('tickets')
      .select('upstream_ref, service_id')
      .eq('upstream_ref', txnId)
      .maybeSingle();

    if (ticket) await syncTicket(admin, ticket);

    // Always acknowledge so the provider does not keep retrying
    return json({ status: 'success', message: 'Webhook received' });
  } catch (e) {
    console.error('webhook error', (e as Error).message);
    return json({ status: 'success', message: 'Webhook received' });
  }
});
