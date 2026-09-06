-- Wires up the defects and audit_events tables, which already existed in the database but were
-- never used by the app (the sign-in screen even advertises "defects" as a feature already).
--
-- Two problems fixed here, same root cause as 17_storage_policies_super_admin_fix.sql:
-- 1. Their RLS policies still use the old current_driver_role() in ('supervisor','admin') check,
--    which has no 'super_admin' branch and doesn't scope plain 'admin' to their own company.
--    Realigned to can_manage_inspection() / can_manage_company(), same as inspection_photos.
-- 2. Driver-side inspection submission is fully anonymous (no auth session, just a company access
--    code -- see 11_anonymous_driver_rls_hardening.sql) but defects_insert_own required
--    reported_by = current_driver_id(), which is never satisfiable for an anonymous submission.
--    Added a matching anon insert policy so a failed checklist item can auto-create a defect.
--
-- Safe to rerun.

-- ---------------------------------------------------------------------------
-- defects
-- ---------------------------------------------------------------------------

drop policy if exists defects_select_own_or_management on public.defects;
create policy defects_select_own_or_management on public.defects
  for select to authenticated
  using (public.can_manage_inspection(inspection_id));

drop policy if exists defects_update_management on public.defects;
create policy defects_update_management on public.defects
  for update to authenticated
  using (public.can_manage_inspection(inspection_id))
  with check (public.can_manage_inspection(inspection_id));

drop policy if exists defects_delete_management on public.defects;
create policy defects_delete_management on public.defects
  for delete to authenticated
  using (public.can_manage_inspection(inspection_id));

drop policy if exists defects_insert_own on public.defects;
create policy defects_insert_own on public.defects
  for insert to authenticated
  with check (
    reported_by = public.current_driver_id()
    or public.can_manage_inspection(inspection_id)
  );

-- Anonymous driver submissions (no auth session) need to be able to auto-create a defect for a
-- failed checklist item on their own just-created inspection, mirroring answers_insert_anon.
grant insert on public.defects to anon;
drop policy if exists defects_insert_anon on public.defects;
create policy defects_insert_anon on public.defects
  for insert to anon
  with check (
    reported_by is null
    and exists (
      select 1 from public.daily_inspections i
      where i.id = inspection_id and i.driver_id is null and i.driver_name is not null
    )
  );

-- ---------------------------------------------------------------------------
-- audit_events
-- ---------------------------------------------------------------------------

alter table public.audit_events add column if not exists company_id uuid references public.companies(id) on delete set null;

drop policy if exists audit_select_management on public.audit_events;
create policy audit_select_management on public.audit_events
  for select to authenticated
  using (company_id is null or public.can_manage_company(company_id));

drop policy if exists audit_insert_self on public.audit_events;
create policy audit_insert_self on public.audit_events
  for insert to authenticated
  with check (actor_id = public.current_driver_id());
