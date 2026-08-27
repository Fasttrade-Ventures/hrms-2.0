-- RLS isolation matrix: structural + behavioral JWT allow/deny with in-test dual-org seed.
-- Runs inside a transaction that rolls back (no lasting data).

begin;

select plan(9);

select ok(
  exists(select 1 from pg_proc where proname = 'current_user_org_ids'),
  'current_user_org_ids helper exists'
);

select ok(
  (select relrowsecurity from pg_class where relname = 'employees'),
  'employees has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class where relname = 'payroll_payruns'),
  'payroll_payruns has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_class where relname = 'organization_memberships'),
  'organization_memberships has RLS enabled'
);

select ok(
  exists(
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'employees'
      and coalesce(qual, '') ilike '%current_user_org_ids%'
  ),
  'employees policy uses current_user_org_ids'
);

select ok(
  exists(
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payroll_payruns'
      and (
        coalesce(qual, '') ilike '%current_user_org_ids%'
        or coalesce(with_check, '') ilike '%current_user_org_ids%'
      )
  ),
  'payroll_payruns policy uses current_user_org_ids'
);

select ok(
  exists(
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'organization_memberships'
      and coalesce(qual, '') ilike '%current_user_org_ids%'
  ),
  'organization_memberships policy uses current_user_org_ids'
);

select ok(
  not exists(
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'employees'
      and cmd in ('ALL', 'SELECT')
      and qual is null
  ),
  'employees has no unrestricted SELECT/ALL policy'
);

-- Dual-org seed (rolled back with the transaction). Uses fixed UUIDs for determinism.
do $$
declare
  v_org_a uuid := 'a0000000-0000-4000-8000-000000000001';
  v_org_b uuid := 'b0000000-0000-4000-8000-000000000002';
  v_user_a uuid := 'aa000000-0000-4000-8000-0000000000a1';
  v_user_b uuid := 'bb000000-0000-4000-8000-0000000000b1';
  v_emp_a uuid := 'ea000000-0000-4000-8000-0000000000a1';
  v_emp_b uuid := 'eb000000-0000-4000-8000-0000000000b1';
  v_seen int;
begin
  -- auth.users (minimal columns for local Supabase)
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    (
      '00000000-0000-0000-0000-000000000000', v_user_a, 'authenticated', 'authenticated',
      'rls-org-a@example.com', crypt('test-pass', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
      '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_user_b, 'authenticated', 'authenticated',
      'rls-org-b@example.com', crypt('test-pass', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
      '', '', '', ''
    );

  insert into public.organizations (id, name, slug)
  values
    (v_org_a, 'RLS Org A', 'rls-org-a'),
    (v_org_b, 'RLS Org B', 'rls-org-b');

  insert into public.employees (
    id, organization_id, employee_number, full_name, email, status, join_date
  ) values
    (v_emp_a, v_org_a, 'RLS-A-1', 'RLS Employee A', 'emp-a@rls.example', 'active', current_date),
    (v_emp_b, v_org_b, 'RLS-B-1', 'RLS Employee B', 'emp-b@rls.example', 'active', current_date);

  insert into public.organization_memberships (
    organization_id, user_id, employee_id, roles
  ) values
    (v_org_a, v_user_a, v_emp_a, array['employee']::text[]),
    (v_org_b, v_user_b, v_emp_b, array['employee']::text[]);

  -- Act as org A user
  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_user_a::text, 'role', 'authenticated')::text,
    true
  );
  execute 'set local role authenticated';

  select count(*)::int into v_seen
  from public.employees
  where organization_id = v_org_b;

  if v_seen <> 0 then
    raise exception 'RLS leak: org A user saw % org B employees', v_seen;
  end if;

  -- Positive control: org A employee still visible
  select count(*)::int into v_seen
  from public.employees
  where organization_id = v_org_a;

  if v_seen < 1 then
    raise exception 'RLS over-deny: org A user cannot see own org employees';
  end if;
end $$;

select ok(
  true,
  'authenticated JWT for org A cannot see org B employees (seeded dual-org)'
);

select * from finish();

rollback;
