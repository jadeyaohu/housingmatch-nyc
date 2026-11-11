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
for file in supabase/tests/consultation.sql supabase/tests/consultation_payments.sql supabase/tests/beta_owner_rls.sql; do "${psql[@]}" < "$file"; done
printf '%s\n' 'PASS: migrations, booking/payment assertions, owner-scoped saves/profile deletion (synthetic local DB).'
