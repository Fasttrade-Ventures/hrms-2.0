-- Default leave and claim types for every organization (idempotent).

insert into public.leave_types (organization_id, name, entitlement_days, requires_attachment, is_unpaid)
select o.id, v.name, v.entitlement_days, v.requires_attachment, v.is_unpaid
from public.organizations o
cross join (
  values
    ('Annual Leave', 14::numeric, false, false),
    ('Medical Leave', 14::numeric, true, false),
    ('Hospitalization Leave', 60::numeric, true, false),
    ('Unpaid Leave', 0::numeric, false, true)
) as v(name, entitlement_days, requires_attachment, is_unpaid)
on conflict (organization_id, name) do nothing;

insert into public.claim_types (organization_id, name, max_amount)
select o.id, v.name, v.max_amount
from public.organizations o
cross join (
  values
    ('Medical', 500::numeric),
    ('Transport', 200::numeric),
    ('Meal', 100::numeric),
    ('Other', null::numeric)
) as v(name, max_amount)
on conflict (organization_id, name) do nothing;
