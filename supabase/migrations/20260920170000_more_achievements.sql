-- Growth system v2: 12 new achievements (26 total), a richer award pass, and
-- three new practice-question categories (data-science, system-design, behavioral).

alter table public.practice_questions drop constraint practice_questions_category_check;
alter table public.practice_questions add constraint practice_questions_category_check
  check (category in ('ai-agents', 'machine-learning', 'software-engineering', 'finance',
                      'data-science', 'system-design', 'behavioral', 'product-design'));

insert into public.achievements (id, name, description, icon, tier, points, sort) values
  ('resume-ready',    'Resume Ready',      'Uploaded your first resume.',                                  '📄', 'bronze', 10, 22),
  ('skill-collector', 'Skill Collector',   'Added 10 or more skills to your Career Profile.',              '🧰', 'bronze', 10, 24),
  ('journey-shared',  'Path Paver',        'Shared a Career Journey with at least 3 milestones.',          '🛤️', 'bronze', 10, 26),
  ('all-rounder',     'All-Rounder',       'Practised at least one question in every category.',           '🧭', 'silver', 25, 72),
  ('category-master', 'Category Master',   'Completed every question in one category.',                    '🏅', 'silver', 30, 74),
  ('applications-25', 'Persistence Pays',  'Submitted 25 job applications.',                               '📬', 'gold',   50, 92),
  ('interviews-3',    'Interview Circuit', 'Reached the interview stage on three applications.',           '🎙️', 'gold',   50, 102),
  ('first-offer',     'Offer On The Table','Received your first offer.',                                   '🏆', 'gold',   60, 104),
  ('streak-30',       'Marathon Month',    'Were active 30 days in a row.',                                '🏔️', 'gold',   60, 112),
  ('connector',       'Networker',         'Started your first conversation with a recruiter.',            '🤝', 'bronze', 15, 122),
  ('posts-5',         'Storyteller',       'Shared 5 posts with the community.',                           '📝', 'silver', 25, 124),
  ('supportive',      'Supportive Voice',  'Left 5 comments helping others.',                              '🌻', 'bronze', 15, 126)
on conflict (id) do nothing;

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
  n_apps int; n_interview_apps int; n_offers int; n_practice int; n_posts int; n_likes int;
  n_resumes int; n_skills int; n_journey int; n_convos int; n_comments int;
  n_cats_done int; n_cats_total int; has_full_category boolean; max_streak int;
  earned text[] := array['pioneer'];
  newly text[] := '{}';
begin
  if uid is null then return '{}'; end if;
  select onboarding_step = 'done', is_pro into onboarded, pro from profiles where id = uid;
  if onboarded is null then return '{}'; end if;

  select count(*) into n_apps
    from application_events e join applications a on a.id = e.application_id
    where a.user_id = uid and e.status = 'applied';
  select count(distinct e.application_id) into n_interview_apps
    from application_events e join applications a on a.id = e.application_id
    where a.user_id = uid and e.status = 'interview';
  select count(*) into n_offers
    from application_events e join applications a on a.id = e.application_id
    where a.user_id = uid and e.status = 'offer';
  select count(*) into n_practice from practice_progress where user_id = uid;
  select count(*) into n_posts from posts where author_id = uid;
  select count(*) into n_likes
    from post_likes pl join posts p on p.id = pl.post_id
    where p.author_id = uid;
  select count(*) into n_resumes from resumes where user_id = uid;
  select count(*) into n_skills from user_skills where user_id = uid;
  select count(*) into n_journey from journey_entries where user_id = uid;
  select count(*) into n_convos from conversation_members where user_id = uid;
  select count(*) into n_comments from comments where author_id = uid;

  select count(distinct q.category) into n_cats_done
    from practice_progress pp join practice_questions q on q.id = pp.question_id
    where pp.user_id = uid;
  select count(distinct category) into n_cats_total from practice_questions;
  select exists (
    select 1 from practice_questions q
    left join practice_progress pp on pp.question_id = q.id and pp.user_id = uid
    group by q.category
    having count(*) = count(pp.question_id)
  ) into has_full_category;

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
  if n_resumes >= 1 then earned := array_append(earned, 'resume-ready'); end if;
  if n_skills >= 10 then earned := array_append(earned, 'skill-collector'); end if;
  if n_journey >= 3 then earned := array_append(earned, 'journey-shared'); end if;
  if n_practice >= 1 then earned := array_append(earned, 'first-question'); end if;
  if n_practice >= 10 then earned := array_append(earned, 'questions-10'); end if;
  if n_practice >= 50 then earned := array_append(earned, 'questions-50'); end if;
  if n_cats_total > 0 and n_cats_done = n_cats_total then earned := array_append(earned, 'all-rounder'); end if;
  if has_full_category then earned := array_append(earned, 'category-master'); end if;
  if n_apps >= 1 then earned := array_append(earned, 'first-application'); end if;
  if n_apps >= 10 then earned := array_append(earned, 'applications-10'); end if;
  if n_apps >= 25 then earned := array_append(earned, 'applications-25'); end if;
  if n_interview_apps >= 1 then earned := array_append(earned, 'first-interview'); end if;
  if n_interview_apps >= 3 then earned := array_append(earned, 'interviews-3'); end if;
  if n_offers >= 1 then earned := array_append(earned, 'first-offer'); end if;
  if max_streak >= 7 then earned := array_append(earned, 'streak-7'); end if;
  if max_streak >= 30 then earned := array_append(earned, 'streak-30'); end if;
  if n_convos >= 1 then earned := array_append(earned, 'connector'); end if;
  if n_posts >= 1 then earned := array_append(earned, 'first-post'); end if;
  if n_posts >= 5 then earned := array_append(earned, 'posts-5'); end if;
  if n_comments >= 5 then earned := array_append(earned, 'supportive'); end if;
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
