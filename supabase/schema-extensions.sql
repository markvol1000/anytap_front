-- Anytap — Wallet, Cards, Transactions, Referral
-- Run AFTER schema.sql (Supabase SQL Editor → New query → Run)

alter table public.profiles
  add column if not exists referral_partner_status text not null default 'normal_member'
    check (referral_partner_status in ('normal_member', 'pending', 'approved')),
  add column if not exists referred_by uuid references public.profiles (id) on delete set null,
  add column if not exists referral_available_balance numeric(18, 2) not null default 0,
  add column if not exists referral_pending_balance numeric(18, 2) not null default 0,
  add column if not exists referral_total_earnings numeric(18, 2) not null default 0;

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  address text not null,
  network text not null default 'TRC20',
  balance_usdt numeric(18, 2) not null default 0,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  variant text not null default 'virtual' check (variant in ('virtual', 'physical')),
  label text,
  status text not null default 'pending'
    check (status in (
      'pending', 'approved', 'rejected', 'shipping', 'issued', 'active', 'frozen', 'terminated'
    )),
  last4 text,
  expiry text,
  holder text,
  is_primary boolean not null default false,
  balance_usdt numeric(18, 2) not null default 0,
  daily_spend_limit numeric(18, 2),
  daily_spend_used numeric(18, 2) default 0,
  fee_usdt numeric(18, 2),
  reference text,
  tracking_number text,
  carrier text,
  estimated_delivery date,
  submitted_at timestamptz not null default now(),
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cards_user_id_idx on public.cards (user_id);
create index if not exists cards_status_idx on public.cards (status);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  amount numeric(18, 2) not null,
  incoming boolean not null default false,
  status text not null default 'completed'
    check (status in ('completed', 'pending', 'failed')),
  tx_id text,
  reference text,
  card_id uuid references public.cards (id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_occurred_at_idx on public.transactions (occurred_at desc);

create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles (id) on delete cascade,
  referee_id uuid references public.profiles (id) on delete set null,
  amount numeric(18, 2) not null,
  description text,
  status text not null default 'completed'
    check (status in ('pending', 'completed')),
  created_at timestamptz not null default now()
);

create index if not exists referral_rewards_referrer_idx on public.referral_rewards (referrer_id);

drop trigger if exists wallets_updated_at on public.wallets;
create trigger wallets_updated_at
  before update on public.wallets
  for each row execute function public.set_updated_at();

drop trigger if exists cards_updated_at on public.cards;
create trigger cards_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

create or replace function public.generate_referral_code()
returns text language plpgsql as $$
begin
  return 'ANY-' || upper(substr(md5(random()::text), 1, 4));
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ref_code text;
  wallet_addr text;
begin
  ref_code := public.generate_referral_code();
  wallet_addr := 'T' || upper(substr(md5(new.id::text), 1, 33));

  insert into public.profiles (id, email, full_name, referral_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    ref_code
  );

  insert into public.wallets (user_id, address, network, balance_usdt)
  values (new.id, wallet_addr, 'TRC20', 0);

  return new;
end;
$$;

alter table public.wallets enable row level security;
alter table public.cards enable row level security;
alter table public.transactions enable row level security;
alter table public.referral_rewards enable row level security;

drop policy if exists "wallets_select_own" on public.wallets;
create policy "wallets_select_own" on public.wallets
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "wallets_admin_update" on public.wallets;
create policy "wallets_admin_update" on public.wallets
  for update using (public.is_admin());

drop policy if exists "cards_select_own" on public.cards;
create policy "cards_select_own" on public.cards
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "cards_insert_own" on public.cards;
create policy "cards_insert_own" on public.cards
  for insert with check (auth.uid() = user_id);

drop policy if exists "cards_admin_all" on public.cards;
create policy "cards_admin_all" on public.cards
  for all using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "transactions_admin_all" on public.transactions;
create policy "transactions_admin_all" on public.transactions
  for all using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "referral_rewards_select" on public.referral_rewards;
create policy "referral_rewards_select" on public.referral_rewards
  for select using (auth.uid() = referrer_id or public.is_admin());

drop policy if exists "referral_rewards_admin" on public.referral_rewards;
create policy "referral_rewards_admin" on public.referral_rewards
  for all using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "profiles_select_referral_network" on public.profiles;
create policy "profiles_select_referral_network" on public.profiles
  for select using (
    auth.uid() = id
    or public.is_admin()
    or referred_by = auth.uid()
  );

-- Backfill wallet for existing users (safe to re-run)
insert into public.wallets (user_id, address, network, balance_usdt)
select
  p.id,
  'T' || upper(substr(md5(p.id::text), 1, 33)),
  'TRC20',
  0
from public.profiles p
where not exists (select 1 from public.wallets w where w.user_id = p.id);

update public.profiles
set referral_code = public.generate_referral_code()
where referral_code is null or referral_code = '';
