-- Private intake queue for externally selected undergraduate coverage cohorts.
-- Run after 20260814_create_undergraduate_catalog.sql.
-- Entries here are not public catalog records and cannot be read by anon users.

create table if not exists public.institution_intake_queue (
  id uuid primary key default gen_random_uuid(),
  collection_key text not null check (collection_key ~ '^[a-z0-9][a-z0-9_-]{2,79}$'),
  source_publisher text not null,
  source_edition text not null,
  source_url text not null check (source_url ~ '^https?://'),
  source_rank integer not null check (source_rank > 0 and source_rank <= 10000),
  institution_name text not null check (char_length(institution_name) between 2 and 200),
  review_status text not null default 'pending_resolution'
    check (review_status in ('pending_resolution', 'resolved', 'verified', 'rejected')),
  resolved_institution_id uuid references public.institutions(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_key, institution_name)
);

create index if not exists institution_intake_queue_collection_rank_idx
  on public.institution_intake_queue (collection_key, source_rank, institution_name);

drop trigger if exists institution_intake_queue_set_updated_at on public.institution_intake_queue;
create trigger institution_intake_queue_set_updated_at
before update on public.institution_intake_queue
for each row execute procedure public.set_updated_at();

alter table public.institution_intake_queue enable row level security;

-- No read policies: this is a private editorial work queue. Import writes use
-- a local, server-only secret key and public clients never access this table.
