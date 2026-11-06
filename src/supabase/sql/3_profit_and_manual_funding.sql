-- =====================================================================
-- 3) Profit tracking + manual bank-transfer funding (no payment gateway needed)
-- Run AFTER files 1 and 2. Safe to run more than once.
-- =====================================================================

-- ---------- A) Cost prices (visible to the Super Admin ONLY, never to customers) ----------
create table if not exists public.service_costs (
  service_id text primary key references public.services(id) on delete cascade,
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0)
);
alter table public.service_costs enable row level security;
drop policy if exists "super reads costs" on public.service_costs;
create policy "super reads costs" on public.service_costs for select using (public.is_super());
revoke insert, update, delete on public.service_costs from anon, authenticated;

-- One row per sale / refund, recording what the sale cost you at that moment
create table if not exists public.transaction_costs (
  transaction_id uuid primary key references public.transactions(id) on delete cascade,
  service_id text,
  cost numeric(12,2) not null default 0,
  kind text not null check (kind in ('SALE','REFUND'))
);
alter table public.transaction_costs enable row level security;
drop policy if exists "super reads transaction costs" on public.transaction_costs;
create policy "super reads transaction costs" on public.transaction_costs for select using (public.is_super());
revoke insert, update, delete on public.transaction_costs from anon, authenticated;

create or replace function public.admin_set_service_cost(p_service_id text, p_cost numeric)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_super() then return jsonb_build_object('success', false, 'error', 'Not permitted'); end if;
  if p_cost is null or p_cost < 0 then return jsonb_build_object('success', false, 'error', 'Invalid cost'); end if;
  if not exists (select 1 from public.services where id = p_service_id) then
    return jsonb_build_object('success', false, 'error', 'Service not found');
  end if;
  insert into public.service_costs (service_id, cost_price) values (p_service_id, p_cost)
  on conflict (service_id) do update set cost_price = excluded.cost_price;
  return jsonb_build_object('success', true);
end $$;

-- Profit = selling price - cost. Refunds reverse BOTH the revenue and the cost.
create or replace function public.profit_summary() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; v_today timestamptz := date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
begin
  if not public.is_super() then return jsonb_build_object('success', false, 'error', 'Not permitted'); end if;
  with x as (
    select t.created_at, c.service_id,
           case when c.kind = 'SALE' then t.amount else -t.amount end as rev,
           case when c.kind = 'SALE' then c.cost else -c.cost end as cst,
           case when c.kind = 'SALE' then 1 else -1 end as cnt
    from public.transaction_costs c join public.transactions t on t.id = c.transaction_id
  )
  select jsonb_build_object(
    'success', true,
    'today',  (select jsonb_build_object('revenue', coalesce(sum(rev),0), 'cost', coalesce(sum(cst),0), 'sales', coalesce(sum(cnt),0)) from x where created_at >= v_today),
    'last7',  (select jsonb_build_object('revenue', coalesce(sum(rev),0), 'cost', coalesce(sum(cst),0), 'sales', coalesce(sum(cnt),0)) from x where created_at >= now() - interval '7 days'),
    'last30', (select jsonb_build_object('revenue', coalesce(sum(rev),0), 'cost', coalesce(sum(cst),0), 'sales', coalesce(sum(cnt),0)) from x where created_at >= now() - interval '30 days'),
    'allTime',(select jsonb_build_object('revenue', coalesce(sum(rev),0), 'cost', coalesce(sum(cst),0), 'sales', coalesce(sum(cnt),0)) from x),
    'byService', coalesce((select jsonb_agg(jsonb_build_object('service_id', service_id, 'sales', s, 'revenue', rv, 'cost', cs) order by rv desc)
                           from (select service_id, sum(cnt) s, sum(rev) rv, sum(cst) cs from x group by service_id) q), '[]'::jsonb)
  ) into r;
  return r;
end $$;

