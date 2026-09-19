-- =====================================================================
-- Career Lighthouse AI Career Platform — core schema
-- Tables, row level security, helper functions and triggers.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.user_role as enum ('seeker', 'recruiter');
create type public.dm_policy as enum ('everyone', 'followers', 'none');
create type public.skill_category as enum ('technical', 'tool', 'domain', 'soft');
create type public.experience_kind as enum ('internship', 'work', 'research', 'volunteer', 'other');
create type public.community_kind as enum ('career', 'company', 'university', 'topic');
create type public.post_type as enum (
  'experience', 'career_journey', 'interview', 'company_review',
  'graduate_program', 'internship', 'question', 'resource'
);
create type public.follow_target as enum ('user', 'career', 'company', 'community', 'topic');
create type public.job_type as enum ('internship', 'graduate', 'part_time', 'full_time');
create type public.job_status as enum ('draft', 'open', 'closed');
create type public.application_status as enum (
  'saved', 'applied', 'viewed', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'
);
create type public.invitation_kind as enum ('apply', 'interview');
create type public.invitation_status as enum ('pending', 'accepted', 'declined');
create type public.roadmap_stage_kind as enum ('skill', 'project', 'portfolio', 'apply');

-- ---------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------
create table public.skills (
  id text primary key,
  name text not null,
  category public.skill_category not null default 'technical',
  aliases text[] not null default '{}',
  description text,
  learn_hint text,
  is_custom boolean not null default false,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table public.careers (
  id text primary key,
  title text not null,
  field text not null,
  summary text not null,
  responsibilities text[] not null default '{}',
  career_path text[] not null default '{}',
  preference_profile jsonb not null default '{}',
  traits text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.career_skills (
  career_id text not null references public.careers on delete cascade,
  skill_id text not null references public.skills on delete cascade,
  importance smallint not null default 2 check (importance between 1 and 3),
  target_level smallint not null default 2 check (target_level between 1 and 3),
  why text,
  primary key (career_id, skill_id)
);
create index career_skills_skill_idx on public.career_skills (skill_id);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  industry text,
  location text,
  size text,
  website text,
  description text,
  is_sample boolean not null default false,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
create index companies_created_by_idx on public.companies (created_by);

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  kind public.community_kind not null,
  name text not null,
  description text,
  career_id text references public.careers on delete set null,
  company_id uuid references public.companies on delete set null,
  created_at timestamptz not null default now()
);
create index communities_career_idx on public.communities (career_id);
create index communities_company_idx on public.communities (company_id);

-- ---------------------------------------------------------------------
-- People and their career profile
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  headline text,
  bio text,
  avatar_url text,
  location text,
  university text,
  degree text,
  major text,
  graduation_year int,
  role public.user_role not null default 'seeker',
  company_id uuid references public.companies on delete set null,
  onboarding_step text not null default 'role'
    check (onboarding_step in ('role', 'resume', 'review', 'preferences', 'done')),
  github_url text,
  linkedin_url text,
  website_url text,
  -- privacy & visibility
  profile_public boolean not null default true,
  resume_public boolean not null default false,
  goal_public boolean not null default true,
  open_to_opportunities boolean not null default false,
  allow_recruiter_contact boolean not null default true,
  show_status_to_recruiters boolean not null default false,
  dm_policy public.dm_policy not null default 'everyone',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_company_idx on public.profiles (company_id);

create table public.career_preferences (
  user_id uuid primary key references public.profiles on delete cascade,
  answers jsonb not null default '{}',
  scores jsonb not null default '{}',
  interested_industries text[] not null default '{}',
  interested_careers text[] not null default '{}',
  work_types text[] not null default '{}',
  company_types text[] not null default '{}',
  preferred_locations text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.career_goals (
  user_id uuid primary key references public.profiles on delete cascade,
  career_id text not null references public.careers,
  set_at timestamptz not null default now()
);
create index career_goals_career_idx on public.career_goals (career_id);

create table public.educations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  school text not null,
  degree text,
  field text,
  start_date text,
  end_date text,
  courses text[] not null default '{}',
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index educations_user_idx on public.educations (user_id);

create table public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  title text not null,
  organization text,
  kind public.experience_kind not null default 'work',
  start_date text,
  end_date text,
  description text,
  skills text[] not null default '{}',
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index experiences_user_idx on public.experiences (user_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  name text not null,
  role text,
  description text,
  url text,
  skills text[] not null default '{}',
  roadmap_stage_id uuid,
  created_at timestamptz not null default now()
);
create index projects_user_idx on public.projects (user_id);

create table public.user_skills (
  user_id uuid not null references public.profiles on delete cascade,
  skill_id text not null references public.skills on delete cascade,
  level smallint not null default 2 check (level between 1 and 3),
  source text not null default 'manual' check (source in ('resume', 'manual', 'roadmap')),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);
create index user_skills_skill_idx on public.user_skills (skill_id);

create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  name text not null,
  issuer text,
  year text,
  url text,
  created_at timestamptz not null default now()
);
create index certifications_user_idx on public.certifications (user_id);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  title text not null,
  url text not null,
  kind text not null default 'other' check (kind in ('github', 'website', 'work', 'other')),
  description text,
  created_at timestamptz not null default now()
);
create index portfolio_items_user_idx on public.portfolio_items (user_id);

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  file_path text not null unique,
  file_name text not null,
  raw_text text,
  parsed jsonb,
  is_primary boolean not null default true,
  created_at timestamptz not null default now()
);
create index resumes_user_idx on public.resumes (user_id);

