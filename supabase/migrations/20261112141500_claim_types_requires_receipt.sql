-- Migration: Add requires_receipt to claim_types table
alter table public.claim_types
  add column if not exists requires_receipt boolean not null default false;

-- Default existing non-mileage standard receipt claim types to require receipts
update public.claim_types
set requires_receipt = true
where is_mileage = false;

grant all on public.claim_types to authenticated, service_role, anon;

