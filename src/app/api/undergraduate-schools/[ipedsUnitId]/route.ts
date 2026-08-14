import { buildSchoolDetail } from "@/lib/undergraduateDirectory";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ ipedsUnitId: string }> },
) {
  const { ipedsUnitId } = await context.params;
  if (!/^\d{1,10}$/.test(ipedsUnitId)) {
    return Response.json({ error: "Invalid institution identifier." }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return Response.json({ error: "Catalog is not configured." }, { status: 503 });
  }

  const { data: institution, error: institutionError } = await supabase
    .from("institutions")
    .select("id, ipeds_unitid, name, short_name, country, region, official_website")
    .eq("ipeds_unitid", ipedsUnitId)
    .maybeSingle();

  if (institutionError) {
    return Response.json({ error: "Catalog is temporarily unavailable." }, { status: 503 });
  }

  if (!institution || typeof institution.id !== "string") {
    return Response.json({ error: "Institution not found." }, { status: 404 });
  }

  const [{ data: metrics, error: metricError }, { data: programs, error: programError }] = await Promise.all([
    supabase
      .from("institution_metrics")
      .select("institution_id, metric_category, metric, value_numeric, unit, source_period, data_sources(title, source_url)")
      .eq("institution_id", institution.id),
    supabase
      .from("undergraduate_programs")
      .select("id, program_name, degree_name, field_of_study, major_categories, official_url")
      .eq("institution_id", institution.id),
  ]);

  if (metricError || programError || !metrics || !programs) {
    return Response.json({ error: "Catalog is temporarily unavailable." }, { status: 503 });
  }

  const programIds = programs
    .map((program) => (typeof program.id === "string" ? program.id : null))
    .filter((id): id is string => id !== null);

  const [requirementsResponse, statisticsResponse] = programIds.length
    ? await Promise.all([
        supabase
          .from("admission_requirements")
          .select("id, program_id, metric, requirement_kind, applicant_scope, application_path, minimum_score, maximum_score, score_scale, test_version, subject_area, satisfaction_group, satisfaction_rule, value_text, data_sources(title, source_url)")
          .in("program_id", programIds),
        supabase
          .from("admission_statistics")
          .select("id, program_id, metric, cohort, statistic, statistic_value, applicant_scope, application_path, score_scale, test_version, subject_area, data_sources(title, source_url)")
          .in("program_id", programIds),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (requirementsResponse.error || statisticsResponse.error || !requirementsResponse.data || !statisticsResponse.data) {
    return Response.json({ error: "Catalog is temporarily unavailable." }, { status: 503 });
  }

  const detail = buildSchoolDetail({
    institution,
    metrics,
    programs,
    requirements: requirementsResponse.data,
    statistics: statisticsResponse.data,
  });

  if (!detail) {
    return Response.json({ error: "Institution data is incomplete." }, { status: 503 });
  }

  return Response.json({ data: detail }, { headers: { "Cache-Control": "no-store" } });
}
