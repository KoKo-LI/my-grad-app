-- Source-backed institution-level facts imported from official public data.
-- Run after the undergraduate catalog and intake queue migrations.

create table if not exists public.institution_metrics (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  source_id uuid not null references public.data_sources(id) on delete restrict,
  metric_category text not null check (metric_category in ('admissions', 'cost', 'enrollment', 'outcomes')),
  metric text not null check (metric in (
    'tuition_in_state_usd',
    'tuition_out_of_state_usd',
    'admission_rate',
    'sat_ebrw_p25',
    'sat_ebrw_median',
    'sat_ebrw_p75',
    'sat_math_p25',
    'sat_math_median',
    'sat_math_p75',
    'act_composite_p25',
    'act_composite_median',
    'act_composite_p75',
    'undergraduate_enrollment',
    'graduation_rate_150_percent'
  )),
  value_numeric numeric(14, 4) not null,
  unit text not null check (unit in ('USD', 'ratio', 'score', 'students')),
  source_period text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, source_id, metric)
);

create index if not exists institution_metrics_institution_id_idx
  on public.institution_metrics (institution_id);
create index if not exists institution_metrics_metric_idx
  on public.institution_metrics (metric);

drop trigger if exists institution_metrics_set_updated_at on public.institution_metrics;
create trigger institution_metrics_set_updated_at
before update on public.institution_metrics
for each row execute procedure public.set_updated_at();

alter table public.institution_metrics enable row level security;

drop policy if exists "public can read published institution metrics" on public.institution_metrics;
create policy "public can read published institution metrics"
on public.institution_metrics for select using (is_published);