-- ---------- B) Redefine the money functions so every sale/refund records its cost ----------
create or replace function public.debit_wallet_for_service(p_service_id text, p_description text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_price numeric; v_bal numeric; v_new numeric; v_tx uuid;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'error', 'Not signed in'); end if;
  select price into v_price from public.services where id = p_service_id;
  if v_price is null then return jsonb_build_object('success', false, 'error', 'Unknown service'); end if;
  select wallet_balance into v_bal from public.profiles where id = v_uid and is_active for update;
  if v_bal is null then return jsonb_build_object('success', false, 'error', 'Account is not active'); end if;
  if v_bal < v_price then
    return jsonb_build_object('success', false, 'error',
      'Insufficient balance. Required: ₦' || to_char(v_price, 'FM999,999,990.00') ||
      ', Current: ₦' || to_char(v_bal, 'FM999,999,990.00') || '. Please fund your wallet.');
  end if;
  v_new := v_bal - v_price;
  update public.profiles set wallet_balance = v_new where id = v_uid;
  insert into public.transactions (user_id, amount, type, status, description, reference)
  values (v_uid, v_price, 'DEBIT', 'SUCCESS', p_description, public.gen_ref('WD-SRV-')) returning id into v_tx;
  insert into public.transaction_costs (transaction_id, service_id, cost, kind)
  values (v_tx, p_service_id, coalesce((select cost_price from public.service_costs where service_id = p_service_id), 0), 'SALE');
  return jsonb_build_object('success', true, 'new_balance', v_new);
end $$;

create or replace function public.submit_service_ticket(
  p_service_id text, p_full_name text, p_id_number text, p_detail text, p_docs jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); s public.services%rowtype; p public.profiles%rowtype;
  v_new numeric; v_num text; v_tx uuid;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'error', 'Not signed in'); end if;
  select * into s from public.services where id = p_service_id;
  if not found or s.type <> 'async' then return jsonb_build_object('success', false, 'error', 'Unknown service'); end if;
  if s.requires_document_upload and jsonb_array_length(coalesce(p_docs, '[]'::jsonb)) = 0 then
    return jsonb_build_object('success', false, 'error', 'Please upload at least one supporting document');
  end if;
  select * into p from public.profiles where id = v_uid and is_active for update;
  if not found then return jsonb_build_object('success', false, 'error', 'Account is not active'); end if;
  if p.wallet_balance < s.price then
    return jsonb_build_object('success', false, 'error',
      'Insufficient balance. Required: ₦' || to_char(s.price, 'FM999,999,990.00') ||
      ', Current: ₦' || to_char(p.wallet_balance, 'FM999,999,990.00') || '. Please fund your wallet.');
  end if;
  v_new := p.wallet_balance - s.price;
  update public.profiles set wallet_balance = v_new where id = v_uid;
  insert into public.transactions (user_id, amount, type, status, description, reference)
  values (v_uid, s.price, 'DEBIT', 'SUCCESS',
          s.title || ' ticket submission for ref #' || p_id_number, public.gen_ref('WD-SRV-')) returning id into v_tx;
  insert into public.transaction_costs (transaction_id, service_id, cost, kind)
  values (v_tx, s.id, coalesce((select cost_price from public.service_costs where service_id = s.id), 0), 'SALE');
  v_num := 'TKT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.ticket_seq')::text, 3, '0');
  insert into public.tickets (ticket_number, user_id, user_name, user_email, user_phone, service_id, service_title,
    type, status, priority, subject, description, attached_docs, amount_paid)
  values (v_num, v_uid, coalesce(nullif(trim(p_full_name), ''), p.name), p.email, p.phone, s.id, s.title,
    'SERVICE_REQUEST', 'OPEN', 'HIGH', s.title || ' for ' || coalesce(nullif(trim(p_full_name), ''), p.name),
    coalesce(nullif(trim(p_detail), ''), 'Request for ' || s.title || '. Ref ID: ' || p_id_number),
    coalesce(p_docs, '[]'::jsonb), s.price);
  return jsonb_build_object('success', true, 'new_balance', v_new, 'ticket_number', v_num);