create table public.journey_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  year int not null,
  title text not null,
  subtitle text,
  description text,
  created_at timestamptz not null default now()
);
create index journey_entries_user_idx on public.journey_entries (user_id, year);

-- ---------------------------------------------------------------------
-- Career roadmap
-- ---------------------------------------------------------------------
create table public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  career_id text not null references public.careers,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index roadmaps_one_active_idx on public.roadmaps (user_id) where is_active;
create index roadmaps_career_idx on public.roadmaps (career_id);

create table public.roadmap_stages (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  position int not null,
  period_label text not null,
  title text not null,
  description text,
  kind public.roadmap_stage_kind not null,
  skill_id text references public.skills,
  evidence_note text,
  evidence_url text,
  completed_at timestamptz
);
create index roadmap_stages_roadmap_idx on public.roadmap_stages (roadmap_id, position);
create index roadmap_stages_user_idx on public.roadmap_stages (user_id);
create index roadmap_stages_skill_idx on public.roadmap_stages (skill_id);

alter table public.projects
  add constraint projects_roadmap_stage_fk
  foreign key (roadmap_stage_id) references public.roadmap_stages on delete set null;
create index projects_roadmap_stage_idx on public.projects (roadmap_stage_id);

create table public.roadmap_tasks (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references public.roadmap_stages on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  title text not null,
  skill_id text references public.skills,
  target_level smallint check (target_level between 1 and 3),
  is_done boolean not null default false,
  done_at timestamptz,
  position int not null default 0
);
create index roadmap_tasks_stage_idx on public.roadmap_tasks (stage_id, position);
create index roadmap_tasks_user_idx on public.roadmap_tasks (user_id);
create index roadmap_tasks_skill_idx on public.roadmap_tasks (skill_id);

-- ---------------------------------------------------------------------
-- Community
-- ---------------------------------------------------------------------
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles on delete cascade,
  community_id uuid references public.communities on delete set null,
  type public.post_type not null default 'experience',
  title text not null check (char_length(title) between 3 and 200),
  body text not null check (char_length(body) between 1 and 20000),
  tags text[] not null default '{}',
  like_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_created_idx on public.posts (created_at desc);
create index posts_community_idx on public.posts (community_id, created_at desc);
create index posts_author_idx on public.posts (author_id, created_at desc);

