-- Run this only to inspect the existing conflict.
select fleet_number, registration, status
from public.trucks
where registration = 'NB67DNGP' or fleet_number in ('8563850', '8563851');
