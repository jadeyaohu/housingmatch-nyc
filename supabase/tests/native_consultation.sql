begin;
insert into auth.users values('ca700000-0000-4000-8000-000000000001'),('ca700000-0000-4000-8000-000000000002');
insert into public.admins values('ca700000-0000-4000-8000-000000000001');
do $$
declare key uuid:=gen_random_uuid(); bid uuid; claim jsonb; scheduling jsonb; x jsonb;
  data jsonb:=jsonb_build_object('package','standard','name','Synthetic Person','email','synthetic@example.test','language','zh',
    'preferredLocal',(now()+interval '10 days')::timestamp,'timezone','UTC','preferredUTC',now()+interval '10 days','topic','',
    'termsVersion','consultation-2026-11-12-native-draft-2','privacyVersion','privacy-2026-11-12-native-draft-2','termsAccepted',true,'privacyAccepted',true,'fingerprint',repeat('a',64));
  admin_id uuid:='ca700000-0000-4000-8000-000000000001';
begin
  x:=public.native_consultation_command('request',key,null,data);bid:=(x->>'id')::uuid;
  assert bid<>key;assert (select workflow_status='awaiting_payment' and payment_status='pending' and booking_status='requested' and price_cents=5900 from public.consultation_bookings where id=bid);
  x:=public.native_consultation_command('request',key,null,data);assert (x->>'id')::uuid=bid;
  assert (select count(*)=1 from public.consultation_email_outbox where booking_id=bid);
  begin perform public.native_consultation_command('request',key,null,data||jsonb_build_object('fingerprint',repeat('b',64)));raise exception 'duplicate conflict bypass';exception when others then if sqlerrm<>'conflict' then raise;end if;end;
  begin perform public.native_consultation_command('verify_payment',bid,'ca700000-0000-4000-8000-000000000002','{}');raise exception 'unauthorized verification';exception when others then if sqlerrm<>'forbidden' then raise;end if;end;
  begin perform public.native_consultation_command('verify_payment',bid,admin_id,jsonb_build_object('amountCents',9900,'currency','usd','verified',true,'environment','test','referenceHash',repeat('c',64)));raise exception 'wrong amount';exception when others then if sqlerrm<>'conflict' then raise;end if;end;
  claim:=public.native_consultation_command('claim_email',bid);assert claim->>'kind'='acknowledgment';
  assert public.native_consultation_command('claim_email',bid) is null;
  begin perform public.native_consultation_command('complete_email',(claim->>'id')::uuid,null,jsonb_build_object('token',gen_random_uuid(),'providerId','mail_synthetic'));raise exception 'wrong lease';exception when others then if sqlerrm<>'busy' then raise;end if;end;
  perform public.native_consultation_command('verify_payment',bid,admin_id,jsonb_build_object('amountCents',5900,'currency','usd','verified',true,'environment','test','referenceHash',repeat('c',64)));
  assert public.native_consultation_command('claim_email',bid) is null; -- Acknowledgment must be delivered first.
  perform public.native_consultation_command('verify_payment',bid,admin_id,jsonb_build_object('amountCents',5900,'currency','usd','verified',true,'environment','test','referenceHash',repeat('c',64)));
  assert (select count(*)=2 from public.consultation_email_outbox where booking_id=bid);
  x:=public.native_consultation_command('prepare_email',(claim->>'id')::uuid,null,jsonb_build_object('token',claim->>'token','message',jsonb_build_object('to','synthetic@example.test','subject','Synthetic acknowledgment','text','Awaiting Payment; no scheduling link')));
  assert x->>'text'='Awaiting Payment; no scheduling link';
  x:=public.native_consultation_command('prepare_email',(claim->>'id')::uuid,null,jsonb_build_object('token',claim->>'token','message',jsonb_build_object('to','synthetic@example.test','subject','Changed','text','Changed')));
  assert x->>'subject'='Synthetic acknowledgment'; -- Freeze payload for provider idempotency retries.
  perform public.native_consultation_command('complete_email',(claim->>'id')::uuid,null,jsonb_build_object('token',claim->>'token','providerId','mail_synthetic_ack'));
  scheduling:=public.native_consultation_command('claim_email',bid);assert scheduling->>'kind'='scheduling';
  perform public.native_consultation_command('prepare_email',(scheduling->>'id')::uuid,null,jsonb_build_object('token',scheduling->>'token','message',jsonb_build_object('to','synthetic@example.test','subject','Synthetic scheduling','text','https://schedule.example.test/synthetic')));
  perform public.native_consultation_command('complete_email',(scheduling->>'id')::uuid,null,jsonb_build_object('token',scheduling->>'token','providerId','mail_synthetic_scheduling'));
  assert (select workflow_status='scheduling_invited' and booking_status='requested' and payment_verified_by=admin_id from public.consultation_bookings where id=bid);
  assert public.native_consultation_command('claim_email',bid) is null;
  -- An ambiguous send beyond the provider dedupe window must stop, not send a duplicate.
  update public.consultation_email_outbox set state='pending',first_attempt_at=now()-interval '24 hours',next_attempt_at=now() where id=(claim->>'id')::uuid;
  perform public.native_consultation_command('claim_email',bid);
  assert (select state='needs_review' from public.consultation_email_outbox where id=(claim->>'id')::uuid);
end $$;
set local role anon;
do $$ begin
  begin perform * from public.consultation_email_outbox;raise exception 'public mail read';exception when insufficient_privilege then null;end;
  begin perform public.native_consultation_command('request',gen_random_uuid());raise exception 'public rpc';exception when insufficient_privilege then null;end;
end $$;
set local role authenticated;
do $$ begin
  begin update public.consultation_bookings set payment_status='paid';raise exception 'customer payment write';exception when insufficient_privilege then null;end;
end $$;
rollback;
