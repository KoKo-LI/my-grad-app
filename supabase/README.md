# Supabase setup

1. In your Supabase project, open **SQL Editor** and run
   `migrations/20260814_create_undergraduate_catalog.sql` in full.
2. Keep all catalog rows unpublished until their official source has been
   reviewed. The public API only reads published, verified data.
3. Add catalog data in this order: `institutions` → `undergraduate_programs`
   → `data_sources` → `admission_cycles` → `admission_requirements` /
   `admission_statistics`.
4. For a row to reach the Dashboard catalog, set the institution and program
   `is_published = true`, the cycle `is_current = true`, the source
   `verification_status = 'verified'`, and the required data rows
   `is_published = true`.

The `published_undergraduate_match_catalog` view emits only verified program
records with a GPA median. It may optionally include official TOEFL and IELTS
minimum scores. Do not use community reports in this view.
