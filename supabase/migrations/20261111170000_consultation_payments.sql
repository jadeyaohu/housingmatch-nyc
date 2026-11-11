-- Development proposal only. Preserves Phase 1 bookings; never run against Production in this PR.
begin;
create table public.consultation_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.consultation_bookings(id),
  package_type text not null check (package_type in ('standard','expert')),
  amount integer not null check (amount in (5900,9900)),
  currency text not null default 'usd' check (currency='usd'),
  invitation_hash text not null unique check (invitation_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null default now()+interval '24 hours',
  availability_agreed_at timestamptz not null default now(),
  operator_id uuid not null references auth.users(id),
  state text not null default 'issued' check (state in ('issued','creating','pending','paid','expired','failed','refunded')),
  session_id text unique check (session_id is null or session_id like 'cs_test_%'),
  intent_id text unique,
  checkout_started_at timestamptz,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);
create unique index consultation_one_open_attempt on public.consultation_payment_attempts(booking_id) where state in ('issued','creating','pending');
create table public.consultation_refund_requests (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.consultation_payment_attempts(id),
  booking_id uuid not null references public.consultation_bookings(id),
  operator_id uuid not null references auth.users(id),
  amount integer not null,
  intent_id text not null,
  status text not null default 'preparing' check (status in ('preparing','pending','succeeded','failed')),
  stripe_id text unique,
  created_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz
);
create unique index consultation_one_open_refund on public.consultation_refund_requests(booking_id) where status in ('preparing','pending','succeeded');
create table public.consultation_payment_events (
  event_id text primary key check (event_id like 'evt_%'),
  attempt_id uuid not null references public.consultation_payment_attempts(id),
  kind text not null check (kind in ('payment','refund')),
  processed_at timestamptz not null default now()
);
alter table public.consultation_payment_attempts enable row level security;
alter table public.consultation_payment_attempts force row level security;
alter table public.consultation_refund_requests enable row level security;
alter table public.consultation_refund_requests force row level security;
alter table public.consultation_payment_events enable row level security;
alter table public.consultation_payment_events force row level security;
revoke all on public.consultation_payment_attempts, public.consultation_refund_requests, public.consultation_payment_events from public, anon, authenticated, service_role;

