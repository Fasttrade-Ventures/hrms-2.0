alter table public.employee_tax_profiles
  add column if not exists pcb_manual_amount numeric(14,2),
  add column if not exists pcb_manual_updated_at timestamptz,
  add column if not exists pcb_manual_updated_by uuid references auth.users(id) on delete set null;

comment on column public.employee_tax_profiles.pcb_manual_amount is
  'When not null, payrun PCB uses this total instead of auto MTD. UI label remains PCB.';

alter table public.employee_tax_profiles
  drop constraint if exists employee_tax_profiles_pcb_manual_amount_nonneg;

alter table public.employee_tax_profiles
  add constraint employee_tax_profiles_pcb_manual_amount_nonneg
  check (pcb_manual_amount is null or pcb_manual_amount >= 0);
