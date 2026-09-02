-- Field Ledger direction: preserve a durable inspection record with explicit identity, evidence, status, and audit history.
-- Run this in the Supabase SQL editor after creating a project. Review RLS policies with your company administrator before production use.

create extension if not exists pgcrypto;

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  employee_number text unique,
  full_name text not null,
  phone text,
  role text not null default 'driver' check (role in ('driver', 'supervisor', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.trucks (
  id uuid primary key default gen_random_uuid(),
  fleet_number text unique not null,
  registration text unique not null,
  truck_type text,
  status text not null default 'ready' check (status in ('ready', 'inspection_due', 'out_of_service')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.truck_assignments (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete restrict,
  truck_id uuid not null references public.trucks(id) on delete restrict,
  assignment_date date not null,
  shift text,
  created_at timestamptz not null default now(),
  unique (driver_id, assignment_date),
  unique (truck_id, assignment_date)
);

create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  version integer not null,
  title text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (version)
);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates(id) on delete cascade,
  section_number text not null,
  section_title text not null,
  prompt text not null,
  sort_order integer not null,
  required boolean not null default true
);

create table if not exists public.daily_inspections (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete restrict,
  truck_id uuid not null references public.trucks(id) on delete restrict,
  assignment_id uuid references public.truck_assignments(id) on delete set null,
  checklist_template_id uuid not null references public.checklist_templates(id) on delete restrict,
  inspection_date date not null,
  started_at timestamptz,
  submitted_at timestamptz,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'needs_review', 'rejected')),
  notes text,
  signature_name text,
  created_at timestamptz not null default now(),
  unique (driver_id, truck_id, inspection_date)
);

create table if not exists public.inspection_answers (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.daily_inspections(id) on delete cascade,
  checklist_item_id uuid not null references public.checklist_items(id) on delete restrict,
  result text not null check (result in ('pass', 'fail', 'not_applicable')),
  comment text,
  created_at timestamptz not null default now(),
  unique (inspection_id, checklist_item_id)
);

create table if not exists public.inspection_photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.daily_inspections(id) on delete cascade,
  photo_type text not null,
  storage_path text not null,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.defects (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.daily_inspections(id) on delete cascade,
  category text not null default 'general',
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'waived')),
  reported_by uuid references public.drivers(id) on delete set null,
  resolved_by uuid references public.drivers(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.drivers(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists truck_assignments_date_idx on public.truck_assignments(assignment_date);
create index if not exists daily_inspections_date_idx on public.daily_inspections(inspection_date);
create index if not exists daily_inspections_status_idx on public.daily_inspections(status);
create index if not exists defects_status_idx on public.defects(status);
create index if not exists inspection_photos_inspection_idx on public.inspection_photos(inspection_id);

-- Private storage bucket for inspection photos. Keep this bucket private in production.
insert into storage.buckets (id, name, public)
values ('inspection-photos', 'inspection-photos', false)
on conflict (id) do nothing;


-- -----------------------------------------------------------------------------
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