-- Single service-only boundary. All mutations lock booking first, then attempt/refund.
-- p_actor is populated ONLY after server auth.getUser verification, then checked against admins.
create function public.consultation_payment_command(p_action text,p_id uuid default null,p_hash text default null,p_actor uuid default null,p_data jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  b public.consultation_bookings%rowtype;
  a public.consultation_payment_attempts%rowtype;
  r public.consultation_refund_requests%rowtype;
  bid uuid;
  next_state text;
  inserted integer;
begin
  if p_action in ('invite','refund_reserve','confirm') then
    if p_actor is null or not exists(select 1 from public.admins where user_id=p_actor) then raise exception 'forbidden'; end if;
    select * into b from public.consultation_bookings where id=p_id for update;
    if not found then raise exception 'not_found'; end if;
    if p_action='confirm' then
      if b.booking_status<>'requested' or b.payment_status<>'paid' then raise exception 'conflict'; end if;
      update public.consultation_bookings set booking_status='confirmed' where id=b.id;
      return jsonb_build_object('bookingStatus','confirmed');
    elsif p_action='invite' then
      if b.booking_status not in ('requested','confirmed') or b.payment_status in ('paid','refunded') then raise exception 'conflict'; end if;
      -- Only an unused, never-reserved invitation may expire locally. Ambiguous Stripe calls stay blocked.
      update public.consultation_payment_attempts set state='expired' where booking_id=b.id and state='issued' and expires_at<=now();
      if exists(select 1 from public.consultation_payment_attempts where booking_id=b.id and state in ('issued','creating','pending','paid')) then raise exception 'conflict'; end if;
      insert into public.consultation_payment_attempts(booking_id,package_type,amount,currency,invitation_hash,operator_id)
      values(b.id,b.package_type,b.price_cents,b.currency,p_hash,p_actor) returning * into a;
    else
      if b.payment_status<>'paid' then raise exception 'conflict'; end if;
      select * into r from public.consultation_refund_requests where booking_id=b.id and status in ('preparing','pending','succeeded');
      if found then return to_jsonb(r); end if;
      select * into a from public.consultation_payment_attempts where booking_id=b.id and state='paid' for update;
      if not found or a.intent_id is null then raise exception 'conflict'; end if;
      insert into public.consultation_refund_requests(attempt_id,booking_id,operator_id,amount,intent_id)
      values(a.id,b.id,p_actor,a.amount,a.intent_id) returning * into r;
      return to_jsonb(r);
    end if;
  else
    if p_action in ('authorize','reserve') then
      select * into a from public.consultation_payment_attempts where invitation_hash=p_hash;
      if not found then raise exception 'forbidden'; end if;
      if a.expires_at<=now() then raise exception 'expired'; end if;
    elsif p_action='refund_attach' then
      select booking_id into bid from public.consultation_refund_requests where id=p_id;
      select * into b from public.consultation_bookings where id=bid for update;
      if not found then raise exception 'not_found'; end if;
      select * into r from public.consultation_refund_requests where id=p_id for update;
      if r.stripe_id is not null and r.stripe_id<>p_data->>'stripe_id' then raise exception 'conflict'; end if;
      update public.consultation_refund_requests set stripe_id=p_data->>'stripe_id',status=case when status='preparing' then 'pending' else status end where id=r.id;
      return jsonb_build_object('ok',true);
    elsif p_action in ('lookup','attach','event') then
      select * into a from public.consultation_payment_attempts where id=p_id;
      if not found then raise exception 'not_found'; end if;
    else raise exception 'forbidden'; end if;
    select * into b from public.consultation_bookings where id=a.booking_id for update;
    select * into a from public.consultation_payment_attempts where id=a.id for update;
    if p_action='reserve' then
      if b.booking_status not in ('requested','confirmed') or b.payment_status in ('paid','refunded') or a.state not in ('issued','creating','pending') then raise exception 'conflict'; end if;
      if a.state='issued' then
        if a.expires_at<now()+interval '31 minutes' then raise exception 'expired'; end if;
        update public.consultation_payment_attempts set state='creating',checkout_started_at=now() where id=a.id returning * into a;
        if b.payment_status='not_started' then update public.consultation_bookings set payment_status='pending' where id=b.id; end if;
      end if;
    elsif p_action='attach' then
      if a.session_id is not null and a.session_id<>p_data->>'session_id' then raise exception 'conflict'; end if;
      update public.consultation_payment_attempts set session_id=p_data->>'session_id',state=case when state='creating' then 'pending' else state end where id=a.id returning * into a;
    elsif p_action='event' then
      if (p_data->>'amount')::integer<>a.amount or p_data->>'currency'<>a.currency then raise exception 'conflict'; end if;
      insert into public.consultation_payment_events(event_id,attempt_id,kind) values(p_data->>'event_id',a.id,p_data->>'kind') on conflict do nothing;
      get diagnostics inserted=row_count;
      if inserted=0 then return jsonb_build_object('duplicate',true); end if;
      next_state=p_data->>'next';
      if p_data->>'kind'='payment' then
        if next_state not in ('pending','paid','expired','failed') or (a.session_id is not null and a.session_id<>p_data->>'session_id') then raise exception 'conflict'; end if;
        if next_state='paid' then
          if p_data->>'intent_id' is null or (a.intent_id is not null and a.intent_id<>p_data->>'intent_id') then raise exception 'conflict'; end if;
          if a.state<>'refunded' then
            update public.consultation_payment_attempts set state='paid',session_id=p_data->>'session_id',intent_id=p_data->>'intent_id',paid_at=coalesce(paid_at,now()) where id=a.id;
            if b.payment_status='not_started' then update public.consultation_bookings set payment_status='pending' where id=b.id; end if;
            if b.payment_status<>'refunded' then update public.consultation_bookings set payment_status='paid',stripe_checkout_session_id=p_data->>'session_id',stripe_payment_intent_id=p_data->>'intent_id' where id=b.id; end if;
          end if;
        elsif a.state in ('issued','creating','pending') then
          update public.consultation_payment_attempts set state=next_state,session_id=p_data->>'session_id' where id=a.id;
          if next_state in ('expired','failed') and b.payment_status='pending' then update public.consultation_bookings set payment_status='not_started' where id=b.id; end if;
        end if;
      elsif p_data->>'kind'='refund' then
        select * into r from public.consultation_refund_requests where id=(p_data->>'refund_request_id')::uuid and attempt_id=a.id for update;
        if not found or next_state not in ('pending','succeeded','failed') or (r.stripe_id is not null and r.stripe_id<>p_data->>'stripe_id') then raise exception 'conflict'; end if;
        if r.status<>'succeeded' and not (r.status='failed' and next_state='pending') then
          update public.consultation_refund_requests set status=next_state,stripe_id=p_data->>'stripe_id',completed_at=case when next_state in ('succeeded','failed') then now() else null end where id=r.id;
          if next_state='succeeded' then
            update public.consultation_payment_attempts set state='refunded',refunded_at=now() where id=a.id;
            if b.payment_status='paid' then update public.consultation_bookings set payment_status='refunded' where id=b.id; end if;
          end if;
        end if;
      else raise exception 'conflict'; end if;
      return jsonb_build_object('ok',true);
    end if;
  end if;
  return to_jsonb(a)||jsonb_build_object('booking_status',b.booking_status,'refund_status',(select status from public.consultation_refund_requests where attempt_id=a.id order by created_at desc limit 1));
end;
$$;
revoke all on function public.consultation_payment_command(text,uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.consultation_payment_command(text,uuid,text,uuid,jsonb) to service_role;
commit;
