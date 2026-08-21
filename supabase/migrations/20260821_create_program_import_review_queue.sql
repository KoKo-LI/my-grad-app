-- Private editorial workflow for expanding the undergraduate program catalog.
--
-- The public app never writes to, or reads from, these tables. An editor first
-- imports candidate programs with a server-only key, verifies each original
-- source in Supabase, then publishes only approved rows with the companion
-- local script. This deliberately avoids an exposed admin API and keeps
-- unpublished research out of the public catalog.

create table if not exists public.undergraduate_program_import_batches (
  id uuid primary key default gen_random_uuid(),
  batch_key text not null unique
    check (batch_key ~ '^[a-z0-9][a-z0-9:_-]{2,79}$'),
  label text not null check (char_length(label) between 3 and 200),
  input_record_count integer not null check (input_record_count > 0 and input_record_count <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.undergraduate_program_import_candidates (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.undergraduate_program_import_batches(id) on delete cascade,
  record_key text not null check (record_key ~ '^[a-z0-9][a-z0-9:_-]{2,159}$'),
  institution_id uuid not null references public.institutions(id) on delete restrict,
  institution_ipeds_unitid text not null,
  program_name text not null check (char_length(program_name) between 2 and 200),
  degree_name text not null check (char_length(degree_name) between 2 and 100),
  field_of_study text not null check (char_length(field_of_study) between 2 and 120),
  major_categories text[] not null default '{}'
    check (cardinality(major_categories) between 1 and 12),
  official_url text not null check (official_url ~ '^https?://'),
  source_kind text not null
    check (source_kind in ('official_program', 'official_institution', 'IPEDS', 'CDS', 'licensed_partner')),
  source_title text not null check (char_length(source_title) between 3 and 240),
  source_url text not null check (source_url ~ '^https?://'),
  source_year text not null check (char_length(source_year) between 4 and 40),
  source_excerpt text check (source_excerpt is null or char_length(source_excerpt) <= 600),
  rights_note text check (rights_note is null or char_length(rights_note) <= 300),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected', 'published')),
  reviewer_notes text check (reviewer_notes is null or char_length(reviewer_notes) <= 1200),
  reviewed_at timestamptz,
  published_program_id uuid references public.undergraduate_programs(id) on delete set null,
  published_source_id uuid references public.data_sources(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, record_key),
  check (
    (review_status <> 'published')
    or (published_program_id is not null and published_source_id is not null and published_at is not null)
  ),
  check (
    (review_status not in ('approved', 'rejected', 'published'))
    or reviewed_at is not null
  )
);

-- One program may cite multiple official catalog or department pages. The
-- relationship is source-attributed rather than copying page text into the
-- public catalog.
create table if not exists public.undergraduate_program_sources (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.undergraduate_programs(id) on delete cascade,
  source_id uuid not null references public.data_sources(id) on delete restrict,
  source_record_key text not null check (source_record_key ~ '^[a-z0-9][a-z0-9:_-]{2,159}$'),
  is_primary boolean not null default false,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (program_id, source_id, source_record_key)
);

create index if not exists undergraduate_program_import_candidates_status_idx
  on public.undergraduate_program_import_candidates (review_status, created_at);
create index if not exists undergraduate_program_import_candidates_institution_idx
  on public.undergraduate_program_import_candidates (institution_id, review_status);
create index if not exists undergraduate_program_sources_program_idx
  on public.undergraduate_program_sources (program_id);

drop trigger if exists undergraduate_program_import_batches_set_updated_at on public.undergraduate_program_import_batches;
create trigger undergraduate_program_import_batches_set_updated_at
before update on public.undergraduate_program_import_batches
for each row execute procedure public.set_updated_at();

drop trigger if exists undergraduate_program_import_candidates_set_updated_at on public.undergraduate_program_import_candidates;
create trigger undergraduate_program_import_candidates_set_updated_at
before update on public.undergraduate_program_import_candidates
for each row execute procedure public.set_updated_at();

alter table public.undergraduate_program_import_batches enable row level security;
alter table public.undergraduate_program_import_candidates enable row level security;
alter table public.undergraduate_program_sources enable row level security;

-- Intentionally create no client policies for the two editorial queue tables.
-- Their ingestion and publication commands use SUPABASE_SECRET_KEY locally.

drop policy if exists "public can read verified published program sources" on public.undergraduate_program_sources;
create policy "public can read verified published program sources"
on public.undergraduate_program_sources
for select
using (
  exists (
    select 1
    from public.undergraduate_programs as program
    join public.institutions as institution on institution.id = program.institution_id
    join public.data_sources as source on source.id = undergraduate_program_sources.source_id
    where program.id = undergraduate_program_sources.program_id
      and program.is_published
      and institution.is_published
      and source.verification_status = 'verified'
  )
);

create or replace view public.undergraduate_program_import_review_queue
with (security_invoker = true)
as
select
  candidate.id,
  batch.batch_key,
  batch.label as batch_label,
  candidate.institution_ipeds_unitid,
  institution.name as institution_name,
  candidate.program_name,
  candidate.degree_name,
  candidate.field_of_study,
  candidate.major_categories,
  candidate.official_url,
  candidate.source_kind,
  candidate.source_title,
  candidate.source_url,
  candidate.source_year,
  candidate.source_excerpt,
  candidate.rights_note,
  candidate.review_status,
  candidate.reviewer_notes,
  candidate.reviewed_at,
  candidate.created_at
from public.undergraduate_program_import_candidates as candidate
join public.undergraduate_program_import_batches as batch on batch.id = candidate.batch_id
join public.institutions as institution on institution.id = candidate.institution_id;

revoke all on public.undergraduate_program_import_batches from anon, authenticated;
revoke all on public.undergraduate_program_import_candidates from anon, authenticated;
revoke all on public.undergraduate_program_import_review_queue from anon, authenticated;
