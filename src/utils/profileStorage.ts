import type {
  AcademicRecord,
  AcademicSubjectScore,
  DegreeTarget,
  StandardizedTestScore,
  StandardizedTestType,
  StudentProfile,
} from "@/types";

export const PROFILE_STORAGE_KEY = "grad_user_profile";
export const PROFILE_STORAGE_EVENT = "grad-profile-updated";
export const THEME_STORAGE_KEY = "grad_dashboard_theme";
export const THEME_STORAGE_EVENT = "grad-theme-updated";

export const currentStageOptions = [
  "高一",
  "高二",
  "高三",
  "大一",
  "大二",
  "大三",
  "大四",
  "研究生在读",
  "已毕业",
] as const;

export const majorOptions = [
  "计算机科学",
  "数据科学 / 人工智能",
  "电子与计算机工程",
  "商业分析",
  "金融 / 经济学",
  "教育学",
  "公共卫生",
  "人机交互 / 设计",
] as const;

export const regionOptions = ["美国", "英国", "加拿大", "欧洲", "新加坡/香港"] as const;

export const testOptions: Record<
  StandardizedTestType,
  { helper: string; max: number; min: number; placeholder: string }
> = {
  TOEFL: { min: 0, max: 120, placeholder: "0–120", helper: "满分 120" },
  IELTS: { min: 0, max: 9, placeholder: "0–9", helper: "满分 9" },
  "Duolingo English Test": {
    min: 10,
    max: 160,
    placeholder: "10–160",
    helper: "10–160 分",
  },
  SAT: { min: 400, max: 1600, placeholder: "400–1600", helper: "400–1600 分" },
  ACT: { min: 1, max: 36, placeholder: "1–36", helper: "1–36 分" },
  GRE: { min: 260, max: 340, placeholder: "260–340", helper: "260–340 分" },
  GMAT: { min: 205, max: 805, placeholder: "205–805", helper: "205–805 分" },
};

export const languageTests: StandardizedTestType[] = [
  "TOEFL",
  "IELTS",
  "Duolingo English Test",
];
export const undergraduateTests: StandardizedTestType[] = ["SAT", "ACT"];
export const graduateTests: StandardizedTestType[] = ["GRE", "GMAT"];

export const apSubjectOptions = [
  "Calculus AB",
  "Calculus BC",
  "Computer Science A",
  "Statistics",
  "Physics 1",
  "Physics C: Mechanics",
  "Chemistry",
  "Biology",
  "Psychology",
  "Macroeconomics",
  "Microeconomics",
  "English Language",
  "English Literature",
  "US History",
] as const;

export const ibSubjectOptions = [
  "Chinese A: Language and Literature",
  "English A: Language and Literature",
  "Mathematics: Analysis and Approaches",
  "Mathematics: Applications and Interpretation",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Economics",
  "Business Management",
  "Psychology",
  "Visual Arts",
] as const;

const emptyAcademicRecord: AcademicRecord = {
  apSubjects: [],
  ibTotalScore: "",
  ibSubjects: [],
  paperCount: "",
  researchProjectCount: "",
  academicAwardCount: "",
};

export const emptyProfile: StudentProfile = {
  degreeTarget: "graduate",
  currentStage: "",
  gpa: "",
  languageScore: "",
  greGmat: "",
  standardizedTests: [],
  academicRecord: emptyAcademicRecord,
  targetRegions: [],
  targetMajor: "",
};

function isDegreeTarget(value: unknown): value is DegreeTarget {
  return value === "undergraduate" || value === "graduate";
}

function isTestType(value: unknown): value is StandardizedTestType {
  return typeof value === "string" && value in testOptions;
}

export function sanitizeNumericValue(value: string, maxLength = 5) {
  const digitsAndDecimal = value.replace(/[^0-9.]/g, "");
  const [whole = "", ...decimalParts] = digitsAndDecimal.split(".");
  const decimal = decimalParts.join("");

  return `${whole}${decimalParts.length > 0 ? `.${decimal}` : ""}`.slice(0, maxLength);
}

function normalizeScore(value: string, min: number, max: number) {
  const sanitized = sanitizeNumericValue(value);

  if (!sanitized) {
    return "";
  }

  const numericValue = Number(sanitized);

  return Number.isFinite(numericValue) && numericValue >= min && numericValue <= max
    ? sanitized
    : "";
}

function normalizeSubjectScores(
  scores: AcademicSubjectScore[],
  allowedSubjects: readonly string[],
  maxScore: number,
) {
  const usedSubjects = new Set<string>();

  return scores.reduce<AcademicSubjectScore[]>((normalizedScores, subjectScore) => {
    if (!allowedSubjects.includes(subjectScore.subject) || usedSubjects.has(subjectScore.subject)) {
      return normalizedScores;
    }

    usedSubjects.add(subjectScore.subject);
    normalizedScores.push({
      subject: subjectScore.subject,
      score: normalizeScore(subjectScore.score, 1, maxScore),
    });
    return normalizedScores;
  }, []);
}

function summarizeTests(tests: StandardizedTestScore[], selectedTests: StandardizedTestType[]) {
  return tests
    .filter((test) => selectedTests.includes(test.test) && test.score)
    .map((test) => `${test.test} ${test.score}`)
    .join(" · ");
}

