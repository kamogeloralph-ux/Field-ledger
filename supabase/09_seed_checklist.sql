-- Field Ledger checklist seed.
-- Run after 01_tables_and_indexes.sql and before testing driver submissions.
-- Safe to rerun: fixed IDs and upserts preserve one active template.

insert into public.checklist_templates (id, version, title, active)
values (
  '11111111-1111-4111-8111-111111111111',
  1,
  'Daily truck departure inspection',
  true
)
on conflict (id) do update set
  version = excluded.version,
  title = excluded.title,
  active = excluded.active;

insert into public.checklist_items (id, template_id, section_number, section_title, prompt, sort_order, required)
values
  ('21111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', '01', 'Walkaround', 'Headlamps, indicators and hazards working', 1, true),
  ('21111111-1111-4111-8111-111111111112', '11111111-1111-4111-8111-111111111111', '01', 'Walkaround', 'Tyres, wheel nuts and visible damage checked', 2, true),
  ('21111111-1111-4111-8111-111111111113', '11111111-1111-4111-8111-111111111111', '01', 'Walkaround', 'Body panels, mirrors and glass secure', 3, true),
  ('21111111-1111-4111-8111-111111111114', '11111111-1111-4111-8111-111111111111', '02', 'Cab & controls', 'Seat belt, seat and doors secure', 4, true),
  ('21111111-1111-4111-8111-111111111115', '11111111-1111-4111-8111-111111111111', '02', 'Cab & controls', 'Warning lights clear after start-up', 5, true),
  ('21111111-1111-4111-8111-111111111116', '11111111-1111-4111-8111-111111111111', '02', 'Cab & controls', 'Brake, steering and clutch feel normal', 6, true),
  ('21111111-1111-4111-8111-111111111117', '11111111-1111-4111-8111-111111111111', '03', 'Equipment', 'Fire extinguisher present and in date', 7, true),
  ('21111111-1111-4111-8111-111111111118', '11111111-1111-4111-8111-111111111111', '03', 'Equipment', 'Warning triangle and first-aid kit present', 8, true),
  ('21111111-1111-4111-8111-111111111119', '11111111-1111-4111-8111-111111111111', '03', 'Equipment', 'Load area, doors and restraints secure', 9, true)
on conflict (id) do update set
  template_id = excluded.template_id,
  section_number = excluded.section_number,
  section_title = excluded.section_title,
  prompt = excluded.prompt,
  sort_order = excluded.sort_order,
  required = excluded.required;

update public.checklist_templates
set active = (id = '11111111-1111-4111-8111-111111111111');
