-- Null means keep the record. Audit retention stays on audit_retention_days.
alter table public.organizations
  add column if not exists document_retention_days integer,
  add column if not exists policy_retention_days integer;

alter table public.organizations
  drop constraint if exists organizations_document_retention_positive;

alter table public.organizations
  add constraint organizations_document_retention_positive
  check (document_retention_days is null or document_retention_days > 0);

alter table public.organizations
  drop constraint if exists organizations_policy_retention_positive;

alter table public.organizations
  add constraint organizations_policy_retention_positive
  check (policy_retention_days is null or policy_retention_days > 0);
