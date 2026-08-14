-- My Grad Path: verified undergraduate admission catalog.
-- Run this migration in Supabase SQL Editor before enabling the API route.

create extension if not exists pgcrypto;

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  ipeds_unitid text unique,
  name text not null,
  short_name text not null,
  country text not null,
  region text not null,
  official_website text not null check (official_website ~ '^https?://'),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.undergraduate_programs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  program_name text not null,
  degree_name text not null default 'Bachelor',
  field_of_study text not null,
  major_categories text[] not null default '{}',
  official_url text not null check (official_url ~ '^https?://'),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, program_name, degree_name)
);

create table if not exists public.admission_cycles (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.undergraduate_programs(id) on delete cascade,
  cycle_name text not null,
  entry_term text not null,
  application_open_date date,
  priority_deadline date,
  final_deadline date not null,
  decision_release_date date,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, cycle_name, entry_term)
);

create table if not exists public.data_sources (
  id uuid primary key default gen_random_uuid(),
  source_kind text not null check (source_kind in ('official_program', 'official_institution', 'IPEDS', 'CDS', 'licensed_partner', 'community_aggregate')),
  title text not null,
  source_url text not null check (source_url ~ '^https?://'),
  source_year text,
  published_at date,
  retrieved_at timestamptz not null default now(),
  source_excerpt text,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'expired', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.admission_requirements (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.undergraduate_programs(id) on delete cascade,
  cycle_id uuid references public.admission_cycles(id) on delete cascade,
  source_id uuid not null references public.data_sources(id) on delete restrict,
  metric text not null check (metric in ('gpa', 'toefl', 'ielts', 'sat', 'act', 'ap_subject', 'ib_total', 'ib_subject')),
  requirement_kind text not null check (requirement_kind in ('minimum', 'recommended', 'required', 'optional', 'not_required', 'considered')),
  applicant_scope text not null default 'all' check (applicant_scope in ('all', 'international', 'domestic')),
  minimum_score numeric(6, 2),
  maximum_score numeric(6, 2),
  value_text text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (minimum_score is not null or maximum_score is not null or value_text is not null or requirement_kind in ('optional', 'not_required'))
);

create table if not exists public.admission_statistics (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.undergraduate_programs(id) on delete cascade,
  cycle_id uuid references public.admission_cycles(id) on delete cascade,
  source_id uuid not null references public.data_sources(id) on delete restrict,
  metric text not null check (metric in ('gpa', 'toefl', 'ielts', 'sat', 'act', 'ap_subject', 'ib_total')),
  cohort text not null check (cohort in ('applicant', 'admitted', 'enrolled')),
  statistic text not null check (statistic in ('p25', 'median', 'p75', 'average', 'acceptance_rate')),
  statistic_value numeric(8, 3) not null,
  sample_size integer check (sample_size is null or sample_size > 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, cycle_id, source_id, metric, cohort, statistic)
);

create table if not exists public.user_school_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.undergraduate_programs(id) on delete cascade,
  status text not null default 'saved' check (status in ('saved', 'researching', 'applying', 'submitted', 'decision_received')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, program_id)
);

