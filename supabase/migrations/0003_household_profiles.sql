-- M2: free accounts — one household profile per signed-in user.
-- Applied to the DEV project (housing-navigator-dev) first. Production requires founder approval.
--
-- Privacy: only what matching needs. No SSN, IDs, documents, employer, or exact address.
-- RLS: a user can read/write only their own row. No anonymous access.

create table if not exists public.household_profiles (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  household_size   int  not null check (household_size between 1 and 12),
  annual_income    int  not null check (annual_income between 0 and 5000000),
  voucher          text not null default 'no' check (voucher in ('yes', 'no', 'unsure')),
  has_member_62_plus boolean not null default false,
  has_disability   boolean not null default false,
  -- lifestyle preferences (never used for eligibility)
  boroughs         text[] not null default '{}',
  bedrooms         text[] not null default '{}',
  rent_max         int check (rent_max is null or rent_max between 0 and 50000),
  language         text not null default 'en' check (language in ('en', 'zh')),
  consented_at     timestamptz not null,            -- agreed to the privacy notice when saving
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.household_profiles enable row level security;

drop policy if exists "own profile: select" on public.household_profiles;
drop policy if exists "own profile: insert" on public.household_profiles;
drop policy if exists "own profile: update" on public.household_profiles;
drop policy if exists "own profile: delete" on public.household_profiles;
create policy "own profile: select" on public.household_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "own profile: insert" on public.household_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own profile: update" on public.household_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own profile: delete" on public.household_profiles for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.touch_updated_at() returns trigger
  language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists household_profiles_touch on public.household_profiles;
create trigger household_profiles_touch before update on public.household_profiles
  for each row execute function public.touch_updated_at();

revoke all on public.household_profiles from anon;
grant select, insert, update, delete on public.household_profiles to authenticated;
