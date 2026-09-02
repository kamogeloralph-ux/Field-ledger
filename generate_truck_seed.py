import csv
from pathlib import Path

csv_path = Path('/home/ubuntu/fleet-inspection-pwa/fleet_register_from_photos.csv')
sql_path = Path('/home/ubuntu/fleet-inspection-pwa/supabase/04_seed_trucks.sql')
rows = list(csv.DictReader(csv_path.open(newline='', encoding='utf-8')))
conflicting_fleets = {'8563850', '8563851'}
valid = [row for row in rows if row['fleet_number'] and row['registration'] and row['fleet_number'] not in conflicting_fleets]

def quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"

lines = [
    '-- Field Ledger: import verified truck identity records into public.trucks.',
    '-- Rows without a registration and the duplicate-registration pair 8563850/8563851 were intentionally excluded.',
    '-- Safe to rerun: conflicts on fleet_number update the registration and status.',
    '',
    'insert into public.trucks (fleet_number, registration, status)',
    'values',
]
values = []
for row in valid:
    values.append(f"  ({quote(row['fleet_number'])}, {quote(row['registration'])}, 'ready')")
lines.append(',\n'.join(values) + '\n')
lines.extend([
    'on conflict (fleet_number) do update',
    'set registration = excluded.registration,',
    '    status = public.trucks.status,',
    '    updated_at = now();',
    '',
    '-- Review-only report for source rows that need manual confirmation:',
    "-- select * from public.trucks where fleet_number in (\'7512125\', \'7512128\', \'7512129\', \'7512133\', \'7512134\', \'7512135\', \'7512138\', \'7512152\', \'8563569\', \'8563850\', \'8563851\');",
])
sql_path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print(f'generated={sql_path}')
print(f'valid_rows={len(valid)}')
print(f'excluded_rows={len(rows) - len(valid)}')
