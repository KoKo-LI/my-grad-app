-- Defense-in-depth for the public undergraduate catalog.
-- A dependent row is visible only when its parent catalog record is public
-- and its attributed source has been verified. This prevents a mistakenly
-- published child row from exposing an unpublished institution or program.

drop policy if exists "public can read published undergraduate programs" on public.undergraduate_programs;
create policy "public can read published undergraduate programs"
on public.undergraduate_programs
for select
using (
  is_published
  and exists (
    select 1
    from public.institutions as institution
    where institution.id = undergraduate_programs.institution_id
      and institution.is_published
  )
);

drop policy if exists "public can read current admission cycles" on public.admission_cycles;
create policy "public can read current admission cycles"
on public.admission_cycles
for select
using (
  is_current
  and exists (
    select 1
    from public.undergraduate_programs as program
    join public.institutions as institution on institution.id = program.institution_id
    where program.id = admission_cycles.program_id
      and program.is_published
      and institution.is_published
  )
);

drop policy if exists "public can read published requirements" on public.admission_requirements;
create policy "public can read published requirements"
on public.admission_requirements
for select
using (
  is_published
  and exists (
    select 1
    from public.undergraduate_programs as program
    join public.institutions as institution on institution.id = program.institution_id
    join public.data_sources as source on source.id = admission_requirements.source_id
    where program.id = admission_requirements.program_id
      and program.is_published
      and institution.is_published
      and source.verification_status = 'verified'
  )
);

drop policy if exists "public can read published statistics" on public.admission_statistics;
create policy "public can read published statistics"
on public.admission_statistics
for select
using (
  is_published
  and exists (
    select 1
    from public.undergraduate_programs as program
    join public.institutions as institution on institution.id = program.institution_id
    join public.data_sources as source on source.id = admission_statistics.source_id
    where program.id = admission_statistics.program_id
      and program.is_published
      and institution.is_published
      and source.verification_status = 'verified'
  )
);

drop policy if exists "public can read published institution metrics" on public.institution_metrics;
create policy "public can read published institution metrics"
on public.institution_metrics
for select
using (
  is_published
  and exists (
    select 1
    from public.institutions as institution
    join public.data_sources as source on source.id = institution_metrics.source_id
    where institution.id = institution_metrics.institution_id
      and institution.is_published
      and source.verification_status = 'verified'
  )
);

drop policy if exists "public can read published institution rankings" on public.institution_rankings;
create policy "public can read published institution rankings"
on public.institution_rankings
for select
using (
  is_published
  and exists (
    select 1
    from public.institutions as institution
    join public.data_sources as source on source.id = institution_rankings.source_id
    where institution.id = institution_rankings.institution_id
      and institution.is_published
      and source.verification_status = 'verified'
  )
);
