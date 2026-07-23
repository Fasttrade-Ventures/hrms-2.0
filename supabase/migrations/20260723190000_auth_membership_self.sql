-- Allow authenticated users to read their own membership rows (login redirect + session bootstrap)
create policy memberships_self on public.organization_memberships
  for select
  using (user_id = auth.uid());
