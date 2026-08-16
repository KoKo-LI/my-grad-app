"use client";

import { ArrowUpRight, Buildings, MagnifyingGlass, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { InstitutionMetric, SchoolDirectoryItem } from "@/types";

interface SchoolDirectoryOverlayProps {
  description: string;
  heading: string;
  onClose: () => void;
  onSelect: (school: SchoolDirectoryItem) => void;
  open: boolean;
  schools: SchoolDirectoryItem[];
}

function findMetric(metrics: InstitutionMetric[], metric: string) {
  return metrics.find((item) => item.metric === metric)?.value ?? null;
}

function formatRate(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function formatTuition(value: number | null) {
  return value === null
    ? "—"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, style: "currency", currency: "USD" }).format(value);
}

export default function SchoolDirectoryOverlay({ description, heading, onClose, onSelect, open, schools }: SchoolDirectoryOverlayProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleSchools = useMemo(
    () =>
      schools
        .filter((school) => {
          if (!normalizedQuery) return true;
          return `${school.name} ${school.shortName} ${school.region} ${school.country}`.toLocaleLowerCase().includes(normalizedQuery);
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
                  const tuition = findMetric(school.metrics, "tuition_out_of_state_usd");
                  return (
                    <button
                      className="group rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-left shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_10px_25px_-5px_rgba(124,58,237,0.12)] dark:border-white/10 dark:bg-zinc-900/50 dark:hover:border-violet-500/40 dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]"
                      key={school.ipedsUnitId}
                      onClick={() => handleSelect(school)}
                      type="button"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xs font-extrabold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">{school.shortName.slice(0, 4)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-2">
                            <span className="truncate text-sm font-extrabold text-zinc-950 dark:text-white">{school.name}</span>
                            <ArrowUpRight aria-hidden="true" className="shrink-0 text-violet-500 opacity-0 transition-opacity group-hover:opacity-100" size={16} weight="bold" />
                          </span>
                          <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">{school.region}</span>
                        </span>
                      </div>
                      <span className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 dark:border-white/5">
                        <span><span className="block text-[10px] font-bold tracking-wide text-zinc-400">录取率</span><span className="mt-0.5 block text-sm font-bold text-zinc-700 dark:text-zinc-200">{formatRate(admissionRate)}</span></span>
                        <span><span className="block text-[10px] font-bold tracking-wide text-zinc-400">州外学费</span><span className="mt-0.5 block truncate text-sm font-bold text-zinc-700 dark:text-zinc-200">{formatTuition(tuition)}</span></span>
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
