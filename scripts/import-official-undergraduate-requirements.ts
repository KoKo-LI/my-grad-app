import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const defaultInputPath = "data/intake/official-undergraduate-requirements.json";

const metricValues = [
  "gpa",
  "english_proficiency",
  "toefl_ibt_total",
  "toefl_ibt_section",
  "ielts_academic_overall",
  "ielts_academic_section",
  "duolingo_english_test",
  "pte_academic",
  "cambridge_english",
  "met",
  "sat_total",
  "sat_ebrw",
  "sat_math",
  "act_composite",
  "act_english",
  "act_ela",
  "ap_subject",
  "ib_total",
  "ib_subject",
  "coursework",
  "transcript",
  "recommendation",
  "essay",
  "portfolio",
  "interview",
  "financial_certification",
] as const;

const statisticMetricValues = [
  "gpa",
  "toefl_ibt_total",
  "toefl_ibt_section",
  "ielts_academic_overall",
  "ielts_academic_section",
  "duolingo_english_test",
  "pte_academic",
  "cambridge_english",
  "met",
  "sat_total",
  "sat_ebrw",
  "sat_math",
  "act_composite",
  "act_english",
  "act_ela",
  "ap_subject",
  "ib_total",
  "ib_subject",
] as const;

const requirementKindValues = ["minimum", "recommended", "required", "optional", "not_required", "considered"] as const;
const applicantScopeValues = ["all", "international", "domestic"] as const;
const applicationPathValues = ["all", "first_year", "transfer"] as const;
const sourceKindValues = ["official_program", "official_institution"] as const;
const satisfactionRuleValues = ["any_of", "all_of"] as const;
const statisticValues = ["p25", "median", "p75", "average", "acceptance_rate"] as const;
const cohortValues = ["applicant", "admitted", "enrolled"] as const;

type Metric = (typeof metricValues)[number];
type StatisticMetric = (typeof statisticMetricValues)[number];
type RequirementKind = (typeof requirementKindValues)[number];
type ApplicantScope = (typeof applicantScopeValues)[number];
type ApplicationPath = (typeof applicationPathValues)[number];
type SourceKind = (typeof sourceKindValues)[number];
type SatisfactionRule = (typeof satisfactionRuleValues)[number];
type Statistic = (typeof statisticValues)[number];
type Cohort = (typeof cohortValues)[number];

type SourceInput = {
  sourceKind: SourceKind;
  title: string;
  sourceUrl: string;
  sourceYear: string;
  publishedAt: string | null;
};

type ProgramInput = {
  programName: string;
  degreeName: string;
  fieldOfStudy: string;
  majorCategories: string[];
  officialUrl: string;
};

type CycleInput = {
  cycleName: string;
  entryTerm: string;
  applicationOpenDate: string | null;
  priorityDeadline: string | null;
  finalDeadline: string;
  decisionReleaseDate: string | null;
  isCurrent: boolean;
};

type RequirementInput = {
  metric: Metric;
  requirementKind: RequirementKind;
  applicantScope: ApplicantScope;
  applicationPath: ApplicationPath;
  minimumScore: number | null;
  maximumScore: number | null;
  scoreScale: number | null;
  testVersion: string | null;
  subjectArea: string | null;
  satisfactionGroup: string | null;
  satisfactionRule: SatisfactionRule | null;
  valueText: string | null;
};

type StatisticInput = {
  metric: StatisticMetric;
  cohort: Cohort;
  statistic: Statistic;
  statisticValue: number;
  sampleSize: number | null;
  applicantScope: ApplicantScope;
  applicationPath: ApplicationPath;
  scoreScale: number | null;
  testVersion: string | null;
  subjectArea: string | null;
};

type RequirementRecord = {
  institutionIpedsUnitId: string;
  program: ProgramInput;
  cycle: CycleInput | null;
  source: SourceInput;
  requirements: RequirementInput[];
  statistics: StatisticInput[];
};

type InputDocument = {
  records: RequirementRecord[];
};

type InstitutionRow = {
  id: string;
  ipeds_unitid: string;
};

type ProgramRow = {
  id: string;
};

