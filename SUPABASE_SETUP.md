# Supabase setup for Field Ledger

## 1. Run the database scripts

The original complete script remains at `supabase/schema.sql`. For a phone, use the smaller files in this order:

| Order | File | Purpose |
|---:|---|---|
| 1 | `supabase/01_tables_and_indexes.sql` | Creates the fleet, driver, assignment, checklist, inspection, defect, audit, and private photo tables. |
| 2 | `supabase/02_row_level_security.sql` | Creates the role helper functions and baseline authenticated access policies. |
| 3 | `supabase/03_storage_policies.sql` | Creates private Storage policies for inspection photos. |
| 4 | `supabase/07_admin_only_policies.sql` | Changes fleet and driver insert, update, and delete access to **admin only**. |
| 5 | `supabase/08_verify_admin_policies.sql` | Read-only check that confirms the admin-only policies are installed. |
| 6 | `supabase/09_seed_checklist.sql` | Seeds the active daily departure checklist used by driver submissions. |
| 7 | `supabase/10_validation_queries.sql` | Read-only checks for account linkage, counts, duplicates, and admin policies. |

Open each file, copy its contents, and run one file at a time in **Supabase dashboard → project → SQL Editor → New query**. Wait for a success message after each file. Run `supabase/09_seed_checklist.sql` before testing a driver inspection submission. The truck data is already prepared separately in `supabase/05_fleet_import_no_duplicate.sql`; it imports 83 conflict-free trucks and intentionally leaves the duplicate-registration pair for review.

## 2. Enable Supabase Auth

In Supabase, open **Authentication → Providers**, enable the **Email** provider, and decide whether email confirmation is required for your company. The PWA uses email/password sessions, keeps the session in the browser, and refreshes it automatically. The browser uses only the public publishable key; never put a Secret key, service-role key, PostgreSQL password, or database connection string into the frontend or GitHub repository.

## 3. Create users and link fleet profiles

Create each person in **Authentication → Users**. Copy the Auth user’s UUID, then create the matching row in `public.drivers`. The `auth_user_id` value must equal the Auth user UUID exactly.

| Role | Access |
|---|---|
| `driver` | Sign in, view live truck data, and complete assigned inspections. |
| `supervisor` | Sign in and review operational records, assignments, and defects. Supervisors cannot change the master fleet or driver roster. |
| `admin` | Sign in to `admin.html` and add, edit, or delete fleet records and driver profiles. |

Example profile statement for a newly created user:

```sql
insert into public.drivers (auth_user_id, employee_number, full_name, role)
values ('AUTH-USER-UUID-HERE', 'EMP-001', 'Example Administrator', 'admin');
```

Replace the placeholder UUID and details before running it. Do not create an admin profile until you have confirmed the UUID belongs to the intended administrator.

The current admin page can add driver profiles after their Auth users exist. It links the profile using the Auth user UUID; the secure server-side key is not exposed to the browser.

## 4. Verify the admin-only policies

After running `supabase/07_admin_only_policies.sql`, run `supabase/08_verify_admin_policies.sql`. It is read-only and lists the installed `trucks` and `drivers` policies. Insert, update, and delete policies should use `current_driver_role() = 'admin'`. You can then run `supabase/10_validation_queries.sql` to confirm the signed-in profile, truck count, active checklist, duplicate registrations, and admin-only write policies. The duplicate query will continue to show `NB67DNGP` until the correct registration is confirmed for fleets `8563850` and `8563851`.

## 5. Open the application

The normal PWA is served from `index.html`. The restricted administrative entry point is `admin.html`. After deployment, open the admin page at:

```text
https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPOSITORY/admin.html
```

Sign in using an Auth user whose `public.drivers.role` is `admin`. A driver or supervisor who opens `admin.html` will receive an access-denied screen. The frontend guard improves usability, while the Supabase RLS policies provide the actual database protection.

## 6. If a query appears stuck

If a query has been running for more than a minute without a result, stop it, refresh the SQL Editor, and check **Database → Tables**. The setup scripts use `if not exists` and `drop policy if exists`, so rerunning an incomplete section is designed to be safe, but review each error before continuing.

## 7. Validation checklist

Test one account for each role. A driver should be able to read trucks and should receive a permission error when attempting to modify a truck. A supervisor should be able to review operational records but should also receive a permission error when attempting to modify a truck or driver profile. An admin should be able to open `admin.html`, add or edit a truck, and delete a driver profile. Keep the `SUPABASE_SERVICE_ROLE_KEY` server-only and rotate it if it is ever exposed.
