-- Rovana final public-driver inspection insert fix.
-- Run this file in the Supabase SQL Editor.

alter table public.daily_inspections enable row level security;
alter table public.daily_inspections alter column driver_id drop not null;

grant usage on schema public to anon;
grant insert on public.daily_inspections to anon;

drop policy if exists inspections_insert_anon on public.daily_inspections;
create policy inspections_insert_anon on public.daily_inspections
  for insert
  to anon
  with check (
    driver_id is null
    and driver_name is not null
    and length(trim(driver_name)) >= 2
    and truck_id is not null
    and checklist_template_id is not null
    and inspection_date is not null
    and status = 'completed'
  );