export function normalizeProfile(profile: StudentProfile): StudentProfile {
  const degreeTarget = isDegreeTarget(profile.degreeTarget) ? profile.degreeTarget : "graduate";
  const availableTestTypes = new Set([
    ...languageTests,
    ...(degreeTarget === "undergraduate" ? undergraduateTests : graduateTests),
  ]);
  const seenTests = new Set<StandardizedTestType>();
  const standardizedTests = profile.standardizedTests.reduce<StandardizedTestScore[]>(
    (tests, test) => {
      if (!isTestType(test.test) || !availableTestTypes.has(test.test) || seenTests.has(test.test)) {
        return tests;
      }

      seenTests.add(test.test);
      const config = testOptions[test.test];
      tests.push({ test: test.test, score: normalizeScore(test.score, config.min, config.max) });
      return tests;
    },
    [],
  );
  const academicRecord = profile.academicRecord;

  return {
    degreeTarget,
    currentStage: (currentStageOptions as readonly string[]).includes(profile.currentStage)
      ? profile.currentStage
      : "",
    gpa: sanitizeNumericValue(profile.gpa),
    languageScore: summarizeTests(standardizedTests, languageTests),
    greGmat: summarizeTests(standardizedTests, ["GRE", "GMAT"]),
    standardizedTests,
    academicRecord: {
      apSubjects: normalizeSubjectScores(academicRecord.apSubjects, apSubjectOptions, 5),
      ibTotalScore: normalizeScore(academicRecord.ibTotalScore, 24, 45),
      ibSubjects: normalizeSubjectScores(academicRecord.ibSubjects, ibSubjectOptions, 7),
      paperCount: normalizeScore(academicRecord.paperCount, 0, 999),
      researchProjectCount: normalizeScore(academicRecord.researchProjectCount, 0, 999),
      academicAwardCount: normalizeScore(academicRecord.academicAwardCount, 0, 999),
    },
    targetRegions: profile.targetRegions.filter((region) =>
      (regionOptions as readonly string[]).includes(region),
    ),
    targetMajor: (majorOptions as readonly string[]).includes(profile.targetMajor)
      ? profile.targetMajor
      : "",
  };
}

function hasValidProfileCore(profile: Record<string, unknown>) {
  return (
    isDegreeTarget(profile.degreeTarget) &&
    typeof profile.currentStage === "string" &&
    typeof profile.gpa === "string" &&
    typeof profile.languageScore === "string" &&
    typeof profile.greGmat === "string" &&
    Array.isArray(profile.standardizedTests) &&
    profile.standardizedTests.every(
      (test) =>
        test &&
        typeof test === "object" &&
        isTestType((test as Record<string, unknown>).test) &&
        typeof (test as Record<string, unknown>).score === "string",
    ) &&
    Array.isArray(profile.targetRegions) &&
    profile.targetRegions.every((region) => typeof region === "string") &&
    typeof profile.targetMajor === "string"
  );
}

function isSubjectScoreList(value: unknown) {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).subject === "string" &&
        typeof (item as Record<string, unknown>).score === "string",
    )
  );
}

function isAcademicRecord(value: unknown): value is AcademicRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const academicRecord = value as Record<string, unknown>;
  return (
    isSubjectScoreList(academicRecord.apSubjects) &&
    typeof academicRecord.ibTotalScore === "string" &&
    isSubjectScoreList(academicRecord.ibSubjects) &&
    typeof academicRecord.paperCount === "string" &&
    typeof academicRecord.researchProjectCount === "string" &&
    typeof academicRecord.academicAwardCount === "string"
  );
}

export function isStudentProfile(value: unknown): value is StudentProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Record<string, unknown>;
  return hasValidProfileCore(profile) && isAcademicRecord(profile.academicRecord);
}

function isLegacyAcademicRecord(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const academicRecord = value as Record<string, unknown>;
  return (
    typeof academicRecord.apScore === "string" &&
    typeof academicRecord.ibScore === "string" &&
    typeof academicRecord.paperCount === "string" &&
    typeof academicRecord.researchProjectCount === "string" &&
    typeof academicRecord.academicAwardCount === "string"
  );
}

function migrateLegacyProfile(value: Record<string, unknown>): StudentProfile | null {
  if (!hasValidProfileCore(value) || !isLegacyAcademicRecord(value.academicRecord)) {
    return null;
  }

  const legacyAcademicRecord = value.academicRecord as Record<string, string>;
  return {
    degreeTarget: value.degreeTarget as DegreeTarget,
    currentStage: value.currentStage as string,
    gpa: value.gpa as string,
    languageScore: value.languageScore as string,
    greGmat: value.greGmat as string,
    standardizedTests: value.standardizedTests as StandardizedTestScore[],
    academicRecord: {
      apSubjects: [],
      ibTotalScore: legacyAcademicRecord.ibScore,
      ibSubjects: [],
      paperCount: legacyAcademicRecord.paperCount,
      researchProjectCount: legacyAcademicRecord.researchProjectCount,
      academicAwardCount: legacyAcademicRecord.academicAwardCount,
    },
    targetRegions: value.targetRegions as string[],
    targetMajor: value.targetMajor as string,
  };
}

export function parseStoredProfile(value: string | null): StudentProfile | null {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (isStudentProfile(parsed)) {
      return normalizeProfile(parsed);
    }

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const migratedProfile = migrateLegacyProfile(parsed as Record<string, unknown>);
    return migratedProfile ? normalizeProfile(migratedProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: StudentProfile) {
  const safeProfile = normalizeProfile(profile);
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(safeProfile));
  window.dispatchEvent(new Event(PROFILE_STORAGE_EVENT));
  return safeProfile;
}

export function clearLocalProfileData() {
  window.localStorage.removeItem(PROFILE_STORAGE_KEY);
  window.localStorage.removeItem(THEME_STORAGE_KEY);
  window.dispatchEvent(new Event(PROFILE_STORAGE_EVENT));
  window.dispatchEvent(new Event(THEME_STORAGE_EVENT));
}
