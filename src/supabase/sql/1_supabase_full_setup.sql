-- =====================================================================
-- Wealthdatas - COMPLETE Supabase setup (safe to run more than once)
-- Paste the whole file into Supabase > SQL Editor > Run.
-- It replaces the earlier SQL, so you do not need to run that one again.
-- =====================================================================

-- ---------- 1. Roles + profiles ----------
do $$ begin
  create type public.user_role as enum ('USER','SUPPORT_ADMIN','SUPER_ADMIN');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  role public.user_role not null default 'USER',
  tier text not null default 'SMART',
  wallet_balance numeric(12,2) not null default 0,
  va_bank_name text not null default 'Wema Bank (Monnify / Paystack DVA)',
  va_account_number text,
  va_account_name text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.is_staff() returns boolean
language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.profiles
    where id = auth.uid() and is_active and role in ('SUPPORT_ADMIN','SUPER_ADMIN'));
$$;

create or replace function public.is_super() returns boolean
language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.profiles
    where id = auth.uid() and is_active and role = 'SUPER_ADMIN');
$$;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "staff read all profiles" on public.profiles;
create policy "staff read all profiles" on public.profiles for select using (public.is_staff());
drop policy if exists "update own basic info" on public.profiles;
create policy "update own basic info" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- A user can only ever edit name and phone. Never role, balance or active flag.
revoke update on public.profiles from anon, authenticated;
grant update (name, phone) on public.profiles to authenticated;

-- Every new signup is ALWAYS a customer, with a 0.00 balance, using the name they typed
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_name text := coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email,'@',1));
begin
  insert into public.profiles (id, name, email, phone, role, wallet_balance, va_account_number, va_account_name)
  values (new.id, v_name, new.email, nullif(trim(new.raw_user_meta_data->>'phone'), ''), 'USER', 0,
          '90' || lpad((floor(random()*100000000))::bigint::text, 8, '0'),
          'WEALTHDATAS / ' || upper(v_name));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 2. Services (prices live here, the server uses THESE prices) ----------
create table if not exists public.services (
  id text primary key,
  title text not null,
  category text not null,
  type text not null check (type in ('instant','async')),
  price numeric(12,2) not null check (price >= 0),
  description text not null,
  badge text not null,
  turnaround text not null,
  requires_document_upload boolean not null default false,
  sort_order int not null default 0
);
alter table public.services enable row level security;
drop policy if exists "signed in users read services" on public.services;
create policy "signed in users read services" on public.services for select to authenticated using (true);

insert into public.services
  (id, title, category, type, price, description, badge, turnaround, requires_document_upload, sort_order)
