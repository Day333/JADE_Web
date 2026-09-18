-- Jobs stay visible to the recruiter who posted them (also inside
-- INSERT ... RETURNING for drafts) and to seekers who applied, even after
-- the listing closes.
drop policy "jobs readable" on public.jobs;
create policy "jobs readable" on public.jobs for select to authenticated using (
  status = 'open'
  or posted_by = (select auth.uid())
  or public.is_job_manager(id)
  or exists (select 1 from public.applications a where a.job_id = jobs.id and a.user_id = (select auth.uid()))
);