create table public.post_likes (
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_likes_user_idx on public.post_likes (user_id);

create table public.post_saves (
  post_id uuid not null references public.posts on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_saves_user_idx on public.post_saves (user_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts on delete cascade,
  author_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);
create index comments_author_idx on public.comments (author_id);

create table public.follows (
  follower_id uuid not null references public.profiles on delete cascade,
  target_type public.follow_target not null,
  target_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, target_type, target_id)
);
create index follows_target_idx on public.follows (target_type, target_id);

-- ---------------------------------------------------------------------
-- Jobs & applications
-- ---------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies on delete cascade,
  posted_by uuid references public.profiles on delete set null,
  title text not null,
  location text,
  job_type public.job_type not null default 'full_time',
  industry text,
  career_id text references public.careers on delete set null,
  experience_level text,
  education_requirement text,
  salary_range text,
  description text,
  responsibilities text[] not null default '{}',
  requirements text[] not null default '{}',
  preferred_qualifications text[] not null default '{}',
  required_skills text[] not null default '{}',
  preferred_skills text[] not null default '{}',
  grad_years int[] not null default '{}',
  deadline date,
  status public.job_status not null default 'open',
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_status_created_idx on public.jobs (status, created_at desc);
create index jobs_company_idx on public.jobs (company_id);
create index jobs_posted_by_idx on public.jobs (posted_by);
create index jobs_career_idx on public.jobs (career_id);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  status public.application_status not null default 'saved',
  resume_id uuid references public.resumes on delete set null,
  cover_letter text,
  share_profile boolean not null default true,
  share_portfolio boolean not null default true,
  shortlisted boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, user_id)
);
create index applications_user_idx on public.applications (user_id, updated_at desc);
create index applications_job_idx on public.applications (job_id);
create index applications_resume_idx on public.applications (resume_id);

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications on delete cascade,
  status public.application_status not null,
  note text,
  actor_id uuid references public.profiles on delete set null,
  created_at timestamptz not null default now()
);
create index application_events_app_idx on public.application_events (application_id, created_at);
create index application_events_actor_idx on public.application_events (actor_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  kind public.invitation_kind not null,
  job_id uuid not null references public.jobs on delete cascade,
  candidate_id uuid not null references public.profiles on delete cascade,
  recruiter_id uuid not null references public.profiles on delete cascade,
  message text,
  status public.invitation_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index invitations_candidate_idx on public.invitations (candidate_id, created_at desc);
create index invitations_recruiter_idx on public.invitations (recruiter_id);
create index invitations_job_idx on public.invitations (job_id);

create table public.saved_candidates (
  recruiter_id uuid not null references public.profiles on delete cascade,
  candidate_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recruiter_id, candidate_id)
);
create index saved_candidates_candidate_idx on public.saved_candidates (candidate_id);

-- ---------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs on delete set null,
  created_by uuid references public.profiles on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index conversations_job_idx on public.conversations (job_id);
create index conversations_created_by_idx on public.conversations (created_by);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade,
  body text not null default '' check (char_length(body) <= 5000),
  attachment jsonb,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_sender_idx on public.messages (sender_id);

-- ---------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  actor_id uuid references public.profiles on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_actor_idx on public.notifications (actor_id);

-- =====================================================================
-- Helper functions (security definer so they can be used inside RLS
-- without recursive policy evaluation)
-- =====================================================================
create or replace function public.is_recruiter()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.role = 'recruiter' from public.profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.my_company_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select p.company_id from public.profiles p where p.id = auth.uid() and p.role = 'recruiter';
$$;

create or replace function public.is_job_manager(p_job uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.jobs j
    join public.profiles p on p.id = auth.uid()
    where j.id = p_job
      and p.role = 'recruiter'
      and (j.posted_by = p.id or (p.company_id is not null and j.company_id = p.company_id))
  );
$$;