values
  ('nin-premium-slip', 'NIN Premium Slip', 'NIN', 'instant', 420.0, 'Instant verifiable NIMC national identity premium slip with secure QR code.', 'NIMC Official', 'Instant (1-3s)', false, 0),
  ('nin-by-phone', 'NIN by Phone', 'NIN', 'instant', 420.0, 'Instant demographic and NIN lookup linked to mobile phone number.', 'Lookup', 'Instant', false, 1),
  ('nin-by-demographic', 'NIN by Demographic', 'NIN', 'instant', 420.0, 'Search NIN using first name, surname, and date of birth.', 'Search', 'Instant', false, 2),
  ('bvn-premium-slip', 'BVN Premium Slip', 'BVN', 'instant', 420.0, 'High-resolution official Bank Verification Number slip with biometric details.', 'NIBSS Official', 'Instant', false, 3),
  ('bvn-retrieval', 'BVN Retrieval', 'BVN', 'instant', 1430.0, 'Direct NIBSS lookup to recover lost or forgotten BVN record.', 'NIBSS Retrieval', 'Instant', false, 4),
  ('ipe-clearance', 'IPE Clearance', 'CLEARANCE', 'async', 990.0, 'NIMC biometric data collision clearance & IPE exception resolution queue.', 'Support Queue', '24 - 48 Hours', true, 5),
  ('nin-validation', 'NIN Validation', 'VALIDATION', 'instant', 1420.0, 'Live NIMC database validation and status confirmation for inactive records.', 'NIMC Portal', 'Instant API', false, 6),
  ('nin-name-mod', 'NIN Name Modification', 'MODIFICATION', 'async', 990.0, 'Legal name correction, marital change, or spelling correction on NIMC database.', 'Async Processing', '24 - 72 Hours', true, 7),
  ('nin-phone-mod', 'NIN Phone Modification', 'MODIFICATION', 'async', 620.0, 'Link new primary mobile telephone number to existing NIN profile.', 'Async Processing', '24 - 48 Hours', true, 8),
  ('nin-address-mod', 'NIN Address Modification', 'MODIFICATION', 'async', 480.0, 'Residential state, LGA, and home street address adjustment on NIMC database.', 'Async Processing', '24 - 48 Hours', true, 9),
  ('bvn-name-mod', 'BVN Name Modification', 'MODIFICATION', 'async', 470.0, 'Bank Verification Number customer name amendment and bank syncing.', 'Async Processing', '24 - 48 Hours', true, 10),
  ('bvn-phone-mod', 'BVN Phone Modification', 'MODIFICATION', 'async', 480.0, 'Update phone number registered with NIBSS BVN database.', 'Async Processing', '24 - 48 Hours', true, 11),
  ('bvn-address-mod', 'BVN Address Modification', 'MODIFICATION', 'async', 470.0, 'Residential and mailing address adjustment on central BVN ledger.', 'Async Processing', '24 - 48 Hours', true, 12),
  ('bvn-dob-mod', 'BVN DOB Modification', 'MODIFICATION', 'async', 480.0, 'Date of birth correction backed by sworn affidavit & birth certificate.', 'Async Processing', '24 - 48 Hours', true, 13)
on conflict (id) do nothing;

-- ---------- 3. Transactions + tickets ----------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  amount numeric(12,2) not null,
  type text not null check (type in ('DEBIT','CREDIT','REFUND')),
  status text not null default 'SUCCESS',
  description text not null,
  reference text not null,
  channel text,
  audit_note text,
  admin_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_idx on public.transactions(user_id, created_at desc);
-- a payment gateway reference can only ever be credited once
create unique index if not exists transactions_gateway_ref_unique
  on public.transactions(reference) where channel in ('CARD','USSD','VIRTUAL_ACCOUNT');
alter table public.transactions enable row level security;
drop policy if exists "read own transactions" on public.transactions;
create policy "read own transactions" on public.transactions for select using (auth.uid() = user_id);
drop policy if exists "staff read all transactions" on public.transactions;
create policy "staff read all transactions" on public.transactions for select using (public.is_staff());

create sequence if not exists public.ticket_seq start 1;
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  user_id uuid not null references public.profiles(id),
  user_name text not null,
  user_email text not null,
  user_phone text,
  service_id text references public.services(id),
  service_title text not null,
  type text not null check (type in ('SERVICE_REQUEST','SUPPORT_INQUIRY','FUNDING_ISSUE')),
  status text not null default 'OPEN' check (status in ('OPEN','IN_PROGRESS','RESOLVED','REJECTED','CLOSED')),
  priority text not null default 'MEDIUM' check (priority in ('LOW','MEDIUM','HIGH','URGENT')),
  subject text not null,
  description text not null,
  attached_docs jsonb not null default '[]'::jsonb,
  amount_paid numeric(12,2),
  resolution_notes text,
  processed_by text,
  processed_at timestamptz,
  result_slip_url text,
  refunded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tickets enable row level security;
drop policy if exists "read own tickets" on public.tickets;
create policy "read own tickets" on public.tickets for select using (auth.uid() = user_id);
drop policy if exists "staff read all tickets" on public.tickets;
create policy "staff read all tickets" on public.tickets for select using (public.is_staff());

-- No client can insert/update/delete these tables directly. Only the functions below can.
revoke insert, update, delete on public.transactions, public.tickets, public.services from anon, authenticated;

-- ---------- 4. Server-side money functions ----------
create or replace function public.gen_ref(prefix text) returns text
language sql volatile set search_path = '' as $$
  select prefix || (100000000 + floor(random()*900000000))::bigint::text;
$$;

