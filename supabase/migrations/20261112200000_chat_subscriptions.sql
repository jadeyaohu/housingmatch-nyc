-- Development-only Pricing v3. No chat text or card data. Service-only state machine.
create table public.beta_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  customer_id text unique, subscription_id text unique,
  activation_subscription text,
  plan text not null default 'free' check(plan in ('free','basic','smart')),
  valid_until timestamptz, cancel_at_period_end boolean not null default false,
  checkout_id uuid, checkout_until timestamptz, checkout_session text,
  checkout_terms_version text, checkout_accepted_at timestamptz,
  sync_token uuid, sync_until timestamptz,
  alert_opt_in boolean not null default false
);
create table public.chat_daily_usage (
  user_id uuid references auth.users(id) on delete cascade, day date,
  used integer not null default 0 check(used >= 0),
  window_start timestamptz not null default now(), attempts integer not null default 0,
  primary key(user_id,day)
);
create table public.chat_reservations (
  id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
  day date not null, state text not null check(state in ('pending','succeeded','failed','expired')),
  expires_at timestamptz not null, created_at timestamptz not null default now(),
  consent_version text not null default 'chat-2026-11-11'
);
create table public.subscription_events (
  id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
  done boolean not null default false, created_at timestamptz not null default now()
);
create table public.beta_milestones (
  user_id uuid primary key references auth.users(id) on delete cascade,
  registration_pending boolean not null default false,
  activation_pending boolean not null default false
);
alter table public.beta_accounts enable row level security;
alter table public.chat_daily_usage enable row level security;
alter table public.chat_reservations enable row level security;
alter table public.subscription_events enable row level security;
alter table public.beta_milestones enable row level security;
revoke all on public.beta_accounts,public.chat_daily_usage,public.chat_reservations,public.subscription_events,public.beta_milestones from public,anon,authenticated;

-- Records only new accounts after this migration, not every existing user's sign-in.
create function public.beta_registration_milestone() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin insert into public.beta_milestones(user_id,registration_pending) values(new.id,true); return new; end $$;
revoke all on function public.beta_registration_milestone() from public,anon,authenticated;
create trigger beta_registration after insert on auth.users for each row execute function public.beta_registration_milestone();

