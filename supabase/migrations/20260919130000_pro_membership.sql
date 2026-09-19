-- Career Lighthouse Pro membership flag. Pro gates downloading the full AI Career Plan PDF.
-- While Career Lighthouse is in beta, upgrading is free (a server action flips the flag);
-- when payments arrive, set this from the payment webhook instead.
alter table public.profiles
  add column if not exists is_pro boolean not null default false;

comment on column public.profiles.is_pro is
  'Career Lighthouse Pro membership; gates the AI Career Plan PDF download. Free to enable during beta.';
