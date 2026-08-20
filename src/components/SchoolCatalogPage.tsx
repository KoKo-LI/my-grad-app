"use client";

import {
  ArrowLeft,
  ArrowSquareOut,
  Check,
  Funnel,
  MagnifyingGlass,
  Moon,
  SlidersHorizontal,
  Sun,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import ProfileDrawer from "@/components/ProfileDrawer";
import SchoolDetailModal from "@/components/SchoolDetailModal";
import SchoolLogo from "@/components/SchoolLogo";
import Sidebar from "@/components/Sidebar";
import { getSchoolChineseName } from "@/data/schoolIdentity";
import { parseSchoolDirectoryResponse } from "@/lib/undergraduateDirectory";
import type { InstitutionMetric, InstitutionRanking, InstitutionRankingKey, SchoolDirectoryItem, SchoolDirectoryProgramFilter, SchoolItem } from "@/types";
import { buildDirectorySchoolTiers } from "@/utils/directoryTierEngine";
import {
  parseStoredProfile,
  PROFILE_STORAGE_EVENT,
  PROFILE_STORAGE_KEY,
  THEME_STORAGE_EVENT,
  THEME_STORAGE_KEY,
} from "@/utils/profileStorage";

type ThemeMode = "light" | "dark";

const rankingLabels: Record<InstitutionRankingKey, string> = {
  qs_world_university_rankings: "QS",
  usnews_national_universities: "U.S. News",
};

const tierCopy: Record<SchoolItem["status"], { description: string; title: string }> = {
  Reach: { title: "Reach 梦校", description: "高挑战 · 放大上限" },
  Target: { title: "Target 匹配", description: "稳健匹配 · 重点投入" },
  Safety: { title: "Safety 保底", description: "成功把握 · 风险对冲" },
};

const majorLabels: Record<string, string> = {
  all: "综合学科",
  "computer-science": "计算机科学",
  engineering: "工程学",
};

function getServerSnapshot() {
  return null;
}

function subscribeToProfile(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === PROFILE_STORAGE_KEY) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(PROFILE_STORAGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(PROFILE_STORAGE_EVENT, onStoreChange);
  };
}

function subscribeToTheme(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_STORAGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_STORAGE_EVENT, onStoreChange);
  };
}

function getProfileSnapshot() {
  return window.localStorage.getItem(PROFILE_STORAGE_KEY);
}

function getThemeSnapshot() {
  return window.localStorage.getItem(THEME_STORAGE_KEY);
}

function findMetric(metrics: InstitutionMetric[], metric: string) {
  return metrics.find((item) => item.metric === metric)?.value ?? null;
}

function findRanking(rankings: InstitutionRanking[], key: InstitutionRankingKey) {
  return rankings.find((item) => item.key === key) ?? null;
}

function formatRate(value: number | null) {
  return value === null ? "待补充" : `${(value * 100).toFixed(1)}%`;
}

function formatScore(value: number | null) {
  return value === null ? "待补充" : Math.round(value).toLocaleString("en-US");
}

function parseTier(value: string | null): SchoolItem["status"] | null {
  return value === "Reach" || value === "Target" || value === "Safety" ? value : null;
}

function formatMajorLabel(major: string) {
  return majorLabels[major] ?? major.replace(/-/g, " ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseProgramFilterResponse(value: unknown): SchoolDirectoryProgramFilter[] {
  if (!isRecord(value) || !Array.isArray(value.data)) return [];

  return value.data.flatMap((item) => {
    if (!isRecord(item) || typeof item.ipedsUnitId !== "string" || !Array.isArray(item.majorCategories)) return [];
    const majorCategories = item.majorCategories
      .filter((category): category is string => typeof category === "string" && Boolean(category.trim()))
      .map((category) => category.trim());
    return majorCategories.length > 0 ? [{ ipedsUnitId: item.ipedsUnitId, majorCategories }] : [];
  });
}

function getSchoolMajorCategories(schools: SchoolDirectoryItem[], filters: SchoolDirectoryProgramFilter[]) {
  const categoriesByIpedsUnitId = new Map(filters.map((filter) => [filter.ipedsUnitId, filter.majorCategories]));
  return new Map(schools.map((school) => [school.ipedsUnitId, categoriesByIpedsUnitId.get(school.ipedsUnitId) ?? []]));
}

function FilterCheckbox({
  checked,
  count,
  idSuffix,
  label,
  onChange,
}: {
  checked: boolean;
  count: number;
  idSuffix: string;
  label: string;
  onChange: () => void;
}) {
  const id = `catalog-filter-${Array.from(idSuffix)
    .map((character) => character.codePointAt(0)?.toString(36) ?? "0")
    .join("-")}`;

  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-transparent px-2.5 py-2 text-sm text-zinc-700 transition hover:border-violet-200 hover:bg-violet-50/70 dark:text-zinc-300 dark:hover:border-violet-400/20 dark:hover:bg-violet-500/10" htmlFor={id}>
      <span className="flex min-w-0 items-center gap-2.5">
        <input
          checked={checked}
          className="size-4 shrink-0 rounded border-slate-300 text-violet-600 focus:ring-violet-500/30 dark:border-white/20 dark:bg-zinc-900"
          id={id}
          onChange={onChange}
          type="checkbox"
        />
        <span className="truncate font-medium">{label}</span>
      </span>
      <span className="shrink-0 text-xs font-semibold text-zinc-400 dark:text-zinc-500">{count}</span>
    </label>
  );
}

