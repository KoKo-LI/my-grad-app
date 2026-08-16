import type { InstitutionMetric, SchoolDirectoryItem, SchoolItem, StudentProfile } from "@/types";

export type DirectorySchoolTiers = Record<SchoolItem["status"], SchoolDirectoryItem[]>;

const tierOrder: SchoolItem["status"][] = ["Reach", "Target", "Safety"];

function getMetricValue(metrics: InstitutionMetric[], metricName: string) {
  return metrics.find((metric) => metric.metric === metricName)?.value ?? null;
}

function getTestScore(profile: StudentProfile, testName: "SAT" | "ACT") {
  const rawScore = profile.standardizedTests.find((test) => test.test === testName)?.score;
  const score = Number(rawScore);

  return Number.isFinite(score) ? score : null;
}

function matchesTargetRegions(profile: StudentProfile, school: SchoolDirectoryItem) {
  if (profile.targetRegions.length === 0) return true;

  return profile.targetRegions.some(
    (region) => school.region === region || (region === "美国" && school.country === "United States"),
  );
}

function classifyByScoreGap(scoreGap: number, safetyThreshold: number, targetThreshold: number): SchoolItem["status"] {
  if (scoreGap >= safetyThreshold) return "Safety";
  if (scoreGap >= targetThreshold) return "Target";
  return "Reach";
}

/**
 * Places every school in exactly one tier using the strongest available public
 * admissions signal. SAT/ACT medians take precedence; acceptance rate is a
 * transparent fallback for schools where Scorecard does not publish a test median.
 */
function classifyDirectorySchool(profile: StudentProfile, school: SchoolDirectoryItem): SchoolItem["status"] {
  const satScore = getTestScore(profile, "SAT");
  const satEbrwMedian = getMetricValue(school.metrics, "sat_ebrw_median");
  const satMathMedian = getMetricValue(school.metrics, "sat_math_median");

  if (satScore !== null && satEbrwMedian !== null && satMathMedian !== null) {
    return classifyByScoreGap(satScore - (satEbrwMedian + satMathMedian), 100, -80);
  }

  const actScore = getTestScore(profile, "ACT");
  const actMedian = getMetricValue(school.metrics, "act_composite_median");

  if (actScore !== null && actMedian !== null) {
    return classifyByScoreGap(actScore - actMedian, 3, -1);
  }

  const acceptanceRate = getMetricValue(school.metrics, "admission_rate");

  if (acceptanceRate !== null) {
    if (acceptanceRate < 0.2) return "Reach";
    if (acceptanceRate < 0.55) return "Target";
    return "Safety";
  }

  return "Target";
}

function createEmptyTiers(): DirectorySchoolTiers {
  return { Reach: [], Target: [], Safety: [] };
}

/**
 * Filters the verified directory to the applicant's selected regions and
 * partitions the result into mutually exclusive Reach, Target and Safety lists.
 */
export function buildDirectorySchoolTiers(
  profile: StudentProfile,
  schools: readonly SchoolDirectoryItem[],
): DirectorySchoolTiers {
  const tiers = createEmptyTiers();

  schools
    .filter((school) => matchesTargetRegions(profile, school))
    .sort((first, second) => first.name.localeCompare(second.name))
    .forEach((school) => {
      tiers[classifyDirectorySchool(profile, school)].push(school);
    });

  return tiers;
}

export function getDirectoryTierCount(tiers: DirectorySchoolTiers) {
  return tierOrder.reduce((total, tier) => total + tiers[tier].length, 0);
}