-- Customer pays for an instant service (price comes from the services table, not the browser)
create or replace function public.debit_wallet_for_service(p_service_id text, p_description text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_price numeric; v_bal numeric; v_new numeric;
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
  values (v_uid, v_price, 'DEBIT', 'SUCCESS', p_description, public.gen_ref('WD-SRV-'));
  return jsonb_build_object('success', true, 'new_balance', v_new);
end $$;

-- Customer pays for a manual service (IPE clearance, modifications) and the ticket is created in the SAME step
create or replace function public.submit_service_ticket(
  p_service_id text, p_full_name text, p_id_number text, p_detail text, p_docs jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); s public.services%rowtype; p public.profiles%rowtype;
  v_new numeric; v_num text;
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
          s.title || ' ticket submission for ref #' || p_id_number, public.gen_ref('WD-SRV-'));
  v_num := 'TKT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.ticket_seq')::text, 3, '0');
  insert into public.tickets (ticket_number, user_id, user_name, user_email, user_phone, service_id, service_title,
    type, status, priority, subject, description, attached_docs, amount_paid)
  values (v_num, v_uid, coalesce(nullif(trim(p_full_name), ''), p.name), p.email, p.phone, s.id, s.title,
    'SERVICE_REQUEST', 'OPEN', 'HIGH', s.title || ' for ' || coalesce(nullif(trim(p_full_name), ''), p.name),
    coalesce(nullif(trim(p_detail), ''), 'Request for ' || s.title || '. Ref ID: ' || p_id_number),
    coalesce(p_docs, '[]'::jsonb), s.price);
  return jsonb_build_object('success', true, 'new_balance', v_new, 'ticket_number', v_num);
end $$;

-- Free support inquiry (no charge)
create or replace function public.create_support_ticket(
  p_type text, p_priority text, p_subject text, p_description text, p_service_title text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); p public.profiles%rowtype; v_num text;
begin
  if v_uid is null then return jsonb_build_object('success', false, 'error', 'Not signed in'); end if;
  if p_type not in ('SUPPORT_INQUIRY','FUNDING_ISSUE','SERVICE_REQUEST') then
    return jsonb_build_object('success', false, 'error', 'Invalid ticket type');
  end if;
  if p_priority not in ('LOW','MEDIUM','HIGH','URGENT') then
    return jsonb_build_object('success', false, 'error', 'Invalid priority');
  end if;
  select * into p from public.profiles where id = v_uid and is_active;
  if not found then return jsonb_build_object('success', false, 'error', 'Account is not active'); end if;
  v_num := 'TKT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.ticket_seq')::text, 3, '0');
  insert into public.tickets (ticket_number, user_id, user_name, user_email, user_phone, service_title,
    type, status, priority, subject, description)
  values (v_num, v_uid, p.name, p.email, p.phone, coalesce(nullif(p_service_title, ''), 'General Customer Support'),
    p_type, 'OPEN', p_priority, p_subject, p_description);
  return jsonb_build_object('success', true, 'ticket_number', v_num);
end $$;

-- Support / Super Admin processes a ticket. A rejection refunds exactly what the customer paid, once.
create or replace function public.staff_update_ticket(
  p_ticket_id uuid, p_status text, p_notes text, p_slip_url text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.tickets%rowtype; v_amt numeric; v_who text;
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
        'SYSTEM_REFUND', public.gen_ref('WD-REF-'));
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

