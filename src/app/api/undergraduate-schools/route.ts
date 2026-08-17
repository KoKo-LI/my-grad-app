import { buildSchoolDirectory } from "@/lib/undergraduateDirectory";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Returns only RLS-approved, source-backed institutions for client-side search. */
export async function GET() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return Response.json({ data: [], source: "unconfigured" }, { headers: { "Cache-Control": "no-store" } });
  }

  const { data: institutions, error: institutionError } = await supabase
    .from("institutions")
    .select("id, ipeds_unitid, name, short_name, country, region, official_website")
    .order("name")
    .limit(160);

  if (institutionError || !institutions) {
    return Response.json({ data: [], source: "unavailable" }, { headers: { "Cache-Control": "no-store" }, status: 503 });
  }

  const institutionIds = institutions
    .map((institution) => (typeof institution.id === "string" ? institution.id : null))
    .filter((id): id is string => id !== null);

  if (institutionIds.length === 0) {
    return Response.json({ data: [], source: "supabase" }, { headers: { "Cache-Control": "no-store" } });
  }

  const [{ data: metrics, error: metricError }, { data: rankings, error: rankingError }] = await Promise.all([
    supabase
      .from("institution_metrics")
      .select("institution_id, metric_category, metric, value_numeric, unit, source_period, data_sources(title, source_url)")
      .in("institution_id", institutionIds),
    supabase
      .from("institution_rankings")
      .select("institution_id, ranking_key, edition, rank_value, rank_display, data_sources(title, source_url)")
      .in("institution_id", institutionIds),
  ]);

  if (metricError || !metrics) {
    return Response.json({ data: [], source: "unavailable" }, { headers: { "Cache-Control": "no-store" }, status: 503 });
  }

  return Response.json(
    {
      data: buildSchoolDirectory(institutions as unknown, metrics as unknown, rankingError ? [] : rankings ?? []),
      source: "supabase",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
