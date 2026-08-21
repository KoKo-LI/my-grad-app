# Undergraduate program import and review workflow

This workflow is for expanding the number of undergraduate programs without
publishing unverified claims. It stores structured program facts and a link to
the original public source; it does not copy course-page prose or scrape data
behind a login or paywall.

## 1. Create the private review queue

In Supabase SQL Editor, run:

```sql
-- Copy and run the complete file:
-- supabase/migrations/20260821_create_program_import_review_queue.sql
```

The migration enables RLS on all editorial tables. The browser has no policy
to read or write the import queue. Only the local, server-only import scripts
can access it with `SUPABASE_SECRET_KEY` from `.env.local`.

## 2. Prepare a batch locally

Copy
[`data/templates/undergraduate-program-intake.example.json`](../data/templates/undergraduate-program-intake.example.json)
to the ignored path `data/intake/undergraduate-program-intake.json`. Replace
the example institution identifier and URLs with real values from a university,
government agency, official Common Data Set, or a licensed partner.

Each record needs:

- a stable `recordKey`;
- the existing `institutions.ipeds_unitid` (the app also supports stable IDs
  such as `GB-IMPERIAL` for non-U.S. institutions);
- an official program title, award, field and one or more Chinese discovery
  categories;
- the original source URL, effective year, source type and a short factual
  verification note.

Validate first, then queue the batch:

```bash
npm run catalog:queue-programs -- --input=data/intake/undergraduate-program-intake.json --validate-only
npm run catalog:queue-programs -- --input=data/intake/undergraduate-program-intake.json
```

The second command writes only to the private `pending` queue. It does not
make any program visible to users.

## 3. Review in Supabase

Use the private review view in SQL Editor:

```sql
select *
from public.undergraduate_program_import_review_queue
where review_status = 'pending'
order by created_at;
```

For every row, open the linked original source and confirm the school, program
name, degree and academic year. Never promote an inferred score requirement or
a community-reported admission result as an official value. Approve a record
only after that verification:

```sql
update public.undergraduate_program_import_candidates
set
  review_status = 'approved',
  reviewer_notes = 'Verified title, award and 2026/27 page against the official URL.',
  reviewed_at = now()
where id = '<candidate-uuid>'
  and review_status = 'pending';
```

Use `review_status = 'rejected'` with a note for a stale, mismatched or
non-authoritative source.

## 4. Publish only reviewed records

Run a local dry run first:

```bash
npm run catalog:publish-reviewed-programs -- --batch=2026-uk-computing-programs --dry-run
npm run catalog:publish-reviewed-programs -- --batch=2026-uk-computing-programs
```

Publication creates or reuses a verified source, publishes the program and
links the program to its source. It will refuse to publish a program when its
parent institution is not already published.

## 5. Add requirements and admitted-score data separately

Program-directory data and score data have different evidence standards. Add
TOEFL, IELTS, SAT, ACT, AP, IB and admitted-student distributions only when a
school or a government source publishes them. Use the existing official
requirements workflow:

```bash
npm run catalog:import-official-requirements -- --input=data/intake/official-undergraduate-requirements.json --dry-run
npm run catalog:import-official-requirements -- --input=data/intake/official-undergraduate-requirements.json
```

For a source that says a score is merely *considered* or test-optional, record
that fact as such. Do not turn it into a minimum. The public app should show
"not disclosed" when official data is unavailable rather than fabricate a
number.
