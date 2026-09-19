-- Public activity feed for profile pages: per-day activity totals only
-- (no application/interview breakdown), so a member can show an activity
-- heatmap on their public profile without exposing raw application data.
-- Visibility follows the same rule as the detailed career profile.
create or replace function public.public_activity(p_user uuid)
returns table (day date, total int)
language sql
stable
security definer
set search_path = ''
as $$
  select acts.day, count(*)::int as total
  from (
    select e.created_at::date as day
      from public.application_events e
      join public.applications a on a.id = e.application_id
      where a.user_id = p_user and e.status in ('applied', 'interview')
    union all
    select done_at::date from public.practice_progress where user_id = p_user
  ) acts
  where (select auth.uid()) is not null
    and (p_user = (select auth.uid()) or public.can_view_profile(p_user))
    and acts.day >= current_date - 370
  group by acts.day;
$$;

revoke execute on function public.public_activity(uuid) from public, anon;
grant execute on function public.public_activity(uuid) to authenticated;
