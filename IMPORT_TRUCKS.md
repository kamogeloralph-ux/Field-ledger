# Import the fleet register into Supabase

The SQL seed file is:

```text
supabase/04_seed_trucks.sql
```

Open Supabase on your phone, select the project, open **SQL Editor**, choose **New query**, open the attached SQL file, copy all of its contents, paste it into the editor, and tap **Run**.

The corrected script imports **83 truck records** into `public.trucks`. It is safe to run again because an existing `fleet_number` is updated instead of duplicated. The two rows using duplicate registration `NB67DNGP` are excluded until you confirm which registration belongs to each truck.

Nine rows were intentionally excluded because the registration number could not be read confidently from the photographs:

```text
7512125, 7512128, 7512129, 7512133, 7512134, 7512135, 7512138, 7512152, 8563569, 8563850, 8563851
```

After confirming those registrations, add them manually with this pattern:

```sql
insert into public.trucks (fleet_number, registration, status)
values ('7512125', 'REPLACE_WITH_CONFIRMED_REGISTRATION', 'ready');
```

To check the result after import, run:

```sql
select fleet_number, registration, status
from public.trucks
order by fleet_number;
```

## If you still see the NB67DNGP error

Close or clear the old SQL Editor query before pasting the replacement. Use `supabase/05_fleet_import_no_duplicate.sql`; this file contains **zero** insert values for `NB67DNGP` and imports 83 rows. Do not run `04_seed_trucks.sql` or an older copied query. If you want to inspect what is already in the table, run `supabase/05_check_duplicate_registration.sql` instead; it is read-only.
