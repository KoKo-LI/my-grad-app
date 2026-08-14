# Supabase setup

1. In your Supabase project, open **SQL Editor** and run
   `migrations/20260814_create_undergraduate_catalog.sql` in full.
2. Run `migrations/20260814_create_undergraduate_intake_queue.sql` to enable
   the private editorial queue used to resolve coverage cohorts before they
   become public catalog records.
3. Keep all catalog rows unpublished until their official source has been
   reviewed. The public API only reads published, verified data.
4. Add catalog data in this order: `institutions` → `undergraduate_programs`
   → `data_sources` → `admission_cycles` → `admission_requirements` /
   `admission_statistics`.
5. For a row to reach the Dashboard catalog, set the institution and program
   `is_published = true`, the cycle `is_current = true`, the source
   `verification_status = 'verified'`, and the required data rows
   `is_published = true`.

The `published_undergraduate_match_catalog` view emits only verified program
records with a GPA median. It may optionally include official TOEFL and IELTS
minimum scores. Do not use community reports in this view.

## Private coverage intake

Place an editor-provided roster in `data/intake/` (the directory is ignored by
Git) as a JSON array of `{ "name": string, "rank": number }` values, then run:

```bash
npm run catalog:import-roster
```

Use `npm run catalog:import-roster -- --validate-only` to validate the local
file before performing any database write.

The script requires `SUPABASE_SECRET_KEY` in `.env.local`. This key bypasses
RLS, is only used by the local Node process, and must never be exposed to the
browser or committed. The queue is intentionally private: resolving an entry
to an IPEDS institution and verifying its official admissions sources is
required before adding it to the public catalog.

### Resolve IPEDS institution identities

Download and unzip the current College Scorecard institution-level CSV into a
local temporary or ignored directory, then run:

```bash
npm run catalog:resolve-ipeds -- --scorecard=/absolute/path/to/scorecard.csv
```

Add `--dry-run` to inspect automatic matches without writing to Supabase.

The resolver only accepts an exact normalized name or a unique high-confidence
match to a currently operating College Scorecard institution. It creates
unpublished `institutions` records and marks the corresponding private queue
rows as `resolved`; all ambiguous rows remain pending for manual review.

### Import official institution metrics

Run `migrations/20260814_create_institution_metrics.sql`, then use the same
local College Scorecard CSV to prepare or import decision-useful metrics:

```bash
npm run catalog:import-scorecard-metrics -- --scorecard=/absolute/path/to/scorecard.csv --dry-run
npm run catalog:import-scorecard-metrics -- --scorecard=/absolute/path/to/scorecard.csv
```

The initial import includes tuition, admissions rate, SAT/ACT percentiles,
undergraduate enrollment and the 150%-of-normal-time graduation rate. Missing
or privacy-suppressed values are skipped, not stored as zero. All imported
metrics remain unpublished until they are reviewed for display.

### Import official program and language requirements

Run `migrations/20260814_expand_admission_requirements.sql` once. It adds
source-specific test version, score-scale, applicant-path and subject fields to
the existing requirements model. This keeps legacy TOEFL (0-120) and the
post-January-2026 TOEFL scale distinct instead of comparing incompatible scores.

Copy `data/templates/official-undergraduate-requirements.example.json` to the
ignored path `data/intake/official-undergraduate-requirements.json`, replace all
example values with an official university or school source, then validate before
writing:

```bash
npm run catalog:import-official-requirements -- --input=data/intake/official-undergraduate-requirements.json --dry-run
npm run catalog:import-official-requirements -- --input=data/intake/official-undergraduate-requirements.json
```

The importer accepts institution-wide undergraduate requirements and
major-specific records. It supports GPA, TOEFL, IELTS, DET, PTE, Cambridge,
MET, SAT/ACT, AP/IB, transcripts, coursework, portfolios, interviews and other
admission obligations. Each input record must provide the official source URL,
effective year and a resolved IPEDS UNITID. Imported rows remain unpublished;
do not enter copied page prose, community reports or unverified score claims.
When a school accepts several equivalent exams, give each alternative the same
`satisfactionGroup` and set `satisfactionRule` to `any_of`; this prevents a
future matcher from treating all language tests as simultaneously required.
