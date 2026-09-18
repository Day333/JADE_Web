-- Every company gets a company community, including companies created by
-- recruiters (users cannot insert communities directly).
create or replace function public.on_company_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.communities (slug, kind, name, description, company_id)
  values (new.slug, 'company', new.name, 'Discuss working at, interviewing with and applying to ' || new.name || '.', new.id)
  on conflict (slug) do nothing;
  return new;
end;
$$;
revoke execute on function public.on_company_created() from public, anon, authenticated;
create trigger companies_community after insert on public.companies
  for each row execute function public.on_company_created();

insert into public.communities (slug, kind, name, description, company_id)
select c.slug, 'company', c.name, 'Discuss working at, interviewing with and applying to ' || c.name || '.', c.id
from public.companies c
where not exists (select 1 from public.communities m where m.company_id = c.id)
on conflict (slug) do nothing;

-- Only real edits should move posts.updated_at; like/comment counters are
-- updated by triggers and must not look like edits.
drop trigger posts_touch on public.posts;
create trigger posts_touch before update of title, body, tags, type, community_id on public.posts
  for each row execute function public.touch_updated_at();
