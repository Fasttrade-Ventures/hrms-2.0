-- Use structured address fields only; migrate legacy free-text residential data first.

update public.employee_profiles
set address_line1 = residential_address
where residential_address is not null
  and trim(residential_address) <> ''
  and (address_line1 is null or trim(address_line1) = '');

alter table public.employee_profiles
  drop column if exists residential_address;
