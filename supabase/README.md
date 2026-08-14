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
