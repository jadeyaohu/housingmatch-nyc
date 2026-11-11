-- Priority-group answers (lottery preferences). Additive and nullable, so it is safe for old rows.
-- The ZIP code is deliberately NOT stored: the quiz promises it isn't kept on our servers.
alter table public.household_profiles
  add column if not exists nycha_resident boolean,
  add column if not exists municipal_or_veteran boolean;
