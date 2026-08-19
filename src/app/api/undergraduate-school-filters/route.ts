import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SchoolDirectoryProgramFilter } from "@/types";

export const dynamic = "force-dynamic";

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

  const [{ data: institutions, error: institutionError }, { data: programs, error: programError }] = await Promise.all([
    supabase
      .from("institutions")
      .select("id, ipeds_unitid")
      .eq("is_published", true)
      .limit(160),
    supabase
      .from("undergraduate_programs")
      .select("institution_id, major_categories")
      .eq("is_published", true)
      .limit(240),
  ]);

  if (institutionError || programError || !Array.isArray(institutions) || !Array.isArray(programs)) {
    return Response.json({ data: [], source: "unavailable" }, { headers: { "Cache-Control": "no-store" }, status: 503 });
  }

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
