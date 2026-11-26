begin;
insert into auth.users values('be700000-0000-4000-8000-000000000001'),('be700000-0000-4000-8000-000000000002');
do $$
declare uid uuid:='be700000-0000-4000-8000-000000000001'; rid uuid; x jsonb; n integer; plan_name text; limits integer;
begin
  x:=public.beta_service_command('status',uid);
  assert x->>'plan'='free' and (x->>'limit')::int=1;
  x:=public.beta_service_command('milestones',uid); assert (x->>'registration')::boolean;
  x:=public.beta_service_command('milestones',uid); assert not (x->>'registration')::boolean;
  foreach plan_name in array array['free','basic','smart'] loop
    limits:=case plan_name when 'free' then 1 when 'basic' then 5 else 15 end;
    update public.beta_accounts set plan=plan_name,valid_until=now()+interval '1 day' where user_id=uid;
    delete from public.chat_daily_usage where user_id=uid;
    rid:=gen_random_uuid();
    perform public.beta_service_command('reserve',uid,jsonb_build_object('request_id',rid));
    begin perform public.beta_service_command('reserve',uid,jsonb_build_object('request_id',gen_random_uuid())); raise exception 'busy bypass'; exception when others then if sqlerrm<>'busy' then raise; end if; end;
    x:=public.beta_service_command('finish',uid,jsonb_build_object('request_id',rid,'success',false)); assert (x->>'used')::int=0;
    for n in 1..limits loop
      -- Reset only the failure-rate window for this quota boundary test.
      update public.chat_daily_usage set attempts=0 where user_id=uid;
      rid:=gen_random_uuid();
      perform public.beta_service_command('reserve',uid,jsonb_build_object('request_id',rid));
      x:=public.beta_service_command('finish',uid,jsonb_build_object('request_id',rid,'success',true));
      assert (x->>'used')::int=n;
      begin perform public.beta_service_command('finish',uid,jsonb_build_object('request_id',rid,'success',true)); raise exception 'replay charged'; exception when others then if sqlerrm<>'duplicate' then raise; end if; end;
    end loop;
    begin perform public.beta_service_command('reserve',uid,jsonb_build_object('request_id',gen_random_uuid())); raise exception 'quota bypass'; exception when others then if sqlerrm<>'quota' then raise; end if; end;
  end loop;
  update public.beta_accounts set valid_until=now()-interval '1 second' where user_id=uid;
  x:=public.beta_service_command('status',uid); assert x->>'plan'='free' and (x->>'limit')::int=1;
  delete from public.chat_daily_usage where user_id=uid;
  for n in 1..10 loop
    rid:=gen_random_uuid(); perform public.beta_service_command('reserve',uid,jsonb_build_object('request_id',rid));
    perform public.beta_service_command('finish',uid,jsonb_build_object('request_id',rid,'success',false));
  end loop;
  begin perform public.beta_service_command('reserve',uid,jsonb_build_object('request_id',gen_random_uuid())); raise exception 'error rate bypass'; exception when others then if sqlerrm<>'rate_limited' then raise; end if; end;
  update public.chat_daily_usage set attempts=0 where user_id=uid;
  rid:=gen_random_uuid();perform public.beta_service_command('reserve',uid,jsonb_build_object('request_id',rid));
  begin perform public.beta_service_command('finish','be700000-0000-4000-8000-000000000002',jsonb_build_object('request_id',rid,'success',true)); raise exception 'owner bypass'; exception when others then if sqlerrm<>'duplicate' then raise; end if; end;
  update public.chat_reservations set expires_at=now()-interval '1 second' where id=rid;
  begin perform public.beta_service_command('finish',uid,jsonb_build_object('request_id',rid,'success',true)); raise exception 'late charge'; exception when others then if sqlerrm<>'duplicate' then raise; end if; end;
  perform public.beta_service_command('reserve',uid,jsonb_build_object('request_id',gen_random_uuid()));
  begin perform public.beta_service_command('alerts',uid,'{"enabled":true}'); raise exception 'free alerts'; exception when others then if sqlerrm<>'forbidden' then raise; end if; end;
  -- No client-supplied date/time can move the reset. Verify NY DST calendar boundary lengths.
  assert extract(epoch from ('2026-03-09 00:00 America/New_York'::timestamptz-'2026-03-08 00:00 America/New_York'::timestamptz))/3600=23;
  assert extract(epoch from ('2026-11-02 00:00 America/New_York'::timestamptz-'2026-11-01 00:00 America/New_York'::timestamptz))/3600=25;
  update public.beta_accounts set customer_id='cus_synthetic',checkout_session='cs_synthetic' where user_id=uid;
  x:=public.beta_service_command('webhook_begin',uid,'{"event":"evt_synthetic"}');
  begin perform public.beta_service_command('webhook_begin',uid,'{"event":"evt_delayed"}'); raise exception 'concurrent sync'; exception when others then if sqlerrm<>'busy' then raise; end if; end;
  perform public.beta_service_command('webhook_finish',uid,jsonb_build_object('event','evt_synthetic','token',x->>'token','subscription','sub_synthetic','session','cs_synthetic','plan','basic','valid_until',now()+interval '1 month'));
  x:=public.beta_service_command('webhook_begin',uid,'{"event":"evt_synthetic"}'); assert (x->>'duplicate')::boolean;
  x:=public.beta_service_command('status',uid);assert x->>'plan'='basic';
  x:=public.beta_service_command('milestones',uid);assert (x->>'activation')::boolean;
  x:=public.beta_service_command('milestones',uid);assert not (x->>'activation')::boolean;
  -- A late renewal of the same subscription is not a new activation.
  update public.beta_accounts set valid_until=now()-interval '1 second' where user_id=uid;
  x:=public.beta_service_command('webhook_begin',uid,'{"event":"evt_renewal"}');
  perform public.beta_service_command('webhook_finish',uid,jsonb_build_object('event','evt_renewal','token',x->>'token','subscription','sub_synthetic','session','cs_synthetic','plan','basic','valid_until',now()+interval '1 month'));
  x:=public.beta_service_command('milestones',uid);assert not (x->>'activation')::boolean;
  -- A request settling across midnight charges its reserved day, not the new day's bucket.
  delete from public.chat_reservations where user_id=uid;
  delete from public.chat_daily_usage where user_id=uid;
  insert into public.chat_daily_usage(user_id,day) values(uid,(clock_timestamp() at time zone 'America/New_York')::date-1);
  rid:=gen_random_uuid();
  insert into public.chat_reservations(id,user_id,day,state,expires_at) values(rid,uid,(clock_timestamp() at time zone 'America/New_York')::date-1,'pending',now()+interval '1 minute');
  x:=public.beta_service_command('finish',uid,jsonb_build_object('request_id',rid,'success',true));assert (x->>'used')::int=0;
  assert (select used=1 from public.chat_daily_usage where user_id=uid and day=(clock_timestamp() at time zone 'America/New_York')::date-1);
  perform public.beta_service_command('reserve',uid,jsonb_build_object('request_id',gen_random_uuid()));
end $$;
set local role anon;
do $$ begin
  begin perform public.beta_service_command('status','be700000-0000-4000-8000-000000000001'); raise exception 'anon rpc'; exception when insufficient_privilege then null; end;
  begin perform * from public.chat_daily_usage; raise exception 'anon read'; exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
do $$ begin
  begin update public.beta_accounts set plan='smart'; raise exception 'client entitlement'; exception when insufficient_privilege then null; end;
  begin perform public.beta_service_command('status','be700000-0000-4000-8000-000000000002'); raise exception 'client rpc'; exception when insufficient_privilege then null; end;
end $$;
rollback;
