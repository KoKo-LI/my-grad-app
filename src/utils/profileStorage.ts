import type {
  AcademicRecord,
  AcademicSubjectScore,
  DegreeTarget,
  ProfilePreset,
  ProfilePresetId,
  SavedTargetSchool,
  StandardizedTestScore,
  StandardizedTestType,
  StudentProfile,
} from "@/types";

export const PROFILE_STORAGE_KEY = "grad_user_profile";
export const PROFILE_STORAGE_EVENT = "grad-profile-updated";
export const SAVED_SCHOOL_IDS_STORAGE_KEY = "grad_saved_school_ids";
export const SAVED_SCHOOL_IDS_STORAGE_EVENT = "grad-saved-school-ids-updated";
export const TARGET_SCHOOLS_STORAGE_KEY = "grad_target_schools";
export const TARGET_SCHOOLS_STORAGE_EVENT = "grad-target-schools-updated";
export const THEME_STORAGE_KEY = "grad_dashboard_theme";
export const THEME_STORAGE_EVENT = "grad-theme-updated";

export const undergraduateStageOptions = [
  "高一",
  "高二",
  "高三",
] as const;

export const graduateStageOptions = [
  "大一",
  "大二",
  "大三",
  "大四",
  "研究生在读",
  "已毕业",
] as const;

export const currentStageOptions = [
  ...undergraduateStageOptions,
  ...graduateStageOptions,
] as const;

export const majorOptions = [
  "计算机科学",
  "数据科学 / 人工智能",
  "软件工程",
  "网络安全",
  "信息系统 / 信息管理",
  "机器人学",
  "生物信息学",
  "电子与计算机工程",
  "机械工程",
  "土木与环境工程",
  "化学工程",
  "材料科学与工程",
  "生物医学工程",
  "数学 / 应用数学",
  "统计学",
  "物理学",
  "化学",
  "生物学 / 生命科学",
  "商业分析",
  "工商管理",
  "市场营销",
  "会计学",
  "供应链管理",
  "创业与创新",
  "金融 / 经济学",
  "国际关系",
  "公共政策 / 公共管理",
  "社会学",
  "心理学",
  "传媒 / 新闻学",
  "法律 / 法学",
  "教育学",
  "公共卫生",
  "护理学",
  "临床研究",
  "人机交互 / 设计",
  "建筑学 / 城市规划",
  "艺术与设计",
  "音乐 / 表演艺术",
  "酒店与旅游管理",
] as const;

export const regionOptions = [
  "美国",
  "英国",
  "加拿大",
  "澳大利亚",
  "新西兰",
  "新加坡",
  "中国香港",
  "中国澳门",
  "日本",
  "韩国",
  "德国",
  "法国",
  "荷兰",
  "瑞士",
  "意大利",
  "西班牙",
  "瑞典",
  "丹麦",
  "爱尔兰",
] as const;

export const testOptions: Record<
  StandardizedTestType,
  { helper: string; max: number; min: number; placeholder: string }
> = {
  TOEFL: { min: 1, max: 120, placeholder: "1–120", helper: "满分 120" },
  IELTS: { min: 0.5, max: 9, placeholder: "0.5–9", helper: "满分 9" },
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
  "African American Studies",
  "Art and Design",
  "Art History",
  "Calculus AB",
  "Calculus BC",
  "Computer Science A",
  "Computer Science Principles",
  "Statistics",
  "Physics 1",
  "Physics 2",
  "Physics C: Mechanics",
  "Physics C: Electricity and Magnetism",
  "Chemistry",
  "Biology",
  "Environmental Science",
  "Psychology",
  "Human Geography",
  "Macroeconomics",
  "Microeconomics",
  "Comparative Government and Politics",
  "United States Government and Politics",
  "English Language",
  "English Literature",
  "Chinese Language and Culture",
  "French Language and Culture",
  "German Language and Culture",
  "Italian Language and Culture",
  "Japanese Language and Culture",
  "Spanish Language and Culture",
  "Spanish Literature and Culture",
  "Latin",
  "Music Theory",
  "Precalculus",
  "Research",
  "Seminar",
  "European History",
  "US History",
  "World History: Modern",
] as const;

export const ibSubjectOptions = [
  "Chinese A: Language and Literature",
  "English A: Language and Literature",
  "French A: Language and Literature",
  "Spanish A: Language and Literature",
  "English B",
  "French B",
  "Mandarin B",
  "Spanish B",
  "Mathematics: Analysis and Approaches",
  "Mathematics: Applications and Interpretation",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Design Technology",
  "Environmental Systems and Societies",
  "Sports, Exercise and Health Science",
  "Economics",
  "Business Management",
  "Geography",
  "Global Politics",
  "History",
  "Philosophy",
  "Psychology",
  "Visual Arts",
  "Film",
  "Music",
  "Theatre",
  "Dance",
] as const;

