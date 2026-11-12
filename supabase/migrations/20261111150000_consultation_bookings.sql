-- PROPOSAL ONLY: apply to a disposable local/development database, never Production in this PR.
begin;
create table public.consultation_bookings (
  id uuid primary key,
  package_type text not null check (package_type in ('standard', 'expert')),
  price_cents integer not null,
  duration_minutes integer not null,
  currency text not null default 'usd' check (currency = 'usd'),
  customer_name text not null check (length(trim(customer_name)) between 1 and 100),
  email text not null check (length(email) between 3 and 254),
  consultation_language text not null check (consultation_language in ('en', 'zh')),
  preferred_local timestamp without time zone not null,
  preferred_timezone text not null check (length(preferred_timezone) between 1 and 80),
  preferred_at timestamptz not null,
  topic text not null default '' check (length(topic) <= 500),
  booking_status text not null default 'requested' check (booking_status in ('requested','confirmed','completed','cancelled')),
  payment_status text not null default 'not_started' check (payment_status in ('not_started','pending','paid','refunded')),
  terms_version text not null,
  privacy_version text not null,
  terms_accepted_at timestamptz not null default now(),
  privacy_accepted_at timestamptz not null default now(),
  request_fingerprint text not null check (request_fingerprint ~ '^[a-f0-9]{64}$'),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((package_type = 'standard' and price_cents = 5900 and duration_minutes = 30)
      or (package_type = 'expert' and price_cents = 9900 and duration_minutes = 60))
);
alter table public.consultation_bookings enable row level security;
alter table public.consultation_bookings force row level security;
-- No public/customer policies: even authenticated users cannot read or insert these records.
revoke all on public.consultation_bookings from public, anon, authenticated, service_role;

-- A single transactionally locked global counter: no IP addresses or identity tracking retained.
create table public.consultation_request_limit (
  singleton boolean primary key default true check (singleton),
  window_start timestamptz not null default now(),
  requests integer not null default 0 check (requests >= 0)
);
insert into public.consultation_request_limit (singleton) values (true);
alter table public.consultation_request_limit enable row level security;
alter table public.consultation_request_limit force row level security;
revoke all on public.consultation_request_limit from public, anon, authenticated, service_role;

create function public.guard_consultation_transition() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.booking_status <> old.booking_status and not (
    (old.booking_status = 'requested' and new.booking_status in ('confirmed','cancelled')) or
    (old.booking_status = 'confirmed' and new.booking_status in ('completed','cancelled'))
  ) then raise exception 'invalid_booking_transition'; end if;
  if new.payment_status <> old.payment_status and not (
    (old.payment_status = 'not_started' and new.payment_status = 'pending') or
    (old.payment_status = 'pending' and new.payment_status in ('paid','not_started')) or
    (old.payment_status = 'paid' and new.payment_status = 'refunded')
  ) then raise exception 'invalid_payment_transition'; end if;
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.guard_consultation_transition() from public, anon, authenticated;
create trigger consultation_transition before update on public.consultation_bookings
for each row execute function public.guard_consultation_transition();

-- Only the server service role can execute; fixed search_path and no dynamic SQL.
create function public.request_consultation(
  p_id uuid, p_package text, p_name text, p_email text, p_language text,
  p_local timestamp without time zone, p_timezone text, p_preferred_at timestamptz,
  p_topic text, p_terms text, p_privacy text, p_fingerprint text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  existing text;
  limiter public.consultation_request_limit%rowtype;
begin
  select * into strict limiter from public.consultation_request_limit where singleton for update;
  select request_fingerprint into existing from public.consultation_bookings where id = p_id;
  if found then
    if existing <> p_fingerprint then raise exception 'idempotency_conflict'; end if;
    return p_id;
  end if;
  if p_terms <> 'consultation-2026-11-11-draft-1' or p_privacy <> 'privacy-2026-11-11-draft-1' then
    raise exception 'invalid_policy_version';
  end if;
  if p_preferred_at <= now() or p_preferred_at > now() + interval '365 days' then raise exception 'invalid_time'; end if;
  if limiter.window_start <= now() - interval '1 minute' then
    update public.consultation_request_limit set window_start = now(), requests = 0 where singleton;
    limiter.requests = 0;
  end if;
  if limiter.requests >= 20 then raise exception 'rate_limited'; end if;
  insert into public.consultation_bookings (
    id, package_type, price_cents, duration_minutes, customer_name, email, consultation_language,
    preferred_local, preferred_timezone, preferred_at, topic, terms_version, privacy_version, request_fingerprint
  ) values (
    p_id, p_package, case p_package when 'standard' then 5900 when 'expert' then 9900 end,
    case p_package when 'standard' then 30 when 'expert' then 60 end, p_name, p_email, p_language,
    p_local, p_timezone, p_preferred_at, p_topic, p_terms, p_privacy, p_fingerprint
  );
  update public.consultation_request_limit set requests = requests + 1 where singleton;
  return p_id;
end;
$$;
revoke all on function public.request_consultation(uuid,text,text,text,text,timestamp,text,timestamptz,text,text,text,text) from public, anon, authenticated;
grant execute on function public.request_consultation(uuid,text,text,text,text,timestamp,text,timestamptz,text,text,text,text) to service_role;
commit;
