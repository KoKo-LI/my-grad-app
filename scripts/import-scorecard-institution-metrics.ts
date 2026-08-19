import { createReadStream } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

type MetricDefinition = {
  column: string;
  metricCategory: "admissions" | "cost" | "enrollment" | "outcomes";
  metric: string;
  unit: "USD" | "ratio" | "score" | "students" | "flag";
};

type InstitutionIdentity = {
  id: string;
  ipedsUnitId: string;
};

type MetricUpsert = {
  institution_id: string;
  source_id: string;
  metric_category: MetricDefinition["metricCategory"];
  metric: string;
  value_numeric: number;
  unit: MetricDefinition["unit"];
  source_period: string;
  is_published: boolean;
};

const collectionKey = "usnews-national-universities-2026";
const sourceTitle = "College Scorecard: Most Recent Institution-Level Data";
const sourceUrl = "https://ed-public-download.scorecard.network/downloads/Most-Recent-Cohorts-Institution_05192025.zip";
const sourceYear = "2025";
const sourcePeriod = "2025-05 College Scorecard release";
/**
 * A deliberately decision-useful subset of the official Scorecard file.
 *
 * The public file is versioned over time, so `loadMetricRows` treats every
 * field below as optional except UNITID. That lets a newer release add or
 * retire a column without turning a complete catalog sync into a partial one.
 * It never synthesizes a value when the Department suppresses or omits it.
 */
const metricDefinitions: readonly MetricDefinition[] = [
  { column: "OPENADMP", metricCategory: "admissions", metric: "open_admissions_policy", unit: "flag" },
  { column: "TUITIONFEE_IN", metricCategory: "cost", metric: "tuition_in_state_usd", unit: "USD" },
  { column: "TUITIONFEE_OUT", metricCategory: "cost", metric: "tuition_out_of_state_usd", unit: "USD" },
  { column: "COSTT4_A", metricCategory: "cost", metric: "average_cost_of_attendance_usd", unit: "USD" },
  { column: "BOOKSUPPLY", metricCategory: "cost", metric: "books_and_supplies_usd", unit: "USD" },
  { column: "ROOMBOARD_ON", metricCategory: "cost", metric: "room_and_board_on_campus_usd", unit: "USD" },
  { column: "OTHEREXPENSE_ON", metricCategory: "cost", metric: "other_expenses_on_campus_usd", unit: "USD" },
  { column: "ROOMBOARD_OFF", metricCategory: "cost", metric: "room_and_board_off_campus_usd", unit: "USD" },
  { column: "OTHEREXPENSE_OFF", metricCategory: "cost", metric: "other_expenses_off_campus_usd", unit: "USD" },
  { column: "OTHEREXPENSE_FAM", metricCategory: "cost", metric: "other_expenses_with_family_usd", unit: "USD" },
  { column: "NPT4_PUB", metricCategory: "cost", metric: "average_net_price_public_usd", unit: "USD" },
  { column: "NPT4_PRIV", metricCategory: "cost", metric: "average_net_price_private_usd", unit: "USD" },
  { column: "PCTPELL", metricCategory: "cost", metric: "pell_grant_recipient_share", unit: "ratio" },
  { column: "PCTFLOAN", metricCategory: "cost", metric: "federal_loan_recipient_share", unit: "ratio" },
  { column: "ADM_RATE", metricCategory: "admissions", metric: "admission_rate", unit: "ratio" },
  { column: "SATVR25", metricCategory: "admissions", metric: "sat_ebrw_p25", unit: "score" },
  { column: "SATVRMID", metricCategory: "admissions", metric: "sat_ebrw_median", unit: "score" },
  { column: "SATVR75", metricCategory: "admissions", metric: "sat_ebrw_p75", unit: "score" },
  { column: "SATMT25", metricCategory: "admissions", metric: "sat_math_p25", unit: "score" },
  { column: "SATMTMID", metricCategory: "admissions", metric: "sat_math_median", unit: "score" },
  { column: "SATMT75", metricCategory: "admissions", metric: "sat_math_p75", unit: "score" },
  { column: "ACTCM25", metricCategory: "admissions", metric: "act_composite_p25", unit: "score" },
  { column: "ACTCMMID", metricCategory: "admissions", metric: "act_composite_median", unit: "score" },
  { column: "ACTCM75", metricCategory: "admissions", metric: "act_composite_p75", unit: "score" },
  { column: "ACTEN25", metricCategory: "admissions", metric: "act_english_p25", unit: "score" },
  { column: "ACTENMID", metricCategory: "admissions", metric: "act_english_median", unit: "score" },
  { column: "ACTEN75", metricCategory: "admissions", metric: "act_english_p75", unit: "score" },
  { column: "ACTMT25", metricCategory: "admissions", metric: "act_math_p25", unit: "score" },
  { column: "ACTMTMID", metricCategory: "admissions", metric: "act_math_median", unit: "score" },
  { column: "ACTMT75", metricCategory: "admissions", metric: "act_math_p75", unit: "score" },
  { column: "UGDS", metricCategory: "enrollment", metric: "undergraduate_enrollment", unit: "students" },
  { column: "UGDS_MEN", metricCategory: "enrollment", metric: "undergraduate_men_share", unit: "ratio" },
  { column: "UGDS_WOMEN", metricCategory: "enrollment", metric: "undergraduate_women_share", unit: "ratio" },
  { column: "RET_FT4", metricCategory: "enrollment", metric: "first_year_full_time_retention_rate", unit: "ratio" },
  { column: "RET_PT4", metricCategory: "enrollment", metric: "first_year_part_time_retention_rate", unit: "ratio" },
  { column: "C150_4", metricCategory: "outcomes", metric: "graduation_rate_150_percent", unit: "ratio" },
  { column: "C200_4", metricCategory: "outcomes", metric: "graduation_rate_200_percent", unit: "ratio" },
  { column: "DEBT_MDN", metricCategory: "outcomes", metric: "median_student_debt_usd", unit: "USD" },
  { column: "GRAD_DEBT_MDN", metricCategory: "outcomes", metric: "median_graduate_debt_usd", unit: "USD" },
  { column: "WDRAW_DEBT_MDN", metricCategory: "outcomes", metric: "median_withdrawal_debt_usd", unit: "USD" },
  { column: "MD_EARN_WNE_P6", metricCategory: "outcomes", metric: "median_earnings_6_years_usd", unit: "USD" },
  { column: "MD_EARN_WNE_P8", metricCategory: "outcomes", metric: "median_earnings_8_years_usd", unit: "USD" },
  { column: "MD_EARN_WNE_P10", metricCategory: "outcomes", metric: "median_earnings_10_years_usd", unit: "USD" },
  { column: "RPY_3YR_RT", metricCategory: "outcomes", metric: "loan_repayment_rate_3_years", unit: "ratio" },
  { column: "RPY_5YR_RT", metricCategory: "outcomes", metric: "loan_repayment_rate_5_years", unit: "ratio" },
  { column: "RPY_7YR_RT", metricCategory: "outcomes", metric: "loan_repayment_rate_7_years", unit: "ratio" },
  { column: "CDR3", metricCategory: "outcomes", metric: "cohort_default_rate_3_years", unit: "ratio" },
];