const emptyAcademicRecord: AcademicRecord = {
  apSubjects: [],
  ibTotalScore: "",
  ibSubjects: [],
  competitionAwards: [],
  paperCount: "",
  researchProjectCount: "",
  academicAwardCount: "",
};

export const emptyProfile: StudentProfile = {
  isInitialized: false,
  degreeTarget: "graduate",
  currentStage: "",
  currentSchool: "",
  gpa: "",
  gpaMax: "4.0",
  languageScore: "",
  greGmat: "",
  standardizedTests: [],
  academicRecord: emptyAcademicRecord,
  targetRegions: [],
  targetMajor: "",
};

export const profilePresets: readonly ProfilePreset[] = [
  {
    id: "cs-foundation",
    label: "经典 CS 申研 3.5",
    description: "GPA 3.5 / TOEFL 100 / GRE 320",
    profile: {
      isInitialized: true,
      degreeTarget: "graduate",
      currentStage: "大四",
      currentSchool: "",
      gpa: "3.5",
      gpaMax: "4.0",
      languageScore: "TOEFL 100",
      greGmat: "GRE 320",
      standardizedTests: [
        { test: "TOEFL", score: "100" },
        { test: "GRE", score: "320" },
      ],
      academicRecord: {
        apSubjects: [],
        ibTotalScore: "",
        ibSubjects: [],
        competitionAwards: [],
        paperCount: "1",
        researchProjectCount: "2",
        academicAwardCount: "1",
      },
      targetRegions: ["美国", "加拿大"],
      targetMajor: "计算机科学",
    },
  },
  {
    id: "cs-ambitious",
    label: "极客冲刺 3.8",
    description: "GPA 3.8 / TOEFL 108 / GRE 330",
    profile: {
      isInitialized: true,
      degreeTarget: "graduate",
      currentStage: "大四",
      currentSchool: "",
      gpa: "3.8",
      gpaMax: "4.0",
      languageScore: "TOEFL 108",
      greGmat: "GRE 330",
      standardizedTests: [
        { test: "TOEFL", score: "108" },
        { test: "GRE", score: "330" },
      ],
      academicRecord: {
        apSubjects: [],
        ibTotalScore: "",
        ibSubjects: [],
        competitionAwards: ["ACM / ICPC 区域赛获奖"],
        paperCount: "2",
        researchProjectCount: "3",
        academicAwardCount: "2",
      },
      targetRegions: ["美国", "英国", "加拿大"],
      targetMajor: "计算机科学",
    },
  },
  {
    id: "ai-specialist",
    label: "AI 专项 3.6",
    description: "GPA 3.6 / TOEFL 105 / GRE 325",
    profile: {
      isInitialized: true,
      degreeTarget: "graduate",
      currentStage: "大四",
      currentSchool: "",
      gpa: "3.6",
      gpaMax: "4.0",
      languageScore: "TOEFL 105",
      greGmat: "GRE 325",
      standardizedTests: [
        { test: "TOEFL", score: "105" },
        { test: "GRE", score: "325" },
      ],
      academicRecord: {
        apSubjects: [],
        ibTotalScore: "",
        ibSubjects: [],
        competitionAwards: ["机器学习项目展示"],
        paperCount: "1",
        researchProjectCount: "3",
        academicAwardCount: "1",
      },
      targetRegions: ["美国", "新加坡", "中国香港"],
      targetMajor: "数据科学 / 人工智能",
    },
  },
];

export function createProfileFromPreset(id: ProfilePresetId): StudentProfile {
  const preset = profilePresets.find((item) => item.id === id);

  if (!preset) {
    return {
      ...emptyProfile,
      standardizedTests: [],
      academicRecord: { ...emptyAcademicRecord, apSubjects: [], ibSubjects: [], competitionAwards: [] },
      targetRegions: [],
    };
  }

  return {
    ...preset.profile,
    standardizedTests: preset.profile.standardizedTests.map((test) => ({ ...test })),
    academicRecord: {
      ...preset.profile.academicRecord,
      apSubjects: preset.profile.academicRecord.apSubjects.map((subject) => ({ ...subject })),
      ibSubjects: preset.profile.academicRecord.ibSubjects.map((subject) => ({ ...subject })),
      competitionAwards: [...preset.profile.academicRecord.competitionAwards],
    },
    targetRegions: [...preset.profile.targetRegions],
  };
}

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

/** Restricts visible numeric input immediately so values cannot exceed a known maximum. */
export function clampNumericValue(value: string, maximum: number, maxLength = 5) {
  const sanitized = sanitizeNumericValue(value, maxLength);
  const numericValue = Number(sanitized);

  return sanitized && Number.isFinite(numericValue) && numericValue > maximum
    ? String(maximum)
    : sanitized;
}

