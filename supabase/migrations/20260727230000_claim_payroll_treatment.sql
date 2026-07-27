alter table public.claim_types
  add column if not exists payroll_treatment text not null default 'taxable'
    check (payroll_treatment in ('taxable', 'reimbursement', 'exclude'));
