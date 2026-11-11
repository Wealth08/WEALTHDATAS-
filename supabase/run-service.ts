// Supabase Edge Function: run-service
// A signed-in customer runs a service. Order of events (always in this order):
//   1) validate input            -> nothing charged if invalid
//   2) charge the wallet         -> server-side, price comes from the services table
//   3) call the provider         -> API key never leaves the server
//   4) on ANY failure, refund the customer automatically
// Business errors come back as HTTP 200 with { ok: false, error } so the browser can show them.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ===== shared provider code (inlined so this file works on its own) =====
// Shared code for the provider (abjiktech) integration.
// The provider API key lives ONLY in Supabase secrets (UPSTREAM_API_KEY). It is never sent to the browser.
//
// Fields marked INFERRED are not shown in the provider docs we received (their panels were collapsed).
// They follow the doc's plain-English description. Confirm them against the expanded docs before launch.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const BASE = (Deno.env.get('UPSTREAM_BASE_URL') ?? 'https://abjiktech.com.ng/api').replace(/\/+$/, '');

// Business rule: the provider does not refund a failed personalization once it accepted it.
// false = we do NOT auto-refund the customer for it (ticket is closed for staff review).
export const REFUND_PERSONALIZATION_FAILURE = false;

/* ------------------------------ validation ------------------------------ */

