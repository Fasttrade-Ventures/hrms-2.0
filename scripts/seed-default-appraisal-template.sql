do $$
declare
  org record;
  tpl_id uuid;
  sec1_id uuid;
  sec2_id uuid;
begin
  for org in select id from public.organizations loop
    if not exists (select 1 from public.appraisal_templates where organization_id = org.id) then
      insert into public.appraisal_templates (
        organization_id,
        name,
        description,
        is_default,
        is_active,
        rating_scale
      ) values (
        org.id,
        'General Performance Appraisal Template',
        'Standard company-wide performance evaluation evaluating core competencies and key accomplishments.',
        true,
        true,
        '{"min": 1, "max": 5, "step": 1, "labels": {"1": "Unsatisfactory", "2": "Needs Improvement", "3": "Meets Expectations", "4": "Exceeds Expectations", "5": "Outstanding"}}'::jsonb
      ) returning id into tpl_id;

      insert into public.appraisal_template_sections (
        template_id,
        title,
        description,
        weight_pct,
        sort_order
      ) values (
        tpl_id,
        'Core Competencies & Values',
        'Demonstrated behaviors, work quality, teamwork, and accountability.',
        50,
        0
      ) returning id into sec1_id;

      insert into public.appraisal_template_questions (
        section_id,
        title,
        description,
        question_type,
        required,
        sort_order
      ) values 
      (sec1_id, 'Quality of Work & Accuracy', 'Delivers thorough, accurate, and high-quality outputs consistently.', 'rating', true, 0),
      (sec1_id, 'Collaboration & Communication', 'Communicates effectively and supports teammates cross-functionally.', 'rating', true, 1);

      insert into public.appraisal_template_sections (
        template_id,
        title,
        description,
        weight_pct,
        sort_order
      ) values (
        tpl_id,
        'Key Results & Accomplishments',
        'Delivery against targets and qualitative achievements.',
        50,
        1
      ) returning id into sec2_id;

      insert into public.appraisal_template_questions (
        section_id,
        title,
        description,
        question_type,
        required,
        sort_order
      ) values 
      (sec2_id, 'Major Achievements & Deliverables', 'Summarize key milestones and contributions during this review period.', 'text', true, 0),
      (sec2_id, 'Areas for Growth & Next Cycle Priorities', 'Identify targeted skill development and upcoming goals.', 'text', false, 1);
    end if;
  end loop;
end $$;
