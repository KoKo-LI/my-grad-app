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

export interface AcademicRecord {
  apScore: string;
  ibScore: string;
  paperCount: string;
  researchProjectCount: string;
  academicAwardCount: string;
}

/**
 * A student's reusable academic background for school matching and application tracking.
 */
export interface StudentProfile {
  degreeTarget: DegreeTarget;
  currentStage: string;
  gpa: string;
  /** Derived legacy fields retained for future matching integrations. */
  languageScore: string;
  greGmat: string;
  standardizedTests: StandardizedTestScore[];
  academicRecord: AcademicRecord;
  targetRegions: string[];
  targetMajor: string;
}

export interface SchoolMatchInput {
  id: string;
  name: string;
  program: string;
  region: string;
  deadline: string;
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
