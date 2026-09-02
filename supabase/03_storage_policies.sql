-- Private Storage policies for inspection-photos. The object name format is
-- inspection UUID / photo type + random UUID + extension.
drop policy if exists inspection_photo_objects_select on storage.objects;
create policy inspection_photo_objects_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'inspection-photos'
    and (
      public.current_driver_role() in ('supervisor', 'admin')
      or exists (
        select 1 from public.daily_inspections i
        where i.id = split_part(name, '/', 1)::uuid
        and i.driver_id = public.current_driver_id()
      )
    )
  );

drop policy if exists inspection_photo_objects_insert on storage.objects;
create policy inspection_photo_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'inspection-photos'
    and exists (
      select 1 from public.daily_inspections i
      where i.id = split_part(name, '/', 1)::uuid
      and (i.driver_id = public.current_driver_id() or public.current_driver_role() in ('supervisor', 'admin'))
    )
  );

drop policy if exists inspection_photo_objects_update on storage.objects;
create policy inspection_photo_objects_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'inspection-photos'
    and (
      public.current_driver_role() in ('supervisor', 'admin')
      or exists (select 1 from public.daily_inspections i where i.id = split_part(name, '/', 1)::uuid and i.driver_id = public.current_driver_id())
    )
  )
  with check (bucket_id = 'inspection-photos');

drop policy if exists inspection_photo_objects_delete on storage.objects;
create policy inspection_photo_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'inspection-photos'
    and (
      public.current_driver_role() in ('supervisor', 'admin')
      or exists (select 1 from public.daily_inspections i where i.id = split_part(name, '/', 1)::uuid and i.driver_id = public.current_driver_id())
    )
  );
