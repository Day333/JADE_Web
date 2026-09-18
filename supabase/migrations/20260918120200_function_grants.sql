-- Lock down function execution rights.
-- Trigger functions are never called directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.on_post_like() from public, anon, authenticated;
revoke execute on function public.on_comment() from public, anon, authenticated;
revoke execute on function public.on_follow() from public, anon, authenticated;
revoke execute on function public.on_message() from public, anon, authenticated;
revoke execute on function public.on_application_change() from public, anon, authenticated;
revoke execute on function public.on_invitation() from public, anon, authenticated;
revoke execute on function public.on_job_published() from public, anon, authenticated;
revoke execute on function public.applications_guard() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- RLS helpers and app RPCs: signed-in users only.
do $$
declare f text;
begin
  foreach f in array array[
    'public.is_recruiter()',
    'public.my_company_id()',
    'public.is_job_manager(uuid)',
    'public.can_view_profile(uuid)',
    'public.can_view_resume(uuid)',
    'public.can_read_resume_path(text)',
    'public.is_conversation_member(uuid)',
    'public.can_invite(uuid, uuid)',
    'public.start_conversation(uuid, uuid)',
    'public.set_application_status(uuid, public.application_status, text)',
    'public.set_application_shortlisted(uuid, boolean)',
    'public.mark_conversation_read(uuid)'
  ]
  loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