/** Keeps a score editable while disallowing a completed zero value. */
export function sanitizePositiveScore(value: string, maximum: number, maxLength = 5) {
  const clampedValue = clampNumericValue(value, maximum, maxLength);

  return clampedValue && Number(clampedValue) === 0 && !clampedValue.endsWith(".")
    ? ""
    : clampedValue;
}

export function sanitizePlainText(value: string, maxLength = 100) {
  return value.replace(/[<>\u0000-\u001F\u007F]/g, "").slice(0, maxLength);
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
  const stageOptions = degreeTarget === "undergraduate" ? undergraduateStageOptions : graduateStageOptions;
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

  const normalizedGpaMax = normalizeScore(profile.gpaMax, 0.1, 100) || "4.0";

  return {
    isInitialized: profile.isInitialized,
    degreeTarget,
    currentStage: (stageOptions as readonly string[]).includes(profile.currentStage)
      ? profile.currentStage
      : "",
    currentSchool: sanitizePlainText(profile.currentSchool, 120),
    gpaMax: normalizedGpaMax,
    gpa: normalizeScore(profile.gpa, 0.01, Number(normalizedGpaMax)),
    languageScore: summarizeTests(standardizedTests, languageTests),
    greGmat: summarizeTests(standardizedTests, ["GRE", "GMAT"]),
    standardizedTests,
    academicRecord: {
      apSubjects: normalizeSubjectScores(academicRecord.apSubjects, apSubjectOptions, 5),
      ibTotalScore: normalizeScore(academicRecord.ibTotalScore, 24, 45),
      ibSubjects: normalizeSubjectScores(academicRecord.ibSubjects, ibSubjectOptions, 7),
      competitionAwards: [
        ...new Set(
          academicRecord.competitionAwards
            .map((award) => sanitizePlainText(award, 80).trim())
            .filter(Boolean),
        ),
      ].slice(0, 12),
      paperCount: normalizeScore(academicRecord.paperCount, 0, 999),
      researchProjectCount: normalizeScore(academicRecord.researchProjectCount, 0, 999),
      academicAwardCount: normalizeScore(academicRecord.academicAwardCount, 0, 999),
    },
    targetRegions: [
      ...new Set(
        profile.targetRegions
          .flatMap((region) => (region === "新加坡/香港" ? ["新加坡", "中国香港"] : [region]))
          .filter((region) => (regionOptions as readonly string[]).includes(region)),
      ),
    ],
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
    Array.isArray(academicRecord.competitionAwards) &&
    academicRecord.competitionAwards.every((award) => typeof award === "string") &&
    typeof academicRecord.paperCount === "string" &&
    typeof academicRecord.researchProjectCount === "string" &&
    typeof academicRecord.academicAwardCount === "string"
  );
}

function isPreCompetitionAcademicRecord(value: unknown) {
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
  return (
    hasValidProfileCore(profile) &&
    typeof profile.isInitialized === "boolean" &&
    typeof profile.currentSchool === "string" &&
    typeof profile.gpaMax === "string" &&
    isAcademicRecord(profile.academicRecord)
  );
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
  if (!hasValidProfileCore(value)) {
    return null;
  }

  let academicRecord: AcademicRecord;

  if (isAcademicRecord(value.academicRecord)) {
    academicRecord = {
      ...value.academicRecord,
      competitionAwards: value.academicRecord.competitionAwards,
    };
  } else if (isPreCompetitionAcademicRecord(value.academicRecord)) {
    const previousAcademicRecord = value.academicRecord as Omit<AcademicRecord, "competitionAwards">;
    academicRecord = { ...previousAcademicRecord, competitionAwards: [] };
  } else if (isLegacyAcademicRecord(value.academicRecord)) {
    const legacyAcademicRecord = value.academicRecord as Record<string, string>;
    academicRecord = {
      apSubjects: [],
      ibTotalScore: legacyAcademicRecord.ibScore,
      ibSubjects: [],
      competitionAwards: [],
      paperCount: legacyAcademicRecord.paperCount,
      researchProjectCount: legacyAcademicRecord.researchProjectCount,
      academicAwardCount: legacyAcademicRecord.academicAwardCount,
    };
  } else {
    return null;
  }

  return {
    isInitialized: typeof value.isInitialized === "boolean" ? value.isInitialized : true,
    degreeTarget: value.degreeTarget as DegreeTarget,
    currentStage: value.currentStage as string,
    currentSchool: typeof value.currentSchool === "string" ? value.currentSchool : "",
    gpa: value.gpa as string,
    gpaMax: typeof value.gpaMax === "string" ? value.gpaMax : "4.0",
    languageScore: value.languageScore as string,
    greGmat: value.greGmat as string,
    standardizedTests: value.standardizedTests as StandardizedTestScore[],
    academicRecord,
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
  const safeProfile = normalizeProfile({ ...profile, isInitialized: true });
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(safeProfile));
  window.dispatchEvent(new Event(PROFILE_STORAGE_EVENT));
  return safeProfile;
}