end $$;

create or replace function public.charge_user(p_user_id uuid, p_service_id text, p_detail text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare s public.services%rowtype; v_bal numeric; v_new numeric; v_ref text; v_tx uuid;
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
  values (p_user_id, s.price, 'DEBIT', 'SUCCESS', s.title || ' ' || coalesce(p_detail, ''), v_ref) returning id into v_tx;
  insert into public.transaction_costs (transaction_id, service_id, cost, kind)
  values (v_tx, s.id, coalesce((select cost_price from public.service_costs where service_id = s.id), 0), 'SALE');
  return jsonb_build_object('success', true, 'amount', s.price, 'new_balance', v_new, 'reference', v_ref, 'title', s.title);
end $$;

-- refund_user now also needs the service id (to reverse the cost). Old 4-argument version is removed.
drop function if exists public.refund_user(uuid, numeric, text, text);
create or replace function public.refund_user(
  p_user_id uuid, p_amount numeric, p_reason text, p_original_ref text, p_service_id text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_new numeric; v_tx uuid;
begin
  if p_amount is null or p_amount <= 0 then return jsonb_build_object('success', false, 'error', 'Invalid amount'); end if;
  update public.profiles set wallet_balance = wallet_balance + p_amount where id = p_user_id returning wallet_balance into v_new;
  if not found then return jsonb_build_object('success', false, 'error', 'User not found'); end if;
  insert into public.transactions (user_id, amount, type, status, description, channel, reference)
  values (p_user_id, p_amount, 'REFUND', 'SUCCESS', 'Auto-Refund: ' || p_reason, 'SYSTEM_REFUND',
          case when p_original_ref is not null then 'WD-REF-' || p_original_ref else public.gen_ref('WD-REF-') end)
  returning id into v_tx;
  if p_service_id is not null then
    insert into public.transaction_costs (transaction_id, service_id, cost, kind)
    values (v_tx, p_service_id, coalesce((select cost_price from public.service_costs where service_id = p_service_id), 0), 'REFUND');
  end if;
  return jsonb_build_object('success', true, 'new_balance', v_new);
end $$;

create or replace function public.staff_update_ticket(
  p_ticket_id uuid, p_status text, p_notes text, p_slip_url text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.tickets%rowtype; v_amt numeric; v_who text; v_tx uuid;
begin
  if not public.is_staff() then return jsonb_build_object('success', false, 'error', 'Not permitted'); end if;
  if p_status not in ('OPEN','IN_PROGRESS','RESOLVED','REJECTED','CLOSED') then
    return jsonb_build_object('success', false, 'error', 'Invalid status');
  end if;
  select * into t from public.tickets where id = p_ticket_id for update;
  if not found then return jsonb_build_object('success', false, 'error', 'Ticket not found'); end if;
  select name || ' (' || role::text || ')' into v_who from public.profiles where id = auth.uid();

  if p_status = 'REJECTED' and not t.refunded and t.service_id is not null then
    v_amt := coalesce(t.amount_paid, (select price from public.services where id = t.service_id), 0);
    if v_amt > 0 then
      update public.profiles set wallet_balance = wallet_balance + v_amt where id = t.user_id;
      insert into public.transactions (user_id, amount, type, status, description, channel, reference)
      values (t.user_id, v_amt, 'REFUND', 'SUCCESS',
        'Auto-Refund: Rejected Ticket ' || t.ticket_number || ' (' || t.service_title || '): ' ||
        coalesce(nullif(trim(p_notes), ''), 'Service could not be completed'),
        'SYSTEM_REFUND', public.gen_ref('WD-REF-')) returning id into v_tx;
      insert into public.transaction_costs (transaction_id, service_id, cost, kind)
      values (v_tx, t.service_id, coalesce((select cost_price from public.service_costs where service_id = t.service_id), 0), 'REFUND');
    end if;
  end if;

  update public.tickets set
    status = p_status,
    resolution_notes = coalesce(nullif(trim(p_notes), ''), resolution_notes),
    result_slip_url = coalesce(p_slip_url, result_slip_url),
    processed_by = v_who,
    processed_at = now(),
    refunded = case when p_status = 'REJECTED' and (service_id is not null) then true else refunded end,
    updated_at = now()
  where id = p_ticket_id;
  return jsonb_build_object('success', true);
end $$;

create or replace function public.system_update_ticket(p_upstream_ref text, p_status text, p_notes text, p_refund boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.tickets%rowtype; v_refunded boolean := false; v_tx uuid;
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
      'SYSTEM_REFUND', public.gen_ref('WD-REF-')) returning id into v_tx;
    insert into public.transaction_costs (transaction_id, service_id, cost, kind)
    values (v_tx, t.service_id, coalesce((select cost_price from public.service_costs where service_id = t.service_id), 0), 'REFUND');
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

-- ---------- C) Manual bank-transfer funding (works without Paystack / Monnify) ----------
-- The REAL account customers pay into. Set it from the Super Admin screen.
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.settings enable row level security;
drop policy if exists "signed in read payment account" on public.settings;
create policy "signed in read payment account" on public.settings for select to authenticated
  using (key = 'payment_account');
revoke insert, update, delete on public.settings from anon, authenticated;

create table if not exists public.funding_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  user_name text not null,
  user_email text not null,
  amount numeric(12,2) not null check (amount > 0),
  sender_name text not null,
  bank text,
  note text,
  reference text not null unique,
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  amount_credited numeric(12,2),
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.funding_requests enable row level security;
drop policy if exists "read own funding requests" on public.funding_requests;
create policy "read own funding requests" on public.funding_requests for select using (auth.uid() = user_id);
drop policy if exists "staff read funding requests" on public.funding_requests;
create policy "staff read funding requests" on public.funding_requests for select using (public.is_staff());
revoke insert, update, delete on public.funding_requests from anon, authenticated;

create or replace function public.admin_set_payment_account(p_bank text, p_account_number text, p_account_name text, p_note text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_super() then return jsonb_build_object('success', false, 'error', 'Not permitted'); end if;
  if coalesce(trim(p_bank), '') = '' or coalesce(trim(p_account_name), '') = '' then
    return jsonb_build_object('success', false, 'error', 'Bank name and account name are required');
  end if;
  if p_account_number !~ '^\d{10}$' then
    return jsonb_build_object('success', false, 'error', 'Account number must be exactly 10 digits');
  end if;
  insert into public.settings (key, value, updated_at)
  values ('payment_account', jsonb_build_object('bank', trim(p_bank), 'accountNumber', p_account_number,
          'accountName', trim(p_account_name), 'note', coalesce(trim(p_note), '')), now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  return jsonb_build_object('success', true);
end $$;

-- Customer says "I have paid". Nothing is credited yet.
create or replace function public.create_funding_request(p_amount numeric, p_sender_name text, p_bank text, p_note text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); p public.profiles%rowtype; v_ref text; v_pending int;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'error', 'Not signed in'); end if;
  if p_amount is null or p_amount < 100 or p_amount > 5000000 then
    return jsonb_build_object('success', false, 'error', 'Enter an amount between ₦100 and ₦5,000,000');
  end if;
  if coalesce(trim(p_sender_name), '') = '' then
    return jsonb_build_object('success', false, 'error', 'Enter the name on the account you paid from');
  end if;
  select * into p from public.profiles where id = v_uid and is_active;
  if not found then return jsonb_build_object('success', false, 'error', 'Account is not active'); end if;
  select count(*) into v_pending from public.funding_requests where user_id = v_uid and status = 'PENDING';
  if v_pending >= 3 then
    return jsonb_build_object('success', false, 'error', 'You already have 3 payments waiting for confirmation. Please wait for them to be reviewed.');
  end if;
  loop
    v_ref := 'WD-FUND-' || lpad((floor(random() * 1000000))::bigint::text, 6, '0');
    exit when not exists (select 1 from public.funding_requests where reference = v_ref);
  end loop;
  insert into public.funding_requests (user_id, user_name, user_email, amount, sender_name, bank, note, reference)
  values (v_uid, p.name, p.email, p_amount, trim(p_sender_name), nullif(trim(p_bank), ''), nullif(trim(p_note), ''), v_ref);
  return jsonb_build_object('success', true, 'reference', v_ref);
end $$;

-- Super Admin confirmed (or refused) the payment in the bank app. Approving credits the wallet exactly once.
create or replace function public.review_funding_request(p_id uuid, p_approve boolean, p_amount_received numeric, p_note text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.funding_requests%rowtype; v_amt numeric; v_new numeric;
begin
  if not public.is_super() then return jsonb_build_object('success', false, 'error', 'Not permitted'); end if;
  select * into r from public.funding_requests where id = p_id for update;
  if not found then return jsonb_build_object('success', false, 'error', 'Request not found'); end if;
  if r.status <> 'PENDING' then return jsonb_build_object('success', false, 'error', 'This request was already reviewed'); end if;

  if p_approve then
    v_amt := coalesce(p_amount_received, r.amount);
    if v_amt <= 0 or v_amt > 5000000 then return jsonb_build_object('success', false, 'error', 'Invalid amount'); end if;
    update public.profiles set wallet_balance = wallet_balance + v_amt where id = r.user_id returning wallet_balance into v_new;
    insert into public.transactions (user_id, amount, type, status, description, channel, reference, audit_note, admin_id)
    values (r.user_id, v_amt, 'CREDIT', 'SUCCESS', 'Wallet funding via bank transfer (verified)', 'BANK_TRANSFER',
            r.reference, nullif(trim(p_note), ''), auth.uid());
    update public.funding_requests set status = 'APPROVED', amount_credited = v_amt, review_note = nullif(trim(p_note), ''),
           reviewed_by = auth.uid(), reviewed_at = now() where id = r.id;
    return jsonb_build_object('success', true, 'credited', v_amt, 'new_balance', v_new);
  else
    if coalesce(trim(p_note), '') = '' then return jsonb_build_object('success', false, 'error', 'Give a reason for rejecting'); end if;
    update public.funding_requests set status = 'REJECTED', review_note = trim(p_note),
           reviewed_by = auth.uid(), reviewed_at = now() where id = r.id;
    return jsonb_build_object('success', true);
  end if;
end $$;

-- ---------- D) Who may call what ----------
revoke execute on function public.admin_set_service_cost(text, numeric) from public, anon;
revoke execute on function public.profit_summary() from public, anon;
revoke execute on function public.admin_set_payment_account(text, text, text, text) from public, anon;
revoke execute on function public.create_funding_request(numeric, text, text, text) from public, anon;
revoke execute on function public.review_funding_request(uuid, boolean, numeric, text) from public, anon;
grant execute on function public.admin_set_service_cost(text, numeric) to authenticated;
grant execute on function public.profit_summary() to authenticated;
grant execute on function public.admin_set_payment_account(text, text, text, text) to authenticated;
grant execute on function public.create_funding_request(numeric, text, text, text) to authenticated;
grant execute on function public.review_funding_request(uuid, boolean, numeric, text) to authenticated;

-- refund_user is server-only (Edge Functions)
revoke execute on function public.refund_user(uuid, numeric, text, text, text) from public, anon, authenticated;
grant execute on function public.refund_user(uuid, numeric, text, text, text) to service_role;
