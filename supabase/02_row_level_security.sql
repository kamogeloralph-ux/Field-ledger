-- Row Level Security
-- -----------------------------------------------------------------------------
-- The policies use the auth user's UUID, not an email address. Every signed-in
-- user should have a matching row in public.drivers.auth_user_id.

create or replace function public.current_driver_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.drivers where auth_user_id = auth.uid() limit 1;
$$;

create or replace function public.current_driver_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.drivers where auth_user_id = auth.uid() limit 1;
$$;

revoke all on function public.current_driver_id() from public;
grant execute on function public.current_driver_id() to authenticated;
revoke all on function public.current_driver_role() from public;
grant execute on function public.current_driver_role() to authenticated;

alter table public.drivers enable row level security;
alter table public.trucks enable row level security;
alter table public.truck_assignments enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.checklist_items enable row level security;
alter table public.daily_inspections enable row level security;
alter table public.inspection_answers enable row level security;
alter table public.inspection_photos enable row level security;
alter table public.defects enable row level security;
alter table public.audit_events enable row level security;

-- Drivers can see their own profile. Supervisors and admins can manage the roster.
drop policy if exists drivers_select_self_or_management on public.drivers;
create policy drivers_select_self_or_management on public.drivers
  for select to authenticated
  using (auth_user_id = auth.uid() or public.current_driver_role() in ('supervisor', 'admin'));

drop policy if exists drivers_insert_management on public.drivers;
create policy drivers_insert_management on public.drivers
  for insert to authenticated
  with check (public.current_driver_role() in ('supervisor', 'admin'));

drop policy if exists drivers_update_management_or_self on public.drivers;
create policy drivers_update_management_or_self on public.drivers
  for update to authenticated
  using (auth_user_id = auth.uid() or public.current_driver_role() in ('supervisor', 'admin'))
  with check (auth_user_id = auth.uid() or public.current_driver_role() in ('supervisor', 'admin'));

drop policy if exists drivers_delete_management on public.drivers;
create policy drivers_delete_management on public.drivers
  for delete to authenticated
  using (public.current_driver_role() in ('supervisor', 'admin'));

-- Trucks are visible to signed-in users. Only management can change the register.
drop policy if exists trucks_select_authenticated on public.trucks;
create policy trucks_select_authenticated on public.trucks
  for select to authenticated
  using (true);

drop policy if exists trucks_insert_management on public.trucks;
create policy trucks_insert_management on public.trucks
  for insert to authenticated
  with check (public.current_driver_role() in ('supervisor', 'admin'));

drop policy if exists trucks_update_management on public.trucks;
create policy trucks_update_management on public.trucks
  for update to authenticated
  using (public.current_driver_role() in ('supervisor', 'admin'))
  with check (public.current_driver_role() in ('supervisor', 'admin'));

drop policy if exists trucks_delete_management on public.trucks;
create policy trucks_delete_management on public.trucks
  for delete to authenticated
  using (public.current_driver_role() in ('supervisor', 'admin'));

-- Drivers see their assignments; supervisors/admins see and manage the full schedule.
drop policy if exists assignments_select_own_or_management on public.truck_assignments;
create policy assignments_select_own_or_management on public.truck_assignments
  for select to authenticated
  using (driver_id = public.current_driver_id() or public.current_driver_role() in ('supervisor', 'admin'));

drop policy if exists assignments_insert_management on public.truck_assignments;
create policy assignments_insert_management on public.truck_assignments
  for insert to authenticated
  with check (public.current_driver_role() in ('supervisor', 'admin'));

drop policy if exists assignments_update_management on public.truck_assignments;
create policy assignments_update_management on public.truck_assignments
  for update to authenticated
  using (public.current_driver_role() in ('supervisor', 'admin'))
  with check (public.current_driver_role() in ('supervisor', 'admin'));

drop policy if exists assignments_delete_management on public.truck_assignments;
create policy assignments_delete_management on public.truck_assignments
  for delete to authenticated
  using (public.current_driver_role() in ('supervisor', 'admin'));

-- Checklist definitions are readable by all signed-in users and editable by management.
drop policy if exists checklist_templates_select_authenticated on public.checklist_templates;
create policy checklist_templates_select_authenticated on public.checklist_templates
  for select to authenticated using (true);

drop policy if exists checklist_templates_manage_management on public.checklist_templates;
create policy checklist_templates_manage_management on public.checklist_templates
  for all to authenticated
  using (public.current_driver_role() in ('supervisor', 'admin'))
  with check (public.current_driver_role() in ('supervisor', 'admin'));

drop policy if exists checklist_items_select_authenticated on public.checklist_items;
create policy checklist_items_select_authenticated on public.checklist_items
  for select to authenticated using (true);

drop policy if exists checklist_items_manage_management on public.checklist_items;
create policy checklist_items_manage_management on public.checklist_items
  for all to authenticated
  using (public.current_driver_role() in ('supervisor', 'admin'))
  with check (public.current_driver_role() in ('supervisor', 'admin'));

