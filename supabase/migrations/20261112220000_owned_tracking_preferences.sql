-- Development only. Manual records, never official application data or automated submissions.
create table public.application_tracker(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(title) between 1 and 100),
 stage text not null default 'unknown' check(stage in ('unknown','awaiting','submitted','lottery_closed','log_number_received','under_review','selected','not_selected')),
 date date not null,source_url text check(source_url is null or (length(source_url)<=1000 and source_url ~ '^https://[^/@]+(/|$)')),
 manually_entered boolean not null default true check(manually_entered=true),created_at timestamptz not null default now()
);
create table public.notification_preferences(
 user_id uuid primary key references auth.users(id) on delete cascade,enabled boolean not null default false,
 consent_version text not null default 'alerts-2026-11-12-draft',consent_updated_at timestamptz not null default now(),
 frequency text not null default 'weekly' check(frequency in ('daily','weekly')),boroughs text[] not null default '{}',
 check(cardinality(boroughs)<=5 and boroughs<@array['Manhattan','Brooklyn','Queens','Bronx','Staten Island']::text[])
);
alter table public.application_tracker enable row level security;alter table public.application_tracker force row level security;
alter table public.notification_preferences enable row level security;alter table public.notification_preferences force row level security;
revoke all on public.application_tracker,public.notification_preferences from public,anon,authenticated;
grant select,insert,update,delete on public.application_tracker to authenticated;
grant select,delete on public.notification_preferences to authenticated;
grant insert(user_id,enabled,frequency,boroughs),update(user_id,enabled,frequency,boroughs) on public.notification_preferences to authenticated;
create function public.touch_notification_consent() returns trigger language plpgsql set search_path='' as $$begin new.consent_updated_at=clock_timestamp();return new;end $$;
revoke all on function public.touch_notification_consent() from public,anon,authenticated;
create trigger notification_consent_updated before update on public.notification_preferences for each row execute function public.touch_notification_consent();
create policy own_tracking on public.application_tracker for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy own_notifications on public.notification_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