create function public.beta_service_command(p_action text,p_user uuid,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  a public.beta_accounts%rowtype; u public.chat_daily_usage%rowtype; r public.chat_reservations%rowtype;
  m public.beta_milestones%rowtype;
  d date := (clock_timestamp() at time zone 'America/New_York')::date;
  t timestamptz := clock_timestamp(); lim integer; rid uuid; tok uuid;
  next_plan text; out_result jsonb;
begin
  if p_action='customer_user' then
    return jsonb_build_object('user_id',(select user_id from public.beta_accounts where customer_id=p_data->>'customer'));
  end if;
  if p_user is null then raise exception 'forbidden'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  insert into public.beta_accounts(user_id) values(p_user) on conflict do nothing;
  select * into a from public.beta_accounts where user_id=p_user for update;
  next_plan := case when a.plan <> 'free' and a.valid_until>t then a.plan else 'free' end;
  lim := case next_plan when 'smart' then 15 when 'basic' then 5 else 1 end;
  if p_action in ('status','reserve','finish') then
    insert into public.chat_daily_usage(user_id,day) values(p_user,d) on conflict do nothing;
    select * into u from public.chat_daily_usage where user_id=p_user and day=d for update;
    if p_action='reserve' then
      rid := (p_data->>'request_id')::uuid;
      -- Lease exceeds the provider's total timeout. Old completions cannot deliver/charge after expiry.
      update public.chat_reservations set state='expired' where user_id=p_user and state='pending' and expires_at<=t;
      if exists(select 1 from public.chat_reservations where id=rid) then raise exception 'duplicate'; end if;
      if exists(select 1 from public.chat_reservations where user_id=p_user and state='pending') then raise exception 'busy'; end if;
      if u.used>=lim then raise exception 'quota'; end if;
      if u.window_start>t-interval '1 minute' and u.attempts>=10 then raise exception 'rate_limited'; end if;
      update public.chat_daily_usage set attempts=case when window_start<=t-interval '1 minute' then 1 else attempts+1 end,
        window_start=case when window_start<=t-interval '1 minute' then t else window_start end where user_id=p_user and day=d;
      insert into public.chat_reservations(id,user_id,day,state,expires_at) values(rid,p_user,d,'pending',t+interval '2 minutes');
    elsif p_action='finish' then
      select * into r from public.chat_reservations where id=(p_data->>'request_id')::uuid and user_id=p_user for update;
      if not found or r.state<>'pending' or r.expires_at<=t then raise exception 'duplicate'; end if;
      update public.chat_reservations set state=case when (p_data->>'success')::boolean then 'succeeded' else 'failed' end where id=r.id;
      if (p_data->>'success')::boolean then
        update public.chat_daily_usage set used=used+1 where user_id=p_user and day=r.day;
      end if;
      select * into u from public.chat_daily_usage where user_id=p_user and day=d;
    end if;
    return jsonb_build_object('plan',next_plan,'used',u.used,'limit',lim,'day',d,
      'resets_at',((d+1)::timestamp at time zone 'America/New_York'), 'cancel_at_period_end',a.cancel_at_period_end,
      'alert_opt_in',a.alert_opt_in);
  elsif p_action='alerts' then
    if (p_data->>'enabled')::boolean and next_plan='free' then raise exception 'forbidden'; end if;
    update public.beta_accounts set alert_opt_in=(p_data->>'enabled')::boolean where user_id=p_user;
    return jsonb_build_object('saved',true,'delivery_enabled',false);
  elsif p_action='checkout_info' then
    return jsonb_build_object('attempt',a.checkout_id,'session',a.checkout_session);
  elsif p_action='checkout_clear' then
    if a.checkout_session is distinct from p_data->>'session' or a.sync_until>t then raise exception 'busy'; end if;
    update public.beta_accounts set checkout_id=null,checkout_until=null,checkout_session=null where user_id=p_user;
    return '{}'::jsonb;
  elsif p_action='checkout_begin' then
    if next_plan<>'free' or a.sync_until>t or a.checkout_id is not null then raise exception 'busy'; end if;
    rid := gen_random_uuid();
    update public.beta_accounts set checkout_id=rid,checkout_until=t+interval '25 hours',checkout_session=null,checkout_terms_version='pricing-v3-2026-11-11',checkout_accepted_at=t where user_id=p_user;
    return jsonb_build_object('attempt',rid,'customer',a.customer_id);
  elsif p_action='checkout_attach' then
    if a.checkout_id is distinct from (p_data->>'attempt')::uuid then raise exception 'forbidden'; end if;
    if a.customer_id is not null and a.customer_id<>p_data->>'customer' then raise exception 'forbidden'; end if;
    update public.beta_accounts set customer_id=p_data->>'customer',checkout_session=p_data->>'session' where user_id=p_user;
    return '{}'::jsonb;
  elsif p_action='customer_attach' then
    if a.checkout_id is distinct from (p_data->>'attempt')::uuid or (a.customer_id is not null and a.customer_id<>p_data->>'customer') then raise exception 'forbidden'; end if;
    update public.beta_accounts set customer_id=p_data->>'customer' where user_id=p_user;
    return '{}'::jsonb;
  elsif p_action='cancel_info' then
    return jsonb_build_object('subscription',a.subscription_id,'customer',a.customer_id);
  elsif p_action='webhook_begin' then
    if exists(select 1 from public.subscription_events where id=p_data->>'event' and done) then return jsonb_build_object('duplicate',true); end if;
    if a.sync_until>t then raise exception 'busy'; end if;
    tok:=gen_random_uuid();
    update public.beta_accounts set sync_token=tok,sync_until=t+interval '90 seconds' where user_id=p_user;
    insert into public.subscription_events(id,user_id) values(p_data->>'event',p_user) on conflict do nothing;
    return jsonb_build_object('token',tok);
  elsif p_action='webhook_abort' then
    update public.beta_accounts set sync_token=null,sync_until=null where user_id=p_user and sync_token=(p_data->>'token')::uuid;
    return '{}'::jsonb;
  elsif p_action='webhook_finish' then
    if a.sync_token is distinct from (p_data->>'token')::uuid or a.sync_until<=t then raise exception 'busy'; end if;
    -- Only the known current or just-authorized Checkout subscription can alter this account.
    if not ((a.subscription_id is not null and a.subscription_id=p_data->>'subscription') or (a.checkout_session is not null and a.checkout_session=p_data->>'session')) then raise exception 'forbidden'; end if;
    next_plan:=p_data->>'plan';
    if next_plan not in ('free','basic','smart') then raise exception 'forbidden'; end if;
    update public.beta_accounts set subscription_id=p_data->>'subscription',plan=next_plan,
      valid_until=(p_data->>'valid_until')::timestamptz,cancel_at_period_end=coalesce((p_data->>'cancel_at_period_end')::boolean,false),
      activation_subscription=case when next_plan<>'free' then p_data->>'subscription' else activation_subscription end,
      sync_token=null,sync_until=null where user_id=p_user;
    update public.subscription_events set done=true where id=p_data->>'event' and user_id=p_user;
    if next_plan<>'free' and a.activation_subscription is distinct from p_data->>'subscription' then
      insert into public.beta_milestones(user_id,activation_pending) values(p_user,true)
      on conflict(user_id) do update set activation_pending=true;
    end if;
    return '{}'::jsonb;
  elsif p_action='milestones' then
    select * into m from public.beta_milestones where user_id=p_user for update;
    out_result:=jsonb_build_object('registration',coalesce(m.registration_pending,false),'activation',coalesce(m.activation_pending,false),'plan',next_plan);
    update public.beta_milestones set registration_pending=false,activation_pending=false where user_id=p_user;
    return out_result;
  end if;
  raise exception 'forbidden';
end $$;
revoke all on function public.beta_service_command(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.beta_service_command(text,uuid,jsonb) to service_role;