-- Can the current user see the detailed career profile (education,
-- experience, skills...) of p_user?
create or replace function public.can_view_profile(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    p_user = auth.uid()
    or exists (select 1 from public.profiles t where t.id = p_user and t.profile_public)
    or (
      public.is_recruiter() and (
        exists (select 1 from public.profiles t where t.id = p_user and t.open_to_opportunities)
        or exists (
          select 1 from public.applications a
          where a.user_id = p_user and a.status <> 'saved' and public.is_job_manager(a.job_id)
        )
      )
    );
$$;

create or replace function public.can_view_resume(p_resume uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.resumes r
    join public.profiles o on o.id = r.user_id
    where r.id = p_resume and (
      r.user_id = auth.uid()
      or (o.resume_public and public.can_view_profile(r.user_id))
      or exists (
        select 1 from public.applications a
        where a.resume_id = r.id and a.status <> 'saved' and public.is_job_manager(a.job_id)
      )
    )
  );
$$;

create or replace function public.can_read_resume_path(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.resumes r where r.file_path = p_path and public.can_view_resume(r.id)
  );
$$;

create or replace function public.is_conversation_member(p_conversation uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = p_conversation and m.user_id = auth.uid()
  );
$$;

create or replace function public.can_invite(p_candidate uuid, p_job uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_job_manager(p_job) and (
    exists (
      select 1 from public.profiles t
      where t.id = p_candidate and t.open_to_opportunities and t.allow_recruiter_contact
    )
    or exists (
      select 1 from public.applications a
      where a.user_id = p_candidate and a.job_id = p_job and a.status <> 'saved'
    )
  );
$$;

-- =====================================================================
-- RPCs called from the app
-- =====================================================================

-- Open (or reuse) a conversation with another user. p_job links the
-- conversation to a job posting (recruiter chat). Enforces messaging
-- privacy settings.
create or replace function public.start_conversation(p_other uuid, p_job uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := auth.uid();
  v_conv uuid;
  v_other public.profiles%rowtype;
  v_allowed boolean := false;
begin
  if v_me is null then raise exception 'not_authenticated'; end if;
  if p_other = v_me then raise exception 'cannot_message_self'; end if;

  select c.id into v_conv
  from public.conversations c
  where c.job_id is not distinct from p_job
    and exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = v_me)
    and exists (select 1 from public.conversation_members m where m.conversation_id = c.id and m.user_id = p_other)
  limit 1;
  if v_conv is not null then return v_conv; end if;

  select * into v_other from public.profiles where id = p_other;
  if not found then raise exception 'user_not_found'; end if;

  if p_job is not null and exists (
    select 1 from public.jobs j
    where j.id = p_job and (j.posted_by = p_other or (v_other.role = 'recruiter' and v_other.company_id = j.company_id))
  ) then
    -- A candidate reaching out to the recruiter who owns this job.
    v_allowed := true;
  elsif public.is_recruiter() then
    v_allowed := v_other.allow_recruiter_contact and (
      v_other.open_to_opportunities
      or exists (
        select 1 from public.applications a
        where a.user_id = p_other and a.status <> 'saved' and public.is_job_manager(a.job_id)
      )
    );
  elsif v_other.dm_policy = 'everyone' then
    v_allowed := true;
  elsif v_other.dm_policy = 'followers' then
    v_allowed := exists (
      select 1 from public.follows f
      where f.follower_id = p_other and f.target_type = 'user' and f.target_id = v_me::text
    );
  end if;

  if not v_allowed then raise exception 'messaging_not_allowed'; end if;

  insert into public.conversations (job_id, created_by) values (p_job, v_me) returning id into v_conv;
  insert into public.conversation_members (conversation_id, user_id) values (v_conv, v_me), (v_conv, p_other);
  return v_conv;
end;
$$;

-- Recruiter or applicant changes an application's status.
create or replace function public.set_application_status(
  p_application uuid, p_status public.application_status, p_note text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_app public.applications%rowtype;
begin
  select * into v_app from public.applications where id = p_application;
  if not found then raise exception 'application_not_found'; end if;

  if public.is_job_manager(v_app.job_id) then
    if p_status not in ('viewed', 'screening', 'interview', 'offer', 'rejected') then
      raise exception 'invalid_status_for_recruiter';
    end if;
  elsif v_app.user_id = auth.uid() then
    if p_status not in ('saved', 'applied', 'withdrawn') then
      raise exception 'invalid_status_for_applicant';
    end if;
  else
    raise exception 'not_allowed';
  end if;

  perform set_config('app.status_note', coalesce(p_note, ''), true);
  update public.applications
    set status = p_status,
        submitted_at = case when p_status = 'applied' and submitted_at is null then now() else submitted_at end
    where id = p_application;
end;
$$;

create or replace function public.set_application_shortlisted(p_application uuid, p_value boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_job uuid;
begin
  select job_id into v_job from public.applications where id = p_application;
  if v_job is null or not public.is_job_manager(v_job) then raise exception 'not_allowed'; end if;
  update public.applications set shortlisted = p_value where id = p_application;
end;
$$;

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void language sql security definer set search_path = '' as $$
  update public.conversation_members
    set last_read_at = now()
    where conversation_id = p_conversation and user_id = auth.uid();
$$;

-- =====================================================================
-- Triggers
-- =====================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();
create trigger jobs_touch before update on public.jobs
  for each row execute function public.touch_updated_at();
create trigger applications_touch before update on public.applications
  for each row execute function public.touch_updated_at();

-- New auth user -> profile row
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Internal helper to create notifications from triggers.
create or replace function public.notify(
  p_user uuid, p_kind text, p_title text, p_body text, p_link text, p_actor uuid
)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, link, actor_id)
  select p_user, p_kind, p_title, p_body, p_link, p_actor
  where p_user is not null and p_user is distinct from p_actor;
$$;
revoke execute on function public.notify(uuid, text, text, text, text, uuid) from public, anon, authenticated;

-- Likes -> counter + notification
create or replace function public.on_post_like()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_post public.posts%rowtype;
  v_name text;
begin
  if tg_op = 'INSERT' then
    update public.posts set like_count = like_count + 1 where id = new.post_id returning * into v_post;
    select full_name into v_name from public.profiles where id = new.user_id;
    perform public.notify(v_post.author_id, 'post_like', coalesce(v_name, 'Someone') || ' liked your post',
      v_post.title, '/community/post/' || v_post.id, new.user_id);
    return new;
  else
    update public.posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
    return old;
  end if;
end;
$$;
create trigger post_likes_count after insert or delete on public.post_likes
  for each row execute function public.on_post_like();

-- Comments -> counter + notification
create or replace function public.on_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_post public.posts%rowtype;
  v_name text;
begin
  if tg_op = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id returning * into v_post;
    select full_name into v_name from public.profiles where id = new.author_id;
    perform public.notify(v_post.author_id, 'post_comment', coalesce(v_name, 'Someone') || ' commented on your post',
      left(new.body, 140), '/community/post/' || v_post.id, new.author_id);
    return new;
  else
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    return old;
  end if;
end;
$$;
create trigger comments_count after insert or delete on public.comments
  for each row execute function public.on_comment();

-- Follow a person -> notification
create or replace function public.on_follow()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
begin
  if new.target_type = 'user' then
    select full_name into v_name from public.profiles where id = new.follower_id;
    perform public.notify(new.target_id::uuid, 'new_follower', coalesce(v_name, 'Someone') || ' started following you',
      null, '/u/' || new.follower_id, new.follower_id);
  end if;
  return new;
end;
$$;
create trigger follows_notify after insert on public.follows
  for each row execute function public.on_follow();

-- Messages -> bump conversation + notify other members
create or replace function public.on_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_sender public.profiles%rowtype;
  v_member uuid;
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  update public.conversation_members set last_read_at = new.created_at
    where conversation_id = new.conversation_id and user_id = new.sender_id;
  select * into v_sender from public.profiles where id = new.sender_id;
  for v_member in
    select user_id from public.conversation_members
    where conversation_id = new.conversation_id and user_id <> new.sender_id
  loop
    perform public.notify(
      v_member,
      case when v_sender.role = 'recruiter' then 'recruiter_reply' else 'message' end,
      case when v_sender.role = 'recruiter'
        then coalesce(v_sender.full_name, 'A recruiter') || ' (recruiter) sent you a message'
        else coalesce(v_sender.full_name, 'Someone') || ' sent you a message' end,
      left(coalesce(nullif(new.body, ''), 'Shared an attachment'), 140),
      '/messages/' || new.conversation_id,
      new.sender_id
    );
  end loop;
  return new;
end;
$$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message();

-- Applications: guard recruiter-only columns, write timeline events,
-- notify the other side.
create or replace function public.applications_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and auth.uid() is not null and auth.uid() = old.user_id then
    new.shortlisted := old.shortlisted;
    new.job_id := old.job_id;
    new.user_id := old.user_id;
  end if;
  if new.status = 'applied' and new.submitted_at is null then
    new.submitted_at := now();
  end if;
  return new;
end;
$$;
create trigger applications_guard before insert or update on public.applications
  for each row execute function public.applications_guard();

create or replace function public.on_application_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_job public.jobs%rowtype;
  v_company text;
  v_applicant text;
  v_note text := nullif(current_setting('app.status_note', true), '');
begin
  if tg_op = 'UPDATE' and new.status = old.status then
    return new;
  end if;

  insert into public.application_events (application_id, status, note, actor_id)
  values (new.id, new.status, v_note, auth.uid());

  select * into v_job from public.jobs where id = new.job_id;
  select name into v_company from public.companies where id = v_job.company_id;

  if new.status = 'applied' then
    select full_name into v_applicant from public.profiles where id = new.user_id;
    perform public.notify(v_job.posted_by, 'new_application',
      coalesce(v_applicant, 'A candidate') || ' applied for ' || v_job.title,
      null, '/employer/jobs/' || v_job.id || '/candidates', new.user_id);
  elsif new.status in ('viewed', 'screening', 'interview', 'offer', 'rejected')
        and auth.uid() is distinct from new.user_id then
    perform public.notify(new.user_id, 'application_status',
      'Application update: ' || v_job.title || ' at ' || coalesce(v_company, 'the company'),
      'Your application status is now ' || initcap(new.status::text) || '.',
      '/applications/' || new.id, auth.uid());
  end if;
  return new;
end;
$$;
create trigger applications_after_change after insert or update of status on public.applications
  for each row execute function public.on_application_change();

-- Invitations -> notify candidate / recruiter
create or replace function public.on_invitation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_job public.jobs%rowtype;
  v_company text;
  v_candidate text;
begin
  select * into v_job from public.jobs where id = new.job_id;
  select name into v_company from public.companies where id = v_job.company_id;
  if tg_op = 'INSERT' then
    perform public.notify(new.candidate_id,
      case when new.kind = 'interview' then 'interview_invite' else 'apply_invite' end,
      case when new.kind = 'interview'
        then coalesce(v_company, 'A company') || ' invited you to interview for ' || v_job.title
        else coalesce(v_company, 'A company') || ' invited you to apply for ' || v_job.title end,
      new.message, '/jobs/' || v_job.id, new.recruiter_id);
  elsif new.status <> old.status then
    select full_name into v_candidate from public.profiles where id = new.candidate_id;
    perform public.notify(new.recruiter_id, 'invitation_response',
      coalesce(v_candidate, 'A candidate') || ' ' || new.status::text || ' your invitation for ' || v_job.title,
      null, '/employer/candidates/' || new.candidate_id || '?job=' || v_job.id, new.candidate_id);
  end if;
  return new;
end;
$$;
create trigger invitations_notify after insert or update of status on public.invitations
  for each row execute function public.on_invitation();

-- New open job -> notify seekers whose goal is that career
create or replace function public.on_job_published()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_company text;
begin
  if new.status = 'open' and new.career_id is not null
     and (tg_op = 'INSERT' or old.status is distinct from 'open') then
    select name into v_company from public.companies where id = new.company_id;
    insert into public.notifications (user_id, kind, title, body, link, actor_id)
    select g.user_id, 'job_recommendation',
           'New opportunity for your goal: ' || new.title,
           coalesce(v_company, '') || coalesce(' · ' || new.location, ''),
           '/jobs/' || new.id, new.posted_by
    from public.career_goals g
    where g.career_id = new.career_id and g.user_id is distinct from new.posted_by;
  end if;
  return new;
end;
$$;
create trigger jobs_published after insert or update of status on public.jobs
  for each row execute function public.on_job_published();

-- =====================================================================
-- Row level security
-- =====================================================================
alter table public.skills enable row level security;
alter table public.careers enable row level security;
alter table public.career_skills enable row level security;
alter table public.companies enable row level security;
alter table public.communities enable row level security;
alter table public.profiles enable row level security;
alter table public.career_preferences enable row level security;
alter table public.career_goals enable row level security;
alter table public.educations enable row level security;
alter table public.experiences enable row level security;
alter table public.projects enable row level security;
alter table public.user_skills enable row level security;
alter table public.certifications enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.resumes enable row level security;
alter table public.journey_entries enable row level security;
alter table public.roadmaps enable row level security;
alter table public.roadmap_stages enable row level security;
alter table public.roadmap_tasks enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_saves enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.application_events enable row level security;
alter table public.invitations enable row level security;
alter table public.saved_candidates enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

-- Reference data: readable by everyone
create policy "skills readable" on public.skills for select to anon, authenticated using (true);
create policy "custom skills insertable" on public.skills for insert to authenticated
  with check (is_custom and created_by = (select auth.uid()));
create policy "careers readable" on public.careers for select to anon, authenticated using (true);
create policy "career skills readable" on public.career_skills for select to anon, authenticated using (true);
create policy "communities readable" on public.communities for select to anon, authenticated using (true);
create policy "companies readable" on public.companies for select to anon, authenticated using (true);
create policy "companies insertable by creator" on public.companies for insert to authenticated
  with check (created_by = (select auth.uid()) and not is_sample);
create policy "companies editable by their recruiters" on public.companies for update to authenticated
  using (created_by = (select auth.uid()) or id = (select public.my_company_id()))
  with check (not is_sample);

-- Profiles: basic identity is visible to signed-in users; details are
-- protected per table via can_view_profile().
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "profiles self insert" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "profiles self update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "preferences owner" on public.career_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "goals readable" on public.career_goals for select to authenticated
  using (
    user_id = (select auth.uid())
    or (public.can_view_profile(user_id)
        and exists (select 1 from public.profiles p where p.id = career_goals.user_id and p.goal_public))
  );
create policy "goals owner write" on public.career_goals for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "goals owner update" on public.career_goals for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "goals owner delete" on public.career_goals for delete to authenticated
  using (user_id = (select auth.uid()));

-- Profile detail tables share the same pattern
do $$
declare t text;
begin
  foreach t in array array['educations', 'experiences', 'projects', 'user_skills', 'certifications', 'portfolio_items']
  loop
    execute format('create policy "%1$s readable" on public.%1$I for select to authenticated using (public.can_view_profile(user_id))', t);
    execute format('create policy "%1$s owner insert" on public.%1$I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s owner update" on public.%1$I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "%1$s owner delete" on public.%1$I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Career journeys are community content: visible to all signed-in users
create policy "journey readable" on public.journey_entries for select to authenticated using (true);
create policy "journey owner insert" on public.journey_entries for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "journey owner update" on public.journey_entries for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "journey owner delete" on public.journey_entries for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "resumes readable" on public.resumes for select to authenticated
  using (public.can_view_resume(id));
create policy "resumes owner insert" on public.resumes for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "resumes owner update" on public.resumes for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "resumes owner delete" on public.resumes for delete to authenticated
  using (user_id = (select auth.uid()));

-- Roadmaps are private to their owner
create policy "roadmaps owner" on public.roadmaps for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "roadmap stages owner" on public.roadmap_stages for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "roadmap tasks owner" on public.roadmap_tasks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Community
create policy "posts readable" on public.posts for select to authenticated using (true);
create policy "posts author insert" on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()));
create policy "posts author update" on public.posts for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "posts author delete" on public.posts for delete to authenticated
  using (author_id = (select auth.uid()));

create policy "likes readable" on public.post_likes for select to authenticated using (true);
create policy "likes own insert" on public.post_likes for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "likes own delete" on public.post_likes for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "saves own" on public.post_saves for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "comments readable" on public.comments for select to authenticated using (true);
create policy "comments own insert" on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()));
create policy "comments own delete" on public.comments for delete to authenticated
  using (author_id = (select auth.uid()));

