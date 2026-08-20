"use client";

import {
  ArrowSquareOut,
  Buildings,
  ChartLineUp,
  CurrencyDollar,
  GraduationCap,
  SpinnerGap,
  TrendUp,
  Users,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import SchoolLogo from "@/components/SchoolLogo";
import { getSchoolChineseName } from "@/data/schoolIdentity";
import { parseSchoolDetailResponse } from "@/lib/undergraduateDirectory";
import type { InstitutionMetric, InstitutionRankingKey, SchoolAdmissionRequirement, SchoolAdmissionStatistic, SchoolDetail, StudentProfile } from "@/types";

interface SchoolDetailModalProps {
  ipedsUnitId: string | null;
  onClose: () => void;
  profile: StudentProfile | null;
}

const metricLabels: Record<string, string> = {
  admission_rate: "录取率",
  average_cost_of_attendance_usd: "平均年度就读成本",
  average_net_price_private_usd: "私立院校平均净价",
  average_net_price_public_usd: "公立院校平均净价",
  books_and_supplies_usd: "书本与用品估算",
  cohort_default_rate_3_years: "三年贷款违约率",
  act_composite_median: "ACT 中位数",
  act_composite_p25: "ACT 25 分位",
  act_composite_p75: "ACT 75 分位",
  act_english_median: "ACT 英语中位数",
  act_english_p25: "ACT 英语 25 分位",
  act_english_p75: "ACT 英语 75 分位",
  act_math_median: "ACT 数学中位数",
  act_math_p25: "ACT 数学 25 分位",
  act_math_p75: "ACT 数学 75 分位",
  federal_loan_recipient_share: "联邦贷款获得者占比",
  first_year_full_time_retention_rate: "首年全日制留存率",
  first_year_part_time_retention_rate: "首年非全日制留存率",
  graduation_rate_150_percent: "毕业率",
  graduation_rate_200_percent: "200% 标准修业年限毕业率",
  loan_repayment_rate_3_years: "三年贷款偿还率",
  loan_repayment_rate_5_years: "五年贷款偿还率",
  loan_repayment_rate_7_years: "七年贷款偿还率",
  median_earnings_10_years_usd: "入学十年后收入中位数",
  median_earnings_6_years_usd: "入学六年后收入中位数",
  median_earnings_8_years_usd: "入学八年后收入中位数",
  median_graduate_debt_usd: "毕业生累计联邦贷款中位数",
  median_student_debt_usd: "学生累计联邦贷款中位数",
  median_withdrawal_debt_usd: "未完成学生累计联邦贷款中位数",
  open_admissions_policy: "开放式录取政策",
  other_expenses_off_campus_usd: "校外其他开支估算",
  other_expenses_on_campus_usd: "校内其他开支估算",
  other_expenses_with_family_usd: "与家庭同住其他开支估算",
  pell_grant_recipient_share: "Pell Grant 获得者占比",
  room_and_board_off_campus_usd: "校外食宿估算",
  room_and_board_on_campus_usd: "校内食宿估算",
  undergraduate_enrollment: "本科在读人数",
  undergraduate_men_share: "本科男生占比",
  undergraduate_women_share: "本科女生占比",
  tuition_in_state_usd: "州内学费",
  tuition_out_of_state_usd: "州外学费",
  sat_ebrw_median: "SAT 阅读写作中位数",
  sat_ebrw_p25: "SAT 阅读写作 25 分位",
  sat_ebrw_p75: "SAT 阅读写作 75 分位",
  sat_math_median: "SAT 数学中位数",
  sat_math_p25: "SAT 数学 25 分位",
  sat_math_p75: "SAT 数学 75 分位",
};

const metricCategoryLabels: Record<InstitutionMetric["category"], string> = {
  admissions: "录取与成绩",
  cost: "学费、资助与生活成本",
  enrollment: "在读学生与留存",
  outcomes: "毕业、债务与收入结果",
};

const requirementLabels: Record<string, string> = {
  act_composite: "ACT 综合",
  act_ela: "ACT 英语语言艺术",
  act_english: "ACT 英语",
  ap_subject: "AP 单科",
  cambridge_english: "剑桥英语",
  duolingo_english_test: "Duolingo English Test",
  english_proficiency: "英语能力证明",
  essay: "文书",
  financial_certification: "财力证明",
  gpa: "GPA",
  ib_subject: "IB 单科",
  ib_total: "IB 总分",
  ielts_academic_overall: "IELTS Academic",
  ielts_academic_section: "IELTS 单项",
  interview: "面试",
  met: "MET",
  portfolio: "作品集",
  pte_academic: "PTE Academic",
  recommendation: "推荐信",
  sat_ebrw: "SAT 阅读与写作",
  sat_math: "SAT 数学",
  sat_total: "SAT 总分",
  toefl_ibt_section: "TOEFL 单项",
  toefl_ibt_total: "TOEFL iBT",
  transcript: "成绩单",
};

const requirementKindLabels: Record<SchoolAdmissionRequirement["requirementKind"], string> = {
  considered: "纳入考量",
  minimum: "最低要求",
  not_required: "不要求",
  optional: "选填",
  recommended: "建议达到",
  required: "必须提交",
};

const statisticLabels: Record<SchoolAdmissionStatistic["statistic"], string> = {
  acceptance_rate: "录取率",
  average: "平均",
  median: "中位数",
  p25: "25 分位",
  p75: "75 分位",
};

const rankingLabels: Record<InstitutionRankingKey, string> = {
  qs_world_university_rankings: "QS 世界大学排名",
  usnews_national_universities: "U.S. News 全美综合大学",
};

function findMetric(metrics: InstitutionMetric[], metric: string) {
  return metrics.find((item) => item.metric === metric) ?? null;
}

function formatMetric(metric: InstitutionMetric | null) {
  if (!metric) return "—";
  if (metric.unit === "flag") return metric.value > 0 ? "是" : "否";
  if (metric.unit === "USD") {
    return new Intl.NumberFormat("en-US", { currency: "USD", maximumFractionDigits: 0, style: "currency" }).format(metric.value);
  }
  if (metric.unit === "ratio") return `${(metric.value * 100).toFixed(1)}%`;
  if (metric.unit === "students") return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(metric.value);
  return `${metric.value}`;
}

function formatRequirementValue(requirement: SchoolAdmissionRequirement) {
  if (requirement.minimumScore !== null && requirement.maximumScore !== null) {
    return `${requirement.minimumScore}–${requirement.maximumScore}${requirement.scoreScale ? ` / ${requirement.scoreScale}` : ""}`;
  }
  if (requirement.minimumScore !== null) {
    return `≥ ${requirement.minimumScore}${requirement.scoreScale ? ` / ${requirement.scoreScale}` : ""}`;
  }
  if (requirement.maximumScore !== null) {
    return `≤ ${requirement.maximumScore}${requirement.scoreScale ? ` / ${requirement.scoreScale}` : ""}`;
  }
  return requirement.valueText ?? requirementKindLabels[requirement.requirementKind];
}

function formatStatisticValue(statistic: SchoolAdmissionStatistic) {
  return statistic.metric === "gpa"
    ? `${statistic.value}${statistic.scoreScale ? ` / ${statistic.scoreScale}` : ""}`
    : `${statistic.value}${statistic.scoreScale ? ` / ${statistic.scoreScale}` : ""}`;
}

interface ProfileComparisonItem {
  applicantValue: string;
  label: string;
  schoolValue: string;
}

function formatScore(value: number | null) {
  return value === null ? "暂无可核验公开值" : Math.round(value).toLocaleString("en-US");
}

function getPersonalGpa(profile: StudentProfile | null) {
  return profile?.gpa ? `${profile.gpa} / ${profile.gpaMax || "4.0"}` : "未填写";
}

function getPersonalTestScore(profile: StudentProfile | null, testName: "SAT" | "ACT") {
  return profile?.standardizedTests.find((test) => test.test === testName)?.score || "未填写";
}

function getActiveLanguage(profile: StudentProfile | null) {
  const languageTests = [
    { databaseMetrics: ["toefl", "toefl_ibt_total"], test: "TOEFL" },
    { databaseMetrics: ["ielts", "ielts_academic_overall"], test: "IELTS" },
    { databaseMetrics: ["duolingo_english_test"], test: "Duolingo English Test" },
  ] as const;
  const activeTest = languageTests.find(({ test }) => {
    const score = profile?.standardizedTests.find((item) => item.test === test)?.score;
    return Boolean(score);
  });

  if (!activeTest) return { databaseMetrics: [] as string[], applicantValue: "未填写" };

  const score = profile?.standardizedTests.find((item) => item.test === activeTest.test)?.score;
  return { databaseMetrics: [...activeTest.databaseMetrics], applicantValue: `${activeTest.test} ${score}` };
}

function getPersonalAcademicScore(profile: StudentProfile | null) {
  if (!profile) return "未填写";

  const apSubjectCount = profile.academicRecord.apSubjects.filter((subject) => Boolean(subject.score)).length;
  const values = [
    apSubjectCount > 0 ? `AP ${apSubjectCount} 门` : "",
    profile.academicRecord.ibTotalScore ? `IB ${profile.academicRecord.ibTotalScore}` : "",
  ].filter(Boolean);

  return values.length > 0 ? values.join(" · ") : "未填写";
}

function getTargetProgramIds(detail: SchoolDetail, profile: StudentProfile | null) {
  const majorMatchedProgramIds = profile?.targetMajor
    ? detail.programs
      .filter((program) => program.majorCategories.includes(profile.targetMajor))
      .map((program) => program.id)
    : [];

  return new Set(majorMatchedProgramIds.length > 0 ? majorMatchedProgramIds : detail.programs.map((program) => program.id));
}

function findProgramStatistic(
  detail: SchoolDetail,
  programIds: ReadonlySet<string>,
  metric: string,
) {
  const statistic = detail.statistics.find(
    (item) => programIds.has(item.programId) && item.metric === metric && (item.statistic === "median" || item.statistic === "average"),
  );

  return statistic ? formatStatisticValue(statistic) : "暂无项目级公开值";
}

function findProgramRequirement(
  detail: SchoolDetail,
  programIds: ReadonlySet<string>,
  metricNames: readonly string[],
) {
  const requirement = detail.requirements.find(
    (item) => programIds.has(item.programId) && metricNames.includes(item.metric) && item.minimumScore !== null,
  );

  return requirement ? formatRequirementValue(requirement) : "暂无项目级公开值";
}

function getProfileComparisons(detail: SchoolDetail, profile: StudentProfile | null): ProfileComparisonItem[] {
  const programIds = getTargetProgramIds(detail, profile);
  const satEbrwMedian = findMetric(detail.metrics, "sat_ebrw_median")?.value ?? null;
  const satMathMedian = findMetric(detail.metrics, "sat_math_median")?.value ?? null;
  const activeLanguage = getActiveLanguage(profile);
  const academicRequirements = [
    findProgramRequirement(detail, programIds, ["ap_subject"]),
    findProgramRequirement(detail, programIds, ["ib_total"]),
  ].filter((value) => value !== "暂无项目级公开值");

  return [
    {
      applicantValue: getPersonalTestScore(profile, "SAT"),
      label: "SAT 本人 / 中位",
      schoolValue: formatScore(satEbrwMedian !== null && satMathMedian !== null ? satEbrwMedian + satMathMedian : null),
    },
    {
      applicantValue: getPersonalTestScore(profile, "ACT"),
      label: "ACT 本人 / 中位",
      schoolValue: formatScore(findMetric(detail.metrics, "act_composite_median")?.value ?? null),
    },
    {
      applicantValue: getPersonalGpa(profile),
      label: "GPA 本人 / 项目",
      schoolValue: findProgramStatistic(detail, programIds, "gpa"),
    },
    {
      applicantValue: activeLanguage.applicantValue,
      label: "语言 本人 / 门槛",
      schoolValue: findProgramRequirement(detail, programIds, activeLanguage.databaseMetrics),
    },
    {
      applicantValue: getPersonalAcademicScore(profile),
      label: "AP / IB 本人 / 项目",
      schoolValue: academicRequirements.length > 0 ? academicRequirements.join(" · ") : "暂无项目级公开值",
    },
  ];
}

function DetailLoading() {
  return (
    <div className="flex min-h-72 items-center justify-center gap-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
      <SpinnerGap aria-hidden="true" className="animate-spin text-violet-500" size={21} /> 正在读取经核验的院校数据…
    </div>
  );
}

function DetailError({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
      <Buildings aria-hidden="true" className="text-violet-500" size={32} weight="duotone" />
      <h2 className="mt-4 text-lg font-extrabold text-zinc-900 dark:text-white">暂时无法读取院校数据</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">请稍后重试。目录只展示已发布且带有官方来源的数据。</p>
      <button className="mt-5 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white dark:bg-white dark:text-zinc-950" onClick={onClose} type="button">返回院校库</button>
    </div>
  );
}

function SchoolDetailContent({ detail, profile }: { detail: SchoolDetail; profile: StudentProfile | null }) {
  const primaryMetrics = [
    { icon: TrendUp, metric: "admission_rate" },
    { icon: CurrencyDollar, metric: "tuition_out_of_state_usd" },
    { icon: Users, metric: "undergraduate_enrollment" },
    { icon: GraduationCap, metric: "graduation_rate_150_percent" },
  ];
  const scoreMetrics = detail.metrics.filter((metric) => metric.category === "admissions" && metric.unit === "score");
  const metricsByCategory = (Object.keys(metricCategoryLabels) as InstitutionMetric["category"][])
    .map((category) => ({
      category,
      metrics: detail.metrics
        .filter((metric) => metric.category === category)
        .sort((first, second) => (metricLabels[first.metric] ?? first.metric).localeCompare(metricLabels[second.metric] ?? second.metric)),
    }))
    .filter((group) => group.metrics.length > 0);
  const requirementsByProgram = useMemo(
    () => new Map(detail.programs.map((program) => [program.id, detail.requirements.filter((requirement) => requirement.programId === program.id)])),
    [detail.programs, detail.requirements],
  );
  const statisticsByProgram = useMemo(
    () => new Map(detail.programs.map((program) => [program.id, detail.statistics.filter((statistic) => statistic.programId === program.id)])),
    [detail.programs, detail.statistics],
  );
  const sourcePeriods = Array.from(new Set(detail.metrics.map((metric) => metric.sourcePeriod)));
  const profileComparisons = getProfileComparisons(detail, profile);
  const rankings = [...detail.rankings].sort((first, second) => first.key.localeCompare(second.key));

  return (
    <>
      <header className="border-b border-slate-200/80 px-5 py-6 dark:border-white/10 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <SchoolLogo className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-black text-white shadow-lg shadow-zinc-950/15 dark:bg-white dark:text-zinc-950" school={detail} />
              <div className="min-w-0">
                <p className="text-xs font-bold tracking-[0.16em] text-violet-600 dark:text-violet-300">VERIFIED SCHOOL PROFILE</p>
                <h1 className="mt-1 truncate text-2xl font-black tracking-[-0.04em] text-zinc-950 dark:text-white sm:text-3xl">{detail.name}</h1>
                <p className="mt-1 truncate text-sm font-bold text-violet-700 dark:text-violet-200">{getSchoolChineseName(detail)}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{detail.region} · {/^\d+$/.test(detail.ipedsUnitId) ? `IPEDS ${detail.ipedsUnitId}` : `院校 ID ${detail.ipedsUnitId}`}{sourcePeriods.length > 0 ? ` · 数据期：${sourcePeriods.join(" / ")}` : ""}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">所有数据均来源于网络公开数据；排名以对应发布机构、版本与披露范围为准。</p>
          </div>
          <a className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700 hover:border-violet-400 hover:bg-violet-100 dark:border-violet-400/25 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:border-violet-400/50" href={detail.officialWebsite} rel="noreferrer" target="_blank">
            学校官网 <ArrowSquareOut aria-hidden="true" size={15} weight="bold" />
          </a>
        </div>
      </header>

      <div className="space-y-7 p-5 sm:p-8">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {primaryMetrics.map(({ icon: Icon, metric }) => {
            const item = findMetric(detail.metrics, metric);
            return (
              <article className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-zinc-900/50" key={metric}>
                <Icon aria-hidden="true" className="text-violet-600 dark:text-violet-300" size={19} weight="duotone" />
                <p className="mt-4 text-xs font-bold text-zinc-500 dark:text-zinc-400">{metricLabels[metric]}</p>
                <p className="mt-1 text-xl font-black tracking-tight text-zinc-950 dark:text-white">{formatMetric(item)}</p>
              </article>
            );
          })}
        </section>

        {rankings.length > 0 && (
          <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2"><ChartLineUp aria-hidden="true" className="text-violet-600 dark:text-violet-300" size={19} weight="duotone" /><h2 className="text-lg font-extrabold text-zinc-950 dark:text-white">公开网络排名</h2></div>
            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">所有数据均来源于网络公开数据；点击来源可核对发布机构与对应版本。</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {rankings.map((ranking) => (
                <a className="group rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 transition-all hover:border-violet-400/50 hover:bg-violet-50/70 dark:border-white/10 dark:bg-zinc-950/45 dark:hover:border-violet-500/40 dark:hover:bg-violet-500/10" href={ranking.sourceUrl} key={`${ranking.key}-${ranking.edition}`} rel="noreferrer" target="_blank">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{rankingLabels[ranking.key]}</p><p className="mt-1 text-2xl font-black tracking-tight text-zinc-950 dark:text-white">{ranking.rankDisplay}</p></div><ArrowSquareOut aria-hidden="true" className="mt-1 text-violet-500 opacity-60 transition-opacity group-hover:opacity-100" size={17} weight="bold" /></div>
                  <p className="mt-3 text-xs font-semibold text-zinc-700 dark:text-zinc-200">{ranking.edition}</p>
                  <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{ranking.sourceTitle}</p>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-violet-200/80 bg-violet-50/50 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-violet-400/20 dark:bg-violet-500/5">
          <div className="flex items-center gap-2"><ChartLineUp aria-hidden="true" className="text-violet-600 dark:text-violet-300" size={19} weight="duotone" /><h2 className="text-lg font-extrabold text-zinc-950 dark:text-white">你的背景与院校数据对比</h2></div>
          <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">学校值优先使用已录取学生中位数与项目公开门槛；没有公开数据的字段不会估算。</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profileComparisons.map((comparison) => (
              <article className="rounded-2xl border border-white/80 bg-white/80 p-3.5 dark:border-white/10 dark:bg-zinc-950/45" key={comparison.label}>
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{comparison.label}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-zinc-400">你</p><p className="mt-1 truncate font-bold text-violet-700 dark:text-violet-200">{comparison.applicantValue}</p></div>
                  <div><p className="text-zinc-400">学校</p><p className="mt-1 truncate font-bold text-zinc-800 dark:text-zinc-100">{comparison.schoolValue}</p></div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {scoreMetrics.length > 0 && (
          <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2"><ChartLineUp aria-hidden="true" className="text-violet-600 dark:text-violet-300" size={19} weight="duotone" /><h2 className="text-lg font-extrabold text-zinc-950 dark:text-white">已录取学生成绩区间</h2></div>
            <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">来自 College Scorecard 公共数据，仅代表披露群体统计，不是最低录取门槛。</p>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {scoreMetrics.map((metric) => (
                <div className="rounded-xl bg-slate-50/80 px-3.5 py-3 dark:bg-zinc-950/45" key={metric.metric}>
                  <dt className="text-xs text-zinc-500 dark:text-zinc-400">{metricLabels[metric.metric] ?? metric.metric}</dt>
                  <dd className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">{formatMetric(metric)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2"><ChartLineUp aria-hidden="true" className="text-violet-600 dark:text-violet-300" size={19} weight="duotone" /><h2 className="text-lg font-extrabold text-zinc-950 dark:text-white">完整公开院校数据</h2></div>
          <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">来自美国教育部 College Scorecard 的已发布字段；每项均保留来源与数据期，隐私抑制或原始数据缺失的数值不会以推测值补齐。</p>
          <div className="mt-5 space-y-5">
            {metricsByCategory.map(({ category, metrics }) => (
              <div key={category}>
                <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-100">{metricCategoryLabels[category]}</h3>
                <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {metrics.map((metric) => (
                    <div className="rounded-xl bg-slate-50/80 px-3.5 py-3 dark:bg-zinc-950/45" key={`${metric.metric}-${metric.sourcePeriod}`}>
                      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{metricLabels[metric.metric] ?? metric.metric}</dt>
                      <dd className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">{formatMetric(metric)}</dd>
                      <a className="mt-1 block truncate text-[10px] font-semibold text-violet-700 transition-colors hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100" href={metric.sourceUrl} rel="noreferrer" target="_blank">{metric.sourcePeriod} · {metric.sourceTitle}</a>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </section>

        {detail.programs.length > 0 ? (
          <section className="space-y-4">
            <div><p className="text-xs font-bold tracking-[0.16em] text-violet-600 dark:text-violet-300">ADMISSION REQUIREMENTS</p><h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950 dark:text-white">项目与申请要求</h2></div>
            {detail.programs.map((program) => {
              const requirements = requirementsByProgram.get(program.id) ?? [];
              const statistics = statisticsByProgram.get(program.id) ?? [];
              return (
                <article className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-white/10 dark:bg-zinc-900/50" key={program.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div><h3 className="text-base font-extrabold text-zinc-950 dark:text-white">{program.programName}</h3><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{program.degreeName} · {program.fieldOfStudy}</p></div>
                    <a className="inline-flex w-fit items-center gap-1 text-xs font-bold text-violet-700 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100" href={program.officialUrl} rel="noreferrer" target="_blank">项目官方页面 <ArrowSquareOut aria-hidden="true" size={13} weight="bold" /></a>
                  </div>
                  {requirements.length > 0 ? (
                    <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                      {requirements.map((requirement) => (
                        <li className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-zinc-950/40" key={requirement.id}>
                          <div className="flex items-start justify-between gap-2"><p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{requirementLabels[requirement.metric] ?? requirement.metric}</p><span className="shrink-0 rounded-full border border-violet-200/60 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200">{requirementKindLabels[requirement.requirementKind]}</span></div>
                          <p className="mt-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200">{formatRequirementValue(requirement)}</p>
                          {(requirement.subjectArea || requirement.testVersion) && <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{[requirement.subjectArea, requirement.testVersion].filter(Boolean).join(" · ")}</p>}
                          <a className="mt-2 inline-flex text-xs font-semibold text-violet-700 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100" href={requirement.sourceUrl} rel="noreferrer" target="_blank">{requirement.sourceTitle} <ArrowSquareOut aria-hidden="true" className="ml-1" size={12} /></a>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-zinc-500 dark:border-white/10 dark:bg-zinc-950/40 dark:text-zinc-400">该院校已接入基础信息；项目级要求正在持续补充。</p>}
                  {statistics.length > 0 && (
                    <div className="mt-5 border-t border-slate-200/80 pt-5 dark:border-white/10">
                      <p className="text-xs font-bold tracking-[0.14em] text-zinc-500 dark:text-zinc-400">OFFICIAL ADMITTED-STUDENT STATISTICS</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {statistics.map((statistic) => (
                          <span className="rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:border-white/10 dark:bg-zinc-950/40 dark:text-zinc-200" key={statistic.id}>{requirementLabels[statistic.metric] ?? statistic.metric} {statisticLabels[statistic.statistic]} {formatStatisticValue(statistic)}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        ) : (
          <section className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center dark:border-white/10 dark:bg-zinc-900/40"><p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">项目级官方门槛正在补充中</p><p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">当前可先查看院校录取率、学费、SAT / ACT 区间、在读规模与毕业率。</p></section>
        )}
      </div>
    </>
  );
}

export default function SchoolDetailModal({ ipedsUnitId, onClose, profile }: SchoolDetailModalProps) {
  const [detail, setDetail] = useState<SchoolDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    if (!ipedsUnitId) return;

    const schoolId = ipedsUnitId;
    const controller = new AbortController();

    async function loadDetail() {
      try {
        const response = await fetch(`/api/undergraduate-schools/${encodeURIComponent(schoolId)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("School detail request failed.");
        const payload: unknown = await response.json();
        const parsed = parseSchoolDetailResponse(payload);
        if (!parsed) throw new Error("School detail response is invalid.");
        setDetail(parsed);
        setStatus("ready");
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    }

    void loadDetail();
    return () => controller.abort();
  }, [ipedsUnitId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    if (ipedsUnitId) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ipedsUnitId, onClose]);

  return (
    <AnimatePresence>
      {ipedsUnitId && (
        <motion.div animate={{ opacity: 1 }} className="fixed inset-0 z-[65] overflow-y-auto bg-zinc-950/45 px-3 py-3 backdrop-blur-sm sm:px-6 sm:py-8" exit={{ opacity: 0 }} initial={{ opacity: 0 }} onMouseDown={onClose} role="presentation">
          <motion.section animate={{ opacity: 1, scale: 1, y: 0 }} aria-modal="true" className="mx-auto min-h-full w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-2xl shadow-zinc-950/25 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/95 sm:min-h-0" exit={{ opacity: 0, scale: 0.98, y: 12 }} initial={{ opacity: 0, scale: 0.98, y: 12 }} onMouseDown={(event) => event.stopPropagation()} role="dialog" transition={{ duration: 0.22, ease: "easeOut" }}>
            <button aria-label="关闭院校详情" className="fixed right-7 top-7 z-10 flex size-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/90 text-zinc-500 shadow-lg hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-white/10 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:border-violet-400/40 dark:hover:bg-violet-500/10 dark:hover:text-violet-100" onClick={onClose} type="button"><X aria-hidden="true" size={19} weight="bold" /></button>
            {status === "loading" ? <DetailLoading /> : status === "error" || !detail ? <DetailError onClose={onClose} /> : <SchoolDetailContent detail={detail} profile={profile} />}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