type CycleRow = {
  id: string;
};

type SourceRow = {
  id: string;
};

type RequirementUpsert = {
  program_id: string;
  cycle_id: string | null;
  source_id: string;
  metric: Metric;
  requirement_kind: RequirementKind;
  applicant_scope: ApplicantScope;
  application_path: ApplicationPath;
  minimum_score: number | null;
  maximum_score: number | null;
  score_scale: number | null;
  test_version: string | null;
  subject_area: string | null;
  satisfaction_group: string | null;
  satisfaction_rule: SatisfactionRule | null;
  value_text: string | null;
  source_record_key: string;
  is_published: boolean;
};

type StatisticUpsert = {
  program_id: string;
  cycle_id: string | null;
  source_id: string;
  metric: StatisticMetric;
  cohort: Cohort;
  statistic: Statistic;
  statistic_value: number;
  sample_size: number | null;
  applicant_scope: ApplicantScope;
  application_path: ApplicationPath;
  score_scale: number | null;
  test_version: string | null;
  subject_area: string | null;
  source_record_key: string;
  is_published: boolean;
};

function getInputPath(): string {
  const argument = process.argv.find((value) => value.startsWith("--input="));
  return argument ? argument.slice("--input=".length) : defaultInputPath;
}

function isDryRun(): boolean {
  return process.argv.includes("--dry-run");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function parseText(value: unknown, label: string, minimumLength = 1, maximumLength = 500): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string.`);
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < minimumLength || normalized.length > maximumLength) {
    throw new Error(`${label} must contain ${minimumLength}-${maximumLength} characters.`);
  }
  return normalized;
}

function parseOptionalText(value: unknown, label: string, maximumLength = 1000): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return parseText(value, label, 1, maximumLength);
}

function parseUrl(value: unknown, label: string): string {
  const parsed = new URL(parseText(value, label));
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`${label} must use http or https.`);
  }
  return parsed.toString();
}

function parseDate(value: unknown, label: string, required: boolean): string | null {
  if (value === null || value === undefined || value === "") {
    if (required) {
      throw new Error(`${label} is required.`);
    }
    return null;
  }
  const date = parseText(value, label, 10, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error(`${label} must be an ISO date (YYYY-MM-DD).`);
  }
  return date;
}

function parseOptionalNumber(value: unknown, label: string, maximum = 100000): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > maximum) {
    throw new Error(`${label} must be a number between 0 and ${maximum}.`);
  }
  return value;
}

function parseStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 30) {
    throw new Error(`${label} must contain 1-30 entries.`);
  }
  return value.map((item, index) => parseText(item, `${label}[${index}]`, 1, 80));
}

function parseProgram(value: unknown, label: string): ProgramInput {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return {
    programName: parseText(value.programName, `${label}.programName`, 2, 200),
    degreeName: parseText(value.degreeName, `${label}.degreeName`, 2, 100),
    fieldOfStudy: parseText(value.fieldOfStudy, `${label}.fieldOfStudy`, 2, 120),
    majorCategories: parseStringArray(value.majorCategories, `${label}.majorCategories`),
    officialUrl: parseUrl(value.officialUrl, `${label}.officialUrl`),
  };
}

function parseCycle(value: unknown, label: string): CycleInput | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isRecord(value) || typeof value.isCurrent !== "boolean") {
    throw new Error(`${label} must be an object with a boolean isCurrent.`);
  }
  return {
    cycleName: parseText(value.cycleName, `${label}.cycleName`, 2, 120),
    entryTerm: parseText(value.entryTerm, `${label}.entryTerm`, 2, 80),
    applicationOpenDate: parseDate(value.applicationOpenDate, `${label}.applicationOpenDate`, false),
    priorityDeadline: parseDate(value.priorityDeadline, `${label}.priorityDeadline`, false),
    finalDeadline: parseDate(value.finalDeadline, `${label}.finalDeadline`, true) ?? "",
    decisionReleaseDate: parseDate(value.decisionReleaseDate, `${label}.decisionReleaseDate`, false),
    isCurrent: value.isCurrent,
  };
}

function parseSource(value: unknown, label: string): SourceInput {
  if (!isRecord(value) || !isOneOf(value.sourceKind, sourceKindValues)) {
    throw new Error(`${label}.sourceKind must be an official source type.`);
  }
  return {
    sourceKind: value.sourceKind,
    title: parseText(value.title, `${label}.title`, 3, 240),
    sourceUrl: parseUrl(value.sourceUrl, `${label}.sourceUrl`),
    sourceYear: parseText(value.sourceYear, `${label}.sourceYear`, 4, 40),
    publishedAt: parseDate(value.publishedAt, `${label}.publishedAt`, false),
  };
}

function parseRequirement(value: unknown, label: string): RequirementInput {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  if (!isOneOf(value.metric, metricValues)) {
    throw new Error(`${label}.metric is not supported.`);
  }
  if (!isOneOf(value.requirementKind, requirementKindValues)) {
    throw new Error(`${label}.requirementKind is not supported.`);
  }
  if (!isOneOf(value.applicantScope, applicantScopeValues)) {
    throw new Error(`${label}.applicantScope is not supported.`);
  }
  if (!isOneOf(value.applicationPath, applicationPathValues)) {
    throw new Error(`${label}.applicationPath is not supported.`);
  }

  const satisfactionGroup = parseOptionalText(value.satisfactionGroup, `${label}.satisfactionGroup`, 80);
  const satisfactionRuleValue = value.satisfactionRule;
  let satisfactionRule: SatisfactionRule | null = null;
  if (satisfactionGroup === null) {
    if (satisfactionRuleValue !== null && satisfactionRuleValue !== undefined) {
      throw new Error(`${label} must provide satisfactionGroup and satisfactionRule together.`);
    }
  } else if (isOneOf(satisfactionRuleValue, satisfactionRuleValues)) {
    satisfactionRule = satisfactionRuleValue;
  } else {
    throw new Error(`${label} must provide satisfactionGroup and satisfactionRule together.`);
  }
  if (satisfactionGroup !== null && !/^[a-z0-9][a-z0-9:_-]{2,79}$/.test(satisfactionGroup)) {
    throw new Error(`${label}.satisfactionGroup must use lowercase letters, numbers, colons, underscores or hyphens.`);
  }

  const minimumScore = parseOptionalNumber(value.minimumScore, `${label}.minimumScore`);
  const maximumScore = parseOptionalNumber(value.maximumScore, `${label}.maximumScore`);
  const scoreScale = parseOptionalNumber(value.scoreScale, `${label}.scoreScale`);
  const valueText = parseOptionalText(value.valueText, `${label}.valueText`);
  const requirementKind = value.requirementKind;

  if (minimumScore !== null && maximumScore !== null && minimumScore > maximumScore) {
    throw new Error(`${label} minimumScore cannot exceed maximumScore.`);
  }
  if (
    scoreScale !== null &&
    ((minimumScore !== null && minimumScore > scoreScale) || (maximumScore !== null && maximumScore > scoreScale))
  ) {
    throw new Error(`${label} scores cannot exceed scoreScale.`);
  }
  if (
    minimumScore === null &&
    maximumScore === null &&
    valueText === null &&
    requirementKind !== "optional" &&
    requirementKind !== "not_required"
  ) {
    throw new Error(`${label} must contain a score or a concise requirement value.`);
  }

  return {
    metric: value.metric,
    requirementKind,
    applicantScope: value.applicantScope,
    applicationPath: value.applicationPath,
    minimumScore,
    maximumScore,
    scoreScale,
    testVersion: parseOptionalText(value.testVersion, `${label}.testVersion`, 120),
    subjectArea: parseOptionalText(value.subjectArea, `${label}.subjectArea`, 120),
    satisfactionGroup,
    satisfactionRule,
    valueText,
  };
}

function parseStatistic(value: unknown, label: string): StatisticInput {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  if (!isOneOf(value.metric, statisticMetricValues)) {
    throw new Error(`${label}.metric is not supported for an admission statistic.`);
  }
  if (!isOneOf(value.cohort, cohortValues) || !isOneOf(value.statistic, statisticValues)) {
    throw new Error(`${label} must declare a supported cohort and statistic.`);
  }
  if (!isOneOf(value.applicantScope, applicantScopeValues) || !isOneOf(value.applicationPath, applicationPathValues)) {
    throw new Error(`${label} must declare a supported applicant scope and application path.`);
  }
  const statisticValue = parseOptionalNumber(value.statisticValue, `${label}.statisticValue`);
  if (statisticValue === null) {
    throw new Error(`${label}.statisticValue is required.`);
  }
  const scoreScale = parseOptionalNumber(value.scoreScale, `${label}.scoreScale`);
  if (scoreScale !== null && statisticValue > scoreScale && value.statistic !== "acceptance_rate") {
    throw new Error(`${label}.statisticValue cannot exceed scoreScale.`);
  }
  const sampleSize = parseOptionalNumber(value.sampleSize, `${label}.sampleSize`, 10000000);
  if (sampleSize !== null && (!Number.isInteger(sampleSize) || sampleSize === 0)) {
    throw new Error(`${label}.sampleSize must be a positive integer when present.`);
  }
  return {
    metric: value.metric,
    cohort: value.cohort,
    statistic: value.statistic,
    statisticValue,
    sampleSize,
    applicantScope: value.applicantScope,
    applicationPath: value.applicationPath,
    scoreScale,
    testVersion: parseOptionalText(value.testVersion, `${label}.testVersion`, 120),
    subjectArea: parseOptionalText(value.subjectArea, `${label}.subjectArea`, 120),
  };
}

function parseInputDocument(value: unknown): InputDocument {
  if (!isRecord(value) || !Array.isArray(value.records) || value.records.length === 0) {
    throw new Error("Input must be an object with a non-empty records array.");
  }
  if (value.records.length > 5000) {
    throw new Error("Input exceeds the 5,000-record safety limit.");
  }

  return {
    records: value.records.map((item, index) => {
      const label = `records[${index}]`;
      if (!isRecord(item)) {
        throw new Error(`${label} must be an object.`);
      }
      const requirements = item.requirements === undefined ? [] : item.requirements;
      const statistics = item.statistics === undefined ? [] : item.statistics;
      if (!Array.isArray(requirements) || !Array.isArray(statistics) || (requirements.length === 0 && statistics.length === 0)) {
        throw new Error(`${label} must include one or more requirements or statistics.`);
      }
      const institutionIpedsUnitId = parseText(item.institutionIpedsUnitId, `${label}.institutionIpedsUnitId`, 6, 6);
      if (!/^\d{6}$/.test(institutionIpedsUnitId)) {
        throw new Error(`${label}.institutionIpedsUnitId must be a 6-digit IPEDS UNITID.`);
      }
      return {
        institutionIpedsUnitId,
        program: parseProgram(item.program, `${label}.program`),
        cycle: parseCycle(item.cycle, `${label}.cycle`),
        source: parseSource(item.source, `${label}.source`),
        requirements: requirements.map((requirement, requirementIndex) =>
          parseRequirement(requirement, `${label}.requirements[${requirementIndex}]`),
        ),
        statistics: statistics.map((statistic, statisticIndex) =>
          parseStatistic(statistic, `${label}.statistics[${statisticIndex}]`),
        ),
      };
    }),
  };
}

function getRequiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required. Keep it in .env.local and never commit it.`);
  }
  return value;
}

