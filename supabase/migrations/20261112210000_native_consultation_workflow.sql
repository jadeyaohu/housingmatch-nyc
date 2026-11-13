-- Nonproduction proposal: native request + manual payment verification + private email outbox.
alter table public.consultation_bookings
  add column workflow_status text check(workflow_status in ('awaiting_payment','payment_verified','scheduling_invited')),
  add column payment_verified_by uuid references auth.users(id),
  add column payment_verified_at timestamptz,
  add column manual_payment_reference_hash text unique,
  add column verification_environment text check(verification_environment='test');
create index consultation_email_recent on public.consultation_bookings(lower(email),created_at);
create table public.consultation_submissions (
  submission_key uuid primary key, booking_id uuid not null unique references public.consultation_bookings(id),
  fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$')
);
create table public.consultation_email_outbox (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.consultation_bookings(id),
  kind text not null check(kind in ('acknowledgment','scheduling')),
  state text not null default 'pending' check(state in ('pending','leased','sent','needs_review')),
  lease_token uuid, lease_until timestamptz, next_attempt_at timestamptz not null default now(),
  attempts integer not null default 0, message jsonb, first_attempt_at timestamptz,
  provider_id text, sent_at timestamptz, created_at timestamptz not null default now(), unique(booking_id,kind)
);
alter table public.consultation_submissions enable row level security;
alter table public.consultation_submissions force row level security;
alter table public.consultation_email_outbox enable row level security;
alter table public.consultation_email_outbox force row level security;
revoke all on public.consultation_submissions,public.consultation_email_outbox from public,anon,authenticated,service_role;
create function public.guard_native_consultation() returns trigger language plpgsql set search_path='' as $$
begin
  if old.workflow_status is not null then
    if new.workflow_status is null or (new.workflow_status<>old.workflow_status and not (
      (old.workflow_status='awaiting_payment' and new.workflow_status='payment_verified') or
      (old.workflow_status='payment_verified' and new.workflow_status='scheduling_invited'))) then raise exception 'invalid_native_transition'; end if;
    if new.workflow_status='awaiting_payment' and new.payment_status<>'pending' then raise exception 'invalid_native_transition'; end if;
    if new.workflow_status in ('payment_verified','scheduling_invited') and
       (new.payment_status<>'paid' or new.payment_verified_by is null or new.payment_verified_at is null or new.manual_payment_reference_hash is null or new.verification_environment is distinct from 'test') then raise exception 'invalid_native_transition'; end if;
  end if;
  return new;
end $$;
revoke all on function public.guard_native_consultation() from public,anon,authenticated;
create trigger native_consultation_guard before update on public.consultation_bookings for each row execute function public.guard_native_consultation();

