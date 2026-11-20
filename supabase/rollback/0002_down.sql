-- Rollback for 0002_analytics_leads.sql. Drops ONLY objects created by 0002.
-- WARNING: this permanently deletes any collected events, leads and consents.
-- Running it is a separate, explicit Product Owner decision (reverting code does not delete data).
-- If pg_cron was scheduled: select cron.unschedule('hn001-purge');
drop function if exists public.purge_expired_privacy_data(timestamptz);
drop table if exists public.consents;
drop table if exists public.leads;
drop table if exists public.analytics_events;
