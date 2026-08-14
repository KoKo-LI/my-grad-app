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

function matchesSchoolTargets(profile: StudentProfile, school: SchoolMatchInput) {
  const matchesRegion = profile.targetRegions.length === 0 || profile.targetRegions.includes(school.region);
  const matchesMajor = !profile.targetMajor || school.majorCategories.includes(profile.targetMajor);

  return matchesRegion && matchesMajor;
}

/** Converts any declared GPA scale to the 4.0 scale used by the school catalog. */
function getNormalizedGpa(profile: StudentProfile) {
  const score = Number(profile.gpa);
  const maximum = Number(profile.gpaMax);

  if (!Number.isFinite(score) || score < 0) {
    return 0;
  }

  if (!Number.isFinite(maximum) || maximum <= 0) {
    return score;
  }

  return (score / maximum) * 4;
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

function getMatchingReason(gpaGap: number, languageGap: number | null, targetMajor: string) {
  const gpaText =
    gpaGap >= 0
      ? `GPA 高于院校中位数 ${gpaGap.toFixed(2)}`
      : `GPA 低于院校中位数 ${Math.abs(gpaGap).toFixed(2)}`;

  const majorText = targetMajor ? "专业方向匹配" : "尚未限定目标专业";

  if (languageGap === null) {
    return `${gpaText}；${majorText}，补充语言成绩后可提高匹配精度`;
  }

  return languageGap >= 0
    ? `${gpaText}；${majorText}，语言成绩满足门槛`
    : `${gpaText}；${majorText}，语言成绩尚未达到门槛`;
}

/**
 * Calculates application tiers from a user profile and arbitrary school medians.
 * No school data or match outcomes are embedded in this function.
 */
export function matchSchools(
  profile: StudentProfile,
  schools: SchoolMatchInput[],
): Record<SchoolItem["status"], SchoolMatchResult[]> {
  const userGpa = getNormalizedGpa(profile);
  const tiers: Record<SchoolItem["status"], SchoolMatchResult[]> = {
    Reach: [],
    Target: [],
    Safety: [],
  };

  schools.forEach((school) => {
    if (!matchesSchoolTargets(profile, school)) {
      return;
    }

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
      matchingReason: getMatchingReason(gpaGap, languageGap, profile.targetMajor),
    });
  });

  MATCH_TIER_ORDER.forEach((tier) => {
    tiers[tier].sort((first, second) => second.matchScore - first.matchScore);
  });

  return tiers;
}
