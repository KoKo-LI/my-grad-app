import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseUndergraduateCatalog } from "@/lib/undergraduateCatalog";

export const dynamic = "force-dynamic";

/**
 * Public, read-only catalog endpoint. It deliberately returns only rows from
 * the published view; privileged write operations remain server-only.
 */
export async function GET() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return Response.json(
      { data: [], source: "unconfigured" },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const { data, error } = await supabase
    .from("published_undergraduate_match_catalog")
    .select("*")
    .limit(240);

  if (error) {
    return Response.json(
      { data: [], source: "unavailable" },
      { headers: { "Cache-Control": "no-store" }, status: 503 },
    );
  }

  return Response.json(
    { data: parseUndergraduateCatalog({ data }), source: "supabase" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
