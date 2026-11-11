-- Per-offer letter / agreement body snapshots (recruiter edits before send).
alter table public.job_offers
  add column if not exists letter_body text,
  add column if not exists agreement_body text,
  add column if not exists agreement_sent_at timestamptz;

-- Backfill letter_body from linked templates where missing.
update public.job_offers o
set letter_body = t.body
from public.hr_letter_templates t
where o.template_id = t.id
  and o.letter_body is null;

-- Offers that already have an agreement PDF were already "sent" in the old flow.
update public.job_offers
set agreement_sent_at = coalesce(accepted_at, now())
where agreement_file_id is not null
  and agreement_sent_at is null;
