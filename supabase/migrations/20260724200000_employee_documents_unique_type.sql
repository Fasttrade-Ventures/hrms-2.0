-- Deduplicate employee documents (keep newest per employee + document type).
with ranked as (
  select
    id,
    row_number() over (
      partition by organization_id, employee_id, lower(trim(document_type))
      order by created_at desc
    ) as rn
  from public.employee_documents
)
delete from public.employee_documents
where id in (select id from ranked where rn > 1);

create unique index if not exists idx_employee_documents_unique_type_per_employee
  on public.employee_documents (organization_id, employee_id, lower(trim(document_type)));
