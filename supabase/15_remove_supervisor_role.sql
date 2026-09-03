-- Field Ledger: keep only driver and admin roles.
-- Run once in the Supabase SQL Editor after the Auth users exist.

update public.drivers
set role = 'admin'
where lower(auth_user_id::text) = lower((select id::text from auth.users where lower(email) = 'chiloaneralph1@gmail.com' limit 1));

update public.drivers
set role = 'admin'
where role = 'supervisor';

alter table public.drivers drop constraint if exists drivers_role_check;
alter table public.drivers add constraint drivers_role_check check (role in ('driver', 'admin'));

comment on column public.drivers.role is 'Application role: driver or admin';

-- Refresh PostgREST schema metadata after the role constraint changes.
notify pgrst, 'reload schema';

select id, full_name, role, active
from public.drivers
where role in ('driver', 'admin')
order by role, full_name;

-- After this migration, sign in at /admin.html with:
--   Skeeveone@gmail.com
--   chiloaneralph1@gmail.com
-- Keep passwords only in Supabase Auth; never store them in this repository.

-- Note: existing RLS policies may still mention 'supervisor' for backwards compatibility;
-- no user can retain that role after this migration's constraint is applied.

-- If the role check constraint uses a different name in your database, inspect:
-- select conname from pg_constraint where conrelid = 'public.drivers'::regclass;
-- and drop that role constraint before rerunning the add-constraint statement.

-- This migration is safe to rerun after the constraint already exists only if the
-- add-constraint statement is adjusted to drop drivers_role_check first, as above.

-- Ensure the specific second admin account is active.
update public.drivers
set active = true, role = 'admin'
where lower(auth_user_id::text) = lower((select id::text from auth.users where lower(email) = 'chiloaneralph1@gmail.com' limit 1));

-- Verify the requested account exists and has the admin role.
select d.full_name, d.role, d.active, u.email
from public.drivers d
join auth.users u on u.id = d.auth_user_id
where lower(u.email) in ('skeeveone@gmail.com', 'chiloaneralph1@gmail.com');

-- If the second email has no driver profile, create it with a generated name.
insert into public.drivers (auth_user_id, full_name, role, active)
select u.id, 'Chiloane Ralph', 'admin', true
from auth.users u
where lower(u.email) = 'chiloaneralph1@gmail.com'
  and not exists (select 1 from public.drivers d where d.auth_user_id = u.id);

update public.drivers d
set role = 'admin', active = true
from auth.users u
where d.auth_user_id = u.id
  and lower(u.email) = 'chiloaneralph1@gmail.com';

select d.full_name, d.role, d.active, u.email
from public.drivers d
join auth.users u on u.id = d.auth_user_id
where lower(u.email) = 'chiloaneralph1@gmail.com';

-- End migration.