const NG_PHONE = /^(?:(?:\+?234)|0)[789][01]\d{8}$/;
const NAME = /^[A-Za-z][A-Za-z .'-]{1,59}$/;

const normPhone = (s: string): string | null => {
  const c = (s ?? '').replace(/[\s\-()]/g, '');
  if (!NG_PHONE.test(c)) return null;
  if (c.startsWith('+234')) return '0' + c.slice(4);
  if (c.startsWith('234')) return '0' + c.slice(3);
  return c;
};
const last4 = (s: string) => '****' + s.slice(-4);

export type Params = Record<string, string>;
type Prepared =
  | { error: string }
  | { body: Record<string, string>; mask: string; queryParam: string; fullName?: string; detail?: string };

export type Verdict = { state: 'pending' | 'done' | 'failed'; notes?: string; refund?: boolean };

type InstantCfg = { kind: 'instant'; path: string; prepare: (p: Params) => Prepared };
type AsyncCfg = {
  kind: 'async';
  path: string;
  statusPath: string;
  statusKey: 'transaction_id' | 'tracking_id'; // which field the provider's status endpoint expects
  prepare: (p: Params) => Prepared;
  interpret: (body: any) => Verdict;
};
export type ServiceCfg = InstantCfg | AsyncCfg;

const prepNin = (p: Params): Prepared => {
  const nin = (p.query ?? '').replace(/\s+/g, '');
  if (!/^\d{11}$/.test(nin)) return { error: 'NIN must be exactly 11 numeric digits' };
  return { body: { nin }, mask: `lookup (ref ${last4(nin)})`, queryParam: nin };
};

const prepTracking = (p: Params): Prepared => {
  const id = (p.tracking_id ?? '').replace(/\s+/g, '');
  if (!/^[A-Za-z0-9]{15}$/.test(id)) return { error: 'Tracking ID must be exactly 15 letters/numbers' };
  return { body: { tracking_id: id }, mask: `(tracking ${last4(id)})`, queryParam: id, detail: `Tracking ID ${last4(id)}` };
};

const dataOf = (b: any) => (b && typeof b === 'object' ? (b.data && typeof b.data === 'object' ? b.data : b) : {});
const stateOf = (b: any) => String(dataOf(b).status ?? b?.status ?? '').toLowerCase();

export const UPSTREAM: Record<string, ServiceCfg> = {
  // Documented: api_key + nin
  'nin-premium-slip': { kind: 'instant', path: 'verification/nin_by_nin.php', prepare: prepNin },

  // INFERRED: field name "phone"
  'nin-by-phone': {
    kind: 'instant',
    path: 'verification/nin_by_phone_premium.php',
    prepare: (p) => {
      const phone = normPhone(p.query ?? '');
      if (!phone) return { error: 'Enter a valid 11-digit Nigerian mobile number (e.g., 08012345678)' };
      return { body: { phone }, mask: `lookup (ref ${last4(phone)})`, queryParam: phone };
    },
  },

  // INFERRED: field name "bvn"
  'bvn-premium-slip': {
    kind: 'instant',
    path: 'verification/bvn_premium_slip.php',
    prepare: (p) => {
      const bvn = (p.query ?? '').replace(/\s+/g, '');
      if (!/^\d{11}$/.test(bvn)) return { error: 'BVN must be exactly 11 numeric digits' };
      return { body: { bvn }, mask: `lookup (ref ${last4(bvn)})`, queryParam: bvn };
    },
  },

  // Documented: phone, first_name, last_name. Status: transaction_id -> pending | completed(bvn, bvns) | failed(refunded)
  'bvn-retrieval': {
    kind: 'async',
    path: 'verification/bvn_retrieval.php',
    statusPath: 'verification/bvn_retrieval_status.php',
    statusKey: 'transaction_id',
    prepare: (p) => {
      const phone = normPhone(p.phone ?? '');
      if (!phone) return { error: 'Enter a valid 11-digit Nigerian mobile number (e.g., 08012345678)' };
      const first = (p.first_name ?? '').trim();
      const last = (p.last_name ?? '').trim();
      if (!NAME.test(first) || !NAME.test(last)) {
        return { error: 'Enter the first name and surname exactly as registered (letters only)' };
      }
      return {
        body: { phone, first_name: first, last_name: last },
        mask: `request (phone ${last4(phone)})`,
        queryParam: phone,
        fullName: `${first} ${last}`,
        detail: `BVN retrieval for ${first} ${last}, phone ${last4(phone)}`,
      };
    },
    interpret: (body) => {
      const d = dataOf(body);
      const st = stateOf(body);
      if (st === 'completed') {
        const list: string[] = Array.isArray(d.bvns) && d.bvns.length ? d.bvns : d.bvn ? [d.bvn] : [];
        return { state: 'done', notes: list.length ? `BVN retrieved: ${list.join(', ')}` : 'Completed' };
      }
      if (st === 'failed') return { state: 'failed', refund: true, notes: 'The BVN could not be retrieved for this number.' };
      return { state: 'pending' };
    },
  },

  // INFERRED: request field "tracking_id" ("using a tracking ID"). Status endpoint: transaction_id.
  'ipe-clearance': {
    kind: 'async',
    path: 'verification/ipe_clearance.php',
    statusPath: 'verification/get_status.php',
    statusKey: 'transaction_id',
    prepare: prepTracking,
    interpret: (body) => {
      const d = dataOf(body);
      const st = stateOf(body);
      if (['completed', 'successful', 'success'].includes(st)) {
        const bits = [d.remarks, d.new_nin ? `New NIN: ${d.new_nin}` : '', d.new_tracking_id ? `New tracking ID: ${d.new_tracking_id}` : '']
          .filter(Boolean)
          .join(' | ');
        return { state: 'done', notes: bits || 'IPE clearance completed.' };
      }
      if (['failed', 'rejected', 'declined'].includes(st)) {
        return { state: 'failed', refund: true, notes: d.remarks || 'IPE clearance could not be completed.' };
      }
      return { state: 'pending' };
    },
  },

  // Documented: tracking_id (15 alphanumeric). Status: tracking_id -> inprogress | completed(nin) | failed
  'nin-personalization': {
    kind: 'async',
    path: 'verification/personalization.php',
    statusPath: 'verification/personalization_status.php',
    statusKey: 'tracking_id',
    prepare: prepTracking,
    interpret: (body) => {
      const d = dataOf(body);
      const st = stateOf(body);
      if (st === 'completed') return { state: 'done', notes: d.nin ? `Personalization completed. NIN: ${d.nin}` : 'Personalization completed.' };
      if (st === 'failed') {
        return {
          state: 'failed',
          refund: REFUND_PERSONALIZATION_FAILURE,
          notes: 'The provider could not complete this personalization. Contact support for a review.',
        };
      }
      return { state: 'pending' };
    },
  },
};

/* ------------------------------ provider call ------------------------------ */

export async function callUpstream(path: string, body: Record<string, unknown>): Promise<{ status: number; body: any }> {
  const apiKey = Deno.env.get('UPSTREAM_API_KEY');
  if (!apiKey) throw new Error('UPSTREAM_API_KEY is not set');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 60000);
  try {
    const res = await fetch(`${BASE}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ api_key: apiKey, ...body }),
      signal: ctl.signal,
    });
    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // non-JSON reply
    }
    return { status: res.status, body: parsed };
  } finally {
    clearTimeout(timer);
  }
}

export const upstreamOk = (r: { status: number; body: any }) =>
  r.status === 200 && !!r.body && !['error', 'failed', 'fail'].includes(String(r.body.status ?? 'success').toLowerCase());

// Never show provider internals (their balance, their errors) to customers
export const customerFacingError = (r: { status: number; body: any }): string => {
  const msg = String(r.body?.message ?? '');
  if (r.status === 429) return 'The service is busy right now. Please try again in a few minutes.';
  if (/not found|no record/i.test(msg)) return 'No record was found for the details you entered.';
  if (r.status === 409) return 'A request for this number is already open or was completed in the last 30 days.';
  if (r.status === 400 && !/balance|api|key|ip|blocked/i.test(msg) && msg) return msg;
  return 'The provider could not complete this request right now.';
};

export const refFromSubmit = (cfg: AsyncCfg, body: any, prepared: { body: Record<string, string> }): string | null => {
  if (cfg.statusKey === 'tracking_id') return prepared.body.tracking_id ?? null;
  const d = dataOf(body);
  return (d.transaction_id ?? body?.transaction_id ?? null) as string | null;
};

/* ------------------------------ status sync ------------------------------ */

// Asks the provider for the real status of one ticket and applies it. Used by the webhook and by polling.
export async function syncTicket(admin: any, t: { upstream_ref: string; service_id: string }): Promise<boolean> {
  const cfg = UPSTREAM[t.service_id];
  if (!cfg || cfg.kind !== 'async') return false;

  const res = await callUpstream(cfg.statusPath, { [cfg.statusKey]: t.upstream_ref });
  await admin.from('tickets').update({ last_synced_at: new Date().toISOString() }).eq('upstream_ref', t.upstream_ref);
  if (res.status !== 200 || !res.body) return false;

  const verdict = cfg.interpret(res.body);
  if (verdict.state === 'pending') return false;

  const status = verdict.state === 'done' ? 'RESOLVED' : verdict.refund ? 'REJECTED' : 'CLOSED';
  const { data } = await admin.rpc('system_update_ticket', {
    p_upstream_ref: t.upstream_ref,
    p_status: status,
    p_notes: verdict.notes ?? null,
    p_refund: !!verdict.refund,
  });
  return !!data?.success && !data?.unchanged;
}

// ===== end shared code =====


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
