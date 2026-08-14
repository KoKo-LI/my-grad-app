-- Preserve source-specific, program-level admission requirements without
-- conflating distinct test versions or application pathways.

alter table public.admission_requirements
  add column if not exists application_path text not null default 'all',
  add column if not exists score_scale numeric(8, 2),
  add column if not exists test_version text,
  add column if not exists subject_area text,
  add column if not exists source_record_key text;

update public.admission_requirements
set source_record_key = concat('legacy:', id::text)
where source_record_key is null;

alter table public.admission_requirements
  alter column source_record_key set not null;

alter table public.admission_requirements
  drop constraint if exists admission_requirements_metric_check;

alter table public.admission_requirements
  add constraint admission_requirements_metric_check
  check (metric in (
    'gpa',
    'toefl_ibt_total', 'toefl_ibt_section',
    'ielts_academic_overall', 'ielts_academic_section',
    'duolingo_english_test', 'pte_academic', 'cambridge_english', 'met',
    'sat_total', 'sat_ebrw', 'sat_math', 'act_composite', 'act_english', 'act_ela',
    'ap_subject', 'ib_total', 'ib_subject',
    'coursework', 'transcript', 'recommendation', 'essay',
    'portfolio', 'interview', 'financial_certification'
  ));

alter table public.admission_requirements
  add constraint admission_requirements_application_path_check
  check (application_path in ('all', 'first_year', 'transfer'));

alter table public.admission_requirements
  add constraint admission_requirements_score_scale_check
  check (score_scale is null or (score_scale > 0 and score_scale <= 100000));

alter table public.admission_requirements
  add constraint admission_requirements_source_record_key_check
  check (source_record_key ~ '^[a-z0-9][a-z0-9:_-]{2,159}$');

create unique index if not exists admission_requirements_source_record_idx
  on public.admission_requirements (program_id, source_id, source_record_key);

create index if not exists admission_requirements_metric_path_idx
  on public.admission_requirements (metric, applicant_scope, application_path);
