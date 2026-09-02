-- Field Ledger: admin-only master-data writes.
-- Run after schema.sql / 02_row_level_security.sql.
-- Drivers and supervisors keep authenticated read access where applicable,
-- but only role=admin can add, edit, or delete trucks and driver profiles.

-- Drivers: only admins can insert, update, or delete roster profiles.
drop policy if exists drivers_insert_management on public.drivers;
create policy drivers_insert_admin_only on public.drivers
  for insert to authenticated
  with check (public.current_driver_role() = 'admin');

drop policy if exists drivers_update_management_or_self on public.drivers;
create policy drivers_update_admin_only on public.drivers
  for update to authenticated
  using (public.current_driver_role() = 'admin')
  with check (public.current_driver_role() = 'admin');

drop policy if exists drivers_delete_management on public.drivers;
create policy drivers_delete_admin_only on public.drivers
  for delete to authenticated
  using (public.current_driver_role() = 'admin');

-- Trucks: only admins can insert, update, or delete master fleet records.
drop policy if exists trucks_insert_management on public.trucks;
create policy trucks_insert_admin_only on public.trucks
  for insert to authenticated
  with check (public.current_driver_role() = 'admin');

drop policy if exists trucks_update_management on public.trucks;
create policy trucks_update_admin_only on public.trucks
  for update to authenticated
  using (public.current_driver_role() = 'admin')
  with check (public.current_driver_role() = 'admin');

drop policy if exists trucks_delete_management on public.trucks;
create policy trucks_delete_admin_only on public.trucks
  for delete to authenticated
  using (public.current_driver_role() = 'admin');
