-- Organization owners can save module toggles and the product tier.
-- Select already exists; without an update policy those saves match zero rows.

create policy organizations_owner_update
on public.organizations
for update
to authenticated
using (id in (select public.current_user_owner_org_ids()))
with check (id in (select public.current_user_owner_org_ids()));
