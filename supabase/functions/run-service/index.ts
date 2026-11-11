// Supabase Edge Function: run-service
// A signed-in customer runs a service. Order of events (always in this order):
//   1) validate input            -> nothing charged if invalid
//   2) charge the wallet         -> server-side, price comes from the services table
//   3) call the provider         -> API key never leaves the server
//   4) on ANY failure, refund the customer automatically
// Business errors come back as HTTP 200 with { ok: false, error } so the browser can show them.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  UPSTREAM,
  callUpstream,
  upstreamOk,
  customerFacingError,
  refFromSubmit,
  corsHeaders,
  json,
  type Params,
} from '../_shared/upstream.ts';

const pick = (o: any, ...keys: string[]): string => {
  for (const k of keys) {
    const v = o?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
  }
  return '';
};

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
    const userId = userData.user.id;

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const input = await req.json();
    const serviceId = String(input.serviceId ?? '');
    const params: Params = (input.params ?? {}) as Params;

    const cfg = UPSTREAM[serviceId];
    if (!cfg) {
      return json({
        ok: false,
        error: 'This service is not connected to the provider yet. You have not been charged.',
      });
    }

    // 1) validate
    const prepared = cfg.prepare(params);
    if ('error' in prepared) return json({ ok: false, error: prepared.error });

    // 2) charge
    const { data: charge, error: chargeErr } = await admin.rpc('charge_user', {
      p_user_id: userId,
      p_service_id: serviceId,
      p_detail: prepared.mask,
    });
    if (chargeErr) return json({ ok: false, error: 'Could not process payment. Please try again.' });
    if (!charge?.success) return json({ ok: false, error: charge?.error ?? 'Payment failed' });

    const refund = async (reason: string) => {
      await admin.rpc('refund_user', {
        p_user_id: userId,
        p_amount: charge.amount,
        p_reason: reason,
        p_original_ref: charge.reference,
        p_service_id: serviceId,
      });
    };

    // 3) call the provider
    let res;
    try {
      res = await callUpstream(cfg.path, prepared.body);
    } catch (e) {
      console.error('provider call failed', serviceId, (e as Error).message);
      await refund(`${charge.title} could not be completed (provider did not respond)`);
      return json({ ok: false, refunded: true, error: 'The provider did not respond. You have not been charged.' });
    }

    if (!upstreamOk(res)) {
      console.error('provider rejected', serviceId, res.status, String(res.body?.message ?? '').slice(0, 120));
      await refund(`${charge.title} failed`);
      return json({ ok: false, refunded: true, error: customerFacingError(res) + ' You have not been charged.' });
    }

    // ---------------- instant: return the real record + the provider's PDF ----------------
    if (cfg.kind === 'instant') {
      const u = res.body.user_data ?? res.body.data ?? {};
      const pdf: string = res.body.pdf_base64 ?? '';
      if (!pdf && !pick(u, 'first_name', 'firstname', 'surname', 'last_name')) {
        await refund(`${charge.title} returned no record`);
        return json({ ok: false, refunded: true, error: 'No record was found. You have not been charged.' });
      }
      const gender = pick(u, 'gender', 'sex').toLowerCase().startsWith('f') ? 'Female' : 'Male';
      return json({
        ok: true,
        kind: 'instant',
        newBalance: charge.new_balance,
        pdfBase64: pdf,
        record: {
          queryParam: prepared.queryParam,
          data: {
            nin: pick(u, 'nin', 'nin_number') || undefined,
            bvn: pick(u, 'bvn', 'bvn_number') || undefined,
            firstName: pick(u, 'first_name', 'firstname'),
            middleName: pick(u, 'middle_name', 'middlename') || undefined,
            lastName: pick(u, 'last_name', 'surname', 'lastname'),
            dob: pick(u, 'date_of_birth', 'dob', 'birthdate'),
            gender,
            phone: pick(u, 'phone_number', 'phone', 'telephone'),
            address: pick(u, 'address', 'residence_address'),
            lga: pick(u, 'lga', 'lga_of_origin'),
            stateOfOrigin: pick(u, 'state_of_origin', 'state'),
            residenceState: pick(u, 'residence_state'),
            trackingNumber: pick(u, 'tracking_id', 'tracking_number'),
          },
        },
      });
    }

    // ---------------- async: the provider accepted it; open a tracked ticket ----------------
    const ref = refFromSubmit(cfg, res.body, prepared);
    const { data: ticket, error: ticketErr } = await admin.rpc('create_upstream_ticket', {
      p_user_id: userId,
      p_service_id: serviceId,
      p_full_name: prepared.fullName ?? '',
      p_detail: prepared.detail ?? '',
      p_upstream_ref: ref,
      p_amount_paid: charge.amount,
    });
    if (ticketErr || !ticket?.success) {
      await refund(`${charge.title} could not be recorded`);
      return json({
        ok: false,
        refunded: true,
        error: (ticket?.error ?? 'Could not record your request.') + ' You have not been charged.',
      });
    }

    return json({ ok: true, kind: 'async', ticketNumber: ticket.ticket_number, newBalance: charge.new_balance });
  } catch (e) {
    console.error('run-service error', (e as Error).message);
    return json({ ok: false, error: 'Something went wrong. Please try again.' });
  }
});
