-- HN-001 · 0002 — anonymous analytics events, email leads, consent ledger.
-- ADDITIVE ONLY: creates three new tables and one maintenance function.
-- It does not reference or modify any object from 0001_init.sql.
--
-- Access model: RLS enabled with NO policies, and all table privileges revoked
-- from anon / authenticated / public. Only the server-side service role
-- (which bypasses RLS) can read or write. The browser never queries these tables.
--
-- DO NOT APPLY until the Product Owner confirms the dedicated Supabase dev project.
-- Rollback: supabase/rollback/0002_down.sql

-- ---------- analytics_events (anonymous, no PII) ----------
create table if not exists public.analytics_events (
  id          bigint generated always as identity primary key,
  event_id    uuid not null unique,                 -- client-generated; retries are idempotent
  event_name  text not null check (event_name in (
                'page_view','matcher_started','matcher_completed',
                'listing_details_opened','application_link_clicked')),
  session_id  uuid not null,                        -- random per browser tab session; not a cookie
  occurred_at timestamptz not null default now(),   -- server time; client clocks are not trusted
  path        text check (path ~ '^/[A-Za-z0-9/_-]{0,199}$'),   -- pathname only, never a query string
  lang        text check (lang in ('en','zh')),
  source      text check (source in ('direct','xiaohongshu','instagram','wechat','linkedin','google','other')),
  props       jsonb not null default '{}'::jsonb
              check (jsonb_typeof(props) = 'object' and pg_column_size(props) <= 512)
);
create index if not exists analytics_events_name_time_idx on public.analytics_events (event_name, occurred_at);
create index if not exists analytics_events_session_idx   on public.analytics_events (session_id);
create index if not exists analytics_events_time_idx      on public.analytics_events (occurred_at);

-- ---------- leads (identifiable, consented, minimal) — written by PR2, not PR1a ----------
create table if not exists public.leads (
  id                     uuid primary key default gen_random_uuid(),
  email                  text not null unique check (char_length(email) <= 254 and email = lower(email)),
  lang                   text not null check (lang in ('en','zh')),
  interests              text[] not null default '{}'
                         check (interests <@ array['lottery_alerts','application_guidance']::text[]),
  status                 text not null default 'pending' check (status in ('pending','active','unsubscribed')),
  source                 text check (source in ('direct','xiaohongshu','instagram','wechat','linkedin','google','other')),
  unsubscribe_token_hash text unique,               -- sha256 of the raw token; raw token is never stored
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  confirmed_at           timestamptz,
  unsubscribed_at        timestamptz,
  check (status <> 'unsubscribed' or unsubscribed_at is not null)
);
create index if not exists leads_status_idx on public.leads (status);

-- ---------- consents (append-only evidence, lives and dies with its lead) ----------
create table if not exists public.consents (
  id             bigint generated always as identity primary key,
  lead_id        uuid not null references public.leads(id) on delete cascade,
  purpose        text not null check (purpose in ('lottery_alerts','application_guidance')),
  action         text not null check (action in ('granted','confirmed','revoked')),
  policy_version text not null check (char_length(policy_version) <= 40),
  form_version   text not null check (char_length(form_version) <= 40),
  method         text not null check (method in ('web_form','confirm_link','unsubscribe_page','manual')),
  created_at     timestamptz not null default now()
);
create index if not exists consents_lead_idx on public.consents (lead_id);

-- ---------- Access: deny everything to client roles ----------
alter table public.analytics_events enable row level security;
alter table public.leads            enable row level security;
alter table public.consents         enable row level security;
alter table public.analytics_events force row level security;
alter table public.leads            force row level security;
alter table public.consents         force row level security;
-- Intentionally NO policies. Defense in depth: also revoke table privileges that
-- Supabase grants to anon/authenticated by default.
do $$
declare r text;
begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on public.analytics_events, public.leads, public.consents from %I', r);
      execute format('revoke all on sequence public.analytics_events_id_seq, public.consents_id_seq from %I', r);
    end if;
  end loop;
end $$;
revoke all on public.analytics_events, public.leads, public.consents from public;

-- ---------- Retention (provisional engineering defaults approved in HN-001) ----------
-- raw events: 90 days · pending leads: 30 days after creation ·
-- unsubscribed leads: 30 days after unsubscribe (consents cascade).
create or replace function public.purge_expired_privacy_data(now_ts timestamptz default now())
returns table (events_deleted bigint, pending_leads_deleted bigint, unsubscribed_leads_deleted bigint)
language plpgsql security definer set search_path = public as $$
declare e bigint; p bigint; u bigint;
begin
  delete from public.analytics_events where occurred_at < now_ts - interval '90 days';
  get diagnostics e = row_count;
  delete from public.leads where status = 'pending' and created_at < now_ts - interval '30 days';
  get diagnostics p = row_count;
  delete from public.leads where status = 'unsubscribed' and unsubscribed_at < now_ts - interval '30 days';
  get diagnostics u = row_count;
  return query select e, p, u;
end $$;
revoke all on function public.purge_expired_privacy_data(timestamptz) from public;
do $$
declare r text;
begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on function public.purge_expired_privacy_data(timestamptz) from %I', r);
    end if;
  end loop;
end $$;

-- Scheduling (run manually in the dev project AFTER confirming pg_cron is enabled;
-- production release is blocked until this schedule is verified):
--   select cron.schedule('hn001-purge', '23 7 * * *', $$select public.purge_expired_privacy_data()$$);