function normalizeSavedSchoolIds(schoolIds: Iterable<string>) {
  return [...new Set(
    Array.from(schoolIds)
      .filter((schoolId) => /^[a-z0-9-]{1,80}$/i.test(schoolId))
      .slice(0, 50),
  )];
}

export function parseSavedSchoolIds(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((schoolId) => typeof schoolId === "string")
      ? normalizeSavedSchoolIds(parsed)
      : [];
  } catch {
    return [];
  }
}

export function saveSavedSchoolIds(schoolIds: Iterable<string>) {
  const safeSchoolIds = normalizeSavedSchoolIds(schoolIds);
  window.localStorage.setItem(SAVED_SCHOOL_IDS_STORAGE_KEY, JSON.stringify(safeSchoolIds));
  window.dispatchEvent(new Event(SAVED_SCHOOL_IDS_STORAGE_EVENT));
  return safeSchoolIds;
}

function isSchoolStatus(value: unknown): value is SavedTargetSchool["status"] {
  return value === "Reach" || value === "Target" || value === "Safety";
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function normalizeSavedTargetSchool(value: unknown): SavedTargetSchool | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const school = value as Record<string, unknown>;
  const id = typeof school.id === "string" && /^[a-z0-9-]{1,80}$/i.test(school.id) ? school.id : null;
  const name = typeof school.name === "string" ? sanitizePlainText(school.name, 140).trim() : "";
  const shortName = typeof school.shortName === "string" ? sanitizePlainText(school.shortName, 16).trim() : "";
  const program = typeof school.program === "string" ? sanitizePlainText(school.program, 140).trim() : "";
  const region = typeof school.region === "string" ? sanitizePlainText(school.region, 40).trim() : "";
  const deadline = typeof school.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(school.deadline) ? school.deadline : "";
  const status = isSchoolStatus(school.status) ? school.status : null;
  const lastAlgorithmStatus = isSchoolStatus(school.lastAlgorithmStatus) ? school.lastAlgorithmStatus : null;

  if (!id || !name || !shortName || !program || !region || !deadline || !status || !lastAlgorithmStatus || !isIsoDateTime(school.addedAt)) {
    return null;
  }

  return {
    addedAt: school.addedAt,
    deadline,
    id,
    lastAlgorithmStatus,
    name,
    notes: typeof school.notes === "string" ? sanitizePlainText(school.notes, 500) : "",
    program,
    region,
    shortName,
    status,
    userOverrideStatus: school.userOverrideStatus === true,
  };
}

function normalizeSavedTargetSchools(schools: Iterable<SavedTargetSchool>) {
  const seenIds = new Set<string>();
  const safeSchools: SavedTargetSchool[] = [];

  for (const school of schools) {
    const normalizedSchool = normalizeSavedTargetSchool(school);
    if (!normalizedSchool || seenIds.has(normalizedSchool.id)) continue;

    seenIds.add(normalizedSchool.id);
    safeSchools.push(normalizedSchool);
    if (safeSchools.length === 50) break;
  }

  return safeSchools;
}

export function parseSavedTargetSchools(value: string | null) {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? normalizeSavedTargetSchools(parsed.filter((school): school is SavedTargetSchool => normalizeSavedTargetSchool(school) !== null))
      : [];
  } catch {
    return [];
  }
}

export function saveSavedTargetSchools(schools: Iterable<SavedTargetSchool>) {
  const safeSchools = normalizeSavedTargetSchools(schools);
  window.localStorage.setItem(TARGET_SCHOOLS_STORAGE_KEY, JSON.stringify(safeSchools));
  window.dispatchEvent(new Event(TARGET_SCHOOLS_STORAGE_EVENT));
  return safeSchools;
}

export function clearLocalProfileData() {
  window.localStorage.removeItem(PROFILE_STORAGE_KEY);
  window.localStorage.removeItem(SAVED_SCHOOL_IDS_STORAGE_KEY);
  window.localStorage.removeItem(TARGET_SCHOOLS_STORAGE_KEY);
  window.localStorage.removeItem(THEME_STORAGE_KEY);
  window.dispatchEvent(new Event(PROFILE_STORAGE_EVENT));
  window.dispatchEvent(new Event(SAVED_SCHOOL_IDS_STORAGE_EVENT));
  window.dispatchEvent(new Event(TARGET_SCHOOLS_STORAGE_EVENT));
  window.dispatchEvent(new Event(THEME_STORAGE_EVENT));
}
