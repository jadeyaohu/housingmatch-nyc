-- Development integration only: reconcile the existing 0001 table with JSON-catalog favorites.
-- Preserves rows; no data import/backfill, no Production application authorized.
begin;
alter table public.saved_listings drop constraint if exists saved_listings_listing_id_fkey;
drop trigger if exists saved_listings_limit on public.saved_listings;
alter table public.saved_listings add constraint beta_saved_id_length check (char_length(listing_id) between 1 and 200) not valid;
drop policy if exists "own saved" on public.saved_listings;
revoke all on public.saved_listings from public,anon,authenticated;
grant select,insert,delete on public.saved_listings to authenticated;
alter table public.saved_listings force row level security;
-- Keep the explicit owner-scoped select/insert/delete policies from 0005.
create function public.delete_my_housing_data() returns void
language plpgsql security invoker set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  delete from public.saved_listings where user_id=auth.uid();
  delete from public.household_profiles where user_id=auth.uid();
end;
$$;
revoke all on function public.delete_my_housing_data() from public,anon;
grant execute on function public.delete_my_housing_data() to authenticated;
commit;
