-- Rovana public driver capture hardening.
-- Run this migration in the Supabase SQL Editor.
-- It intentionally limits anon access to lookup data and completed inspection capture.

alter table public.daily_inspections alter column driver_id drop not null;

grant usage on schema public to anon;
grant select on public.trucks, public.checklist_templates, public.checklist_items to anon;
grant insert on public.daily_inspections, public.inspection_answers, public.inspection_photos to anon;
grant usage, select on all sequences in schema public to anon;

drop policy if exists trucks_select_anon on public.trucks;
create policy trucks_select_anon on public.trucks for select to anon using (true);

drop policy if exists checklist_templates_select_anon on public.checklist_templates;
create policy checklist_templates_select_anon on public.checklist_templates for select to anon using (active = true);

drop policy if exists checklist_items_select_anon on public.checklist_items;
create policy checklist_items_select_anon on public.checklist_items for select to anon using (exists (select 1 from public.checklist_templates t where t.id = template_id and t.active = true));

drop policy if exists inspections_insert_anon on public.daily_inspections;
create policy inspections_insert_anon on public.daily_inspections
  for insert to anon
  with check (
    driver_id is null
    and driver_name is not null
    and length(trim(driver_name)) >= 2
    and truck_id is not null
    and checklist_template_id is not null
    and status = 'completed'
  );

drop policy if exists answers_insert_anon on public.inspection_answers;
create policy answers_insert_anon on public.inspection_answers
  for insert to anon
  with check (exists (
    select 1 from public.daily_inspections i
    where i.id = inspection_id and i.driver_id is null and i.driver_name is not null
  ));

drop policy if exists photos_insert_anon on public.inspection_photos;
create policy photos_insert_anon on public.inspection_photos
  for insert to anon
  with check (
    exists (
      select 1 from public.daily_inspections i
      where i.id = inspection_id and i.driver_id is null and i.driver_name is not null
    )
    and photo_type in ('selfie', 'front', 'rear', 'left', 'right', 'cab', 'dashboard')
  );

grant insert on storage.objects to anon;
drop policy if exists inspection_photo_objects_insert_anon on storage.objects;
create policy inspection_photo_objects_insert_anon on storage.objects
  for insert to anon
  with check (
    bucket_id = 'inspection-photos'
    and exists (
      select 1 from public.daily_inspections i
      where i.id = split_part(name, '/', 1)::uuid
        and i.driver_id is null
        and i.driver_name is not null
    )
  );
