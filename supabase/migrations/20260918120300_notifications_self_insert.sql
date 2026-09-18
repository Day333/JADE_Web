-- Let the app create notifications for the signed-in user themselves
-- (e.g. "Your roadmap is ready", "N new opportunities match your profile").
-- Notifications for other users are only created by database triggers.
create policy "notifications self insert" on public.notifications for insert to authenticated
  with check (user_id = (select auth.uid()) and (actor_id is null or actor_id = (select auth.uid())));
