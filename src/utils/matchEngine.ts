import type {
  SchoolItem,
  SchoolMatchInput,
  SchoolMatchResult,
  StandardizedTestType,
  StudentProfile,
} from "@/types";

const MATCH_TIER_ORDER: SchoolItem["status"][] = ["Reach", "Target", "Safety"];

function getTestScore(profile: StudentProfile, testType: StandardizedTestType) {
  const score = profile.standardizedTests.find((test) => test.test === testType)?.score;
  const numericScore = Number(score);

  return Number.isFinite(numericScore) ? numericScore : null;
}

function getLanguageGap(profile: StudentProfile, school: SchoolMatchInput) {
  const toeflScore = getTestScore(profile, "TOEFL");
  const ieltsScore = getTestScore(profile, "IELTS");

  if (school.minimumToefl && toeflScore !== null) {
    return toeflScore - school.minimumToefl;
  }

  if (school.minimumIelts && ieltsScore !== null) {
    return ieltsScore - school.minimumIelts;
  }

  return null;
}

function calculateStatus(gpaGap: number, languageGap: number | null): SchoolItem["status"] {
  // A language score below the published minimum is a hard constraint.
  if (languageGap !== null && languageGap < 0) {
    return "Reach";
  }

  if (gpaGap >= 0.15) {
    return "Safety";
  }

  if (gpaGap >= -0.2) {
    return "Target";
  }

  return "Reach";
}

function calculateMatchScore(gpaGap: number, languageGap: number | null) {
  const gpaScore = Math.max(10, Math.min(90, 58 + gpaGap * 100));
  const languageAdjustment = languageGap === null ? 0 : Math.max(-35, Math.min(12, languageGap * 2));

  return Math.round(Math.max(5, Math.min(95, gpaScore + languageAdjustment)));
}

function getMatchingReason(gpaGap: number, languageGap: number | null) {
  const gpaText =
    gpaGap >= 0
      ? `GPA 高于院校中位数 ${gpaGap.toFixed(2)}`
      : `GPA 低于院校中位数 ${Math.abs(gpaGap).toFixed(2)}`;

  if (languageGap === null) {
    return `${gpaText}；补充语言成绩后可提高匹配精度`;
  }

  return languageGap >= 0
    ? `${gpaText}；语言成绩满足门槛`
    : `${gpaText}；语言成绩尚未达到门槛`;
}

/**
 * Calculates application tiers from a user profile and arbitrary school medians.
 * No school data or match outcomes are embedded in this function.
 */
export function matchSchools(
  profile: StudentProfile,
  schools: SchoolMatchInput[],
): Record<SchoolItem["status"], SchoolMatchResult[]> {
  const parsedGpa = Number(profile.gpa);
  const userGpa = Number.isFinite(parsedGpa) ? parsedGpa : 0;
  const tiers: Record<SchoolItem["status"], SchoolMatchResult[]> = {
    Reach: [],
    Target: [],
    Safety: [],
  };

  schools.forEach((school) => {
    const gpaGap = userGpa - school.medianGpa;
    const languageGap = getLanguageGap(profile, school);
    const status = calculateStatus(gpaGap, languageGap);

    tiers[status].push({
      id: school.id,
      name: school.name,
      shortName: school.shortName,
      program: school.program,
      region: school.region,
      status,
      deadline: school.deadline,
      notes: "",
      matchScore: calculateMatchScore(gpaGap, languageGap),
      matchingReason: getMatchingReason(gpaGap, languageGap),
    });
  });

  MATCH_TIER_ORDER.forEach((tier) => {
    tiers[tier].sort((first, second) => second.matchScore - first.matchScore);
  });

  return tiers;
}
