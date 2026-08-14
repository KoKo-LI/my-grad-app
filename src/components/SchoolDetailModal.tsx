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
import { parseSchoolDetailResponse } from "@/lib/undergraduateDirectory";
import type { InstitutionMetric, SchoolAdmissionRequirement, SchoolAdmissionStatistic, SchoolDetail } from "@/types";

interface SchoolDetailModalProps {
  ipedsUnitId: string | null;
  onClose: () => void;
}

const metricLabels: Record<string, string> = {
  admission_rate: "录取率",
  act_composite_median: "ACT 中位数",
  act_composite_p25: "ACT 25 分位",
  act_composite_p75: "ACT 75 分位",
  graduation_rate_150_percent: "毕业率",
  undergraduate_enrollment: "本科在读人数",
  tuition_in_state_usd: "州内学费",
  tuition_out_of_state_usd: "州外学费",
  sat_ebrw_median: "SAT 阅读写作中位数",
  sat_ebrw_p25: "SAT 阅读写作 25 分位",
  sat_ebrw_p75: "SAT 阅读写作 75 分位",
  sat_math_median: "SAT 数学中位数",
  sat_math_p25: "SAT 数学 25 分位",
  sat_math_p75: "SAT 数学 75 分位",
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

function findMetric(metrics: InstitutionMetric[], metric: string) {
  return metrics.find((item) => item.metric === metric) ?? null;
}

function formatMetric(metric: InstitutionMetric | null) {
  if (!metric) return "—";
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

function SchoolDetailContent({ detail }: { detail: SchoolDetail }) {
  const primaryMetrics = [
    { icon: TrendUp, metric: "admission_rate" },
    { icon: CurrencyDollar, metric: "tuition_out_of_state_usd" },
    { icon: Users, metric: "undergraduate_enrollment" },
    { icon: GraduationCap, metric: "graduation_rate_150_percent" },
  ];
  const scoreMetrics = detail.metrics.filter((metric) => metric.category === "admissions" && metric.metric !== "admission_rate");
  const requirementsByProgram = useMemo(
    () => new Map(detail.programs.map((program) => [program.id, detail.requirements.filter((requirement) => requirement.programId === program.id)])),
    [detail.programs, detail.requirements],
  );
  const statisticsByProgram = useMemo(
    () => new Map(detail.programs.map((program) => [program.id, detail.statistics.filter((statistic) => statistic.programId === program.id)])),
    [detail.programs, detail.statistics],
  );
  const sourcePeriods = Array.from(new Set(detail.metrics.map((metric) => metric.sourcePeriod)));

  return (
    <>
      <header className="border-b border-slate-200/80 px-5 py-6 dark:border-white/10 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-black text-white shadow-lg shadow-zinc-950/15 dark:bg-white dark:text-zinc-950">{detail.shortName.slice(0, 4)}</span>
              <div className="min-w-0">
                <p className="text-xs font-bold tracking-[0.16em] text-violet-600 dark:text-violet-300">VERIFIED SCHOOL PROFILE</p>
                <h1 className="mt-1 truncate text-2xl font-black tracking-[-0.04em] text-zinc-950 dark:text-white sm:text-3xl">{detail.name}</h1>
              </div>
            </div>
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{detail.region} · IPEDS {detail.ipedsUnitId}{sourcePeriods.length > 0 ? ` · 数据期：${sourcePeriods.join(" / ")}` : ""}</p>
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

export default function SchoolDetailModal({ ipedsUnitId, onClose }: SchoolDetailModalProps) {
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
            {status === "loading" ? <DetailLoading /> : status === "error" || !detail ? <DetailError onClose={onClose} /> : <SchoolDetailContent detail={detail} />}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
