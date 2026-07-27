-- Seed common required document types for organizations that do not have them yet.
insert into public.required_documents (
  organization_id,
  name,
  description,
  requires_expiry,
  warning_days,
  is_active,
  sort_order
)
select
  o.id,
  seed.name,
  seed.description,
  seed.requires_expiry,
  seed.warning_days,
  true,
  seed.sort_order
from public.organizations o
cross join (
  values
    ('NRIC copy', 'National ID card (front and back)', true, 30, 1),
    ('Passport', 'Valid passport biodata page', true, 60, 2),
    ('Employment contract', 'Signed employment agreement', true, 30, 3),
    ('Work permit', 'Valid work permit or pass', true, 60, 4),
    ('Bank account details', 'Bank statement or confirmation letter', false, 30, 5)
) as seed(name, description, requires_expiry, warning_days, sort_order)
where not exists (
  select 1
  from public.required_documents existing
  where existing.organization_id = o.id
)
on conflict (organization_id, name) do nothing;