function getScorecardPath(): string {
  const argument = process.argv.find((value) => value.startsWith("--scorecard="));
  if (!argument) {
    throw new Error("Pass the unzipped College Scorecard CSV with --scorecard=/absolute/path/to/file.csv.");
  }
  return argument.slice("--scorecard=".length);
}

function isDryRun(): boolean {
  return process.argv.includes("--dry-run");
}

function getRequiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Keep it in .env.local and never commit it.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let isQuoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (isQuoted) {
      if (character === '"' && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        isQuoted = false;
      } else {
        cell += character;
      }
      continue;
    }
    if (character === '"') {
      isQuoted = true;
    } else if (character === ",") {
      cells.push(cell);
      cell = "";
    } else {
      cell += character;
    }
  }

  if (isQuoted) {
    throw new Error("College Scorecard CSV contains an unterminated quoted value.");
  }
  cells.push(cell);
  return cells;
}

function parseResolvedInstitutionIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("Resolved queue query did not return an array.");
  }
  return value.map((item, index) => {
    if (!isRecord(item) || typeof item.resolved_institution_id !== "string") {
      throw new Error(`Resolved queue record ${index + 1} has an invalid shape.`);
    }
    return item.resolved_institution_id;
  });
}

function parseInstitutionIdentities(value: unknown): InstitutionIdentity[] {
  if (!Array.isArray(value)) {
    throw new Error("Institution query did not return an array.");
  }
  return value.map((item, index) => {
    if (!isRecord(item) || typeof item.id !== "string" || typeof item.ipeds_unitid !== "string") {
      throw new Error(`Institution record ${index + 1} has an invalid shape.`);
    }
    return { id: item.id, ipedsUnitId: item.ipeds_unitid };
  });
}

function parseSourceId(value: unknown): string {
  if (!isRecord(value) || typeof value.id !== "string") {
    throw new Error("Data source write did not return an ID.");
  }
  return value.id;
}

function parseOptionalSourceId(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  return parseSourceId(value[0]);
}