create index if not exists undergraduate_programs_institution_id_idx on public.undergraduate_programs(institution_id);
create index if not exists admission_cycles_program_id_idx on public.admission_cycles(program_id);
create index if not exists admission_requirements_program_id_idx on public.admission_requirements(program_id);
create index if not exists admission_statistics_program_id_idx on public.admission_statistics(program_id);
create index if not exists user_school_tracking_user_id_idx on public.user_school_tracking(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists institutions_set_updated_at on public.institutions;
create trigger institutions_set_updated_at before update on public.institutions for each row execute procedure public.set_updated_at();
drop trigger if exists undergraduate_programs_set_updated_at on public.undergraduate_programs;
create trigger undergraduate_programs_set_updated_at before update on public.undergraduate_programs for each row execute procedure public.set_updated_at();
drop trigger if exists admission_cycles_set_updated_at on public.admission_cycles;
create trigger admission_cycles_set_updated_at before update on public.admission_cycles for each row execute procedure public.set_updated_at();
drop trigger if exists admission_requirements_set_updated_at on public.admission_requirements;
create trigger admission_requirements_set_updated_at before update on public.admission_requirements for each row execute procedure public.set_updated_at();
drop trigger if exists admission_statistics_set_updated_at on public.admission_statistics;
create trigger admission_statistics_set_updated_at before update on public.admission_statistics for each row execute procedure public.set_updated_at();
drop trigger if exists user_school_tracking_set_updated_at on public.user_school_tracking;
create trigger user_school_tracking_set_updated_at before update on public.user_school_tracking for each row execute procedure public.set_updated_at();

alter table public.institutions enable row level security;
alter table public.undergraduate_programs enable row level security;
alter table public.admission_cycles enable row level security;
alter table public.data_sources enable row level security;
alter table public.admission_requirements enable row level security;
alter table public.admission_statistics enable row level security;
alter table public.user_school_tracking enable row level security;

drop policy if exists "public can read published institutions" on public.institutions;
create policy "public can read published institutions" on public.institutions for select using (is_published);
drop policy if exists "public can read published undergraduate programs" on public.undergraduate_programs;
create policy "public can read published undergraduate programs" on public.undergraduate_programs for select using (is_published);
drop policy if exists "public can read current admission cycles" on public.admission_cycles;
create policy "public can read current admission cycles" on public.admission_cycles for select using (is_current);
drop policy if exists "public can read verified sources" on public.data_sources;
create policy "public can read verified sources" on public.data_sources for select using (verification_status = 'verified');
drop policy if exists "public can read published requirements" on public.admission_requirements;
create policy "public can read published requirements" on public.admission_requirements for select using (is_published);
drop policy if exists "public can read published statistics" on public.admission_statistics;
create policy "public can read published statistics" on public.admission_statistics for select using (is_published);
drop policy if exists "users manage their tracked programs" on public.user_school_tracking;
create policy "users manage their tracked programs" on public.user_school_tracking for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace view public.published_undergraduate_match_catalog
with (security_invoker = true)
as
select
  program.id,
  institution.name,
  institution.short_name,
  program.program_name as program,
  institution.region,
  cycle.final_deadline as deadline,
  program.major_categories,
  gpa_stat.statistic_value as median_gpa,
  toefl_requirement.minimum_score as minimum_toefl,
  ielts_requirement.minimum_score as minimum_ielts
from public.undergraduate_programs as program
join public.institutions as institution on institution.id = program.institution_id and institution.is_published
join public.admission_cycles as cycle on cycle.program_id = program.id and cycle.is_current
join lateral (
  select statistic.statistic_value
  from public.admission_statistics as statistic
  join public.data_sources as source on source.id = statistic.source_id and source.verification_status = 'verified'
  where statistic.program_id = program.id
    and statistic.cycle_id = cycle.id
    and statistic.metric = 'gpa'
    and statistic.statistic = 'median'
    and statistic.is_published
  order by statistic.created_at desc
  limit 1
) as gpa_stat on true
left join lateral (
  select requirement.minimum_score
  from public.admission_requirements as requirement
  join public.data_sources as source on source.id = requirement.source_id and source.verification_status = 'verified'
  where requirement.program_id = program.id
    and (requirement.cycle_id = cycle.id or requirement.cycle_id is null)
    and requirement.metric = 'toefl'
    and requirement.requirement_kind = 'minimum'
    and requirement.is_published
  order by requirement.cycle_id nulls last, requirement.created_at desc
  limit 1
) as toefl_requirement on true
left join lateral (
  select requirement.minimum_score
  from public.admission_requirements as requirement
  join public.data_sources as source on source.id = requirement.source_id and source.verification_status = 'verified'
  where requirement.program_id = program.id
    and (requirement.cycle_id = cycle.id or requirement.cycle_id is null)
    and requirement.metric = 'ielts'
    and requirement.requirement_kind = 'minimum'
    and requirement.is_published
  order by requirement.cycle_id nulls last, requirement.created_at desc
  limit 1
) as ielts_requirement on true
where program.is_published;

grant select on public.published_undergraduate_match_catalog to anon, authenticated;
