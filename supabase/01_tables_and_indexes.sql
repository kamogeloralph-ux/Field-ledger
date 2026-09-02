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
