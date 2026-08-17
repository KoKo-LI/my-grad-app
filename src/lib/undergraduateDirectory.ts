import type {
  InstitutionMetric,
  InstitutionRanking,
  SchoolAdmissionRequirement,
  SchoolAdmissionStatistic,
  SchoolDetail,
  SchoolDirectoryItem,
  UndergraduateProgramSummary,
} from "@/types";

type RawRecord = Record<string, unknown>;

const metricCategories = ["admissions", "cost", "enrollment", "outcomes"] as const;
const metricUnits = ["USD", "ratio", "score", "students"] as const;
const rankingKeys = ["usnews_national_universities", "qs_world_university_rankings"] as const;
const requirementKinds = ["minimum", "recommended", "required", "optional", "not_required", "considered"] as const;
const applicantScopes = ["all", "international", "domestic"] as const;
const applicationPaths = ["all", "first_year", "transfer"] as const;
const statisticKinds = ["p25", "median", "p75", "average", "acceptance_rate"] as const;
const admissionCohorts = ["applicant", "admitted", "enrolled"] as const;

function isRecord(value: unknown): value is RawRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function readNullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : readNumber(value);
}

function readNullableText(value: unknown): string | null {
  return value === null || value === undefined ? null : readText(value);
}

function readStringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return null;
  }

  return value.map((item) => item.trim()).filter(Boolean);
}

function isOneOf<T extends string>(value: string | null, choices: readonly T[]): value is T {
  return value !== null && choices.includes(value as T);
}