function CatalogSchoolCard({
  majorCategories,
  onOpen,
  school,
}: {
  majorCategories: string[];
  onOpen: () => void;
  school: SchoolDirectoryItem;
}) {
  const admissionRate = findMetric(school.metrics, "admission_rate");
  const satEbrwMedian = findMetric(school.metrics, "sat_ebrw_median");
  const satMathMedian = findMetric(school.metrics, "sat_math_median");
  const satMedian = satEbrwMedian !== null && satMathMedian !== null ? satEbrwMedian + satMathMedian : null;
  const actMedian = findMetric(school.metrics, "act_composite_median");
  const usNewsRanking = findRanking(school.rankings, "usnews_national_universities");
  const qsRanking = findRanking(school.rankings, "qs_world_university_rankings");
  const rankings = [usNewsRanking, qsRanking].filter((ranking): ranking is InstitutionRanking => ranking !== null);

  return (
    <motion.button
      className="group flex min-h-[246px] flex-col rounded-3xl border border-slate-200/80 bg-white/80 p-5 text-left shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_10px_25px_-5px_rgba(124,58,237,0.12)] focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-500/20 dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-none dark:hover:border-violet-500/40 dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]"
      onClick={onOpen}
      type="button"
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex min-w-0 items-start gap-3">
        <SchoolLogo className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-xs font-extrabold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100" school={school} />
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="truncate text-base font-extrabold tracking-tight text-zinc-950 dark:text-white">{school.name}</span>
            <ArrowSquareOut aria-hidden="true" className="mt-0.5 shrink-0 text-violet-500 opacity-0 transition-opacity group-hover:opacity-100" size={17} weight="bold" />
          </span>
          <span className="mt-1 block truncate text-xs font-semibold text-violet-700 dark:text-violet-200">{getSchoolChineseName(school)}</span>
          <span className="mt-0.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">{school.region}</span>
        </span>
      </div>
      {rankings.length > 0 && (
        <span className="mt-4 flex flex-wrap gap-1.5">
          {rankings.map((ranking) => (
            <span className="rounded-full border border-violet-200/60 bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200" key={ranking.key} title={`${ranking.edition} · ${ranking.sourceTitle}`}>
              {rankingLabels[ranking.key]} {ranking.rankDisplay}
            </span>
          ))}
        </span>
      )}
      <span className="mt-auto grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
        <span>
          <span className="block text-[10px] font-bold tracking-wide text-zinc-400">录取率</span>
          <span className="mt-1 block text-sm font-extrabold text-emerald-700 dark:text-emerald-200">{formatRate(admissionRate)}</span>
        </span>
        <span>
          <span className="block text-[10px] font-bold tracking-wide text-zinc-400">SAT 中位</span>
          <span className="mt-1 block text-sm font-extrabold text-zinc-800 dark:text-zinc-100">{formatScore(satMedian)}</span>
        </span>
        <span>
          <span className="block text-[10px] font-bold tracking-wide text-zinc-400">ACT 中位</span>
          <span className="mt-1 block text-sm font-extrabold text-zinc-800 dark:text-zinc-100">{formatScore(actMedian)}</span>
        </span>
      </span>
      <span className="mt-4 flex min-h-5 flex-wrap gap-1.5">
        {majorCategories.slice(0, 2).map((category) => (
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" key={category}>{formatMajorLabel(category)}</span>
        ))}
        {majorCategories.length > 2 && <span className="rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">+{majorCategories.length - 2}</span>}
        {majorCategories.length === 0 && <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">项目分类待核验</span>}
      </span>
    </motion.button>
  );
}

export default function SchoolCatalogPage() {
  const searchParams = useSearchParams();
  const storedProfile = useSyncExternalStore(subscribeToProfile, getProfileSnapshot, getServerSnapshot);
  const storedTheme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerSnapshot);
  const profile = useMemo(() => parseStoredProfile(storedProfile), [storedProfile]);
  const theme: ThemeMode = storedTheme === "dark" ? "dark" : "light";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [directory, setDirectory] = useState<SchoolDirectoryItem[]>([]);
  const [programFilters, setProgramFilters] = useState<SchoolDirectoryProgramFilter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedMajors, setSelectedMajors] = useState<string[]>([]);
  const [selectedSchoolIpedsUnitId, setSelectedSchoolIpedsUnitId] = useState<string | null>(null);
  const tierScope = parseTier(searchParams.get("tier"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      setIsLoading(true);
      try {
        const [directoryResponse, programResponse] = await Promise.all([
          fetch("/api/undergraduate-schools", { signal: controller.signal }),
          fetch("/api/undergraduate-school-filters", { signal: controller.signal }),
        ]);

        if (directoryResponse.ok) {
          const directoryPayload: unknown = await directoryResponse.json();
          setDirectory(parseSchoolDirectoryResponse(directoryPayload));
        }

        if (programResponse.ok) {
          const programPayload: unknown = await programResponse.json();
          setProgramFilters(parseProgramFilterResponse(programPayload));
        }
      } catch {
        // The page retains its transparent empty state when public data is temporarily unavailable.
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadCatalog();
    return () => controller.abort();
  }, []);

  const majorCategoriesBySchool = useMemo(
    () => getSchoolMajorCategories(directory, programFilters),
    [directory, programFilters],
  );
  const availableRegions = useMemo(
    () => Array.from(new Set(directory.map((school) => school.region))).sort((first, second) => first.localeCompare(second, "zh-CN")),
    [directory],
  );
  const availableMajors = useMemo(
    () => Array.from(new Set(Array.from(majorCategoriesBySchool.values()).flat())).sort((first, second) => first.localeCompare(second, "zh-CN")),
    [majorCategoriesBySchool],
  );
  const activeTierScope = profile?.isInitialized === true ? tierScope : null;
  const scopedSchools = useMemo(() => {
    if (!activeTierScope || !profile) return directory;
    return buildDirectorySchoolTiers(profile, directory)[activeTierScope];
  }, [activeTierScope, directory, profile]);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleSchools = useMemo(
    () =>
      scopedSchools.filter((school) => {
        const matchesQuery = !normalizedQuery || `${school.name} ${getSchoolChineseName(school)} ${school.shortName} ${school.region} ${school.country}`.toLocaleLowerCase().includes(normalizedQuery);
        const matchesRegion = selectedRegions.length === 0 || selectedRegions.includes(school.region);
        const schoolMajors = majorCategoriesBySchool.get(school.ipedsUnitId) ?? [];
        const matchesMajor = selectedMajors.length === 0 || selectedMajors.some((major) => schoolMajors.includes(major));
        return matchesQuery && matchesRegion && matchesMajor;
      }),
    [majorCategoriesBySchool, normalizedQuery, scopedSchools, selectedMajors, selectedRegions],
  );

  const toggleFilter = (value: string, values: string[], setValues: (nextValues: string[]) => void) => {
    setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  const resetFilters = () => {
    setQuery("");
    setSelectedRegions([]);
    setSelectedMajors([]);
  };

  const handleThemeChange = (nextTheme: ThemeMode) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event(THEME_STORAGE_EVENT));
  };

  const activeFilterCount = selectedRegions.length + selectedMajors.length + (query ? 1 : 0);
  const hasUsableTierScope = tierScope === null || activeTierScope !== null;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f5f5f7] text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <span className="absolute -top-20 left-1/4 h-96 w-96 rounded-full bg-violet-500/10 blur-[120px] dark:bg-violet-600/15" />
        <span className="absolute -bottom-24 -right-20 h-[28rem] w-[28rem] rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-600/15" />
      </div>
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onOpenProfile={() => {
          setMobileSidebarOpen(false);
          setDrawerOpen(true);
        }}
        onToggle={() => setSidebarCollapsed((currentValue) => !currentValue)}
      />
      <motion.main
        animate={{ opacity: 1, y: 0 }}
        className={`relative z-10 min-h-screen transition-[padding] duration-300 ${sidebarCollapsed ? "xl:pl-[84px]" : "xl:pl-[264px]"}`}
        initial={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        <header className="sticky top-0 z-20 border border-slate-200/80 bg-white/80 px-4 py-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-none dark:backdrop-blur-md xl:px-8">
          <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-3">
            <button
              aria-expanded={mobileSidebarOpen}
              aria-label="打开侧边栏"
              className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 hover:text-violet-700 dark:hover:bg-zinc-800 dark:hover:text-violet-200 xl:hidden"
              onClick={() => setMobileSidebarOpen(true)}
              type="button"
            >
              <SlidersHorizontal aria-hidden="true" size={19} weight="bold" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-[0.18em] text-violet-600 dark:text-violet-300">VERIFIED UNDERGRADUATE CATALOG</p>
              <p className="mt-0.5 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">全球院校库</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                aria-label={theme === "dark" ? "切换至浅色主题" : "切换至深色主题"}
                className="flex size-10 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-zinc-600 shadow-sm hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-violet-400/40 dark:hover:text-violet-200"
                onClick={() => handleThemeChange(theme === "dark" ? "light" : "dark")}
                type="button"
              >
                {theme === "dark" ? <Sun aria-hidden="true" size={18} weight="duotone" /> : <Moon aria-hidden="true" size={18} weight="duotone" />}
              </button>
              <button
                className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 text-sm font-bold text-zinc-700 hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:border-violet-400/40 dark:hover:text-violet-200 sm:inline-flex"
                onClick={() => setDrawerOpen(true)}
                type="button"
              >
                修改背景
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1680px] px-4 py-7 sm:px-6 xl:px-8">
          <section className="flex flex-col gap-5 border-b border-slate-200/80 pb-7 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Link className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 transition-transform hover:text-violet-700 active:scale-95 dark:text-blue-300 dark:hover:text-violet-200" href="/">
                <ArrowLeft aria-hidden="true" size={14} weight="bold" /> 返回申请总览
              </Link>
              <h1 className="mt-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-3xl font-black tracking-[-0.04em] text-transparent sm:text-4xl dark:from-white dark:via-zinc-200 dark:to-zinc-400">探索全球院校</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">浏览已接入的院校数据，用地区与专业条件缩小范围；每所院校均可进入完整、来源可追溯的公开数据详情。</p>
            </div>
            <p className="rounded-full border border-violet-200/60 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200">{directory.length > 0 ? `${directory.length} 所已接入院校` : "正在连接公开数据"}</p>
          </section>

          {!hasUsableTierScope && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
              先完善个人背景，才能使用 Reach / Target / Safety 候选范围；当前已展示完整院校库。
            </div>
          )}

          <div className="mt-7 grid items-start gap-5 xl:grid-cols-[272px_minmax(0,1fr)]">
            <aside className="rounded-3xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-none xl:sticky xl:top-[84px]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-extrabold text-zinc-900 dark:text-white"><Funnel aria-hidden="true" className="text-violet-600 dark:text-violet-300" size={17} weight="duotone" /> 快捷筛选</div>
                <button
                  className="text-xs font-bold text-violet-700 hover:text-violet-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-violet-300 dark:hover:text-violet-100"
                  disabled={activeFilterCount === 0}
                  onClick={resetFilters}
                  type="button"
                >
                  清除
                </button>
              </div>
              {activeTierScope && (
                <div className="mt-4 flex items-start gap-2 rounded-2xl border border-violet-200/70 bg-violet-50/70 p-3 text-xs leading-5 text-violet-800 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-100">
                  <Check aria-hidden="true" className="mt-0.5 shrink-0" size={14} weight="bold" />
                  <span>正在浏览 <strong>{tierCopy[activeTierScope].title}</strong> 候选范围。<Link className="ml-1 font-bold underline underline-offset-2" href="/catalog">查看全部</Link></span>
                </div>
              )}
              <label className="relative mt-5 block">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400"><MagnifyingGlass aria-hidden="true" size={16} /></span>
                <input
                  aria-label="搜索全球院校库"
                  className="h-10 w-full rounded-xl border border-slate-200/80 bg-slate-50/80 pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/15 dark:border-white/10 dark:bg-zinc-950/50 dark:text-white"
                  onChange={(event) => setQuery(event.target.value.slice(0, 80))}
                  placeholder="搜索校名或地区…"
                  value={query}
                />
              </label>
              <section className="mt-6">
                <h2 className="text-[11px] font-extrabold tracking-[0.15em] text-zinc-400">地区</h2>
                <div className="mt-2 space-y-1">
                  {availableRegions.map((region) => (
                    <FilterCheckbox
                      checked={selectedRegions.includes(region)}
                      count={scopedSchools.filter((school) => school.region === region).length}
                      idSuffix={`region-${region}`}
                      key={region}
                      label={region}
                      onChange={() => toggleFilter(region, selectedRegions, setSelectedRegions)}
                    />
                  ))}
                  {!isLoading && availableRegions.length === 0 && <p className="px-2.5 py-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">地区数据暂不可用。</p>}
                </div>
              </section>
              <section className="mt-6 border-t border-slate-100 pt-5 dark:border-white/5">
                <h2 className="text-[11px] font-extrabold tracking-[0.15em] text-zinc-400">专业方向</h2>
                <p className="mt-1 px-0.5 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">按已核验项目分类筛选。</p>
                <div className="mt-2 max-h-[34vh] space-y-1 overflow-y-auto pr-1">
                  {availableMajors.map((major) => (
                    <FilterCheckbox
                      checked={selectedMajors.includes(major)}
                      count={scopedSchools.filter((school) => (majorCategoriesBySchool.get(school.ipedsUnitId) ?? []).includes(major)).length}
                      idSuffix={`major-${major}`}
                      key={major}
                      label={formatMajorLabel(major)}
                      onChange={() => toggleFilter(major, selectedMajors, setSelectedMajors)}
                    />
                  ))}
                  {!isLoading && availableMajors.length === 0 && <p className="px-2.5 py-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">正在补充项目分类数据。</p>}
                </div>
              </section>
            </aside>

            <section aria-label="院校筛选结果" className="min-w-0">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold tracking-[0.16em] text-blue-600 dark:text-blue-300">DISCOVERY RESULTS</p>
                  <h2 className="mt-1 text-xl font-extrabold tracking-tight text-zinc-950 dark:text-white">{isLoading ? "正在汇总院校数据" : `找到 ${visibleSchools.length} 所院校`}</h2>
                </div>
                <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">所有数据均来源于网络公开数据；排名以对应发布机构、版本与披露范围为准。</p>
              </div>
              {isLoading ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  {[0, 1, 2, 3, 4, 5].map((index) => <div className="dashboard-shimmer h-[246px] rounded-3xl border border-slate-200/80 bg-slate-200/80 dark:border-white/10 dark:bg-zinc-900/50" key={index} />)}
                </div>
              ) : visibleSchools.length > 0 ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {visibleSchools.map((school) => (
                      <CatalogSchoolCard
                        key={school.ipedsUnitId}
                        majorCategories={majorCategoriesBySchool.get(school.ipedsUnitId) ?? []}
                        onOpen={() => setSelectedSchoolIpedsUnitId(school.ipedsUnitId)}
                        school={school}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/60 p-8 text-center shadow-sm backdrop-blur-xl dark:border-white/15 dark:bg-zinc-900/40">
                  <Funnel aria-hidden="true" className="text-violet-500" size={30} weight="duotone" />
                  <h3 className="mt-4 text-base font-extrabold text-zinc-900 dark:text-white">没有匹配的院校</h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">可调整地区、专业方向或关键词，重新查看已接入的公开院校数据。</p>
                  <button className="mt-5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 hover:border-violet-400 hover:bg-violet-100 dark:border-violet-400/25 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/20" onClick={resetFilters} type="button">清除筛选条件</button>
                </div>
              )}
            </section>
          </div>
        </div>
      </motion.main>
      <SchoolDetailModal ipedsUnitId={selectedSchoolIpedsUnitId} onClose={() => setSelectedSchoolIpedsUnitId(null)} profile={profile} />
      <ProfileDrawer
        onClose={() => setDrawerOpen(false)}
        onSaved={() => setDrawerOpen(false)}
        onThemeChange={handleThemeChange}
        open={drawerOpen}
        profile={profile}
        theme={theme}
      />
    </div>
  );
}