-- Drivers can create and edit their own inspection until it is submitted. Management can review all.
drop policy if exists inspections_select_own_or_management on public.daily_inspections;
create policy inspections_select_own_or_management on public.daily_inspections
  for select to authenticated
  using (driver_id = public.current_driver_id() or public.current_driver_role() in ('supervisor', 'admin'));

drop policy if exists inspections_insert_own on public.daily_inspections;
create policy inspections_insert_own on public.daily_inspections
  for insert to authenticated
  with check (driver_id = public.current_driver_id());

drop policy if exists inspections_update_own_or_management on public.daily_inspections;
create policy inspections_update_own_or_management on public.daily_inspections
  for update to authenticated
  using (driver_id = public.current_driver_id() or public.current_driver_role() in ('supervisor', 'admin'))
  with check (driver_id = public.current_driver_id() or public.current_driver_role() in ('supervisor', 'admin'));

drop policy if exists inspections_delete_management on public.daily_inspections;
create policy inspections_delete_management on public.daily_inspections
  for delete to authenticated
  using (public.current_driver_role() in ('supervisor', 'admin'));

-- Answers inherit access from their parent inspection.
drop policy if exists answers_select_own_or_management on public.inspection_answers;
create policy answers_select_own_or_management on public.inspection_answers
  for select to authenticated
  using (exists (select 1 from public.daily_inspections i where i.id = inspection_id and (i.driver_id = public.current_driver_id() or public.current_driver_role() in ('supervisor', 'admin'))));

drop policy if exists answers_insert_own on public.inspection_answers;
create policy answers_insert_own on public.inspection_answers
  for insert to authenticated
  with check (exists (select 1 from public.daily_inspections i where i.id = inspection_id and i.driver_id = public.current_driver_id()));

drop policy if exists answers_update_own_or_management on public.inspection_answers;
create policy answers_update_own_or_management on public.inspection_answers
  for update to authenticated
  using (exists (select 1 from public.daily_inspections i where i.id = inspection_id and (i.driver_id = public.current_driver_id() or public.current_driver_role() in ('supervisor', 'admin'))))
  with check (exists (select 1 from public.daily_inspections i where i.id = inspection_id and (i.driver_id = public.current_driver_id() or public.current_driver_role() in ('supervisor', 'admin'))));

drop policy if exists answers_delete_management on public.inspection_answers;
create policy answers_delete_management on public.inspection_answers
  for delete to authenticated
  using (public.current_driver_role() in ('supervisor', 'admin'));

-- Photos inherit access from their parent inspection. The storage object path must
-- begin with the inspection UUID, matching the client upload helper.
drop policy if exists photos_select_own_or_management on public.inspection_photos;
create policy photos_select_own_or_management on public.inspection_photos
  for select to authenticated
  using (exists (select 1 from public.daily_inspections i where i.id = inspection_id and (i.driver_id = public.current_driver_id() or public.current_driver_role() in ('supervisor', 'admin'))));

drop policy if exists photos_insert_own on public.inspection_photos;
create policy photos_insert_own on public.inspection_photos
  for insert to authenticated
  with check (exists (select 1 from public.daily_inspections i where i.id = inspection_id and i.driver_id = public.current_driver_id()));

drop policy if exists photos_delete_own_or_management on public.inspection_photos;
create policy photos_delete_own_or_management on public.inspection_photos
  for delete to authenticated
  using (exists (select 1 from public.daily_inspections i where i.id = inspection_id and (i.driver_id = public.current_driver_id() or public.current_driver_role() in ('supervisor', 'admin'))));

-- Defects are visible to the reporting driver and management. Drivers can report;
-- only management can update resolution status.
drop policy if exists defects_select_own_or_management on public.defects;
create policy defects_select_own_or_management on public.defects
  for select to authenticated
  using (reported_by = public.current_driver_id() or public.current_driver_role() in ('supervisor', 'admin'));

drop policy if exists defects_insert_own on public.defects;
create policy defects_insert_own on public.defects
  for insert to authenticated
  with check (reported_by = public.current_driver_id());

drop policy if exists defects_update_management on public.defects;
create policy defects_update_management on public.defects
  for update to authenticated
  using (public.current_driver_role() in ('supervisor', 'admin'))
  with check (public.current_driver_role() in ('supervisor', 'admin'));

drop policy if exists defects_delete_management on public.defects;
create policy defects_delete_management on public.defects
  for delete to authenticated
  using (public.current_driver_role() in ('supervisor', 'admin'));

-- Audit events are management-readable; authenticated users can append events
-- attributed to themselves.
drop policy if exists audit_select_management on public.audit_events;
create policy audit_select_management on public.audit_events
  for select to authenticated
  using (public.current_driver_role() in ('supervisor', 'admin'));

drop policy if exists audit_insert_self on public.audit_events;
create policy audit_insert_self on public.audit_events
  for insert to authenticated
  with check (actor_id = public.current_driver_id());

