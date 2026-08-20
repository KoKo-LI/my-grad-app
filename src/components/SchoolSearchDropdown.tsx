"use client";

import { Buildings, MagnifyingGlass, SpinnerGap } from "@phosphor-icons/react";
import { useMemo } from "react";
import SchoolLogo from "@/components/SchoolLogo";
import { getSchoolChineseName } from "@/data/schoolIdentity";
import type { InstitutionMetric, SchoolDirectoryItem } from "@/types";

interface SchoolSearchDropdownProps {
  isLoading: boolean;
  onSelect: (school: SchoolDirectoryItem) => void;
  query: string;
  schools: SchoolDirectoryItem[];
}

function findMetric(metrics: InstitutionMetric[], metric: string) {
  return metrics.find((item) => item.metric === metric)?.value ?? null;
}

function formatRate(value: number | null) {
  return value === null ? "录取率待补充" : `录取率 ${(value * 100).toFixed(1)}%`;
}

export default function SchoolSearchDropdown({ isLoading, onSelect, query, schools }: SchoolSearchDropdownProps) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const results = useMemo(() => {
    if (!normalizedQuery) return [];

    return schools
      .filter((school) => `${school.name} ${getSchoolChineseName(school)} ${school.shortName} ${school.region} ${school.country}`.toLocaleLowerCase().includes(normalizedQuery))
      .slice(0, 8);
  }, [normalizedQuery, schools]);

  if (!normalizedQuery) return null;

  return (
    <section aria-label="院校搜索结果" className="absolute left-0 right-0 top-[calc(100%+0.6rem)] z-30 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-xl shadow-zinc-950/10 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-black/30">
      <div className="flex items-center justify-between px-2.5 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        <span>院校数据搜索</span>
        <span>{schools.length > 0 ? `${schools.length} 所已接入` : "正在连接目录"}</span>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">
          <SpinnerGap aria-hidden="true" className="animate-spin" size={16} /> 正在加载院校目录…
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-1">
          {results.map((school) => (
            <button
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-violet-50 dark:hover:bg-violet-500/10"
              key={school.ipedsUnitId}
              onClick={() => onSelect(school)}
              type="button"
            >
              <SchoolLogo className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xs font-extrabold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" school={school} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{school.name}</span>
                <span className="mt-0.5 block truncate text-xs font-semibold text-violet-700 dark:text-violet-200">{getSchoolChineseName(school)}</span>
                <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">{school.region} · {formatRate(findMetric(school.metrics, "admission_rate"))}</span>
              </span>
              <Buildings aria-hidden="true" className="shrink-0 text-violet-500" size={18} weight="duotone" />
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-4 text-sm text-zinc-500 dark:text-zinc-400">
          <MagnifyingGlass aria-hidden="true" size={16} /> 未找到匹配院校，请尝试英文校名、简称或地区。
        </div>
      )}
    </section>
  );
}
