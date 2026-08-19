-- Expand the public College Scorecard fact set for the verified
-- undergraduate catalog. All rows remain source-attributed; omitted or
-- privacy-suppressed values are never replaced with estimates.

alter table public.institution_metrics
  drop constraint if exists institution_metrics_metric_check;

alter table public.institution_metrics
  add constraint institution_metrics_metric_check
  check (metric in (
    'open_admissions_policy',
    'admission_rate',

    'sat_ebrw_p25', 'sat_ebrw_median', 'sat_ebrw_p75',
    'sat_math_p25', 'sat_math_median', 'sat_math_p75',
    'act_composite_p25', 'act_composite_median', 'act_composite_p75',
    'act_english_p25', 'act_english_median', 'act_english_p75',
    'act_math_p25', 'act_math_median', 'act_math_p75',

    'tuition_in_state_usd', 'tuition_out_of_state_usd',
    'average_cost_of_attendance_usd', 'books_and_supplies_usd',
    'room_and_board_on_campus_usd', 'other_expenses_on_campus_usd',
    'room_and_board_off_campus_usd', 'other_expenses_off_campus_usd',
    'other_expenses_with_family_usd',
    'average_net_price_public_usd', 'average_net_price_private_usd',
    'pell_grant_recipient_share', 'federal_loan_recipient_share',

    'undergraduate_enrollment', 'undergraduate_men_share',
    'undergraduate_women_share', 'first_year_full_time_retention_rate',
    'first_year_part_time_retention_rate',

    'graduation_rate_150_percent', 'graduation_rate_200_percent',
    'median_student_debt_usd', 'median_graduate_debt_usd',
    'median_withdrawal_debt_usd',
    'median_earnings_6_years_usd', 'median_earnings_8_years_usd',
    'median_earnings_10_years_usd',
    'loan_repayment_rate_3_years', 'loan_repayment_rate_5_years',
    'loan_repayment_rate_7_years', 'cohort_default_rate_3_years'
  ));

alter table public.institution_metrics
  drop constraint if exists institution_metrics_unit_check;

alter table public.institution_metrics
  add constraint institution_metrics_unit_check
  check (unit in ('USD', 'ratio', 'score', 'students', 'flag'));
