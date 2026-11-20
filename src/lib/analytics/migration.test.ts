import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Runs 0002 against an in-process Postgres (PGlite) that mimics Supabase's default grants
 * to anon/authenticated, then checks deny-all access, constraints, retention and rollback.
 * No real database is touched.
 */
const root = process.cwd();
const up = readFileSync(path.join(root, "supabase/migrations/0002_analytics_leads.sql"), "utf8");
const down = readFileSync(path.join(root, "supabase/rollback/0002_down.sql"), "utf8");

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  // Supabase-like setup: client roles exist and get broad default privileges on new tables.
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on sequences to anon, authenticated;
    alter default privileges in schema public grant execute on functions to anon, authenticated;
  `);
  await db.exec(up);
}, 30_000);
afterAll(async () => db?.close());

const asRole = async (role: string, sql: string) => {
  await db.exec(`set role ${role}`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role");
  }
};

describe("0002 migration", () => {
  it("is idempotent (re-running does not fail)", async () => {
    await expect(db.exec(up)).resolves.toBeDefined();
  });

  it.each(["anon", "authenticated"])("denies %s all reads, writes and the purge function", async (role) => {
    await expect(asRole(role, "select * from public.analytics_events")).rejects.toThrow(/permission denied/);
    await expect(asRole(role, "select * from public.leads")).rejects.toThrow(/permission denied/);
    await expect(asRole(role, "select * from public.consents")).rejects.toThrow(/permission denied/);
    await expect(
      asRole(role, `insert into public.analytics_events (event_id, event_name, session_id) values (gen_random_uuid(), 'page_view', gen_random_uuid())`),
    ).rejects.toThrow(/permission denied/);
    await expect(asRole(role, "select public.purge_expired_privacy_data()")).rejects.toThrow(/permission denied/);
  });

  it("has RLS enabled and forced with zero policies on all three tables", async () => {
    const r = await db.query<{ relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }>(
      `select relname, relrowsecurity, relforcerowsecurity from pg_class
       where relname in ('analytics_events','leads','consents') order by relname`,
    );
    expect(r.rows).toHaveLength(3);
    expect(r.rows.every((x) => x.relrowsecurity && x.relforcerowsecurity)).toBe(true);
    const p = await db.query(`select 1 from pg_policies where tablename in ('analytics_events','leads','consents')`);
    expect(p.rows).toHaveLength(0);
  });

  it("dedupes on event_id and enforces event/path/source/props constraints", async () => {
    const id = "0b6f0c55-1d9a-4f0e-8f43-2a6b0f3b9c11";
    const ins = (extra = "", vals = "") =>
      db.query(`insert into public.analytics_events (event_id, event_name, session_id${extra}) values ('${id}', 'page_view', gen_random_uuid()${vals}) on conflict (event_id) do nothing`);
    await ins();
    await ins();
    expect((await db.query(`select count(*)::int as n from public.analytics_events where event_id = '${id}'`)).rows[0]).toEqual({ n: 1 });
    const bad = (sql: string) => expect(db.query(sql)).rejects.toThrow(/violates check constraint/);
    await bad(`insert into public.analytics_events (event_id, event_name, session_id) values (gen_random_uuid(), 'opt_in_submitted', gen_random_uuid())`);
    await bad(`insert into public.analytics_events (event_id, event_name, session_id, path) values (gen_random_uuid(), 'page_view', gen_random_uuid(), '/x?income=1')`);
    await bad(`insert into public.analytics_events (event_id, event_name, session_id, source) values (gen_random_uuid(), 'page_view', gen_random_uuid(), 'evil.com')`);
    await bad(`insert into public.analytics_events (event_id, event_name, session_id, props) values (gen_random_uuid(), 'page_view', gen_random_uuid(), '[1]')`);
    await bad(`insert into public.leads (email, lang) values ('Mixed@Case.com', 'en')`);
    await bad(`insert into public.leads (email, lang, interests) values ('a@b.co', 'en', '{marketing}')`);
  });

  it("purges per the approved retention defaults and cascades consents", async () => {
    await db.exec(`
      truncate public.analytics_events; delete from public.leads;
      insert into public.analytics_events (event_id, event_name, session_id, occurred_at) values
        (gen_random_uuid(), 'page_view', gen_random_uuid(), now() - interval '91 days'),
        (gen_random_uuid(), 'page_view', gen_random_uuid(), now() - interval '89 days');
      insert into public.leads (id, email, lang, status, created_at, unsubscribed_at) values
        ('11111111-1111-4111-8111-111111111111', 'old-pending@x.co', 'en', 'pending', now() - interval '31 days', null),
        ('22222222-2222-4222-8222-222222222222', 'new-pending@x.co', 'en', 'pending', now() - interval '29 days', null),
        ('33333333-3333-4333-8333-333333333333', 'old-unsub@x.co', 'zh', 'unsubscribed', now() - interval '90 days', now() - interval '31 days'),
        ('44444444-4444-4444-8444-444444444444', 'new-unsub@x.co', 'zh', 'unsubscribed', now() - interval '90 days', now() - interval '29 days'),
        ('55555555-5555-4555-8555-555555555555', 'active@x.co', 'en', 'active', now() - interval '400 days', null);
      insert into public.consents (lead_id, purpose, action, policy_version, form_version, method) values
        ('33333333-3333-4333-8333-333333333333', 'lottery_alerts', 'granted', 'privacy-2026-11', 'optin-v1', 'web_form'),
        ('55555555-5555-4555-8555-555555555555', 'lottery_alerts', 'granted', 'privacy-2026-11', 'optin-v1', 'web_form');
    `);
    const r = await db.query("select * from public.purge_expired_privacy_data()");
    expect(r.rows[0]).toEqual({ events_deleted: 1, pending_leads_deleted: 1, unsubscribed_leads_deleted: 1 });
    const left = await db.query<{ email: string }>("select email from public.leads order by email");
    expect(left.rows.map((x) => x.email)).toEqual(["active@x.co", "new-pending@x.co", "new-unsub@x.co"]);
    const consents = await db.query<{ lead_id: string }>("select lead_id from public.consents");
    expect(consents.rows.map((x) => x.lead_id)).toEqual(["55555555-5555-4555-8555-555555555555"]);
    expect((await db.query("select count(*)::int as n from public.analytics_events")).rows[0]).toEqual({ n: 1 });
  });

  it("rejects consent rows without a live lead (no orphan evidence)", async () => {
    await expect(
      db.query(`insert into public.consents (lead_id, purpose, action, policy_version, form_version, method)
                values ('99999999-9999-4999-8999-999999999999', 'lottery_alerts', 'granted', 'p', 'f', 'web_form')`),
    ).rejects.toThrow(/foreign key/);
  });

  it("rollback drops only the 0002 objects", async () => {
    await db.exec(`create table public.listings (id text primary key)`); // stand-in for a 0001 table
    await db.exec(down);
    const t = await db.query<{ tablename: string }>(`select tablename from pg_tables where schemaname = 'public' order by 1`);
    expect(t.rows.map((x) => x.tablename)).toEqual(["listings"]);
    const f = await db.query(`select 1 from pg_proc where proname = 'purge_expired_privacy_data'`);
    expect(f.rows).toHaveLength(0);
  });
});