-- Super Admin verifies a payment and credits a wallet (audit note is mandatory)
create or replace function public.admin_credit_wallet(p_user_id uuid, p_amount numeric, p_note text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_new numeric; v_admin text;
begin
  if not public.is_super() then return jsonb_build_object('success', false, 'error', 'Not permitted'); end if;
  if p_amount is null or p_amount <= 0 then return jsonb_build_object('success', false, 'error', 'Enter a valid positive amount'); end if;
  if coalesce(trim(p_note), '') = '' then return jsonb_build_object('success', false, 'error', 'Audit note is required'); end if;
  update public.profiles set wallet_balance = wallet_balance + p_amount where id = p_user_id returning wallet_balance into v_new;
  if not found then return jsonb_build_object('success', false, 'error', 'User not found'); end if;
  select name into v_admin from public.profiles where id = auth.uid();
  insert into public.transactions (user_id, amount, type, status, description, channel, reference, audit_note, admin_id)
  values (p_user_id, p_amount, 'CREDIT', 'SUCCESS', 'Manual Wallet Credit by Admin (' || v_admin || ')',
          'ADMIN_OVERRIDE', public.gen_ref('WD-FND-'), p_note, auth.uid());
  return jsonb_build_object('success', true, 'new_balance', v_new);
end $$;

create or replace function public.admin_debit_wallet(p_user_id uuid, p_amount numeric, p_note text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_bal numeric; v_new numeric;
begin
  if not public.is_super() then return jsonb_build_object('success', false, 'error', 'Not permitted'); end if;
  if p_amount is null or p_amount <= 0 then return jsonb_build_object('success', false, 'error', 'Enter a valid positive amount'); end if;
  if coalesce(trim(p_note), '') = '' then return jsonb_build_object('success', false, 'error', 'Audit note is required'); end if;
  select wallet_balance into v_bal from public.profiles where id = p_user_id for update;
  if not found then return jsonb_build_object('success', false, 'error', 'User not found'); end if;
  if v_bal < p_amount then
    return jsonb_build_object('success', false, 'error',
      'Insufficient balance. Required: ₦' || to_char(p_amount, 'FM999,999,990.00') ||
      ', Current: ₦' || to_char(v_bal, 'FM999,999,990.00') || '.');
  end if;
  v_new := v_bal - p_amount;
  update public.profiles set wallet_balance = v_new where id = p_user_id;
  insert into public.transactions (user_id, amount, type, status, description, channel, reference, audit_note, admin_id)
  values (p_user_id, p_amount, 'DEBIT', 'SUCCESS', 'Manual Wallet Debit by Admin: ' || p_note,
          'ADMIN_OVERRIDE', public.gen_ref('WD-SRV-'), p_note, auth.uid());
  return jsonb_build_object('success', true, 'new_balance', v_new);
end $$;

create or replace function public.admin_set_service_price(p_service_id text, p_price numeric)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_super() then return jsonb_build_object('success', false, 'error', 'Not permitted'); end if;
  if p_price is null or p_price < 0 then return jsonb_build_object('success', false, 'error', 'Invalid price'); end if;
  update public.services set price = p_price where id = p_service_id;
  if not found then return jsonb_build_object('success', false, 'error', 'Service not found'); end if;
  return jsonb_build_object('success', true);
end $$;

-- For the payment-gateway webhook ONLY (service role). Credits a VERIFIED payment exactly once.
create or replace function public.credit_wallet_from_gateway(
  p_user_id uuid, p_amount numeric, p_reference text, p_channel text, p_description text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_new numeric;
begin
  if p_amount is null or p_amount <= 0 then return jsonb_build_object('success', false, 'error', 'Invalid amount'); end if;
  if p_channel not in ('CARD','USSD','VIRTUAL_ACCOUNT') then return jsonb_build_object('success', false, 'error', 'Invalid channel'); end if;
  if exists (select 1 from public.transactions where reference = p_reference and channel in ('CARD','USSD','VIRTUAL_ACCOUNT')) then
    return jsonb_build_object('success', true, 'duplicate', true);
  end if;
  update public.profiles set wallet_balance = wallet_balance + p_amount where id = p_user_id returning wallet_balance into v_new;
  if not found then return jsonb_build_object('success', false, 'error', 'User not found'); end if;
  insert into public.transactions (user_id, amount, type, status, description, channel, reference)
  values (p_user_id, p_amount, 'CREDIT', 'SUCCESS', coalesce(p_description, 'Wallet funding via ' || p_channel), p_channel, p_reference);
  return jsonb_build_object('success', true, 'new_balance', v_new);
end $$;

-- ---------- 5. Who may call which function ----------
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.credit_wallet_from_gateway(uuid, numeric, text, text, text) from authenticated;
grant execute on function public.credit_wallet_from_gateway(uuid, numeric, text, text, text) to service_role;

-- ---------- 6. Make yourself the FIRST Super Admin (sign up in the app first, then run this) ----------
-- update public.profiles set role = 'SUPER_ADMIN' where email = 'YOUR_EMAIL_HERE';
