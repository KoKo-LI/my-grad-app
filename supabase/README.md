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

### Import official institution metrics for every resolved school

Run `migrations/20260814_create_institution_metrics.sql` and
`migrations/20260818_expand_institution_metrics.sql`, then use the same
official College Scorecard CSV to import every available decision-useful
institution-level fact for the resolved 101-school cohort:

```bash
npm run catalog:import-scorecard-metrics -- --scorecard=/absolute/path/to/scorecard.csv --dry-run
npm run catalog:import-scorecard-metrics -- --scorecard=/absolute/path/to/scorecard.csv
```

The importer covers admissions policy and rate, SAT/ACT percentiles, tuition,
net price, estimated living costs, Pell/loan participation, undergraduate
enrollment and retention, graduation, debt, earnings, repayment and default
outcomes when each field is present in the Department's release. It
automatically publishes those source-attributed federal facts. Missing,
privacy-suppressed or retired source fields are skipped rather than stored as
zero or estimated.

Do not use a third-party GitHub repository as the source of a value merely
because its data is convenient. GitHub may be used to distribute an import
manifest only when every record carries an original official/government URL,
source year and licence/terms review. The application should display that
original source URL, not the GitHub mirror, for every public fact.

### Publish source-attributed U.S. News and QS rankings

Run `migrations/20260816_create_institution_rankings.sql` after the catalog,
intake queue and institution metrics migrations. It creates a dedicated
rankings table and publishes the existing resolved 2026 U.S. News National
Universities cohort using the private intake queue already in this project.

Then run the QS importer to retrieve the official QS World University Rankings
2027 workbook and match its U.S. rows only to the resolved 101-school cohort:

```bash
npm run catalog:import-qs-rankings -- --validate-only
npm run catalog:import-qs-rankings
```

The importer stores only university name-to-rank matches plus the QS publisher,
edition, publication date and source URL; it does not copy descriptions,
methodology or editorial analysis. Display the source link and edition with
every ranking, and review the publisher's current terms before redistributing
rankings outside this product.

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
effective year and a resolved IPEDS UNITID. Do not enter copied page prose,
community reports or unverified score claims. The current private intake has
19 institutions with official program-source records; the remaining schools
need their own official admissions pages or official CDS publications before
project-level fields can be added truthfully.
When a school accepts several equivalent exams, give each alternative the same
`satisfactionGroup` and set `satisfactionRule` to `any_of`; this prevents a
future matcher from treating all language tests as simultaneously required.

Run `migrations/20260814_expand_admission_statistics.sql` before importing
official admitted-student score ranges. An input record may include a
`statistics` array alongside `requirements`; use it for P25, median, P75 or
average figures published by the school. Do not enter those distributions as
minimums or recommendations.
