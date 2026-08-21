import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SchoolDirectoryProgramFilter } from "@/types";

export const dynamic = "force-dynamic";

const filterPageSize = 1000;

type FilterQueryResult =
  | { data: unknown[]; error: null }
  | { data: []; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readMajorCategories(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value.map((item) => item.trim()).filter(Boolean)
    : [];
}

async function fetchAllPublishedFilterInstitutions(): Promise<FilterQueryResult> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { data: [], error: "Catalog is not configured." };

  const rows: unknown[] = [];
  for (let start = 0; ; start += filterPageSize) {
    const { data, error } = await supabase
      .from("institutions")
      .select("id, ipeds_unitid")
      .eq("is_published", true)
      .order("id")
      .range(start, start + filterPageSize - 1);

    if (error) return { data: [], error: error.message };
    if (!Array.isArray(data)) return { data: [], error: "Institutions did not return an array." };

    rows.push(...(data as unknown[]));
    if (data.length < filterPageSize) return { data: rows, error: null };
  }
}

async function fetchAllPublishedProgramFilters(): Promise<FilterQueryResult> {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { data: [], error: "Catalog is not configured." };

  const rows: unknown[] = [];
  for (let start = 0; ; start += filterPageSize) {
    const { data, error } = await supabase
      .from("undergraduate_programs")
      .select("institution_id, major_categories")
      .eq("is_published", true)
      .order("id")
      .range(start, start + filterPageSize - 1);

    if (error) return { data: [], error: error.message };
    if (!Array.isArray(data)) return { data: [], error: "Programs did not return an array." };

    rows.push(...(data as unknown[]));
    if (data.length < filterPageSize) return { data: rows, error: null };
  }
}

/**
 * Exposes only published program categories needed by the client-side catalog
 * filter. Institution names, requirements and source records remain behind the
 * existing school-detail route.
 */
export async function GET() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return Response.json({ data: [], source: "unconfigured" }, { headers: { "Cache-Control": "no-store" } });
  }

  const [institutionsResponse, programsResponse] = await Promise.all([
    fetchAllPublishedFilterInstitutions(),
    fetchAllPublishedProgramFilters(),
  ]);

  if (institutionsResponse.error || programsResponse.error) {
    return Response.json({ data: [], source: "unavailable" }, { headers: { "Cache-Control": "no-store" }, status: 503 });
  }
  const institutions = institutionsResponse.data;
  const programs = programsResponse.data;

  const ipedsUnitIdByInstitutionId = new Map(
    institutions.flatMap((institution) => {
      if (!isRecord(institution)) return [];
      const id = readText(institution.id);
      const ipedsUnitId = readText(institution.ipeds_unitid);
      return id && ipedsUnitId ? [[id, ipedsUnitId] as const] : [];
    }),
  );
  const categoriesByIpedsUnitId = new Map<string, Set<string>>();

  programs.forEach((program) => {
    if (!isRecord(program)) return;
    const institutionId = readText(program.institution_id);
    const ipedsUnitId = institutionId ? ipedsUnitIdByInstitutionId.get(institutionId) : undefined;
    if (!ipedsUnitId) return;

    const categories = categoriesByIpedsUnitId.get(ipedsUnitId) ?? new Set<string>();
    readMajorCategories(program.major_categories).forEach((category) => categories.add(category));
    if (categories.size > 0) categoriesByIpedsUnitId.set(ipedsUnitId, categories);
  });

  const data: SchoolDirectoryProgramFilter[] = Array.from(categoriesByIpedsUnitId, ([ipedsUnitId, categories]) => ({
    ipedsUnitId,
    majorCategories: Array.from(categories).sort((first, second) => first.localeCompare(second, "zh-CN")),
  }));

  return Response.json(
    { data, source: "supabase" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
