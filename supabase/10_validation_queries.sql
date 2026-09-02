-- Field Ledger read-only validation queries.
-- Run in Supabase SQL Editor after the setup scripts.
-- These statements do not create, update, or delete data.

-- 1. Confirm the current signed-in user's linked fleet profile.
select
  auth.uid() as auth_user_id,
  public.current_driver_id() as fleet_profile_id,
  public.current_driver_role() as fleet_role;

-- 2. Confirm the truck register and active checklist are available.
select count(*) as truck_count from public.trucks;
select count(*) as active_checklist_templates
from public.checklist_templates
where active = true;

-- 3. Find duplicate registration values in the source register.
select registration, count(*) as fleet_count, array_agg(fleet_number order by fleet_number) as fleet_numbers
from public.trucks
group by registration
having count(*) > 1
order by registration;

-- 4. Confirm admin-only write policies are installed for master data.
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('trucks', 'drivers')
  and cmd in ('INSERT', 'UPDATE', 'DELETE')
order by tablename, cmd, policyname;
