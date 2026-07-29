-- Anytap — run in Supabase Dashboard → SQL Editor
-- Enables real auth + profiles + KYC (member portal + admin approve)

-- ─── Profiles (1:1 with auth.users) ───────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'member' check (role in ('member', 'admin')),
  kyc_status text not null default 'not_started'
    check (kyc_status in ('not_started', 'pending', 'under_review', 'approved', 'rejected')),
  card_status text not null default 'not_issued'
    check (card_status in (
      'not_issued', 'application_review', 'deposit_received', 'creating',
      'shipping', 'issued', 'active', 'frozen', 'terminated'
    )),
  referral_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_role_idx on public.profiles (role);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── KYC applications ─────────────────────────────────────────────────────────
create table if not exists public.kyc_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'approved', 'rejected')),
  full_name text,
  country text,
  id_document_url text,
  selfie_url text,
  reject_reason text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kyc_applications_user_id_idx on public.kyc_applications (user_id);
create index if not exists kyc_applications_status_idx on public.kyc_applications (status);

-- ─── Admin audit log ──────────────────────────────────────────────────────────
create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles (id) on delete set null,
  admin_name text,
  action text not null,
  target text,
  created_at timestamptz not null default now()
);

-- ─── updated_at helper ────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists kyc_applications_updated_at on public.kyc_applications;
create trigger kyc_applications_updated_at
  before update on public.kyc_applications
  for each row execute function public.set_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.kyc_applications enable row level security;
alter table public.admin_logs enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin());

-- kyc
drop policy if exists "kyc_select_own" on public.kyc_applications;
create policy "kyc_select_own" on public.kyc_applications
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "kyc_insert_own" on public.kyc_applications;
create policy "kyc_insert_own" on public.kyc_applications
  for insert with check (auth.uid() = user_id);

drop policy if exists "kyc_admin_all" on public.kyc_applications;
create policy "kyc_admin_all" on public.kyc_applications
  for all using (public.is_admin())
  with check (public.is_admin());

-- admin logs (admins only)
drop policy if exists "admin_logs_admin" on public.admin_logs;
create policy "admin_logs_admin" on public.admin_logs
  for all using (public.is_admin())
  with check (public.is_admin());

-- ─── Make yourself admin (after first signup) ───────────────────────────────
-- update public.profiles set role = 'admin' where email = 'your@email.com';
