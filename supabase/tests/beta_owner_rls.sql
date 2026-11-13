-- Synthetic disposable database only. No Production execution authorized.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
insert into public.household_profiles(user_id,household_size,annual_income,consented_at) values('11111111-1111-4111-8111-111111111111',2,60000,now()),('22222222-2222-4222-8222-222222222222',1,50000,now());
insert into public.saved_listings(user_id,listing_id) values('11111111-1111-4111-8111-111111111111','demo-a'),('22222222-2222-4222-8222-222222222222','demo-b');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare n integer; denied boolean:=false; begin
 select count(*) into n from public.saved_listings;
 if n<>1 then raise exception 'owner isolation failed'; end if;
 begin insert into public.saved_listings(user_id,listing_id) values('22222222-2222-4222-8222-222222222222','wrong-owner');
 exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'cross-owner insert accepted'; end if;
 delete from public.saved_listings where user_id='22222222-2222-4222-8222-222222222222';
 get diagnostics n=row_count; if n<>0 then raise exception 'cross-owner deletion'; end if;
 -- Favorites are free and need no copied database listing or subscription.
 for i in 1..6 loop insert into public.saved_listings(user_id,listing_id) values(auth.uid(),'demo-more-'||i); end loop;
 perform public.delete_my_housing_data();
 if exists(select 1 from public.saved_listings) or exists(select 1 from public.household_profiles) then raise exception 'own delete failed'; end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from public.saved_listings)<>1 or (select count(*) from public.household_profiles)<>1 then raise exception 'another owner data lost'; end if;
 if has_table_privilege('anon','public.saved_listings','select') or has_function_privilege('anon','public.delete_my_housing_data()','execute') then raise exception 'anonymous access'; end if;
end $$;
rollback;