function parseNumericValue(value: string): number | null {
  const normalized = value.trim();
  if (!normalized || /^(NA|NULL|PS|PrivacySuppressed)$/i.test(normalized)) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function loadMetricRows(
  scorecardPath: string,
  institutionIdByIpedsUnitId: Map<string, string>,
): Promise<Omit<MetricUpsert, "source_id">[]> {
  const reader = createInterface({
    input: createReadStream(path.resolve(scorecardPath), { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  let columnIndexes: Map<string, number> | null = null;
  const metrics: Omit<MetricUpsert, "source_id">[] = [];

  for await (const line of reader) {
    const cells = parseCsvLine(line);
    if (!columnIndexes) {
      columnIndexes = new Map(cells.map((column, index) => [column.replace(/^\uFEFF/, ""), index]));
      if (!columnIndexes.has("UNITID")) {
        throw new Error("College Scorecard CSV is missing the required UNITID column.");
      }
      const missingMetricColumns = metricDefinitions
        .map(({ column }) => column)
        .filter((column) => !columnIndexes?.has(column));
      if (missingMetricColumns.length > 0) {
        console.warn(`The Scorecard release does not include ${missingMetricColumns.length} optional metrics: ${missingMetricColumns.join(", ")}.`);
      }
      continue;
    }

    const unitId = cells[columnIndexes.get("UNITID") ?? -1]?.trim();
    const institutionId = unitId ? institutionIdByIpedsUnitId.get(unitId) : undefined;
    if (!institutionId) {
      continue;
    }

    for (const definition of metricDefinitions) {
      const columnIndex = columnIndexes.get(definition.column);
      if (columnIndex === undefined) {
        continue;
      }
      const rawValue = cells[columnIndex] ?? "";
      const value = parseNumericValue(rawValue);
      if (value === null) {
        continue;
      }
      metrics.push({
        institution_id: institutionId,
        metric_category: definition.metricCategory,
        metric: definition.metric,
        value_numeric: value,
        unit: definition.unit,
        source_period: sourcePeriod,
        // This importer only accepts the Department's official public file;
        // values may be hidden by the source, but imported values are reviewed
        // source-attributed facts that can be published immediately.
        is_published: true,
      });
    }
  }

  return metrics;
}

async function main(): Promise<void> {
  const scorecardPath = getScorecardPath();
  const supabaseUrl = getRequiredEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = getRequiredEnvironmentValue("SUPABASE_SECRET_KEY");
  const client = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data: queueData, error: queueError } = await client
    .from("institution_intake_queue")
    .select("resolved_institution_id")
    .eq("collection_key", collectionKey)
    .eq("review_status", "resolved");
  if (queueError) {
    throw new Error(`Could not read resolved queue rows: ${queueError.message}`);
  }

  const resolvedInstitutionIds = parseResolvedInstitutionIds(queueData as unknown);
  const { data: institutionData, error: institutionError } = await client
    .from("institutions")
    .select("id, ipeds_unitid")
    .in("id", resolvedInstitutionIds);
  if (institutionError) {
    throw new Error(`Could not read resolved institutions: ${institutionError.message}`);
  }

  const identities = parseInstitutionIdentities(institutionData as unknown);
  const institutionIdByIpedsUnitId = new Map(identities.map((institution) => [institution.ipedsUnitId, institution.id]));
  const metricRows = await loadMetricRows(scorecardPath, institutionIdByIpedsUnitId);
  const coveredInstitutionIds = new Set(metricRows.map((metric) => metric.institution_id));

  if (isDryRun()) {
    console.log(`Dry run prepared ${metricRows.length} metrics for ${coveredInstitutionIds.size} of ${identities.length} resolved institutions.`);
    return;
  }

  const { data: existingSourceData, error: existingSourceError } = await client
    .from("data_sources")
    .select("id")
    .eq("title", sourceTitle)
    .eq("source_url", sourceUrl)
    .eq("source_year", sourceYear)
    .limit(1);
  if (existingSourceError) {
    throw new Error(`Could not check the College Scorecard source: ${existingSourceError.message}`);
  }

  let sourceId = parseOptionalSourceId(existingSourceData as unknown);
  if (!sourceId) {
    const { data: sourceData, error: sourceError } = await client
    .from("data_sources")
      .insert({
        source_kind: "IPEDS",
        title: sourceTitle,
        source_url: sourceUrl,
        source_year: sourceYear,
        retrieved_at: new Date().toISOString(),
        verification_status: "verified",
      })
      .select("id")
      .single();
    if (sourceError) {
      throw new Error(`Could not record the College Scorecard source: ${sourceError.message}`);
    }
    sourceId = parseSourceId(sourceData as unknown);
  }

  const metricRowsWithSource: MetricUpsert[] = metricRows.map((metric) => ({ ...metric, source_id: sourceId }));
  const batchSize = 500;
  for (let start = 0; start < metricRowsWithSource.length; start += batchSize) {
    const batch = metricRowsWithSource.slice(start, start + batchSize);
    const { error } = await client
      .from("institution_metrics")
      .upsert(batch, { onConflict: "institution_id,source_id,metric" });
    if (error) {
      throw new Error(`Could not import institution metrics: ${error.message}`);
    }
  }

  console.log(`Imported ${metricRowsWithSource.length} metrics for ${coveredInstitutionIds.size} institutions from College Scorecard.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown College Scorecard metric import failure.";
  console.error(message);
  process.exitCode = 1;
});
