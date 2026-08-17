-- Source-attributed institutional rankings for the public undergraduate catalog.
-- Rankings are stored separately from admissions facts because they measure a
-- different concept and must always retain their publisher, edition and URL.

alter table public.data_sources
  drop constraint if exists data_sources_source_kind_check;

alter table public.data_sources
  add constraint data_sources_source_kind_check
  check (source_kind in (
    'official_program',
    'official_institution',
    'IPEDS',
    'CDS',
    'licensed_partner',
    'community_aggregate',
    'ranking'
  ));

create table if not exists public.institution_rankings (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  source_id uuid not null references public.data_sources(id) on delete restrict,
  ranking_key text not null check (ranking_key in ('usnews_national_universities', 'qs_world_university_rankings')),
  edition text not null check (char_length(edition) between 2 and 160),
  rank_value integer not null check (rank_value > 0 and rank_value <= 10000),
  rank_display text not null check (char_length(rank_display) between 1 and 24),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, source_id, ranking_key)
);

create index if not exists institution_rankings_institution_id_idx
  on public.institution_rankings (institution_id);
create index if not exists institution_rankings_ranking_key_idx
  on public.institution_rankings (ranking_key, rank_value);

drop trigger if exists institution_rankings_set_updated_at on public.institution_rankings;
create trigger institution_rankings_set_updated_at
before update on public.institution_rankings
for each row execute procedure public.set_updated_at();

alter table public.institution_rankings enable row level security;

drop policy if exists "public can read published institution rankings" on public.institution_rankings;
create policy "public can read published institution rankings"
on public.institution_rankings for select using (is_published);

-- The pre-existing private intake queue is the verified source-of-truth for
-- the 2026 U.S. News National Universities coverage cohort. Only resolved
-- records tied to a published institution are surfaced here.
insert into public.data_sources (
  source_kind,
  title,
  source_url,
  source_year,
  verification_status
)
select
  'ranking',
  'U.S. News & World Report — 2026 Best Colleges: National Universities',
  'https://www.usnews.com/best-colleges/rankings/national-universities',
  '2026',
  'verified'
where not exists (
  select 1
  from public.data_sources
  where source_kind = 'ranking'
    and title = 'U.S. News & World Report — 2026 Best Colleges: National Universities'
    and source_url = 'https://www.usnews.com/best-colleges/rankings/national-universities'
    and source_year = '2026'
);

with usnews_source as (
  select id
  from public.data_sources
  where source_kind = 'ranking'
    and title = 'U.S. News & World Report — 2026 Best Colleges: National Universities'
    and source_url = 'https://www.usnews.com/best-colleges/rankings/national-universities'
    and source_year = '2026'
  order by created_at asc
  limit 1
)
insert into public.institution_rankings (
  institution_id,
  source_id,
  ranking_key,
  edition,
  rank_value,
  rank_display,
  is_published
)
select
  queue.resolved_institution_id,
  usnews_source.id,
  'usnews_national_universities',
  '2026 Best Colleges: National Universities',
  queue.source_rank,
  '#' || queue.source_rank::text,
  true
from public.institution_intake_queue as queue
join public.institutions as institution
  on institution.id = queue.resolved_institution_id
  and institution.is_published
cross join usnews_source
where queue.collection_key = 'usnews-national-universities-2026'
  and queue.review_status in ('resolved', 'verified')
on conflict (institution_id, source_id, ranking_key) do update
set
  edition = excluded.edition,
  rank_value = excluded.rank_value,
  rank_display = excluded.rank_display,
  is_published = excluded.is_published,
  updated_at = now();