create policy "follows readable" on public.follows for select to authenticated using (true);
create policy "follows own insert" on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()));
create policy "follows own delete" on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()));

-- Jobs
create policy "jobs readable" on public.jobs for select to authenticated
  using (status = 'open' or public.is_job_manager(id));
create policy "jobs recruiter insert" on public.jobs for insert to authenticated
  with check (
    posted_by = (select auth.uid())
    and (select public.is_recruiter())
    and company_id = (select public.my_company_id())
    and not is_sample
  );
create policy "jobs manager update" on public.jobs for update to authenticated
  using (public.is_job_manager(id)) with check (public.is_job_manager(id) and not is_sample);
create policy "jobs manager delete" on public.jobs for delete to authenticated
  using (public.is_job_manager(id));

create policy "applications readable" on public.applications for select to authenticated
  using (user_id = (select auth.uid()) or (status <> 'saved' and public.is_job_manager(job_id)));
create policy "applications own insert" on public.applications for insert to authenticated
  with check (user_id = (select auth.uid()) and status in ('saved', 'applied') and not shortlisted);
create policy "applications own update" on public.applications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and status in ('saved', 'applied', 'withdrawn'));
create policy "applications own delete" on public.applications for delete to authenticated
  using (user_id = (select auth.uid()) and status = 'saved');

