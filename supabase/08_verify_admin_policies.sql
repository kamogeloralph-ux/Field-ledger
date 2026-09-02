-- Read-only verification for the admin-only master-data policy migration.
-- Run after supabase/07_admin_only_policies.sql.
-- This query does not change any data or policies.

select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('trucks', 'drivers')
order by tablename, cmd, policyname;