function parseRows<T extends object>(value: unknown, label: string, parse: (item: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} did not return an array.`);
  }
  return value.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`${label}[${index}] has an invalid shape.`);
    }
    return parse(item);
  });
}

function parseSingleRow<T extends object>(value: unknown, label: string, parse: (item: Record<string, unknown>) => T): T {
  const rows = parseRows(value, label, parse);
  if (rows.length !== 1) {
    throw new Error(`${label} must return exactly one row.`);
  }
  return rows[0];
}

function recordKey(kind: "requirement" | "statistic", identity: object): string {
  const digest = createHash("sha256").update(JSON.stringify(identity)).digest("hex").slice(0, 48);
  return `${kind}:${digest}`;
}

function sourceRecordKey(requirement: RequirementInput, cycleName: string | null): string {
  return recordKey("requirement", { cycleName, ...requirement });
}

function statisticSourceRecordKey(statistic: StatisticInput, cycleName: string | null): string {
  return recordKey("statistic", { cycleName, ...statistic });
}

async function main(): Promise<void> {
  const inputPath = getInputPath();
  const input = parseInputDocument(JSON.parse(await readFile(path.resolve(process.cwd(), inputPath), "utf8")) as unknown);
  const totalRequirements = input.records.reduce((total, record) => total + record.requirements.length, 0);
  const totalStatistics = input.records.reduce((total, record) => total + record.statistics.length, 0);

  if (isDryRun()) {
    console.log(`Validated ${totalRequirements} requirements and ${totalStatistics} statistics across ${input.records.length} official source records.`);
    return;
  }

  const supabaseUrl = getRequiredEnvironmentValue("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = getRequiredEnvironmentValue("SUPABASE_SECRET_KEY");
  const client = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const unitIds = [...new Set(input.records.map((record) => record.institutionIpedsUnitId))];
  const { data: institutionData, error: institutionError } = await client
    .from("institutions")
    .select("id, ipeds_unitid")
    .in("ipeds_unitid", unitIds);
  if (institutionError) {
    throw new Error(`Could not load institution identities: ${institutionError.message}`);
  }
  const institutions = parseRows(institutionData as unknown, "Institution lookup", (item): InstitutionRow => {
    if (typeof item.id !== "string" || typeof item.ipeds_unitid !== "string") {
      throw new Error("Institution lookup row has an invalid shape.");
    }
    return { id: item.id, ipeds_unitid: item.ipeds_unitid };
  });
  const institutionIdByUnitId = new Map(institutions.map((institution) => [institution.ipeds_unitid, institution.id]));
  const unresolvedUnitIds = unitIds.filter((unitId) => !institutionIdByUnitId.has(unitId));
  if (unresolvedUnitIds.length > 0) {
    throw new Error(`No resolved institution exists for IPEDS UNITID(s): ${unresolvedUnitIds.join(", ")}.`);
  }

  let importedRequirements = 0;
  let importedStatistics = 0;
  for (const record of input.records) {
    const institutionId = institutionIdByUnitId.get(record.institutionIpedsUnitId);
    if (!institutionId) {
      throw new Error(`Missing institution mapping for ${record.institutionIpedsUnitId}.`);
    }
    const { data: programData, error: programError } = await client
      .from("undergraduate_programs")
      .upsert(
        {
          institution_id: institutionId,
          program_name: record.program.programName,
          degree_name: record.program.degreeName,
          field_of_study: record.program.fieldOfStudy,
          major_categories: record.program.majorCategories,
          official_url: record.program.officialUrl,
          is_published: false,
        },
        { onConflict: "institution_id,program_name,degree_name" },
      )
      .select("id");
    if (programError) {
      throw new Error(`Could not upsert ${record.program.programName}: ${programError.message}`);
    }
    const programId = parseSingleRow(programData as unknown, "Program upsert", (item): ProgramRow => {
      if (typeof item.id !== "string") {
        throw new Error("Program upsert row has an invalid id.");
      }
      return { id: item.id };
    }).id;

    let cycleId: string | null = null;
    if (record.cycle) {
      const { data: cycleData, error: cycleError } = await client
        .from("admission_cycles")
        .upsert(
          {
            program_id: programId,
            cycle_name: record.cycle.cycleName,
            entry_term: record.cycle.entryTerm,
            application_open_date: record.cycle.applicationOpenDate,
            priority_deadline: record.cycle.priorityDeadline,
            final_deadline: record.cycle.finalDeadline,
            decision_release_date: record.cycle.decisionReleaseDate,
            is_current: record.cycle.isCurrent,
          },
          { onConflict: "program_id,cycle_name,entry_term" },
        )
        .select("id");
      if (cycleError) {
        throw new Error(`Could not upsert ${record.cycle.cycleName}: ${cycleError.message}`);
      }
      cycleId = parseSingleRow(cycleData as unknown, "Cycle upsert", (item): CycleRow => {
        if (typeof item.id !== "string") {
          throw new Error("Cycle upsert row has an invalid id.");
        }
        return { id: item.id };
      }).id;
    }

    const { data: existingSourceData, error: existingSourceError } = await client
      .from("data_sources")
      .select("id")
      .eq("source_url", record.source.sourceUrl)
      .eq("source_year", record.source.sourceYear)
      .limit(1);
    if (existingSourceError) {
      throw new Error(`Could not find source ${record.source.sourceUrl}: ${existingSourceError.message}`);
    }
    const existingSources = parseRows(existingSourceData as unknown, "Source lookup", (item): SourceRow => {
      if (typeof item.id !== "string") {
        throw new Error("Source lookup row has an invalid id.");
      }
      return { id: item.id };
    });
    let sourceId = existingSources[0]?.id;
    if (!sourceId) {
      const { data: sourceData, error: sourceError } = await client
        .from("data_sources")
        .insert({
          source_kind: record.source.sourceKind,
          title: record.source.title,
          source_url: record.source.sourceUrl,
          source_year: record.source.sourceYear,
          published_at: record.source.publishedAt,
          verification_status: "verified",
        })
        .select("id");
      if (sourceError) {
        throw new Error(`Could not create source ${record.source.sourceUrl}: ${sourceError.message}`);
      }
      sourceId = parseSingleRow(sourceData as unknown, "Source insert", (item): SourceRow => {
        if (typeof item.id !== "string") {
          throw new Error("Source insert row has an invalid id.");
        }
        return { id: item.id };
      }).id;
    }
    const rows: RequirementUpsert[] = record.requirements.map((requirement) => ({
      program_id: programId,
      cycle_id: cycleId,
      source_id: sourceId,
      metric: requirement.metric,
      requirement_kind: requirement.requirementKind,
      applicant_scope: requirement.applicantScope,
      application_path: requirement.applicationPath,
      minimum_score: requirement.minimumScore,
      maximum_score: requirement.maximumScore,
      score_scale: requirement.scoreScale,
      test_version: requirement.testVersion,
      subject_area: requirement.subjectArea,
      satisfaction_group: requirement.satisfactionGroup,
      satisfaction_rule: requirement.satisfactionRule,
      value_text: requirement.valueText,
      source_record_key: sourceRecordKey(requirement, record.cycle?.cycleName ?? null),
      is_published: false,
    }));
    const { error: requirementError } = await client
      .from("admission_requirements")
      .upsert(rows, { onConflict: "program_id,source_id,source_record_key" });
    if (requirementError) {
      throw new Error(`Could not import requirements for ${record.program.programName}: ${requirementError.message}`);
    }
    importedRequirements += rows.length;

    const statisticRows: StatisticUpsert[] = record.statistics.map((statistic) => ({
      program_id: programId,
      cycle_id: cycleId,
      source_id: sourceId,
      metric: statistic.metric,
      cohort: statistic.cohort,
      statistic: statistic.statistic,
      statistic_value: statistic.statisticValue,
      sample_size: statistic.sampleSize,
      applicant_scope: statistic.applicantScope,
      application_path: statistic.applicationPath,
      score_scale: statistic.scoreScale,
      test_version: statistic.testVersion,
      subject_area: statistic.subjectArea,
      source_record_key: statisticSourceRecordKey(statistic, record.cycle?.cycleName ?? null),
      is_published: false,
    }));
    if (statisticRows.length > 0) {
      const { error: statisticError } = await client
        .from("admission_statistics")
        .upsert(statisticRows, { onConflict: "program_id,source_id,source_record_key" });
      if (statisticError) {
        throw new Error(`Could not import admission statistics for ${record.program.programName}: ${statisticError.message}`);
      }
      importedStatistics += statisticRows.length;
    }
  }

  console.log(`Imported ${importedRequirements} unpublished official requirements and ${importedStatistics} statistics from ${input.records.length} source records.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unknown official requirement import failure.");
  process.exitCode = 1;
});
