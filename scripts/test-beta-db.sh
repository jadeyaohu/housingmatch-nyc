#!/usr/bin/env bash
# Synthetic local/disposable Postgres only, no caller-supplied connection string or secret.
set -euo pipefail
cd "$(dirname "$0")/.."
container="hm-beta-test-${RANDOM}-$$"
base=(env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH docker --host=unix:///var/run/docker.sock)
trap '"${base[@]}" stop "$container" >/dev/null 2>&1 || true' EXIT
"${base[@]}" run -d --rm --network none --name "$container" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
# The entrypoint starts a temporary UNIX-socket-only server during initdb.
# TCP readiness waits for the final server; the temporary server can disappear mid-migration.
ready=0
for i in {1..30}; do if "${base[@]}" exec "$container" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then ready=1; break; fi; sleep 1; done
[[ "$ready" == 1 ]]
psql=("${base[@]}" exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1)
"${psql[@]}" <<'SQL'
create role anon; create role authenticated; create role service_role;
create schema auth; grant usage on schema auth to public;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
SQL
for file in supabase/migrations/*.sql; do "${psql[@]}" < "$file"; done
for file in supabase/tests/consultation.sql supabase/tests/consultation_payments.sql supabase/tests/beta_owner_rls.sql supabase/tests/chat_subscriptions.sql supabase/tests/native_consultation.sql supabase/tests/owned_tracking.sql; do "${psql[@]}" < "$file"; done
# Independent connections race the same free account; exactly one reservation may succeed.
"${psql[@]}" -c "insert into auth.users values('be700000-0000-4000-8000-000000000099')" >/dev/null
race_dir=$(mktemp -d /tmp/hm-quota-race.XXXXXX)
pids=()
for n in {1..8}; do
  (if "${psql[@]}" -c "set role service_role; select public.beta_service_command('reserve','be700000-0000-4000-8000-000000000099',jsonb_build_object('request_id',gen_random_uuid()))" >"$race_dir/$n.log" 2>&1; then touch "$race_dir/$n.ok"; fi) &
  pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
[[ $(find "$race_dir" -name '*.ok' | wc -l) -eq 1 ]]
[[ $(grep -l 'ERROR:  busy' "$race_dir"/*.log | wc -l) -eq 7 ]]
"${psql[@]}" <<'SQL'
do $$ declare rid uuid; x jsonb; begin
 select id into strict rid from public.chat_reservations where user_id='be700000-0000-4000-8000-000000000099' and state='pending';
 x:=public.beta_service_command('finish','be700000-0000-4000-8000-000000000099',jsonb_build_object('request_id',rid,'success',true));
 assert (x->>'used')::int=1;
 begin perform public.beta_service_command('reserve','be700000-0000-4000-8000-000000000099',jsonb_build_object('request_id',gen_random_uuid())); raise exception 'race quota bypass'; exception when others then if sqlerrm<>'quota' then raise; end if; end;
end $$;
SQL
rm -r "$race_dir"
# Race independent email workers against one synthetic acknowledgment.
"${psql[@]}" <<'SQL'
select public.native_consultation_command('request','ca700000-0000-4000-8000-000000000099',null,jsonb_build_object(
 'package','standard','name','Synthetic','email','race@example.test','language','en','preferredLocal',(now()+interval '10 days')::timestamp,
 'timezone','UTC','preferredUTC',now()+interval '10 days','topic','','termsVersion','consultation-2026-11-12-native-draft-2',
 'privacyVersion','privacy-2026-11-12-native-draft-2','termsAccepted',true,'privacyAccepted',true,'fingerprint',repeat('d',64)));
SQL
mail_race_dir=$(mktemp -d /tmp/hm-mail-race.XXXXXX)
pids=()
for n in {1..8}; do
  "${psql[@]}" -qAt -c "set role service_role; select (public.native_consultation_command('claim_email')->>'id') is not null" >"$mail_race_dir/$n.log" &
  pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
[[ $(grep -lx t "$mail_race_dir"/*.log | wc -l) -eq 1 ]]
[[ $(grep -lx f "$mail_race_dir"/*.log | wc -l) -eq 7 ]]
rm -r "$mail_race_dir"
printf '%s\n' 'PASS: concurrent email workers (8 connections), exactly one acknowledgment lease.'
printf '%s\n' 'PASS: concurrent free quota (8 connections), Pricing v3 state machine.'
printf '%s\n' 'PASS: migrations, booking/payment assertions, owner-scoped saves/profile deletion (synthetic local DB).'
