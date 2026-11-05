alter table public.payroll_payrun_items
  add column if not exists pcb_auto_amount numeric(14,2);

comment on column public.payroll_payrun_items.pcb_auto_amount is
  'LHDN auto PCB for the period, kept even when pcb is a manual override.';