function readHttpUrl(value: unknown): string | null {
  const url = readText(value);
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function readSource(value: unknown): { title: string; url: string } | null {
  const source = Array.isArray(value) ? value[0] : value;
  if (!isRecord(source)) return null;

  const title = readText(source.title);
  const url = readHttpUrl(source.source_url);
  return title && url ? { title, url } : null;
}

type ParsedInstitution = SchoolDirectoryItem & { internalId: string };

function parseInstitution(value: unknown): ParsedInstitution | null {
  if (!isRecord(value)) return null;

  const internalId = readText(value.id);
  const ipedsUnitId = readText(value.ipeds_unitid);
  const name = readText(value.name);
  const shortName = readText(value.short_name);
  const country = readText(value.country);
  const region = readText(value.region);
  const officialWebsite = readHttpUrl(value.official_website);

  if (!internalId || !ipedsUnitId || !name || !shortName || !country || !region || !officialWebsite) {
    return null;
  }

  return { country, internalId, ipedsUnitId, metrics: [], name, officialWebsite, rankings: [], region, shortName };
}

type ParsedMetric = InstitutionMetric & { institutionId: string };

function parseMetric(value: unknown): ParsedMetric | null {
  if (!isRecord(value)) return null;

  const institutionId = readText(value.institution_id);
  const category = readText(value.metric_category);
  const metric = readText(value.metric);
  const valueNumeric = readNumber(value.value_numeric);
  const unit = readText(value.unit);
  const sourcePeriod = readText(value.source_period);
  const source = readSource(value.data_sources);

  if (
    !institutionId ||
    !isOneOf(category, metricCategories) ||
    !metric ||
    valueNumeric === null ||
    !isOneOf(unit, metricUnits) ||
    !sourcePeriod ||
    !source
  ) {
    return null;
  }

  return {
    category,
    institutionId,
    metric,
    sourcePeriod,
    sourceTitle: source.title,
    sourceUrl: source.url,
    unit,
    value: valueNumeric,
  };
}

type ParsedRanking = InstitutionRanking & { institutionId: string };

function parseRanking(value: unknown): ParsedRanking | null {
  if (!isRecord(value)) return null;

  const institutionId = readText(value.institution_id);
  const key = readText(value.ranking_key);
  const edition = readText(value.edition);
  const rankValue = readNumber(value.rank_value);
  const rankDisplay = readText(value.rank_display);
  const source = readSource(value.data_sources);

  if (
    !institutionId ||
    !isOneOf(key, rankingKeys) ||
    !edition ||
    rankValue === null ||
    !Number.isInteger(rankValue) ||
    rankValue < 1 ||
    !rankDisplay ||
    !source
  ) {
    return null;
  }

  return {
    edition,
    institutionId,
    key,
    rankDisplay,
    rankValue,
    sourceTitle: source.title,
    sourceUrl: source.url,
  };
}

/** Converts RLS-filtered Supabase rows into safe public directory records. */
export function buildSchoolDirectory(institutionsValue: unknown, metricsValue: unknown, rankingsValue: unknown = []): SchoolDirectoryItem[] {
  if (!Array.isArray(institutionsValue) || !Array.isArray(metricsValue) || !Array.isArray(rankingsValue)) return [];

  const metricsByInstitutionId = new Map<string, InstitutionMetric[]>();
  metricsValue.map(parseMetric).filter((metric): metric is ParsedMetric => metric !== null).forEach((metric) => {
    const { institutionId, ...publicMetric } = metric;
    const current = metricsByInstitutionId.get(institutionId) ?? [];
    current.push(publicMetric);
    metricsByInstitutionId.set(institutionId, current);
  });

  const rankingsByInstitutionId = new Map<string, InstitutionRanking[]>();
  rankingsValue.map(parseRanking).filter((ranking): ranking is ParsedRanking => ranking !== null).forEach((ranking) => {
    const { institutionId, ...publicRanking } = ranking;
    const current = rankingsByInstitutionId.get(institutionId) ?? [];
    current.push(publicRanking);
    rankingsByInstitutionId.set(institutionId, current);
  });

  return institutionsValue
    .map(parseInstitution)
    .filter((institution): institution is ParsedInstitution => institution !== null)
    .map(({ internalId, ...institution }) => ({
      ...institution,
      metrics: (metricsByInstitutionId.get(internalId) ?? []).sort((first, second) => first.metric.localeCompare(second.metric)),
      rankings: (rankingsByInstitutionId.get(internalId) ?? []).sort((first, second) => first.key.localeCompare(second.key)),
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

function parseProgram(value: unknown): UndergraduateProgramSummary | null {
  if (!isRecord(value)) return null;

  const id = readText(value.id);
  const programName = readText(value.program_name);
  const degreeName = readText(value.degree_name);
  const fieldOfStudy = readText(value.field_of_study);
  const majorCategories = readStringList(value.major_categories);
  const officialUrl = readHttpUrl(value.official_url);

  if (!id || !programName || !degreeName || !fieldOfStudy || !majorCategories || !officialUrl) {
    return null;
  }

  return { degreeName, fieldOfStudy, id, majorCategories, officialUrl, programName };
}

function parseRequirement(value: unknown): SchoolAdmissionRequirement | null {
  if (!isRecord(value)) return null;

  const id = readText(value.id);
  const programId = readText(value.program_id);
  const metric = readText(value.metric);
  const requirementKind = readText(value.requirement_kind);
  const applicantScope = readText(value.applicant_scope);
  const applicationPath = readText(value.application_path);
  const minimumScore = readNullableNumber(value.minimum_score);
  const maximumScore = readNullableNumber(value.maximum_score);
  const scoreScale = readNullableNumber(value.score_scale);
  const testVersion = value.test_version === null ? null : readText(value.test_version);
  const subjectArea = value.subject_area === null ? null : readText(value.subject_area);
  const satisfactionGroup = value.satisfaction_group === null ? null : readText(value.satisfaction_group);
  const satisfactionRule = value.satisfaction_rule === "any_of" || value.satisfaction_rule === "all_of" ? value.satisfaction_rule : null;
  const valueText = value.value_text === null ? null : readText(value.value_text);
  const source = readSource(value.data_sources);

  if (
    !id ||
    !programId ||
    !metric ||
    !isOneOf(requirementKind, requirementKinds) ||
    !isOneOf(applicantScope, applicantScopes) ||
    !isOneOf(applicationPath, applicationPaths) ||
    !source
  ) {
    return null;
  }

  return {
    applicantScope,
    applicationPath,
    id,
    maximumScore,
    metric,
    minimumScore,
    programId,
    requirementKind,
    satisfactionGroup,
    satisfactionRule,
    scoreScale,
    sourceTitle: source.title,
    sourceUrl: source.url,
    subjectArea,
    testVersion,
    valueText,
  };
}

function parseStatistic(value: unknown): SchoolAdmissionStatistic | null {
  if (!isRecord(value)) return null;

  const id = readText(value.id);
  const programId = readText(value.program_id);
  const metric = readText(value.metric);
  const cohort = readText(value.cohort);
  const statistic = readText(value.statistic);
  const valueNumeric = readNumber(value.statistic_value);
  const applicantScope = readText(value.applicant_scope);
  const applicationPath = readText(value.application_path);
  const scoreScale = readNullableNumber(value.score_scale);
  const testVersion = value.test_version === null ? null : readText(value.test_version);
  const subjectArea = value.subject_area === null ? null : readText(value.subject_area);
  const source = readSource(value.data_sources);

  if (
    !id ||
    !programId ||
    !metric ||
    !isOneOf(cohort, admissionCohorts) ||
    !isOneOf(statistic, statisticKinds) ||
    valueNumeric === null ||
    !isOneOf(applicantScope, applicantScopes) ||
    !isOneOf(applicationPath, applicationPaths) ||
    !source
  ) {
    return null;
  }

  return {
    applicantScope,
    applicationPath,
    cohort,
    id,
    metric,
    programId,
    scoreScale,
    sourceTitle: source.title,
    sourceUrl: source.url,
    statistic,
    subjectArea,
    testVersion,
    value: valueNumeric,
  };
}

export function buildSchoolDetail(value: unknown): SchoolDetail | null {
  if (!isRecord(value)) return null;

  const directory = buildSchoolDirectory([value.institution], value.metrics, value.rankings);
  const school = directory[0];
  if (!school || !Array.isArray(value.programs) || !Array.isArray(value.requirements) || !Array.isArray(value.statistics)) {
    return null;
  }

  const programs = value.programs.map(parseProgram).filter((program): program is UndergraduateProgramSummary => program !== null);
  const programIds = new Set(programs.map((program) => program.id));
  const requirements = value.requirements
    .map(parseRequirement)
    .filter((requirement): requirement is SchoolAdmissionRequirement => requirement !== null && programIds.has(requirement.programId));
  const statistics = value.statistics
    .map(parseStatistic)
    .filter((statistic): statistic is SchoolAdmissionStatistic => statistic !== null && programIds.has(statistic.programId));

  return { ...school, programs, requirements, statistics };
}

export function parseSchoolDirectoryResponse(value: unknown): SchoolDirectoryItem[] {
  if (!isRecord(value) || !Array.isArray(value.data)) return [];
  return value.data.map(parsePublicDirectoryItem).filter((item): item is SchoolDirectoryItem => item !== null);
}

/** Parses the camelCase public API contract, separately from Supabase's raw row shape. */
function parsePublicMetric(value: unknown): InstitutionMetric | null {
  if (!isRecord(value)) return null;

  const category = readText(value.category);
  const metric = readText(value.metric);
  const sourcePeriod = readText(value.sourcePeriod);
  const sourceTitle = readText(value.sourceTitle);
  const sourceUrl = readHttpUrl(value.sourceUrl);
  const unit = readText(value.unit);
  const numericValue = readNumber(value.value);

  if (
    !isOneOf(category, metricCategories) ||
    !metric ||
    !sourcePeriod ||
    !sourceTitle ||
    !sourceUrl ||
    !isOneOf(unit, metricUnits) ||
    numericValue === null
  ) {
    return null;
  }

  return { category, metric, sourcePeriod, sourceTitle, sourceUrl, unit, value: numericValue };
}

function parsePublicRanking(value: unknown): InstitutionRanking | null {
  if (!isRecord(value)) return null;

  const edition = readText(value.edition);
  const key = readText(value.key);
  const rankDisplay = readText(value.rankDisplay);
  const rankValue = readNumber(value.rankValue);
  const sourceTitle = readText(value.sourceTitle);
  const sourceUrl = readHttpUrl(value.sourceUrl);

  if (
    !edition ||
    !isOneOf(key, rankingKeys) ||
    !rankDisplay ||
    rankValue === null ||
    !Number.isInteger(rankValue) ||
    rankValue < 1 ||
    !sourceTitle ||
    !sourceUrl
  ) {
    return null;
  }

  return { edition, key, rankDisplay, rankValue, sourceTitle, sourceUrl };
}

function parsePublicDirectoryItem(value: unknown): SchoolDirectoryItem | null {
  if (!isRecord(value)) return null;

  const country = readText(value.country);
  const ipedsUnitId = readText(value.ipedsUnitId);
  const name = readText(value.name);
  const officialWebsite = readHttpUrl(value.officialWebsite);
  const region = readText(value.region);
  const shortName = readText(value.shortName);

  if (!country || !ipedsUnitId || !name || !officialWebsite || !region || !shortName || !Array.isArray(value.metrics) || !Array.isArray(value.rankings)) {
    return null;
  }

  return {
    country,
    ipedsUnitId,
    metrics: value.metrics.map(parsePublicMetric).filter((metric): metric is InstitutionMetric => metric !== null),
    name,
    officialWebsite,
    rankings: value.rankings.map(parsePublicRanking).filter((ranking): ranking is InstitutionRanking => ranking !== null),
    region,
    shortName,
  };
}

function parsePublicProgram(value: unknown): UndergraduateProgramSummary | null {
  if (!isRecord(value)) return null;

  const degreeName = readText(value.degreeName);
  const fieldOfStudy = readText(value.fieldOfStudy);
  const id = readText(value.id);
  const majorCategories = readStringList(value.majorCategories);
  const officialUrl = readHttpUrl(value.officialUrl);
  const programName = readText(value.programName);

  if (!degreeName || !fieldOfStudy || !id || !majorCategories || !officialUrl || !programName) return null;
  return { degreeName, fieldOfStudy, id, majorCategories, officialUrl, programName };
}

function parsePublicRequirement(value: unknown): SchoolAdmissionRequirement | null {
  if (!isRecord(value)) return null;

  const applicantScope = readText(value.applicantScope);
  const applicationPath = readText(value.applicationPath);
  const id = readText(value.id);
  const metric = readText(value.metric);
  const programId = readText(value.programId);
  const requirementKind = readText(value.requirementKind);
  const sourceTitle = readText(value.sourceTitle);
  const sourceUrl = readHttpUrl(value.sourceUrl);
  const rawSatisfactionRule = readText(value.satisfactionRule);

  if (
    !isOneOf(applicantScope, applicantScopes) ||
    !isOneOf(applicationPath, applicationPaths) ||
    !id ||
    !metric ||
    !programId ||
    !isOneOf(requirementKind, requirementKinds) ||
    !sourceTitle ||
    !sourceUrl
  ) {
    return null;
  }

  return {
    applicantScope,
    applicationPath,
    id,
    maximumScore: readNullableNumber(value.maximumScore),
    metric,
    minimumScore: readNullableNumber(value.minimumScore),
    programId,
    requirementKind,
    satisfactionGroup: readNullableText(value.satisfactionGroup),
    satisfactionRule: rawSatisfactionRule === "any_of" || rawSatisfactionRule === "all_of" ? rawSatisfactionRule : null,
    scoreScale: readNullableNumber(value.scoreScale),
    sourceTitle,
    sourceUrl,
    subjectArea: readNullableText(value.subjectArea),
    testVersion: readNullableText(value.testVersion),
    valueText: readNullableText(value.valueText),
  };
}

function parsePublicStatistic(value: unknown): SchoolAdmissionStatistic | null {
  if (!isRecord(value)) return null;

  const applicantScope = readText(value.applicantScope);
  const applicationPath = readText(value.applicationPath);
  const cohort = readText(value.cohort);
  const id = readText(value.id);
  const metric = readText(value.metric);
  const programId = readText(value.programId);
  const sourceTitle = readText(value.sourceTitle);
  const sourceUrl = readHttpUrl(value.sourceUrl);
  const statistic = readText(value.statistic);
  const numericValue = readNumber(value.value);

  if (
    !isOneOf(applicantScope, applicantScopes) ||
    !isOneOf(applicationPath, applicationPaths) ||
    !isOneOf(cohort, admissionCohorts) ||
    !id ||
    !metric ||
    !programId ||
    !sourceTitle ||
    !sourceUrl ||
    !isOneOf(statistic, statisticKinds) ||
    numericValue === null
  ) {
    return null;
  }

  return {
    applicantScope,
    applicationPath,
    cohort,
    id,
    metric,
    programId,
    scoreScale: readNullableNumber(value.scoreScale),
    sourceTitle,
    sourceUrl,
    statistic,
    subjectArea: readNullableText(value.subjectArea),
    testVersion: readNullableText(value.testVersion),
    value: numericValue,
  };
}

export function parseSchoolDetailResponse(value: unknown): SchoolDetail | null {
  if (!isRecord(value) || !isRecord(value.data)) return null;

  const school = parsePublicDirectoryItem(value.data);
  if (!school || !Array.isArray(value.data.programs) || !Array.isArray(value.data.requirements) || !Array.isArray(value.data.statistics)) {
    return null;
  }

  const programs = value.data.programs
    .map(parsePublicProgram)
    .filter((program): program is UndergraduateProgramSummary => program !== null);
  const programIds = new Set(programs.map((program) => program.id));
  const requirements = value.data.requirements
    .map(parsePublicRequirement)
    .filter((requirement): requirement is SchoolAdmissionRequirement => requirement !== null && programIds.has(requirement.programId));
  const statistics = value.data.statistics
    .map(parsePublicStatistic)
    .filter((statistic): statistic is SchoolAdmissionStatistic => statistic !== null && programIds.has(statistic.programId));

  return { ...school, programs, requirements, statistics };
}
