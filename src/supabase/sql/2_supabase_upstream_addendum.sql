-- =====================================================================
-- Provider (abjiktech) integration - run AFTER supabase_full_setup.sql
-- Safe to run more than once.
-- =====================================================================

-- 1) Tickets can now be linked to a request at the provider
alter table public.tickets add column if not exists upstream_ref text;
alter table public.tickets add column if not exists last_synced_at timestamptz;
create unique index if not exists tickets_upstream_ref_unique
  on public.tickets(upstream_ref) where upstream_ref is not null;

-- 2) Catalog corrections to match how the provider really works
--    BVN Retrieval is NOT instant: the provider's team works it, usually within 24 hours.
update public.services
   set type = 'async', turnaround = 'Within 24 Hours', requires_document_upload = false,
       description = 'Find the BVN linked to a phone number. Provide the phone number and the registered first and last name.'
 where id = 'bvn-retrieval';
--    The provider takes a tracking ID for IPE clearance, not uploaded documents.
update public.services set requires_document_upload = false where id = 'ipe-clearance';

-- 3) OPTIONAL: sell NIN Personalization. Replace 0.00 with YOUR selling price, then un-comment and run.
-- insert into public.services (id, title, category, type, price, description, badge, turnaround, requires_document_upload, sort_order)
-- values ('nin-personalization', 'NIN Personalization', 'NIN', 'async', 0.00,
--         'Personalize a NIN using its 15-character tracking ID.', 'Async Processing', '24 - 48 Hours', false, 14)
-- on conflict (id) do nothing;

-- 4) Money functions that ONLY the server (Edge Functions with the service role) may call.
--    Customers can never call these directly.

create or replace function public.charge_user(p_user_id uuid, p_service_id text, p_detail text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.services%rowtype; v_bal numeric; v_new numeric; v_ref text;
begin
  select * into s from public.services where id = p_service_id;
  if not found then return jsonb_build_object('success', false, 'error', 'Unknown service'); end if;
  select wallet_balance into v_bal from public.profiles where id = p_user_id and is_active for update;
  if v_bal is null then return jsonb_build_object('success', false, 'error', 'Account is not active'); end if;
  if v_bal < s.price then
    return jsonb_build_object('success', false, 'error',
      'Insufficient balance. Required: ₦' || to_char(s.price, 'FM999,999,990.00') ||
      ', Current: ₦' || to_char(v_bal, 'FM999,999,990.00') || '. Please fund your wallet.');
  end if;
  v_new := v_bal - s.price;
  v_ref := public.gen_ref('WD-SRV-');
  update public.profiles set wallet_balance = v_new where id = p_user_id;
  insert into public.transactions (user_id, amount, type, status, description, reference)
  values (p_user_id, s.price, 'DEBIT', 'SUCCESS', s.title || ' ' || coalesce(p_detail, ''), v_ref);
  return jsonb_build_object('success', true, 'amount', s.price, 'new_balance', v_new, 'reference', v_ref, 'title', s.title);
end $$;

create or replace function public.refund_user(p_user_id uuid, p_amount numeric, p_reason text, p_original_ref text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_new numeric;
begin
  if p_amount is null or p_amount <= 0 then return jsonb_build_object('success', false, 'error', 'Invalid amount'); end if;
  update public.profiles set wallet_balance = wallet_balance + p_amount where id = p_user_id returning wallet_balance into v_new;
  if not found then return jsonb_build_object('success', false, 'error', 'User not found'); end if;
  insert into public.transactions (user_id, amount, type, status, description, channel, reference)
  values (p_user_id, p_amount, 'REFUND', 'SUCCESS', 'Auto-Refund: ' || p_reason, 'SYSTEM_REFUND',
          case when p_original_ref is not null then 'WD-REF-' || p_original_ref else public.gen_ref('WD-REF-') end);
  return jsonb_build_object('success', true, 'new_balance', v_new);
end $$;

create or replace function public.create_upstream_ticket(
  p_user_id uuid, p_service_id text, p_full_name text, p_detail text, p_upstream_ref text, p_amount_paid numeric)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.services%rowtype; p public.profiles%rowtype; v_num text;
begin
  select * into s from public.services where id = p_service_id;
  if not found then return jsonb_build_object('success', false, 'error', 'Unknown service'); end if;
  select * into p from public.profiles where id = p_user_id;
  if not found then return jsonb_build_object('success', false, 'error', 'User not found'); end if;
  v_num := 'TKT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.ticket_seq')::text, 3, '0');
  insert into public.tickets (ticket_number, user_id, user_name, user_email, user_phone, service_id, service_title,
    type, status, priority, subject, description, amount_paid, upstream_ref, last_synced_at)
  values (v_num, p.id, coalesce(nullif(trim(p_full_name), ''), p.name), p.email, p.phone, s.id, s.title,
    'SERVICE_REQUEST', 'IN_PROGRESS', 'HIGH', s.title || ' request',
    coalesce(nullif(trim(p_detail), ''), s.title), p_amount_paid, p_upstream_ref, now());
  return jsonb_build_object('success', true, 'ticket_number', v_num);
exception when unique_violation then
  return jsonb_build_object('success', false, 'error', 'This request was already submitted');
end $$;

-- Applies a provider status to a ticket. Final states are never overwritten, and a refund can only happen once.
create or replace function public.system_update_ticket(p_upstream_ref text, p_status text, p_notes text, p_refund boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.tickets%rowtype; v_refunded boolean := false;
begin
  if p_status not in ('IN_PROGRESS','RESOLVED','REJECTED','CLOSED') then
    return jsonb_build_object('success', false, 'error', 'Invalid status');
  end if;
  select * into t from public.tickets where upstream_ref = p_upstream_ref for update;
  if not found then return jsonb_build_object('success', false, 'error', 'Ticket not found'); end if;
  if t.status in ('RESOLVED','REJECTED','CLOSED') then
    return jsonb_build_object('success', true, 'unchanged', true);
  end if;
  if p_refund and not t.refunded and coalesce(t.amount_paid, 0) > 0 then
    update public.profiles set wallet_balance = wallet_balance + t.amount_paid where id = t.user_id;
    insert into public.transactions (user_id, amount, type, status, description, channel, reference)
    values (t.user_id, t.amount_paid, 'REFUND', 'SUCCESS',
      'Auto-Refund: ' || t.service_title || ' (' || t.ticket_number || ') could not be completed',
      'SYSTEM_REFUND', public.gen_ref('WD-REF-'));
    v_refunded := true;
  end if;
  update public.tickets set
    status = p_status,
    resolution_notes = coalesce(nullif(trim(p_notes), ''), resolution_notes),
    processed_by = 'Provider (automatic)',
    processed_at = now(),
    refunded = refunded or v_refunded,
    updated_at = now()
  where id = t.id;
  return jsonb_build_object('success', true, 'user_id', t.user_id, 'refunded', v_refunded);
end $$;

-- 5) Lock these four functions to the server only
revoke execute on function public.charge_user(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.refund_user(uuid, numeric, text, text) from public, anon, authenticated;
revoke execute on function public.create_upstream_ticket(uuid, text, text, text, text, numeric) from public, anon, authenticated;
revoke execute on function public.system_update_ticket(text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.charge_user(uuid, text, text) to service_role;
grant execute on function public.refund_user(uuid, numeric, text, text) to service_role;
grant execute on function public.create_upstream_ticket(uuid, text, text, text, text, numeric) to service_role;
grant execute on function public.system_update_ticket(text, text, text, boolean) to service_role;
