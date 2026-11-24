-- Allow numeric answers on appraisal template questions (e.g. pipeline counts).
alter table public.appraisal_template_questions
  drop constraint if exists appraisal_template_questions_question_type_check;

alter table public.appraisal_template_questions
  add constraint appraisal_template_questions_question_type_check
  check (question_type in ('rating', 'text', 'yes_no', 'number'));
