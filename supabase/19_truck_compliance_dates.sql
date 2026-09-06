-- Adds compliance-date tracking to trucks: license disc, roadworthy/COF, and insurance expiry,
-- plus an optional next-service odometer target. Powers the expiry badges in the admin fleet
-- table. All nullable -- existing trucks simply show no badge until an admin fills these in.
-- Safe to rerun.

alter table public.trucks add column if not exists license_disc_expiry date;
alter table public.trucks add column if not exists roadworthy_expiry date;
alter table public.trucks add column if not exists insurance_expiry date;
alter table public.trucks add column if not exists next_service_km integer check (next_service_km is null or next_service_km >= 0);
