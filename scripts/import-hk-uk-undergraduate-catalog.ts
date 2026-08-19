import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const migrationPath = "supabase/migrations/20260818_add_hong_kong_and_uk_undergraduate_catalog.sql";
const baseProgramName = "国际本科申请基准（院校级）";
const baseDegreeName = "Bachelor";

type SqlScalar = string | number | null;
type SqlValue = SqlScalar | string[];
type SqlRow = SqlValue[];
type RawRecord = Record<string, unknown>;

type InstitutionSeed = {
  country: string;
  ipedsUnitId: string;
  name: string;
  officialWebsite: string;
  region: string;
  shortName: string;
};

type SourceSeed = {
  sourceKind: "official_institution" | "official_program" | "ranking";
  sourceExcerpt: string;
  sourceUrl: string;
  sourceYear: string;
  title: string;
};

type RankingSeed = {
  ipedsUnitId: string;
  rankDisplay: string;
  rankValue: number;
};

type ProgramSeed = {
  degreeName: string;
  fieldOfStudy: string;
  ipedsUnitId: string;
  majorCategories: string[];
  officialUrl: string;
  programName: string;
};

type RequirementSeed = {
  applicantScope: string;
  ipedsUnitId: string;
  maximumScore: number | null;
  metric: string;
  minimumScore: number | null;
  requirementKind: string;
  scoreScale: number | null;
  sourceRecordKey: string;
  sourceUrl: string;
  sourceYear: string;
  subjectArea: string | null;
  testVersion: string | null;
  valueText: string | null;
};

