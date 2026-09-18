-- Covering index for the custom-skill creator foreign key (performance advisor).
create index if not exists skills_created_by_idx on public.skills (created_by);
