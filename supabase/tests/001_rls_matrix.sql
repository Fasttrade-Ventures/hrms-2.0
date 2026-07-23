-- RLS isolation matrix (positive + negative placeholders)

SELECT plan(3);

SELECT ok(
  exists(select 1 from pg_proc where proname = 'current_user_org_ids'),
  'current_user_org_ids helper exists'
);

SELECT ok(
  (select relrowsecurity from pg_class where relname = 'employees'),
  'employees has RLS enabled'
);

SELECT ok(
  (select relrowsecurity from pg_class where relname = 'payroll_payruns'),
  'payroll_payruns has RLS enabled'
);

SELECT * FROM finish();
