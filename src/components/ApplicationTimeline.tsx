"use client";

import {
  CalendarCheck,
  CalendarDots,
  CheckCircle,
  ClockCountdown,
  PaperPlaneTilt,
  Sparkle,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import SchoolLogo from "@/components/SchoolLogo";
import { getInstitutionIdFromTargetId, getSchoolChineseName } from "@/data/schoolIdentity";
import type {
  ApplicationTimelineMilestone,
  ApplicationTimelineStage,
  SavedTargetSchool,
} from "@/types";

interface ApplicationTimelineProps {
  schools: SavedTargetSchool[];
}

const stageConfiguration: Record<
  ApplicationTimelineStage,
  { Icon: typeof CalendarDots; dayOffset: number; label: string }
> = {
  portalOpen: { Icon: CalendarDots, dayOffset: -120, label: "网申开放" },
  priorityDeadline: { Icon: ClockCountdown, dayOffset: -45, label: "优先截止" },
  finalDeadline: { Icon: PaperPlaneTilt, dayOffset: 0, label: "终轮截止" },
  decisionRelease: { Icon: CheckCircle, dayOffset: 65, label: "结果发放" },
};

const timelineStages: ApplicationTimelineStage[] = [
  "portalOpen",
  "priorityDeadline",
  "finalDeadline",
  "decisionRelease",
];

function shiftDate(dateString: string, dayOffset: number) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function getMilestones(deadline: string): ApplicationTimelineMilestone[] {
  return timelineStages.map((stage) => ({
    date: shiftDate(deadline, stageConfiguration[stage].dayOffset),
    label: stageConfiguration[stage].label,
    stage,
  }));
}

function formatTimelineDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function isCompleted(date: string) {
  return new Date(`${date}T23:59:59`).getTime() < Date.now();
}

function hasConfirmedDeadline(deadline: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(deadline);
}

export default function ApplicationTimeline({ schools }: ApplicationTimelineProps) {
  const visibleSchools = schools.filter((school) => hasConfirmedDeadline(school.deadline)).slice(0, 4);
  const schoolsAwaitingDeadlines = schools.length - visibleSchools.length;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_10px_25px_-5px_rgba(124,58,237,0.12)] dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-sm dark:backdrop-blur-md dark:hover:border-violet-500/40 dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.12)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-violet-600 dark:text-violet-300">
            <Sparkle aria-hidden="true" size={15} weight="fill" /> APPLICATION OVERVIEW
          </p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-zinc-950 dark:text-white">全景动态时间轴</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">悬浮节点查看各校的关键申请节奏。</p>
        </div>
        <span className="w-fit rounded-full border border-violet-200/60 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 dark:border-white/10 dark:bg-zinc-950/40 dark:text-zinc-300">
          已加入 {schools.length} 所{schoolsAwaitingDeadlines > 0 ? ` · ${schoolsAwaitingDeadlines} 所待确认` : ""}
        </span>
      </div>

      {visibleSchools.length > 0 ? (
        <div className="mt-6 overflow-x-auto pb-2">
          <div className="min-w-[720px] space-y-5">
            {visibleSchools.map((school) => {
              const milestones = getMilestones(school.deadline);

              return (
                <article className="grid grid-cols-[142px_minmax(0,1fr)] items-center gap-5 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_10px_25px_-5px_rgba(124,58,237,0.12)] dark:border-white/10 dark:bg-zinc-950/35 dark:shadow-none dark:backdrop-blur-none dark:hover:border-violet-500/40 dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]" key={school.id}>
                  <div className="flex min-w-0 items-center gap-3">
                    <SchoolLogo
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-800"
                      school={{ ipedsUnitId: getInstitutionIdFromTargetId(school.id), name: school.name, officialWebsite: school.officialWebsite, shortName: school.shortName }}
                    />
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-extrabold text-zinc-900 dark:text-white">{school.name}</h3>
                      <p className="mt-1 truncate text-xs font-semibold text-violet-700 dark:text-violet-200">{getSchoolChineseName({ ipedsUnitId: getInstitutionIdFromTargetId(school.id), name: school.name })}</p>
                      <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{school.status}</p>
                    </div>
                  </div>
                  <div className="relative grid grid-cols-4 gap-2">
                    <span aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-4 h-px bg-zinc-200 dark:bg-white/10" />
                    {milestones.map((milestone) => {
                      const configuration = stageConfiguration[milestone.stage];
                      const Icon = configuration.Icon;
                      const complete = isCompleted(milestone.date);

                      return (
                        <motion.button
                          aria-label={`${school.name}：${milestone.label}，${milestone.date}`}
                          className="group relative z-10 flex min-w-0 flex-col items-center text-center focus:outline-none"
                          key={milestone.stage}
                          type="button"
                          whileHover={{ scale: 1.04, y: -3 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <span className={`flex size-8 items-center justify-center rounded-full border shadow-sm transition-colors ${complete ? "border-emerald-400/60 bg-emerald-500 text-white shadow-emerald-500/25" : "border-violet-200/60 bg-violet-50 text-violet-700 shadow-violet-500/20 dark:border-violet-400/55 dark:bg-zinc-900 dark:text-violet-200"}`}>
                            <Icon aria-hidden="true" size={15} weight={complete ? "fill" : "bold"} />
                          </span>
                          <span className="mt-2 truncate text-[11px] font-bold text-zinc-700 dark:text-zinc-200">{milestone.label}</span>
                          <span className="mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">{formatTimelineDate(milestone.date)}</span>
                          <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-3 w-max max-w-48 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 text-left text-xs font-semibold text-zinc-700 opacity-0 shadow-xl shadow-zinc-950/15 backdrop-blur-md transition group-focus:opacity-100 group-hover:opacity-100 dark:border-white/10 dark:bg-zinc-900/95 dark:text-zinc-100">
                            {school.name}<br />{milestone.label} · {milestone.date}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="dashboard-shimmer mt-6 flex min-h-36 items-center gap-4 rounded-2xl border border-dashed border-slate-200/80 bg-slate-200/80 px-5 text-sm text-zinc-600 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/15 dark:bg-zinc-950/30 dark:text-zinc-300 dark:shadow-none dark:backdrop-blur-none">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200"><CalendarCheck aria-hidden="true" size={22} weight="duotone" /></span>
          <p>{schools.length > 0 ? "已加入院校，待接入项目级官方截止日期后，系统会在这里汇总网申开放、截止与结果发放节点。" : "先从智能推荐中加入院校；系统会在这里汇总网申开放、截止与结果发放节点。"}</p>
        </div>
      )}
    </section>
  );
}
