-- Growth system: interview practice questions, activity tracking and achievements.
-- Powers /practice (question bank) and /progress (stats, activity heatmap, badges).

-- ---------------------------------------------------------------------------
-- Interview practice questions (content ships via migrations; read-only for users)
-- ---------------------------------------------------------------------------
create table public.practice_questions (
  id text primary key,
  category text not null check (category in ('ai-agents', 'machine-learning', 'software-engineering', 'finance')),
  difficulty text not null check (difficulty in ('basic', 'intermediate', 'advanced')),
  question text not null,
  answer text not null,
  tags text[] not null default '{}',
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index practice_questions_category_idx on public.practice_questions (category, sort);

alter table public.practice_questions enable row level security;
create policy "practice questions are readable when signed in"
  on public.practice_questions for select to authenticated using (true);

-- One row per question a user has worked through.
create table public.practice_progress (
  user_id uuid not null references public.profiles on delete cascade,
  question_id text not null references public.practice_questions on delete cascade,
  done_at timestamptz not null default now(),
  primary key (user_id, question_id)
);
create index practice_progress_user_idx on public.practice_progress (user_id, done_at desc);

alter table public.practice_progress enable row level security;
create policy "own practice progress: read" on public.practice_progress for select to authenticated using (user_id = (select auth.uid()));
create policy "own practice progress: insert" on public.practice_progress for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own practice progress: delete" on public.practice_progress for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Achievements
-- ---------------------------------------------------------------------------
create table public.achievements (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  tier text not null check (tier in ('bronze', 'silver', 'gold')),
  points int not null default 10,
  sort int not null default 0
);

alter table public.achievements enable row level security;
create policy "achievements are readable when signed in"
  on public.achievements for select to authenticated using (true);

-- Earned via refresh_achievements() only (security definer); users cannot self-award.
create table public.user_achievements (
  user_id uuid not null references public.profiles on delete cascade,
  achievement_id text not null references public.achievements on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
create index user_achievements_user_idx on public.user_achievements (user_id, earned_at desc);

alter table public.user_achievements enable row level security;
create policy "earned achievements are readable when signed in"
  on public.user_achievements for select to authenticated using (true);

insert into public.achievements (id, name, description, icon, tier, points, sort) values
  ('pioneer',           'Beta Pioneer',      'Joined Career Lighthouse during the beta.',                    '🌱', 'bronze', 10, 10),
  ('profile-ready',     'Profile Builder',   'Completed onboarding and built your Career Profile.',          '📋', 'bronze', 10, 20),
  ('goal-setter',       'Goal Setter',       'Set a career goal.',                                           '🎯', 'bronze', 10, 30),
  ('planner',           'Strategist',        'Generated your AI Career Plan.',                               '🗺️', 'bronze', 15, 40),
  ('first-question',    'First Rep',         'Worked through your first practice question.',                 '💡', 'bronze', 10, 50),
  ('questions-10',      'Warming Up',        'Worked through 10 practice questions.',                        '🧠', 'bronze', 15, 60),
  ('questions-50',      'Question Crusher',  'Worked through 50 practice questions.',                        '⚡', 'silver', 40, 70),
  ('first-application', 'First Shot',        'Submitted your first job application.',                        '🚀', 'bronze', 15, 80),
  ('applications-10',   'Momentum',          'Submitted 10 job applications.',                               '🔥', 'silver', 30, 90),
  ('first-interview',   'In the Room',       'Reached your first interview.',                                '🎤', 'silver', 30, 100),
  ('streak-7',          '7-Day Streak',      'Were active 7 days in a row (applications, interviews or practice).', '📆', 'silver', 30, 110),
  ('first-post',        'Community Voice',   'Shared your first post with the community.',                   '💬', 'bronze', 10, 120),
  ('crowd-favourite',   'Crowd Favourite',   'Received 10 likes on your posts.',                             '⭐', 'gold',   50, 130),
  ('pro-member',        'Lighthouse Pro',    'Upgraded to Career Lighthouse Pro.',                           '👑', 'gold',   20, 140);

-- ---------------------------------------------------------------------------
-- Award pass: derives everything from data, so badges cannot be self-awarded.
-- Returns the ids of newly earned achievements (and notifies about each).
-- ---------------------------------------------------------------------------
create or replace function public.refresh_achievements()
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  onboarded boolean;
  pro boolean;
  n_apps int; n_interviews int; n_practice int; n_posts int; n_likes int; max_streak int;
  earned text[] := array['pioneer'];
  newly text[] := '{}';
begin
  if uid is null then return '{}'; end if;
  select onboarding_step = 'done', is_pro into onboarded, pro from profiles where id = uid;
  if onboarded is null then return '{}'; end if;

  select count(*) into n_apps
    from application_events e join applications a on a.id = e.application_id
    where a.user_id = uid and e.status = 'applied';
  select count(*) into n_interviews
    from application_events e join applications a on a.id = e.application_id
    where a.user_id = uid and e.status = 'interview';
  select count(*) into n_practice from practice_progress where user_id = uid;
  select count(*) into n_posts from posts where author_id = uid;
  select count(*) into n_likes
    from post_likes pl join posts p on p.id = pl.post_id
    where p.author_id = uid;

  -- Longest run of consecutive days with any tracked activity.
  select coalesce(max(run), 0) into max_streak from (
    select count(*) as run from (
      select d, d - (row_number() over (order by d))::int as grp from (
        select distinct d from (
          select e.created_at::date as d
            from application_events e join applications a on a.id = e.application_id
            where a.user_id = uid and e.status in ('applied', 'interview')
          union
          select done_at::date from practice_progress where user_id = uid
        ) raw
      ) days
    ) grouped group by grp
  ) runs;

  if onboarded then earned := array_append(earned, 'profile-ready'); end if;
  if exists (select 1 from career_goals where user_id = uid) then earned := array_append(earned, 'goal-setter'); end if;
  if exists (select 1 from career_plans where user_id = uid) then earned := array_append(earned, 'planner'); end if;
  if n_practice >= 1 then earned := array_append(earned, 'first-question'); end if;
  if n_practice >= 10 then earned := array_append(earned, 'questions-10'); end if;
  if n_practice >= 50 then earned := array_append(earned, 'questions-50'); end if;
  if n_apps >= 1 then earned := array_append(earned, 'first-application'); end if;
  if n_apps >= 10 then earned := array_append(earned, 'applications-10'); end if;
  if n_interviews >= 1 then earned := array_append(earned, 'first-interview'); end if;
  if max_streak >= 7 then earned := array_append(earned, 'streak-7'); end if;
  if n_posts >= 1 then earned := array_append(earned, 'first-post'); end if;
  if n_likes >= 10 then earned := array_append(earned, 'crowd-favourite'); end if;
  if pro then earned := array_append(earned, 'pro-member'); end if;

  with ins as (
    insert into user_achievements (user_id, achievement_id)
    select uid, e from unnest(earned) as e
    on conflict do nothing
    returning achievement_id
  )
  select coalesce(array_agg(achievement_id), '{}') into newly from ins;

  insert into notifications (user_id, kind, title, body, link)
  select uid, 'achievement', 'Achievement unlocked: ' || a.icon || ' ' || a.name, a.description, '/progress'
  from achievements a where a.id = any (newly);

  return newly;
end;
$$;

revoke execute on function public.refresh_achievements() from public, anon;
grant execute on function public.refresh_achievements() to authenticated;
