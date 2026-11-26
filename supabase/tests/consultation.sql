-- Disposable local database only. Apply the consultation migration first; all synthetic rows rolled back.
\set ON_ERROR_STOP on
begin;
do $$
declare
  v_id uuid := gen_random_uuid();
  other uuid;
  next_time timestamptz := now() + interval '10 days';
  denied boolean := false;
begin
  if has_table_privilege('anon', 'public.consultation_bookings', 'select')
    or has_table_privilege('authenticated', 'public.consultation_bookings', 'select')
    or has_table_privilege('anon', 'public.consultation_bookings', 'insert')
    or has_table_privilege('authenticated', 'public.consultation_bookings', 'update') then raise exception 'public privilege leak'; end if;
  if has_function_privilege('anon', 'public.request_consultation(uuid,text,text,text,text,timestamp,text,timestamptz,text,text,text,text)', 'execute')
    or has_function_privilege('authenticated', 'public.request_consultation(uuid,text,text,text,text,timestamp,text,timestamptz,text,text,text,text)', 'execute') then raise exception 'public RPC leak'; end if;
  if not (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.consultation_bookings'::regclass) then raise exception 'RLS missing'; end if;
  perform set_config('role', 'service_role', true);
  perform public.request_consultation(v_id,'standard','Synthetic Person','synthetic@example.test','en',next_time at time zone 'UTC','UTC',next_time,'','consultation-2026-11-11-draft-1','privacy-2026-11-11-draft-1',repeat('a',64));
  perform public.request_consultation(v_id,'standard','Synthetic Person','synthetic@example.test','en',next_time at time zone 'UTC','UTC',next_time,'','consultation-2026-11-11-draft-1','privacy-2026-11-11-draft-1',repeat('a',64));
  begin
    perform public.request_consultation(v_id,'standard','Synthetic Person','synthetic@example.test','en',next_time at time zone 'UTC','UTC',next_time,'','consultation-2026-11-11-draft-1','privacy-2026-11-11-draft-1',repeat('b',64));
  exception when others then if sqlerrm = 'idempotency_conflict' then denied := true; else raise; end if; end;
  if not denied then raise exception 'conflicting retry accepted'; end if;
  perform set_config('role', 'none', true);
  if (select count(*) from public.consultation_bookings where consultation_bookings.id = v_id) <> 1 then raise exception 'retry duplicated'; end if;
  if not exists (select 1 from public.consultation_bookings b where b.id = v_id and booking_status = 'requested' and payment_status = 'not_started' and price_cents = 5900 and duration_minutes = 30) then raise exception 'incorrect initial state'; end if;
  denied := false;
  begin update public.consultation_bookings b set booking_status = 'completed' where b.id = v_id;
  exception when others then if sqlerrm = 'invalid_booking_transition' then denied := true; else raise; end if; end;
  if not denied then raise exception 'invalid transition accepted'; end if;
  update public.consultation_bookings b set booking_status = 'confirmed' where b.id = v_id;
  update public.consultation_bookings b set booking_status = 'completed' where b.id = v_id;
  denied := false;
  begin update public.consultation_bookings b set payment_status = 'paid' where b.id = v_id;
  exception when others then if sqlerrm = 'invalid_payment_transition' then denied := true; else raise; end if; end;
  if not denied then raise exception 'unverified paid shortcut'; end if;
  for i in 1..19 loop
    other := gen_random_uuid();
    perform public.request_consultation(other,'expert','Synthetic Person','synthetic@example.test','zh',next_time at time zone 'UTC','UTC',next_time,'','consultation-2026-11-11-draft-1','privacy-2026-11-11-draft-1',repeat('a',64));
  end loop;
  denied := false;
  begin
    perform public.request_consultation(gen_random_uuid(),'expert','Synthetic Person','synthetic@example.test','zh',next_time at time zone 'UTC','UTC',next_time,'','consultation-2026-11-11-draft-1','privacy-2026-11-11-draft-1',repeat('a',64));
  exception when others then if sqlerrm = 'rate_limited' then denied := true; else raise; end if; end;
  if not denied then raise exception 'rate cap bypassed'; end if;
  if (select count(*) from public.consultation_bookings) <> 20 then raise exception 'unexpected writes'; end if;
end;
$$;
rollback;
