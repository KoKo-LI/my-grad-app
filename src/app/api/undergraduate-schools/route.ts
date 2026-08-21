import { buildSchoolDirectory } from "@/lib/undergraduateDirectory";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const metricPageSize = 1000;

type MetricQueryResult =
  | { data: unknown[]; error: null }
  | { data: []; error: string };

type ProgramReference = {
  id: string;
  institutionId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseProgramReferences(value: unknown): ProgramReference[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((program) => {
    if (!isRecord(program) || typeof program.id !== "string" || typeof program.institution_id !== "string") return [];
    return [{ id: program.id, institutionId: program.institution_id }];
  });
}

/**
 * Supabase caps a single REST response at 1,000 rows in this project. The
 * complete 101-school catalog now exceeds that size, so fetch every stable
 * page rather than silently presenting a partial directory.
 */
async function fetchAllPublishedMetrics(
  institutionIds: string[],
): Promise<MetricQueryResult> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { data: [], error: "Catalog is not configured." };

  const rows: unknown[] = [];
  for (let start = 0; ; start += metricPageSize) {
    const { data, error } = await supabase
      .from("institution_metrics")
      .select("id, institution_id, metric_category, metric, value_numeric, unit, source_period, data_sources(title, source_url)")
      .in("institution_id", institutionIds)
      .eq("is_published", true)
      .order("id")
      .range(start, start + metricPageSize - 1);

    if (error) return { data: [], error: error.message };
    if (!Array.isArray(data)) return { data: [], error: "Institution metrics did not return an array." };

    rows.push(...(data as unknown[]));
    if (data.length < metricPageSize) return { data: rows, error: null };
  }
}

async function fetchAllPublishedRequirements(
  programs: ProgramReference[],
): Promise<MetricQueryResult> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { data: [], error: "Catalog is not configured." };
  if (programs.length === 0) return { data: [], error: null };

  const programIds = programs.map((program) => program.id);
  const institutionByProgramId = new Map(programs.map((program) => [program.id, program.institutionId]));
  const rows: unknown[] = [];

  for (let start = 0; ; start += metricPageSize) {
    const { data, error } = await supabase
      .from("admission_requirements")
      .select("id, program_id, metric, requirement_kind, applicant_scope, application_path, minimum_score, maximum_score, score_scale, test_version, subject_area, satisfaction_group, satisfaction_rule, value_text, data_sources(title, source_url)")
      .in("program_id", programIds)
      .eq("is_published", true)
      .order("id")
      .range(start, start + metricPageSize - 1);

    if (error) return { data: [], error: error.message };
    if (!Array.isArray(data)) return { data: [], error: "Admission requirements did not return an array." };

    data.forEach((requirement) => {
      if (!isRecord(requirement) || typeof requirement.program_id !== "string") return;
      const institutionId = institutionByProgramId.get(requirement.program_id);
      if (institutionId) rows.push({ ...requirement, institution_id: institutionId });
    });

    if (data.length < metricPageSize) return { data: rows, error: null };
  }
}

/** Returns only RLS-approved, source-backed institutions for client-side search. */
export async function GET() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return Response.json({ data: [], source: "unconfigured" }, { headers: { "Cache-Control": "no-store" } });
  }

  const { data: institutions, error: institutionError } = await supabase
    .from("institutions")
    .select("id, ipeds_unitid, name, short_name, country, region, official_website")
    .eq("is_published", true)
    .order("name")
    .limit(256);

  if (institutionError || !institutions) {
    return Response.json({ data: [], source: "unavailable" }, { headers: { "Cache-Control": "no-store" }, status: 503 });
  }

  const institutionIds = institutions
    .map((institution) => (typeof institution.id === "string" ? institution.id : null))
    .filter((id): id is string => id !== null);

  if (institutionIds.length === 0) {
    return Response.json({ data: [], source: "supabase" }, { headers: { "Cache-Control": "no-store" } });
  }

  const { data: programs, error: programError } = await supabase
    .from("undergraduate_programs")
    .select("id, institution_id")
    .in("institution_id", institutionIds)
    .eq("is_published", true)
    .limit(1000);

  if (programError || !programs) {
    return Response.json({ data: [], source: "unavailable" }, { headers: { "Cache-Control": "no-store" }, status: 503 });
  }

  const programReferences = parseProgramReferences(programs);

  const [metricsResponse, requirementsResponse, { data: rankings, error: rankingError }] = await Promise.all([
    fetchAllPublishedMetrics(institutionIds),
    fetchAllPublishedRequirements(programReferences),
    supabase
      .from("institution_rankings")
      .select("institution_id, ranking_key, edition, rank_value, rank_display, data_sources(title, source_url)")
      .in("institution_id", institutionIds)
      .eq("is_published", true),
  ]);

  if (metricsResponse.error || requirementsResponse.error) {
    return Response.json({ data: [], source: "unavailable" }, { headers: { "Cache-Control": "no-store" }, status: 503 });
  }

  return Response.json(
    {
      data: buildSchoolDirectory(institutions as unknown, metricsResponse.data, rankingError ? [] : rankings ?? [], requirementsResponse.data),
      source: "supabase",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
