-- Driver-free inspection capture migration.
-- Review this policy model with your operations administrator before production use.

alter table public.daily_inspections alter column driver_id drop not null;
alter table public.daily_inspections add column if not exists driver_name text;
alter table public.daily_inspections add column if not exists selfie_storage_path text;

-- Anonymous users can read only the data needed to start an inspection.
drop policy if exists trucks_select_anon on public.trucks;
create policy trucks_select_anon on public.trucks for select to anon using (true);
drop policy if exists checklist_templates_select_anon on public.checklist_templates;
create policy checklist_templates_select_anon on public.checklist_templates for select to anon using (active = true);
drop policy if exists checklist_items_select_anon on public.checklist_items;
create policy checklist_items_select_anon on public.checklist_items for select to anon using (exists (select 1 from public.checklist_templates t where t.id = template_id and t.active = true));

-- Anonymous users may create a completed inspection and its complete evidence set.
drop policy if exists inspections_insert_anon on public.daily_inspections;
create policy inspections_insert_anon on public.daily_inspections for insert to anon with check (
  driver_id is null and driver_name is not null and length(trim(driver_name)) >= 2 and status = 'completed'
);
drop policy if exists answers_insert_anon on public.inspection_answers;
create policy answers_insert_anon on public.inspection_answers for insert to anon with check (
  exists (select 1 from public.daily_inspections i where i.id = inspection_id and i.driver_id is null and i.driver_name is not null)
);
drop policy if exists photos_insert_anon on public.inspection_photos;
create policy photos_insert_anon on public.inspection_photos for insert to anon with check (
  exists (select 1 from public.daily_inspections i where i.id = inspection_id and i.driver_id is null and i.driver_name is not null)
  and photo_type in ('selfie', 'front', 'rear', 'left', 'right', 'cab', 'dashboard')
);

-- Permit the browser's publishable key to upload evidence only beneath a newly-created inspection UUID.
drop policy if exists inspection_photo_objects_insert_anon on storage.objects;
create policy inspection_photo_objects_insert_anon on storage.objects for insert to anon with check (
  bucket_id = 'inspection-photos'
  and exists (select 1 from public.daily_inspections i where i.id = split_part(name, '/', 1)::uuid and i.driver_id is null and i.driver_name is not null)
);

-- Optional server-side hardening: the application should only submit all seven images.
create or replace function public.validate_anonymous_inspection_evidence()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.driver_id is null and new.status = 'completed' and (new.driver_name is null or length(trim(new.driver_name)) < 2) then
    raise exception 'A full name is required for anonymous inspections';
  end if;
  return new;
end;
$$;
drop trigger if exists validate_anonymous_inspection_evidence on public.daily_inspections;
create trigger validate_anonymous_inspection_evidence before insert or update on public.daily_inspections for each row execute function public.validate_anonymous_inspection_evidence();
