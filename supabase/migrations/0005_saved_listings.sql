-- M4: saved homes. One row per (user, listing). Only the listing id is stored; listing details
-- come from our public listings data. RLS: a user sees and changes only their own rows.
create table if not exists public.saved_listings (
  user_id    uuid not null references auth.users(id) on delete cascade,
  listing_id text not null check (char_length(listing_id) between 1 and 200),
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.saved_listings enable row level security;
revoke all on public.saved_listings from anon;

create policy "own saved: select" on public.saved_listings for select to authenticated using ((select auth.uid()) = user_id);
create policy "own saved: insert" on public.saved_listings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own saved: delete" on public.saved_listings for delete to authenticated using ((select auth.uid()) = user_id);
