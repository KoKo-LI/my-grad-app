import type {
  AcademicRecord,
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

const emptyAcademicRecord: AcademicRecord = {
  apScore: "",
  ibScore: "",
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
      apScore: normalizeScore(academicRecord.apScore, 1, 5),
      ibScore: normalizeScore(academicRecord.ibScore, 24, 45),
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

export function isStudentProfile(value: unknown): value is StudentProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Record<string, unknown>;
  const academicRecord = profile.academicRecord as Record<string, unknown> | undefined;

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
    academicRecord !== undefined &&
    Object.values(academicRecord).every((item) => typeof item === "string") &&
    Array.isArray(profile.targetRegions) &&
    profile.targetRegions.every((region) => typeof region === "string") &&
    typeof profile.targetMajor === "string"
  );
}

export function parseStoredProfile(value: string | null): StudentProfile | null {
  if (!value) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return isStudentProfile(parsed) ? normalizeProfile(parsed) : null;
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
