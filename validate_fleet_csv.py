import csv
from collections import Counter
from pathlib import Path

path = Path('/home/ubuntu/fleet-inspection-pwa/fleet_register_from_photos.csv')
rows = list(csv.DictReader(path.open(newline='', encoding='utf-8')))
fleets = [row['fleet_number'] for row in rows]
registrations = [row['registration'] for row in rows if row['registration']]
print(f'rows={len(rows)}')
print(f'unique_fleet_numbers={len(set(fleets))}')
print(f'duplicate_fleet_numbers={[fleet for fleet, count in Counter(fleets).items() if count > 1]}')
print(f'missing_registrations={sum(not row["registration"] for row in rows)}')
print(f'uncertain_rows={sum(row["verification_status"] != "confirmed" for row in rows)}')
print(f'empty_fleet_numbers={sum(not row["fleet_number"] for row in rows)}')
print(f'malformed_columns={sum(len(row) != 6 for row in rows)}')
print(f'duplicate_registrations={[registration for registration, count in Counter(registrations).items() if count > 1]}')
