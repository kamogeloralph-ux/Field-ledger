-- Field Ledger: safe admin-only truck policies.
-- This script intentionally does not touch driver policies.
-- Safe to run repeatedly.

alter table public.trucks enable row level security;

drop policy if exists trucks_insert_admin_only on public.trucks;
create policy trucks_insert_admin_only on public.trucks
  for insert to authenticated
  with check (public.current_driver_role() = 'admin');

drop policy if exists trucks_update_admin_only on public.trucks;
create policy trucks_update_admin_only on public.trucks
  for update to authenticated
  using (public.current_driver_role() = 'admin')
  with check (public.current_driver_role() = 'admin');

drop policy if exists trucks_delete_admin_only on public.trucks;
create policy trucks_delete_admin_only on public.trucks
  for delete to authenticated
  using (public.current_driver_role() = 'admin');

-- Confirm the truck policies now present.
select policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'trucks'
  and policyname in ('trucks_insert_admin_only', 'trucks_update_admin_only', 'trucks_delete_admin_only')
order by policyname;
