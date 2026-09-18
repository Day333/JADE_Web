-- AI Career Plans: a personalised plan per target career. The newest row per
-- user and career is the current plan; older rows are kept as history.
create table public.career_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  career_id text not null references public.careers on delete cascade,
  content jsonb not null,
  source text not null check (source in ('ai', 'rules')),
  model text,
  created_at timestamptz not null default now()
);
create index career_plans_user_idx on public.career_plans (user_id, career_id, created_at desc);
create index career_plans_career_idx on public.career_plans (career_id);

alter table public.career_plans enable row level security;
create policy "career plans owner" on public.career_plans for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
