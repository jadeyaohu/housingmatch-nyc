-- HousingMatch NYC — initial schema (Phases 1–4).
-- Run with: supabase db push   (or paste into the Supabase SQL editor)

-- ---------- Listings (public read, admin write) ----------
create table if not exists public.listings (
  id                    text primary key,
  external_id           text unique,               -- Housing Connect Lottery ID when known
  project_name          text not null,
  borough               text check (borough in ('Manhattan','Brooklyn','Queens','Bronx','Staten Island')),
  address               text,
  housing_program       text,
  unit_types            text[] not null default '{}',
  income_bands          jsonb  not null default '[]', -- array of IncomeBand (see src/lib/types.ts)
  restrictions          text[] not null default '{}',
  is_rerental           boolean not null default false,
  application_open_date date,
  application_deadline  date,
  application_url       text,
  source_url            text,
  status                text not null default 'unknown' check (status in ('open','upcoming','closed','unknown')),
  last_verified_at      date,
  eligibility_notes     text,
  verified_by           uuid references auth.users(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists listings_status_deadline_idx on public.listings (status, application_deadline);
create index if not exists listings_borough_idx on public.listings (borough);

-- ---------- Admins ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

-- ---------- Household profiles (one per user) ----------
-- No SSNs, immigration documents, tax returns or government IDs — by design.
create table if not exists public.households (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  size               int  not null check (size between 1 and 12),
  annual_income      int  not null check (annual_income >= 0),
  boroughs           text[] not null default '{}',
  bedrooms           text[] not null default '{}',
  has_voucher        boolean not null default false,
  has_member_62_plus boolean,
  has_member_55_plus boolean,
  has_disability     boolean,
  language           text not null default 'en' check (language in ('en','zh')),
  consented_at       timestamptz not null,           -- privacy notice consent
  updated_at         timestamptz not null default now()
);

-- ---------- Saved listings / application tracker ----------
create table if not exists public.saved_listings (
  user_id      uuid not null references auth.users(id) on delete cascade,
  listing_id   text not null references public.listings(id) on delete cascade,
  status       text not null default 'interested' check (status in
                 ('interested','applied','selected_for_review','documents_requested','under_review','approved','rejected','withdrawn')),
  applied_on   date,
  notes        text check (char_length(notes) <= 4000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- Free plan: at most 5 saved listings unless the user has an active subscription.
create table if not exists public.subscriptions (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id   text unique,
  stripe_subscription_id text unique,
  status               text not null,   -- mirrors Stripe: active, trialing, past_due, canceled...
  current_period_end   timestamptz,
  updated_at           timestamptz not null default now()
);
create or replace function public.is_plus(uid uuid) returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from public.subscriptions where user_id = uid and status in ('active','trialing')) $$;

create or replace function public.enforce_free_save_limit() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if not public.is_plus(new.user_id)
     and (select count(*) from public.saved_listings where user_id = new.user_id) >= 5 then
    raise exception 'FREE_PLAN_SAVE_LIMIT' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists saved_listings_limit on public.saved_listings;
create trigger saved_listings_limit before insert on public.saved_listings
  for each row execute function public.enforce_free_save_limit();

-- ---------- Notifications ----------
create table if not exists public.notification_prefs (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  new_match_alerts boolean not null default true,
  deadline_reminders boolean not null default true,
  weekly_digest    boolean not null default false,
  unsubscribed_all boolean not null default false,
  unsubscribe_token uuid not null default gen_random_uuid() unique
);

create table if not exists public.notifications_sent (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  listing_id  text references public.listings(id) on delete set null,
  kind        text not null check (kind in ('new_match','deadline_reminder','weekly_digest')),
  period_key  text not null,          -- e.g. listing id or ISO week; dedupes sends
  provider_id text,
  status      text not null default 'queued',
  sent_at     timestamptz not null default now(),
  unique (user_id, kind, period_key)
);

-- ---------- Admin audit log ----------
create table if not exists public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references auth.users(id),
  action     text not null,
  entity     text not null,
  entity_id  text,
  diff       jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Row Level Security ----------
alter table public.listings           enable row level security;
alter table public.admins             enable row level security;
alter table public.households         enable row level security;
alter table public.saved_listings     enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.notifications_sent enable row level security;
alter table public.audit_log          enable row level security;

create policy "listings readable by all"  on public.listings for select using (true);
create policy "listings admin write"      on public.listings for all using (public.is_admin()) with check (public.is_admin());

create policy "own household"   on public.households         for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own saved"       on public.saved_listings     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own prefs"       on public.notification_prefs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "read own sub"    on public.subscriptions      for select using (auth.uid() = user_id);   -- writes only via Stripe webhook (service role)
create policy "read own notifs" on public.notifications_sent for select using (auth.uid() = user_id);
create policy "admin audit"     on public.audit_log          for select using (public.is_admin());
create policy "admin list"      on public.admins             for select using (public.is_admin());
