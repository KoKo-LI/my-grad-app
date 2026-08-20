"use client";

import { ArrowUpRight, Buildings, MagnifyingGlass, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import SchoolLogo from "@/components/SchoolLogo";
import { getSchoolChineseName } from "@/data/schoolIdentity";
import type { InstitutionMetric, InstitutionRanking, InstitutionRankingKey, SchoolDirectoryItem, StudentProfile } from "@/types";

interface SchoolDirectoryOverlayProps {
  description: string;
  heading: string;
  onClose: () => void;
  onSelect: (school: SchoolDirectoryItem) => void;
  open: boolean;
  profile: StudentProfile | null;
  schools: SchoolDirectoryItem[];
}

function findMetric(metrics: InstitutionMetric[], metric: string) {
  return metrics.find((item) => item.metric === metric)?.value ?? null;
}

function formatRate(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatScore(value: number | null) {
  return value === null ? "暂无可核验值" : Math.round(value).toLocaleString("en-US");
}

const rankingLabels: Record<InstitutionRankingKey, string> = {
  qs_world_university_rankings: "QS",
  usnews_national_universities: "U.S. News",
};

function findRanking(rankings: InstitutionRanking[], key: InstitutionRankingKey) {
  return rankings.find((ranking) => ranking.key === key) ?? null;
}

function getPersonalGpa(profile: StudentProfile | null) {
  return profile?.gpa ? `${profile.gpa} / ${profile.gpaMax || "4.0"}` : "未填写";
}

function getPersonalTestScore(profile: StudentProfile | null, testName: "SAT" | "ACT") {
  const score = profile?.standardizedTests.find((test) => test.test === testName)?.score;
  return score || "未填写";
}

function getPersonalLanguageScore(profile: StudentProfile | null) {
  const languageScores = profile?.standardizedTests
    .filter((test) => test.test === "TOEFL" || test.test === "IELTS" || test.test === "Duolingo English Test")
    .filter((test) => Boolean(test.score))
    .map((test) => `${test.test} ${test.score}`) ?? [];

  return languageScores.length > 0 ? languageScores.join(" · ") : "未填写";
}

function getPersonalAcademicScore(profile: StudentProfile | null) {
  if (!profile) return "未填写";

  const apSubjectCount = profile.academicRecord.apSubjects.filter((subject) => Boolean(subject.score)).length;
  const items = [
    apSubjectCount > 0 ? `AP ${apSubjectCount} 门` : "",
    profile.academicRecord.ibTotalScore ? `IB ${profile.academicRecord.ibTotalScore}` : "",
  ].filter(Boolean);

  return items.length > 0 ? items.join(" · ") : "未填写";
}

function ComparisonMetric({ applicantValue, label, schoolValue }: { applicantValue: string; label: string; schoolValue: string }) {
  return (
    <span className="min-w-0 rounded-xl bg-slate-50/90 p-2 dark:bg-zinc-950/45">
      <span className="block text-[10px] font-bold tracking-wide text-zinc-400">{label}</span>
      <span className="mt-1 block truncate text-[11px] font-bold text-violet-700 dark:text-violet-200">你：{applicantValue}</span>
      <span className="mt-0.5 block truncate text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">校：{schoolValue}</span>
    </span>
  );
}

export default function SchoolDirectoryOverlay({ description, heading, onClose, onSelect, open, profile, schools }: SchoolDirectoryOverlayProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleSchools = useMemo(
    () =>
      schools
        .filter((school) => {
          if (!normalizedQuery) return true;
          return `${school.name} ${getSchoolChineseName(school)} ${school.shortName} ${school.region} ${school.country}`.toLocaleLowerCase().includes(normalizedQuery);
        })
        .slice(0, 60),
    [normalizedQuery, schools],
  );

  const handleSelect = (school: SchoolDirectoryItem) => {
    setQuery("");
    onSelect(school);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[55] flex items-start justify-center overflow-y-auto bg-zinc-950/40 px-3 py-3 backdrop-blur-sm sm:items-center sm:px-6 sm:py-8"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onMouseDown={onClose}
          role="presentation"
        >
          <motion.section
            animate={{ opacity: 1, scale: 1, y: 0 }}
            aria-label={heading}
            aria-modal="true"
            className="my-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-2xl shadow-zinc-950/25 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-950/95"
            exit={{ opacity: 0, scale: 0.98, y: 12 }}
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-5 dark:border-white/10 sm:px-7">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-violet-600 dark:text-violet-300">VERIFIED UNDERGRADUATE CATALOG</p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-zinc-950 dark:text-white">{heading}</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
                <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">所有数据均来源于网络公开数据；排名以对应发布机构、版本与披露范围为准。</p>
              </div>
              <button
                aria-label="关闭院校库"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 text-zinc-500 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-white/10 dark:text-zinc-300 dark:hover:border-violet-400/40 dark:hover:bg-violet-500/10 dark:hover:text-violet-100"
                onClick={onClose}
                type="button"
              >
                <X aria-hidden="true" size={19} weight="bold" />
              </button>
            </header>
            <div className="p-5 sm:p-7">
              <label className="relative block">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-zinc-400"><MagnifyingGlass aria-hidden="true" size={19} /></span>
                <input
                  aria-label="搜索院校库"
                  className="h-12 w-full rounded-2xl border border-slate-200/80 bg-slate-50/80 pl-11 pr-4 text-sm text-zinc-900 outline-none transition focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/15 dark:border-white/10 dark:bg-zinc-900/70 dark:text-white"
                  onChange={(event) => setQuery(event.target.value.slice(0, 80))}
                  placeholder="搜索院校名称、简称或地区…"
                  value={query}
                />
              </label>
              <div className="mt-4 flex items-center justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                <span>{normalizedQuery ? `找到 ${visibleSchools.length} 所匹配院校` : "按字母顺序浏览"}</span>
                <span>点击院校查看完整录取信息</span>
              </div>
              <div className="mt-4 grid max-h-[60vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                {visibleSchools.map((school) => {
                  const admissionRate = findMetric(school.metrics, "admission_rate");
                  const satEbrwMedian = findMetric(school.metrics, "sat_ebrw_median");
                  const satMathMedian = findMetric(school.metrics, "sat_math_median");
                  const satMedian = satEbrwMedian !== null && satMathMedian !== null ? satEbrwMedian + satMathMedian : null;
                  const actMedian = findMetric(school.metrics, "act_composite_median");
                  const usNewsRanking = findRanking(school.rankings, "usnews_national_universities");
                  const qsRanking = findRanking(school.rankings, "qs_world_university_rankings");
                  return (
                    <button
                      className="group rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-left shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_10px_25px_-5px_rgba(124,58,237,0.12)] dark:border-white/10 dark:bg-zinc-900/50 dark:hover:border-violet-500/40 dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]"
                      key={school.ipedsUnitId}
                      onClick={() => handleSelect(school)}
                      type="button"
                    >
                      <div className="flex items-start gap-3">
                        <SchoolLogo className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xs font-extrabold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" school={school} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="truncate text-sm font-extrabold text-zinc-950 dark:text-white">{school.name}</span>
                            <ArrowUpRight aria-hidden="true" className="shrink-0 text-violet-500 opacity-0 transition-opacity group-hover:opacity-100" size={16} weight="bold" />
                          </span>
                          <span className="mt-1 block truncate text-xs font-semibold text-violet-700 dark:text-violet-200">{getSchoolChineseName(school)}</span>
                          <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">{school.region}</span>
                          {(usNewsRanking || qsRanking) && (
                            <span className="mt-2 flex flex-wrap gap-1.5">
                              {[usNewsRanking, qsRanking].filter((ranking): ranking is InstitutionRanking => ranking !== null).map((ranking) => (
                                <span className="rounded-full border border-violet-200/60 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200" key={ranking.key} title={`${ranking.edition} · ${ranking.sourceTitle}`}>
                                  {rankingLabels[ranking.key]} {ranking.rankDisplay}
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3 dark:border-white/5">
                        <span>
                          <span className="block text-[10px] font-bold tracking-wide text-zinc-400">录取率</span>
                          <span className="mt-1 block text-sm font-bold text-emerald-700 dark:text-emerald-200">{formatRate(admissionRate)}</span>
                        </span>
                        <span className="min-w-0 text-right">
                          <span className="block text-[10px] font-bold tracking-wide text-zinc-400">录取中位分</span>
                          <span className="mt-1 block truncate text-xs font-bold text-zinc-700 dark:text-zinc-200">SAT {formatScore(satMedian)} · ACT {formatScore(actMedian)}</span>
                        </span>
                      </span>
                      <span className="mt-2 block text-[10px] font-semibold text-violet-600 opacity-80 transition-opacity group-hover:opacity-100 dark:text-violet-300">悬停查看个人背景对比</span>
                      <span className="grid max-h-0 grid-cols-3 gap-2 overflow-hidden opacity-0 transition-[max-height,opacity,margin,padding] duration-300 group-hover:mt-3 group-hover:max-h-72 group-hover:opacity-100 group-focus-visible:mt-3 group-focus-visible:max-h-72 group-focus-visible:opacity-100">
                        <ComparisonMetric applicantValue={getPersonalTestScore(profile, "SAT")} label="SAT 本人/中位" schoolValue={formatScore(satMedian)} />
                        <ComparisonMetric applicantValue={getPersonalTestScore(profile, "ACT")} label="ACT 本人/中位" schoolValue={formatScore(actMedian)} />
                        <ComparisonMetric applicantValue={getPersonalGpa(profile)} label="GPA 本人/学校" schoolValue="暂无项目级公开值" />
                        <ComparisonMetric applicantValue={getPersonalLanguageScore(profile)} label="语言 本人/学校" schoolValue="暂无项目级公开值" />
                        <ComparisonMetric applicantValue={getPersonalAcademicScore(profile)} label="AP / IB 本人/学校" schoolValue="暂无项目级公开值" />
                      </span>
                    </button>
                  );
                })}
                {visibleSchools.length === 0 && (
                  <div className="col-span-full flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center dark:border-white/10 dark:bg-zinc-900/40">
                    <Buildings aria-hidden="true" className="text-violet-500" size={28} weight="duotone" />
                    <p className="mt-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200">未找到匹配院校</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">试试学校全名、英文简称或州名。</p>
                  </div>
                )}
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
