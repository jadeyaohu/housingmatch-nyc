-- Disposable LOCAL database only, after 0001 + Phase 1 + Phase 2 migrations. Rolls back synthetic data.
\set ON_ERROR_STOP on
begin;
do $$
declare
  operator_id uuid := gen_random_uuid(); bid uuid := gen_random_uuid(); aid uuid; rid uuid;
  a jsonb; again jsonb; r jsonb; n integer; denied boolean := false;
begin
  insert into auth.users(id) values(operator_id);
  insert into public.admins(user_id) values(operator_id);
  insert into public.consultation_bookings(id,package_type,price_cents,duration_minutes,customer_name,email,consultation_language,preferred_local,preferred_timezone,preferred_at,terms_version,privacy_version,request_fingerprint)
  values(bid,'standard',5900,30,'Synthetic Person','synthetic@example.test','en',now()+interval '10 days','UTC',now()+interval '10 days','consultation-2026-11-11-draft-1','privacy-2026-11-11-draft-1',repeat('a',64));
  if has_table_privilege('anon','public.consultation_payment_attempts','select') or has_table_privilege('authenticated','public.consultation_refund_requests','select') or has_function_privilege('anon','public.consultation_payment_command(text,uuid,text,uuid,jsonb)','execute') then raise exception 'public payment access'; end if;
  begin perform public.consultation_payment_command('invite',bid,repeat('1',64),gen_random_uuid());
  exception when others then if sqlerrm='forbidden' then denied:=true; else raise; end if; end;
  if not denied then raise exception 'non-admin invitation permitted'; end if;
  a:=public.consultation_payment_command('invite',bid,repeat('1',64),operator_id); aid:=(a->>'id')::uuid;
  denied:=false;
  begin perform public.consultation_payment_command('invite',bid,repeat('2',64),operator_id);
  exception when others then if sqlerrm='conflict' then denied:=true; else raise; end if; end;
  if not denied then raise exception 'duplicate invitation permitted'; end if;
  a:=public.consultation_payment_command('reserve',null,repeat('1',64));
  again:=public.consultation_payment_command('reserve',null,repeat('1',64));
  if a<>again or a->>'state'<>'creating' then raise exception 'unstable reservation'; end if;
  perform public.consultation_payment_command('attach',aid,null,null,'{"session_id":"cs_test_fixture"}');
  perform public.consultation_payment_command('event',aid,null,null,'{"event_id":"evt_paid","kind":"payment","next":"paid","session_id":"cs_test_fixture","intent_id":"pi_fixture","amount":5900,"currency":"usd"}');
  perform public.consultation_payment_command('event',aid,null,null,'{"event_id":"evt_paid","kind":"payment","next":"paid","session_id":"cs_test_fixture","intent_id":"pi_fixture","amount":5900,"currency":"usd"}');
  perform public.consultation_payment_command('event',aid,null,null,'{"event_id":"evt_old_expired","kind":"payment","next":"expired","session_id":"cs_test_fixture","amount":5900,"currency":"usd"}');
  if not exists(select 1 from public.consultation_bookings where id=bid and booking_status='requested' and payment_status='paid') then raise exception 'payment regressed or auto-confirmed'; end if;
  select count(*) into n from public.consultation_payment_events where attempt_id=aid;
  if n<>2 then raise exception 'event not deduplicated'; end if;
  denied:=false;
  begin perform public.consultation_payment_command('refund_reserve',bid,null,gen_random_uuid());
  exception when others then if sqlerrm='forbidden' then denied:=true; else raise; end if; end;
  if not denied then raise exception 'unauthorized refund'; end if;
  r:=public.consultation_payment_command('refund_reserve',bid,null,operator_id); rid:=(r->>'id')::uuid;
  again:=public.consultation_payment_command('refund_reserve',bid,null,operator_id);
  if r<>again then raise exception 'duplicate refund reservation'; end if;
  perform public.consultation_payment_command('refund_attach',rid,null,null,'{"stripe_id":"re_failed"}');
  if (select payment_status from public.consultation_bookings where id=bid)<>'paid' then raise exception 'refund marked before webhook'; end if;
  perform public.consultation_payment_command('event',aid,null,null,jsonb_build_object('event_id','evt_refund_failed','kind','refund','next','failed','refund_request_id',rid,'stripe_id','re_failed','amount',5900,'currency','usd'));
  if (select payment_status from public.consultation_bookings where id=bid)<>'paid' then raise exception 'failed refund changed payment'; end if;
  perform public.consultation_payment_command('event',aid,null,null,jsonb_build_object('event_id','evt_refund_old_pending','kind','refund','next','pending','refund_request_id',rid,'stripe_id','re_failed','amount',5900,'currency','usd'));
  if (select status from public.consultation_refund_requests where id=rid)<>'failed' then raise exception 'failed refund regressed'; end if;
  r:=public.consultation_payment_command('refund_reserve',bid,null,operator_id); rid:=(r->>'id')::uuid;
  perform public.consultation_payment_command('event',aid,null,null,jsonb_build_object('event_id','evt_refund_ok','kind','refund','next','succeeded','refund_request_id',rid,'stripe_id','re_fixture','amount',5900,'currency','usd'));
  perform public.consultation_payment_command('event',aid,null,null,jsonb_build_object('event_id','evt_refund_stale','kind','refund','next','pending','refund_request_id',rid,'stripe_id','re_fixture','amount',5900,'currency','usd'));
  perform public.consultation_payment_command('event',aid,null,null,'{"event_id":"evt_old_paid","kind":"payment","next":"paid","session_id":"cs_test_fixture","intent_id":"pi_fixture","amount":5900,"currency":"usd"}');
  if not exists(select 1 from public.consultation_bookings where id=bid and booking_status='requested' and payment_status='refunded') then raise exception 'refund regressed or appointment changed'; end if;
  -- Expired capabilities cannot reserve a session.
  update public.consultation_payment_attempts set expires_at=now()-interval '1 second' where id=aid;
  denied:=false;
  begin perform public.consultation_payment_command('authorize',null,repeat('1',64));
  exception when others then if sqlerrm='expired' then denied:=true; else raise; end if; end;
  if not denied then raise exception 'expired invitation accepted'; end if;
end;
$$;
rollback;