type CatalogSeeds = {
  institutions: InstitutionSeed[];
  programs: ProgramSeed[];
  rankings: RankingSeed[];
  requirements: RequirementSeed[];
  sources: SourceSeed[];
};

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRequiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Keep it in .env.local and never commit it.`);
  }
  return value;
}

function isValidateOnly(): boolean {
  return process.argv.includes("--validate-only");
}

function takeValueBlock(sql: string, cteName: string, endMarker: string): string {
  const cteStart = sql.indexOf(`with ${cteName} (`);
  if (cteStart < 0) throw new Error(`Could not find ${cteName} in ${migrationPath}.`);

  const valuesStart = sql.indexOf("  values\n", cteStart);
  if (valuesStart < 0) throw new Error(`Could not find ${cteName} values in ${migrationPath}.`);

  const rowStart = valuesStart + "  values\n".length;
  const end = sql.indexOf(endMarker, rowStart);
  if (end < 0) throw new Error(`Could not find the end of ${cteName} in ${migrationPath}.`);

  return sql.slice(rowStart, end);
}

function parseQuotedSqlString(token: string): string {
  if (token.length < 2 || !token.startsWith("'") || !token.endsWith("'")) {
    throw new Error(`Invalid SQL string literal: ${token.slice(0, 80)}`);
  }

  let output = "";
  for (let index = 1; index < token.length - 1; index += 1) {
    const character = token[index];
    if (character === "'" && token[index + 1] === "'") {
      output += "'";
      index += 1;
    } else {
      output += character;
    }
  }
  return output;
}

function splitSqlFields(input: string): string[] {
  const fields: string[] = [];
  let bracketDepth = 0;
  let inQuote = false;
  let start = 0;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === "'") {
      if (inQuote && input[index + 1] === "'") {
        index += 1;
      } else {
        inQuote = !inQuote;
      }
      continue;
    }

    if (inQuote) continue;
    if (character === "[") bracketDepth += 1;
    if (character === "]") bracketDepth -= 1;
    if (character === "," && bracketDepth === 0) {
      fields.push(input.slice(start, index).trim());
      start = index + 1;
    }
  }

  fields.push(input.slice(start).trim());
  return fields;
}

function parseSqlValue(token: string): SqlValue {
  if (token === "null") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(token)) return Number(token);
  if (token.startsWith("array[") && token.endsWith("]")) {
    return splitSqlFields(token.slice("array[".length, -1)).map(parseQuotedSqlString);
  }
  return parseQuotedSqlString(token);
}

function parseSqlRows(valueBlock: string, label: string): SqlRow[] {
  const rows: SqlRow[] = [];
  let inQuote = false;
  let depth = 0;
  let rowStart = -1;

  for (let index = 0; index < valueBlock.length; index += 1) {
    const character = valueBlock[index];
    if (character === "'") {
      if (inQuote && valueBlock[index + 1] === "'") {
        index += 1;
      } else {
        inQuote = !inQuote;
      }
      continue;
    }

    if (inQuote) continue;
    if (character === "(") {
      if (depth === 0) rowStart = index + 1;
      depth += 1;
      continue;
    }
    if (character !== ")") continue;

    depth -= 1;
    if (depth < 0) throw new Error(`${label} has an unexpected closing parenthesis.`);
    if (depth === 0 && rowStart >= 0) {
      rows.push(splitSqlFields(valueBlock.slice(rowStart, index)).map(parseSqlValue));
      rowStart = -1;
    }
  }

  if (inQuote || depth !== 0 || rowStart >= 0) throw new Error(`${label} has an incomplete SQL value row.`);
  if (rows.length === 0) throw new Error(`${label} does not contain any value rows.`);
  return rows;
}

function readRowText(value: SqlValue, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
  return value.trim();
}

function readRowNumber(value: SqlValue, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
  return value;
}

function readNullableRowNumber(value: SqlValue, label: string): number | null {
  if (value === null) return null;
  return readRowNumber(value, label);
}

function readNullableRowText(value: SqlValue, label: string): string | null {
  if (value === null) return null;
  return readRowText(value, label);
}

function readRowTextArray(value: SqlValue, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => !item.trim())) throw new Error(`${label} must be a non-empty text array.`);
  return value.map((item) => item.trim());
}

function expectRowLength(row: SqlRow, length: number, label: string): void {
  if (row.length !== length) throw new Error(`${label} has ${row.length} fields; expected ${length}.`);
}

function readInstitutionSeeds(rows: SqlRow[]): InstitutionSeed[] {
  return rows.map((row, index) => {
    expectRowLength(row, 6, `institution row ${index + 1}`);
    return {
      ipedsUnitId: readRowText(row[0], "institution identifier"),
      name: readRowText(row[1], "institution name"),
      shortName: readRowText(row[2], "institution short name"),
      country: readRowText(row[3], "institution country"),
      region: readRowText(row[4], "institution region"),
      officialWebsite: readRowText(row[5], "institution official website"),
    };
  });
}

function readSourceSeeds(rows: SqlRow[]): SourceSeed[] {
  return rows.map((row, index) => {
    expectRowLength(row, 5, `source row ${index + 1}`);
    const sourceKind = readRowText(row[0], "source kind");
    if (sourceKind !== "official_institution" && sourceKind !== "official_program" && sourceKind !== "ranking") {
      throw new Error(`Unsupported source kind: ${sourceKind}.`);
    }
    return {
      sourceKind,
      title: readRowText(row[1], "source title"),
      sourceUrl: readRowText(row[2], "source URL"),
      sourceYear: readRowText(row[3], "source year"),
      sourceExcerpt: readRowText(row[4], "source excerpt"),
    };
  });
}

function readRankingSeeds(rows: SqlRow[]): RankingSeed[] {
  return rows.map((row, index) => {
    expectRowLength(row, 3, `ranking row ${index + 1}`);
    return {
      ipedsUnitId: readRowText(row[0], "ranking institution identifier"),
      rankValue: readRowNumber(row[1], "ranking value"),
      rankDisplay: readRowText(row[2], "ranking display"),
    };
  });
}

function readProgramSeeds(rows: SqlRow[]): ProgramSeed[] {
  return rows.map((row, index) => {
    expectRowLength(row, 6, `program row ${index + 1}`);
    return {
      ipedsUnitId: readRowText(row[0], "program institution identifier"),
      programName: readRowText(row[1], "program name"),
      degreeName: readRowText(row[2], "program degree name"),
      fieldOfStudy: readRowText(row[3], "program field of study"),
      majorCategories: readRowTextArray(row[4], "program major categories"),
      officialUrl: readRowText(row[5], "program official URL"),
    };
  });
}

function readRequirementSeeds(rows: SqlRow[]): RequirementSeed[] {
  return rows.map((row, index) => {
    expectRowLength(row, 13, `requirement row ${index + 1}`);
    return {
      ipedsUnitId: readRowText(row[0], "requirement institution identifier"),
      metric: readRowText(row[1], "requirement metric"),
      requirementKind: readRowText(row[2], "requirement kind"),
      applicantScope: readRowText(row[3], "requirement applicant scope"),
      minimumScore: readNullableRowNumber(row[4], "minimum score"),
      maximumScore: readNullableRowNumber(row[5], "maximum score"),
      scoreScale: readNullableRowNumber(row[6], "score scale"),
      testVersion: readNullableRowText(row[7], "test version"),
      subjectArea: readNullableRowText(row[8], "subject area"),
      valueText: readNullableRowText(row[9], "value text"),
      sourceUrl: readRowText(row[10], "requirement source URL"),
      sourceYear: readRowText(row[11], "requirement source year"),
      sourceRecordKey: readRowText(row[12], "requirement source record key"),
    };
  });
}

async function loadCatalogSeeds(): Promise<CatalogSeeds> {
  const sql = await readFile(path.resolve(migrationPath), "utf8");
  return {
    institutions: readInstitutionSeeds(parseSqlRows(takeValueBlock(sql, "institution_seed", ")\ninsert into public.institutions"), "institution_seed")),
    sources: readSourceSeeds(parseSqlRows(takeValueBlock(sql, "source_seed", ")\ninsert into public.data_sources"), "source_seed")),
    rankings: readRankingSeeds(parseSqlRows(takeValueBlock(sql, "ranking_seed", "), qs_source as"), "ranking_seed")),
    programs: readProgramSeeds(parseSqlRows(takeValueBlock(sql, "program_seed", ")\ninsert into public.undergraduate_programs"), "program_seed")),
    requirements: readRequirementSeeds(parseSqlRows(takeValueBlock(sql, "requirement_seed", ")\ninsert into public.admission_requirements"), "requirement_seed")),
  };
}

function parseRows(value: unknown, label: string): RawRecord[] {
  if (!Array.isArray(value) || value.some((item) => !isRecord(item))) throw new Error(`${label} returned an invalid response.`);
  return value;
}

function readIdentifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !value) throw new Error(`${label} is missing an ID.`);
  return value;
}

function sourceKey(sourceUrl: string, sourceYear: string): string {
  return `${sourceUrl}\u0000${sourceYear}`;
}

async function main(): Promise<void> {
  const seeds = await loadCatalogSeeds();
  console.log(`Validated ${seeds.institutions.length} institutions, ${seeds.sources.length} sources, ${seeds.rankings.length} rankings, ${seeds.programs.length} programs, and ${seeds.requirements.length} requirements.`);
  if (isValidateOnly()) return;

  const client = createClient(
    getRequiredEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnvironmentValue("SUPABASE_SECRET_KEY"),
    { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } },
  );

  const { data: institutionData, error: institutionError } = await client
    .from("institutions")
    .upsert(seeds.institutions.map((seed) => ({
      country: seed.country,
      ipeds_unitid: seed.ipedsUnitId,
      is_published: true,
      name: seed.name,
      official_website: seed.officialWebsite,
      region: seed.region,
      short_name: seed.shortName,
    })), { onConflict: "ipeds_unitid" })
    .select("id, ipeds_unitid");
  if (institutionError) throw new Error(`Could not upsert international institutions: ${institutionError.message}`);

  const institutionIds = new Map<string, string>();
  parseRows(institutionData, "institution upsert").forEach((row) => {
    const ipedsUnitId = readIdentifier(row.ipeds_unitid, "institution identifier");
    institutionIds.set(ipedsUnitId, readIdentifier(row.id, "institution"));
  });

  const sourceUrls = seeds.sources.map((source) => source.sourceUrl);
  const { data: existingSourceData, error: existingSourceError } = await client
    .from("data_sources")
    .select("id, source_url, source_year")
    .in("source_url", sourceUrls);
  if (existingSourceError) throw new Error(`Could not inspect catalog sources: ${existingSourceError.message}`);

  const existingSourceKeys = new Set(
    parseRows(existingSourceData, "existing source lookup").map((row) => sourceKey(readIdentifier(row.source_url, "source URL"), typeof row.source_year === "string" ? row.source_year : "")),
  );
  const missingSources = seeds.sources.filter((source) => !existingSourceKeys.has(sourceKey(source.sourceUrl, source.sourceYear)));
  if (missingSources.length > 0) {
    const { error: sourceInsertError } = await client.from("data_sources").insert(missingSources.map((source) => ({
      source_excerpt: source.sourceExcerpt,
      source_kind: source.sourceKind,
      source_url: source.sourceUrl,
      source_year: source.sourceYear,
      title: source.title,
      verification_status: "verified",
    })));
    if (sourceInsertError) throw new Error(`Could not create catalog sources: ${sourceInsertError.message}`);
  }

  const { data: sourceData, error: sourceError } = await client
    .from("data_sources")
    .select("id, source_url, source_year")
    .in("source_url", sourceUrls);
  if (sourceError) throw new Error(`Could not load catalog sources: ${sourceError.message}`);

  const sourceIds = new Map<string, string>();
  parseRows(sourceData, "source lookup").forEach((row) => {
    const sourceUrl = readIdentifier(row.source_url, "source URL");
    const sourceYear = typeof row.source_year === "string" ? row.source_year : "";
    sourceIds.set(sourceKey(sourceUrl, sourceYear), readIdentifier(row.id, "source"));
  });

  const qsSourceId = sourceIds.get(sourceKey("https://www.topuniversities.com/world-university-rankings", "2027"));
  if (!qsSourceId) throw new Error("QS World University Rankings 2027 source is unavailable after import.");

  const { error: rankingError } = await client.from("institution_rankings").upsert(
    seeds.rankings.map((ranking) => ({
      edition: "QS World University Rankings 2027",
      institution_id: readIdentifier(institutionIds.get(ranking.ipedsUnitId), `institution ${ranking.ipedsUnitId}`),
      is_published: true,
      rank_display: ranking.rankDisplay,
      rank_value: ranking.rankValue,
      ranking_key: "qs_world_university_rankings",
      source_id: qsSourceId,
    })),
    { onConflict: "institution_id,source_id,ranking_key" },
  );
  if (rankingError) throw new Error(`Could not publish QS ranking rows: ${rankingError.message}`);

  const { data: programData, error: programError } = await client
    .from("undergraduate_programs")
    .upsert(seeds.programs.map((program) => ({
      degree_name: program.degreeName,
      field_of_study: program.fieldOfStudy,
      institution_id: readIdentifier(institutionIds.get(program.ipedsUnitId), `institution ${program.ipedsUnitId}`),
      is_published: true,
      major_categories: program.majorCategories,
      official_url: program.officialUrl,
      program_name: program.programName,
    })), { onConflict: "institution_id,program_name,degree_name" })
    .select("id, institution_id, program_name, degree_name");
  if (programError) throw new Error(`Could not upsert international programs: ${programError.message}`);

  const programIds = new Map<string, string>();
  parseRows(programData, "program upsert").forEach((row) => {
    const key = `${readIdentifier(row.institution_id, "program institution")}\u0000${readIdentifier(row.program_name, "program name")}\u0000${readIdentifier(row.degree_name, "program degree")}`;
    programIds.set(key, readIdentifier(row.id, "program"));
  });

  const { error: requirementError } = await client.from("admission_requirements").upsert(
    seeds.requirements.map((requirement) => {
      const institutionId = readIdentifier(institutionIds.get(requirement.ipedsUnitId), `institution ${requirement.ipedsUnitId}`);
      const programKey = `${institutionId}\u0000${baseProgramName}\u0000${baseDegreeName}`;
      const sourceId = sourceIds.get(sourceKey(requirement.sourceUrl, requirement.sourceYear));
      if (!sourceId) throw new Error(`Source is unavailable for ${requirement.sourceRecordKey}.`);
      return {
        applicant_scope: requirement.applicantScope,
        application_path: "first_year",
        is_published: true,
        maximum_score: requirement.maximumScore,
        metric: requirement.metric,
        minimum_score: requirement.minimumScore,
        program_id: readIdentifier(programIds.get(programKey), `program ${requirement.ipedsUnitId}`),
        requirement_kind: requirement.requirementKind,
        score_scale: requirement.scoreScale,
        source_id: sourceId,
        source_record_key: requirement.sourceRecordKey,
        subject_area: requirement.subjectArea,
        test_version: requirement.testVersion,
        value_text: requirement.valueText,
      };
    }),
    { onConflict: "program_id,source_id,source_record_key" },
  );
  if (requirementError) throw new Error(`Could not publish international admission requirements: ${requirementError.message}`);

  console.log(`Published ${seeds.institutions.length} international institutions and ${seeds.requirements.length} source-attributed admission requirements.`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown international catalog import failure.");
  process.exitCode = 1;
});
