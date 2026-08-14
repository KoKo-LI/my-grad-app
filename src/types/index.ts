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