create function public.native_consultation_command(p_action text,p_id uuid default null,p_actor uuid default null,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare b public.consultation_bookings%rowtype; s public.consultation_submissions%rowtype; o public.consultation_email_outbox%rowtype;
  lim public.consultation_request_limit%rowtype; rid uuid; tok uuid; now_at timestamptz:=clock_timestamp();
begin
  if p_action='request' then
    select * into strict lim from public.consultation_request_limit where singleton for update;
    select * into s from public.consultation_submissions where submission_key=p_id;
    if found then
      if s.fingerprint<>p_data->>'fingerprint' then raise exception 'conflict'; end if;
      select * into strict b from public.consultation_bookings where id=s.booking_id;
      return jsonb_build_object('id',s.booking_id,'status',b.workflow_status,'paymentStatus',b.payment_status,'acknowledgment',case when exists(select 1 from public.consultation_email_outbox where booking_id=b.id and kind='acknowledgment' and state='sent') then 'sent' else 'queued' end);
    end if;
    if p_data->>'termsVersion'<>'consultation-2026-11-12-native-draft-2' or p_data->>'privacyVersion'<>'privacy-2026-11-12-native-draft-2' or
       p_data->>'termsAccepted' is distinct from 'true' or p_data->>'privacyAccepted' is distinct from 'true' then raise exception 'forbidden'; end if;
    if (p_data->>'preferredUTC')::timestamptz<=now_at or (p_data->>'preferredUTC')::timestamptz>now_at+interval '365 days' then raise exception 'conflict'; end if;
    if lim.window_start<=now_at-interval '1 minute' then update public.consultation_request_limit set window_start=now_at,requests=0 where singleton; lim.requests:=0; end if;
    if lim.requests>=20 or (select count(*) from public.consultation_bookings where lower(email)=lower(p_data->>'email') and created_at>now_at-interval '1 day')>=10 then raise exception 'rate_limited'; end if;
    rid:=gen_random_uuid();
    insert into public.consultation_bookings(id,package_type,price_cents,duration_minutes,customer_name,email,consultation_language,
      preferred_local,preferred_timezone,preferred_at,topic,terms_version,privacy_version,request_fingerprint,payment_status,workflow_status)
    values(rid,p_data->>'package',case p_data->>'package' when 'standard' then 5900 when 'expert' then 9900 end,
      case p_data->>'package' when 'standard' then 30 when 'expert' then 60 end,p_data->>'name',lower(p_data->>'email'),p_data->>'language',
      (p_data->>'preferredLocal')::timestamp,p_data->>'timezone',(p_data->>'preferredUTC')::timestamptz,p_data->>'topic',p_data->>'termsVersion',p_data->>'privacyVersion',p_data->>'fingerprint','pending','awaiting_payment');
    insert into public.consultation_submissions values(p_id,rid,p_data->>'fingerprint');
    insert into public.consultation_email_outbox(booking_id,kind) values(rid,'acknowledgment');
    update public.consultation_request_limit set requests=requests+1 where singleton;
    return jsonb_build_object('id',rid,'status','awaiting_payment','paymentStatus','pending','acknowledgment','queued');
  elsif p_action in ('verify_payment','authorize_dispatch') then
    if p_actor is null or not exists(select 1 from public.admins where user_id=p_actor) then raise exception 'forbidden'; end if;
    if p_action='authorize_dispatch' then return '{}'::jsonb; end if;
    select * into b from public.consultation_bookings where id=p_id for update;
    if not found or b.workflow_status is null then raise exception 'not_found'; end if;
    if (p_data->>'amountCents')::int is distinct from b.price_cents or p_data->>'currency' is distinct from 'usd' or
       p_data->>'verified' is distinct from 'true' or p_data->>'environment' is distinct from 'test' or
       coalesce(p_data->>'referenceHash','') !~ '^[a-f0-9]{64}$' then raise exception 'conflict'; end if;
    if b.workflow_status in ('payment_verified','scheduling_invited') then
      if b.manual_payment_reference_hash<>p_data->>'referenceHash' then raise exception 'conflict'; end if;
      return jsonb_build_object('id',b.id,'status',b.workflow_status);
    end if;
    if b.booking_status<>'requested' or b.payment_status<>'pending' then raise exception 'conflict'; end if;
    if exists(select 1 from public.consultation_bookings where manual_payment_reference_hash=p_data->>'referenceHash') then raise exception 'conflict'; end if;
    update public.consultation_bookings set workflow_status='payment_verified',payment_status='paid',payment_verified_by=p_actor,
      payment_verified_at=now_at,manual_payment_reference_hash=p_data->>'referenceHash',verification_environment='test' where id=b.id;
    insert into public.consultation_email_outbox(booking_id,kind) values(b.id,'scheduling') on conflict do nothing;
    return jsonb_build_object('id',b.id,'status','payment_verified');
  elsif p_action='claim_email' then
    -- Never automatically retry past the provider's 24-hour idempotency window.
    update public.consultation_email_outbox set state='needs_review' where state in ('pending','leased') and first_attempt_at<now_at-interval '23 hours' and (lease_until is null or lease_until<=now_at) and (p_id is null or booking_id=p_id);
    select e.* into o from public.consultation_email_outbox e join public.consultation_bookings q on q.id=e.booking_id
      where (p_id is null or e.booking_id=p_id) and e.next_attempt_at<=now_at and
      (e.state='pending' or (e.state='leased' and e.lease_until<=now_at)) and q.booking_status='requested' and
      (e.kind='acknowledgment' or (q.workflow_status='payment_verified' and q.payment_status='paid' and q.payment_verified_by is not null and
        exists(select 1 from public.consultation_email_outbox ack where ack.booking_id=q.id and ack.kind='acknowledgment' and ack.state='sent')))
      order by e.created_at,e.id for update of e skip locked limit 1;
    if not found then return null; end if;
    tok:=gen_random_uuid();
    update public.consultation_email_outbox set state='leased',lease_token=tok,lease_until=now_at+interval '90 seconds',attempts=attempts+1 where id=o.id;
    select * into strict b from public.consultation_bookings where id=o.booking_id;
    return jsonb_build_object('id',o.id,'token',tok,'kind',o.kind,'bookingId',b.id,'email',b.email,'package',b.package_type,'language',b.consultation_language,'priceCents',b.price_cents,'message',o.message);
  elsif p_action in ('prepare_email','complete_email','release_email') then
    select * into o from public.consultation_email_outbox where id=p_id for update;
    if not found or o.state<>'leased' or o.lease_token is distinct from (p_data->>'token')::uuid or o.lease_until<=now_at then raise exception 'busy'; end if;
    if p_action='release_email' then
      update public.consultation_email_outbox set state='pending',lease_token=null,lease_until=null,next_attempt_at=now_at+interval '1 minute' where id=o.id;
    elsif p_action='prepare_email' then
      if o.message is null then
        select * into strict b from public.consultation_bookings where id=o.booking_id;
        if p_data->'message'->>'to' is distinct from b.email or coalesce(p_data->'message'->>'text','')='' or coalesce(p_data->'message'->>'subject','')=''  or length(p_data->'message'->>'text')>20000 or length(p_data->'message'->>'subject')>200 then raise exception 'forbidden'; end if;
        update public.consultation_email_outbox set message=p_data->'message',first_attempt_at=now_at where id=o.id;
      end if;
      return (select message from public.consultation_email_outbox where id=o.id);
    else
      if coalesce(p_data->>'providerId','')='' or o.message is null then raise exception 'conflict'; end if;
      if o.kind='scheduling' then
        select * into b from public.consultation_bookings where id=o.booking_id for update;
        if b.workflow_status<>'payment_verified' or b.payment_status<>'paid' then raise exception 'conflict'; end if;
        update public.consultation_bookings set workflow_status='scheduling_invited' where id=b.id;
      end if;
      update public.consultation_email_outbox set state='sent',sent_at=now_at,provider_id=p_data->>'providerId',lease_token=null,lease_until=null where id=o.id;
    end if;
    return '{}'::jsonb;
  end if;
  raise exception 'forbidden';
end $$;
revoke all on function public.native_consultation_command(text,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.native_consultation_command(text,uuid,uuid,jsonb) to service_role;
