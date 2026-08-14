export type DegreeTarget = "undergraduate" | "graduate";

export type StandardizedTestType =
  | "TOEFL"
  | "IELTS"
  | "Duolingo English Test"
  | "SAT"
  | "ACT"
  | "GRE"
  | "GMAT";

export interface StandardizedTestScore {
  test: StandardizedTestType;
  score: string;
}

export interface AcademicSubjectScore {
  subject: string;
  score: string;
}

export interface AcademicRecord {
  apSubjects: AcademicSubjectScore[];
  ibTotalScore: string;
  ibSubjects: AcademicSubjectScore[];
  competitionAwards: string[];
  paperCount: string;
  researchProjectCount: string;
  academicAwardCount: string;
}

/**
 * A student's reusable academic background for school matching and application tracking.
 */
export interface StudentProfile {
  isInitialized: boolean;
  degreeTarget: DegreeTarget;
  currentStage: string;
  currentSchool: string;
  gpa: string;
  gpaMax: string;
  /** Derived legacy fields retained for future matching integrations. */
  languageScore: string;
  greGmat: string;
  standardizedTests: StandardizedTestScore[];
  academicRecord: AcademicRecord;
  targetRegions: string[];
  targetMajor: string;
}

export type ProfilePresetId = "cs-foundation" | "cs-ambitious" | "ai-specialist";

export interface ProfilePreset {
  id: ProfilePresetId;
  label: string;
  description: string;
  profile: StudentProfile;
}

export interface SchoolMatchInput {
  id: string;
  name: string;
  program: string;
  region: string;
  deadline: string;
  majorCategories: readonly string[];
  medianGpa: number;
  minimumToefl?: number;
  minimumIelts?: number;
  shortName: string;
}

export interface SchoolMatchResult extends SchoolItem {
  matchScore: number;
  matchingReason: string;
  shortName: string;
}

export type ApplicationTimelineStage = "portalOpen" | "priorityDeadline" | "finalDeadline" | "decisionRelease";

export interface ApplicationTimelineMilestone {
  date: string;
  label: string;
  stage: ApplicationTimelineStage;
}

/**
 * A single graduate-school application in the future application tracker.
 */
export interface SchoolItem {
  id: string;
  name: string;
  program: string;
  region: string;
  status: "Reach" | "Target" | "Safety";
  deadline: string;
  notes: string;
}

export type InstitutionMetricUnit = "USD" | "ratio" | "score" | "students";

export interface InstitutionMetric {
  category: "admissions" | "cost" | "enrollment" | "outcomes";
  metric: string;
  sourcePeriod: string;
  sourceTitle: string;
  sourceUrl: string;
  unit: InstitutionMetricUnit;
  value: number;
}

/** Public, source-backed record used by the undergraduate school directory. */
export interface SchoolDirectoryItem {
  country: string;
  ipedsUnitId: string;
  metrics: InstitutionMetric[];
  name: string;
  officialWebsite: string;
  region: string;
  shortName: string;
}

export interface UndergraduateProgramSummary {
  degreeName: string;
  fieldOfStudy: string;
  id: string;
  majorCategories: string[];
  officialUrl: string;
  programName: string;
}

export type AdmissionRequirementKind = "minimum" | "recommended" | "required" | "optional" | "not_required" | "considered";
export type ApplicantScope = "all" | "international" | "domestic";
export type ApplicationPath = "all" | "first_year" | "transfer";
export type AdmissionStatisticKind = "p25" | "median" | "p75" | "average" | "acceptance_rate";
export type AdmissionCohort = "applicant" | "admitted" | "enrolled";

export interface SchoolAdmissionRequirement {
  applicantScope: ApplicantScope;
  applicationPath: ApplicationPath;
  id: string;
  maximumScore: number | null;
  metric: string;
  minimumScore: number | null;
  programId: string;
  requirementKind: AdmissionRequirementKind;
  satisfactionGroup: string | null;
  satisfactionRule: "any_of" | "all_of" | null;
  scoreScale: number | null;
  sourceTitle: string;
  sourceUrl: string;
  subjectArea: string | null;
  testVersion: string | null;
  valueText: string | null;
}

export interface SchoolAdmissionStatistic {
  applicantScope: ApplicantScope;
  applicationPath: ApplicationPath;
  cohort: AdmissionCohort;
  id: string;
  metric: string;
  programId: string;
  scoreScale: number | null;
  sourceTitle: string;
  sourceUrl: string;
  statistic: AdmissionStatisticKind;
  subjectArea: string | null;
  testVersion: string | null;
  value: number;
}

export interface SchoolDetail extends SchoolDirectoryItem {
  programs: UndergraduateProgramSummary[];
  requirements: SchoolAdmissionRequirement[];
  statistics: SchoolAdmissionStatistic[];
}
