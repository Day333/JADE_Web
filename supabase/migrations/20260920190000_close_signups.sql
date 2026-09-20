-- Pause new registrations after the hackathon. The sign-up page already shows
-- a "sign-ups are paused" notice (lib/config.ts SIGNUPS_OPEN); this trigger
-- enforces it at the database, so calling the Supabase auth API directly
-- cannot create accounts either.
--
-- To reopen sign-ups:
--   drop trigger signups_closed on auth.users;
-- (and set SIGNUPS_OPEN = true in lib/config.ts). Note the trigger also blocks
-- creating users from the Supabase dashboard while it is active.

create or replace function public.block_signups()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Sign-ups are temporarily closed.';
end;
$$;

revoke execute on function public.block_signups() from public, anon, authenticated;

create trigger signups_closed
  before insert on auth.users
  for each row execute function public.block_signups();