create policy "application events readable" on public.application_events for select to authenticated
  using (exists (
    select 1 from public.applications a
    where a.id = application_events.application_id
      and (a.user_id = (select auth.uid()) or public.is_job_manager(a.job_id))
  ));

create policy "invitations readable" on public.invitations for select to authenticated
  using (candidate_id = (select auth.uid()) or recruiter_id = (select auth.uid()));
create policy "invitations recruiter insert" on public.invitations for insert to authenticated
  with check (recruiter_id = (select auth.uid()) and status = 'pending' and public.can_invite(candidate_id, job_id));
create policy "invitations candidate respond" on public.invitations for update to authenticated
  using (candidate_id = (select auth.uid()))
  with check (candidate_id = (select auth.uid()) and status in ('accepted', 'declined'));

create policy "saved candidates own" on public.saved_candidates for all to authenticated
  using (recruiter_id = (select auth.uid()))
  with check (recruiter_id = (select auth.uid()) and (select public.is_recruiter()));

-- Messaging (conversations are created through start_conversation)
create policy "conversations readable by members" on public.conversations for select to authenticated
  using (public.is_conversation_member(id));
create policy "members readable by members" on public.conversation_members for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy "messages readable by members" on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id));
create policy "messages insert by members" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.is_conversation_member(conversation_id));

-- Notifications
create policy "notifications own read" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications own update" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "notifications own delete" on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

-- =====================================================================
-- Storage: private resume files, one folder per user
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes', 'resumes', false, 10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do nothing;

create policy "resume files owner upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "resume files read" on storage.objects for select to authenticated
  using (
    bucket_id = 'resumes'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or public.can_read_resume_path(name))
  );
create policy "resume files owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- =====================================================================
-- Realtime for chat and notification badges
-- =====================================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

-- Backfill profiles for accounts created before this migration
insert into public.profiles (id, full_name)
select u.id, coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do nothing;
