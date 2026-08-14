"use client";

import {
  ArrowRight,
  CalendarBlank,
  Check,
  ClipboardText,
  Clock,
  Lightning,
  LockSimple,
  MagnifyingGlass,
  Moon,
  Plus,
  Sparkle,
  Sun,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import ApplicationTimeline from "@/components/ApplicationTimeline";
import ProfileDrawer from "@/components/ProfileDrawer";
import Sidebar from "@/components/Sidebar";
import { schoolCatalog } from "@/data/schoolCatalog";
import type { SchoolItem, SchoolMatchResult, StudentProfile } from "@/types";
import { matchSchools } from "@/utils/matchEngine";
import {
  createProfileFromPreset,
  parseSavedSchoolIds,
  parseStoredProfile,
  PROFILE_STORAGE_EVENT,
  PROFILE_STORAGE_KEY,
  SAVED_SCHOOL_IDS_STORAGE_EVENT,
  SAVED_SCHOOL_IDS_STORAGE_KEY,
  saveProfile,
  saveSavedSchoolIds,
  THEME_STORAGE_EVENT,
  THEME_STORAGE_KEY,
} from "@/utils/profileStorage";

type ThemeMode = "light" | "dark";
type MatchTiers = Record<SchoolItem["status"], SchoolMatchResult[]>;

const tierDetails: Record<SchoolItem["status"], { accent: string; description: string; title: string }> = {
  Reach: {
    title: "Reach 梦校",
    description: "高挑战 · 放大上限",
    accent:
      "border-slate-200/80 bg-white/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-violet-500/30 dark:bg-violet-950/10 dark:hover:border-violet-400/60",
  },
  Target: {
    title: "Target 匹配",
    description: "稳健匹配 · 重点投入",
    accent:
      "border-slate-200/80 bg-white/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-blue-500/30 dark:bg-blue-950/10 dark:hover:border-violet-400/60",
  },
  Safety: {
    title: "Safety 保底",
    description: "成功把握 · 风险对冲",
    accent:
      "border-slate-200/80 bg-white/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] dark:border-emerald-500/30 dark:bg-emerald-950/10 dark:hover:border-violet-400/60",
  },
};

const unlockMessages: Record<SchoolItem["status"], string> = {
  Reach: "录入背景后，自动匹配你的冲刺院校。",
  Target: "录入背景后，自动匹配你的重点申请院校。",
  Safety: "录入背景后，自动匹配你的保底院校。",
};

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

function getProfileSnapshot() {
  return window.localStorage.getItem(PROFILE_STORAGE_KEY);
}

function subscribeToSavedSchoolIds(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SAVED_SCHOOL_IDS_STORAGE_KEY) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SAVED_SCHOOL_IDS_STORAGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SAVED_SCHOOL_IDS_STORAGE_EVENT, onStoreChange);
  };
}

function getSavedSchoolIdsSnapshot() {
  return window.localStorage.getItem(SAVED_SCHOOL_IDS_STORAGE_KEY);
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

function getThemeSnapshot() {
  return window.localStorage.getItem(THEME_STORAGE_KEY);
}

function getServerSnapshot() {
  return null;
}

function getLanguageSnapshot(profile: StudentProfile) {
  const languageTest = profile.standardizedTests.find((test) =>
    ["TOEFL", "IELTS", "Duolingo English Test"].includes(test.test),
  );

  return languageTest?.score ? `${languageTest.test} ${languageTest.score}` : "语言待补充";
}

function getProfileSnapshotText(profile: StudentProfile) {
  const gpaSnapshot = profile.gpa ? `${profile.gpa} / ${profile.gpaMax || "4.0"}` : "—";
  return `${profile.currentStage || "阶段待补充"} · GPA ${gpaSnapshot} · ${getLanguageSnapshot(profile)}`;
}

function getDaysUntil(dateString: string) {
  const deadline = new Date(`${dateString}T23:59:59`);
  const difference = Math.ceil((deadline.getTime() - Date.now()) / 86_400_000);
  return Math.max(0, difference);
}

function useActionLock(cooldownMs = 3000) {
  const [isLoading, setIsLoading] = useState(false);
  const locked = useRef(false);
  const timeoutId = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timeoutId.current !== null) window.clearTimeout(timeoutId.current);
    },
    [],
  );

  const run = (action: () => void) => {
    if (locked.current) return;

    locked.current = true;
    setIsLoading(true);
    action();
    timeoutId.current = window.setTimeout(() => {
      locked.current = false;
      setIsLoading(false);
    }, cooldownMs);
  };

  return { isLoading, run };
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(timeoutId);
  }, [message, onClose]);

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="fixed bottom-5 right-5 z-[70] flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200/80 bg-white/90 px-4 py-3 shadow-2xl shadow-zinc-950/20 backdrop-blur-xl dark:border-emerald-400/25 dark:bg-zinc-900/90"
      exit={{ opacity: 0, scale: 0.96, y: 12 }}
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      role="status"
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
        <Check aria-hidden="true" size={15} weight="bold" />
      </span>
      <p className="text-sm font-semibold leading-6 text-zinc-800 dark:text-zinc-100">{message}</p>
      <button
        aria-label="关闭提示"
        className="ml-1 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-white"
        onClick={onClose}
        type="button"
      >
        ×
      </button>
    </motion.div>
  );
}

function SchoolCard({ school }: { school: SchoolMatchResult }) {
  const badgeStyle =
    school.status === "Reach"
      ? "border border-violet-200/60 bg-violet-50 text-violet-700 dark:border-0 dark:bg-violet-500/15 dark:text-violet-200"
      : school.status === "Target"
        ? "border border-violet-200/60 bg-violet-50 text-violet-700 dark:border-0 dark:bg-blue-500/15 dark:text-blue-200"
        : "border border-violet-200/60 bg-violet-50 text-violet-700 dark:border-0 dark:bg-emerald-500/15 dark:text-emerald-200";

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_10px_25px_-5px_rgba(124,58,237,0.12)] dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-sm dark:backdrop-blur-md dark:hover:border-violet-500/40 dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
          {school.shortName}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-bold text-zinc-900 dark:text-white">{school.name}</h3>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${badgeStyle}`}>约 {school.matchScore}%</span>
          </div>
          <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{school.program}</p>
          <p className="mt-2 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">{school.matchingReason}</p>
        </div>
      </div>
    </article>
  );
}

function UnlockCard({ onUnlock, onUseDefault, tier }: { onUnlock: () => void; onUseDefault: () => void; tier: SchoolItem["status"] }) {
  const details = tierDetails[tier];

  return (
    <article className="dashboard-shimmer flex min-h-[254px] flex-col rounded-2xl border border-dashed border-slate-200/80 bg-slate-200/80 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/15 dark:bg-zinc-950/35 dark:shadow-sm dark:backdrop-blur-none">
      <span className="flex size-11 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-700 shadow-sm dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200">
        <LockSimple aria-hidden="true" size={21} weight="duotone" />
      </span>
      <h3 className="mt-5 text-sm font-extrabold text-zinc-900 dark:text-white">解锁 {details.title} 选校梯度</h3>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{unlockMessages[tier]}</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <button
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
          onClick={onUnlock}
          type="button"
        >
          <Lightning aria-hidden="true" size={14} weight="fill" />
          录入学术背景
        </button>
        <button
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-bold text-zinc-700 hover:border-violet-300 hover:text-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-500/10 dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:border-violet-400/45 dark:hover:text-violet-200"
          onClick={onUseDefault}
          type="button"
        >
          <Sparkle aria-hidden="true" size={14} weight="fill" />
          一键使用默认基准
        </button>
      </div>
    </article>
  );
}

function SchoolTierBoard({
  isInitialized,
  onUnlock,
  onUseDefault,
  tiers,
}: {
  isInitialized: boolean;
  onUnlock: () => void;
  onUseDefault: () => void;
  tiers: MatchTiers | null;
}) {
  return (
    <section aria-label="动态选校梯度" className="grid gap-4 xl:grid-cols-3">
      {(Object.keys(tierDetails) as SchoolItem["status"][]).map((tier) => {
        const details = tierDetails[tier];
        const schools = tiers?.[tier] ?? [];

        return (
          <section
            className={`min-h-[370px] rounded-3xl border p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_10px_25px_-5px_rgba(124,58,237,0.12)] dark:shadow-none dark:backdrop-blur-md dark:hover:border-violet-500/40 dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.12)] ${details.accent}`}
            key={tier}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold tracking-tight text-zinc-950 dark:text-white">{details.title}</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{details.description}</p>
              </div>
              <span className="rounded-full border border-violet-200/60 bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700 dark:border-white/5 dark:bg-zinc-900/70 dark:text-zinc-300">
                {isInitialized ? `${schools.length} 所` : "待解锁"}
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {!isInitialized ? (
                <UnlockCard onUnlock={onUnlock} onUseDefault={onUseDefault} tier={tier} />
              ) : tiers ? (
                schools.length > 0 ? (
                  schools.slice(0, 2).map((school) => <SchoolCard key={school.id} school={school} />)
                ) : (
                  <p className="rounded-2xl border border-dashed border-zinc-300 bg-white/80 p-4 text-sm leading-6 text-zinc-700 shadow-sm dark:border-white/15 dark:bg-zinc-900/70 dark:text-zinc-200">
                    当前筛选条件下暂无院校，可调整目标地区或补充背景资料。
                  </p>
                )
              ) : (
                <p className="rounded-2xl border border-dashed border-zinc-300 bg-white/80 p-4 text-sm leading-6 text-zinc-700 shadow-sm dark:border-white/15 dark:bg-zinc-900/70 dark:text-zinc-200">
                  保存个人背景后，这里会基于 GPA 与语言门槛自动计算院校梯度。
                </p>
              )}
            </div>
            <button className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-violet-700 dark:text-blue-300 dark:hover:text-violet-200" type="button">
              查看全部 <ArrowRight aria-hidden="true" size={13} weight="bold" />
            </button>
          </section>
        );
      })}
    </section>
  );
}

function RecommendationCarousel({
  recommendations,
  onAdd,
  isLoading,
  refreshVersion,
  savedSchoolIds,
}: {
  recommendations: SchoolMatchResult[];
  onAdd: (school: SchoolMatchResult) => void;
  isLoading: boolean;
  refreshVersion: number;
  savedSchoolIds: Set<string>;
}) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_10px_25px_-5px_rgba(124,58,237,0.12)] dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-sm dark:backdrop-blur-md dark:hover:border-violet-500/40 dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-blue-600 dark:text-blue-300">SMART RECOMMENDATIONS</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-zinc-950 dark:text-white">热门 / AI 智能推荐</h2>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">依据你的匹配梯度优先排序</p>
      </div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 flex snap-x gap-4 overflow-x-auto pb-2"
        initial={{ opacity: 0.55, y: 4 }}
        key={refreshVersion}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        {recommendations.length > 0 ? (
          recommendations.map((school) => {
            const isAdded = savedSchoolIds.has(school.id);
            return (
              <article
                className="w-[248px] shrink-0 snap-start rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_10px_25px_-5px_rgba(124,58,237,0.12)] dark:border-white/10 dark:bg-zinc-950/40 dark:shadow-none dark:backdrop-blur-none dark:hover:border-violet-500/40 dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]"
                key={school.id}
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-800">{school.shortName}</span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-zinc-900 dark:text-white">{school.name}</h3>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{school.region}</p>
                  </div>
                </div>
                <p className="mt-4 h-9 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{school.program}</p>
                <button
                  className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white text-xs font-bold text-blue-700 hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-400/20 dark:bg-zinc-900/70 dark:text-blue-200 dark:hover:border-violet-400/45 dark:hover:bg-violet-500/10"
                  disabled={isLoading || isAdded}
                  onClick={() => onAdd(school)}
                  type="button"
                >
                  {isAdded ? <Check aria-hidden="true" size={14} weight="bold" /> : <Plus aria-hidden="true" size={14} weight="bold" />}
                  {isAdded ? "已加入选校" : isLoading ? "Loading..." : "加入选校"}
                </button>
              </article>
            );
          })
        ) : (
          <p className="dashboard-shimmer rounded-2xl border border-dashed border-slate-200/80 bg-slate-200/80 p-4 text-sm text-zinc-600 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/15 dark:bg-zinc-950/30 dark:text-zinc-300 dark:shadow-none dark:backdrop-blur-none">完善背景后，即可获得按匹配度排序的推荐院校。</p>
        )}
      </motion.div>
    </section>
  );
}

function DeadlineBanner({ schools }: { schools: SchoolMatchResult[] }) {
  const nearestSchool = [...schools].sort((first, second) => first.deadline.localeCompare(second.deadline))[0];
  const daysLeft = nearestSchool ? getDaysUntil(nearestSchool.deadline) : null;

  return (
    <article className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_10px_25px_-5px_rgba(124,58,237,0.12)] dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-sm dark:backdrop-blur-md dark:hover:border-violet-500/40 dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.12)] sm:p-7">
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200">
            <CalendarBlank aria-hidden="true" size={24} weight="duotone" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.16em] text-blue-600 dark:text-blue-300">NEXT DEADLINE</p>
            {nearestSchool ? (
              <>
                <h2 className="mt-2 truncate text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white sm:text-3xl">{nearestSchool.name}</h2>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{nearestSchool.program} · {nearestSchool.region}</p>
              </>
            ) : (
              <>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white sm:text-3xl">等待你的第一所申请院校</h2>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">保存背景后，系统会根据匹配院校突出显示最近截止日期。</p>
              </>
            )}
          </div>
        </div>
        {nearestSchool ? (
          <div className="flex shrink-0 items-center gap-5 rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/35 dark:shadow-sm dark:backdrop-blur-none">
            <div>
              <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">终轮截止</p>
              <p className="mt-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">{nearestSchool.deadline}</p>
            </div>
            <span className="h-10 w-px bg-zinc-200 dark:bg-white/10" />
            <div className="text-right">
              <p className="text-3xl font-black leading-none text-blue-600 dark:text-blue-300">{daysLeft}</p>
              <p className="mt-1 text-xs font-bold text-zinc-500 dark:text-zinc-400">天后截止</p>
            </div>
          </div>
        ) : (
          <span className="flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 dark:border-violet-400/25 dark:bg-violet-500/10 dark:text-violet-200"><Clock aria-hidden="true" size={15} weight="bold" />等待解锁</span>
        )}
      </div>
    </article>
  );
}

export default function DashboardShell() {
  const storedProfile = useSyncExternalStore(subscribeToProfile, getProfileSnapshot, getServerSnapshot);
  const storedSavedSchoolIds = useSyncExternalStore(
    subscribeToSavedSchoolIds,
    getSavedSchoolIdsSnapshot,
    getServerSnapshot,
  );
  const storedTheme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerSnapshot);
  const profile = useMemo(() => parseStoredProfile(storedProfile), [storedProfile]);
  const savedSchoolIds = useMemo(() => new Set(parseSavedSchoolIds(storedSavedSchoolIds)), [storedSavedSchoolIds]);
  const isInitialized = profile?.isInitialized === true;
  const initializedProfile = isInitialized ? profile : null;
  const theme: ThemeMode = storedTheme === "dark" ? "dark" : "light";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [drawerRequested, setDrawerRequested] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [recommendationVersion, setRecommendationVersion] = useState(0);
  const { isLoading, run } = useActionLock();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const tiers = useMemo(
    () => (initializedProfile ? matchSchools(initializedProfile, schoolCatalog) : null),
    [initializedProfile],
  );
  const searchedTiers = useMemo(() => {
    if (!tiers) return null;

    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    if (!normalizedQuery) return tiers;

    return Object.fromEntries(
      Object.entries(tiers).map(([tier, schools]) => [
        tier,
        schools.filter((school) =>
          `${school.name} ${school.program} ${school.region}`.toLocaleLowerCase().includes(normalizedQuery),
        ),
      ]),
    ) as MatchTiers;
  }, [searchQuery, tiers]);
  const recommendations = useMemo(
    () =>
      searchedTiers
        ? Object.values(searchedTiers).flat().sort((first, second) => second.matchScore - first.matchScore).slice(0, 6)
        : [],
    [searchedTiers],
  );
  const allSchools = useMemo(() => (tiers ? Object.values(tiers).flat() : []), [tiers]);
  const selectedSchools = useMemo(
    () => allSchools.filter((school) => savedSchoolIds.has(school.id)),
    [allSchools, savedSchoolIds],
  );

  const handleThemeChange = (nextTheme: ThemeMode) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event(THEME_STORAGE_EVENT));
    setToast(nextTheme === "dark" ? "已切换至深色主题" : "已切换至浅色主题");
  };

  const handleProfileSaved = () => {
    setDrawerRequested(false);
    setToast("已根据你的最新成绩重新计算选校梯度！");
  };

  const handleUseDefaultProfile = () => {
    saveProfile(createProfileFromPreset("cs-foundation"));
    setToast("已载入经典 CS 申研基准，并完成选校梯度计算！");
  };

  const handleAddSchool = (school: SchoolMatchResult) => {
    run(() => {
      saveSavedSchoolIds(new Set(savedSchoolIds).add(school.id));
      setToast(`${school.name} 已加入你的选校清单`);
    });
  };

  const handleRefreshRecommendations = () => {
    run(() => {
      setRecommendationVersion((currentVersion) => currentVersion + 1);
      setToast("已按当前背景重新计算并排序推荐院校");
    });
  };

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
          setDrawerRequested(true);
        }}
        onToggle={() => setSidebarCollapsed((currentValue) => !currentValue)}
      />
      <main className={`relative z-10 min-h-screen transition-[padding] duration-300 ${sidebarCollapsed ? "xl:pl-[84px]" : "xl:pl-[264px]"}`}>
        <header className="sticky top-0 z-20 border border-slate-200/80 bg-white/80 px-4 py-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-none dark:backdrop-blur-md xl:px-8">
          <div className="mx-auto flex max-w-[1600px] items-center gap-3">
            <button
              aria-expanded={mobileSidebarOpen}
              aria-label="打开侧边栏"
              className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 hover:text-blue-700 dark:hover:bg-zinc-800 dark:hover:text-blue-300 xl:hidden"
              onClick={() => setMobileSidebarOpen(true)}
              type="button"
            >
              <ClipboardText aria-hidden="true" size={19} weight="bold" />
            </button>
            <label className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400"><MagnifyingGlass aria-hidden="true" size={17} /></span>
              <input
                aria-label="全局搜索"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/80 pl-9 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-zinc-900/70 dark:text-white"
                onChange={(event) => setSearchQuery(event.target.value.slice(0, 80))}
                placeholder="搜索院校、项目或地区…"
                value={searchQuery}
              />
            </label>
            {profile && <p className="hidden whitespace-nowrap text-xs font-semibold text-zinc-500 2xl:block dark:text-zinc-400">{getProfileSnapshotText(profile)}</p>}
            <button
              aria-label={theme === "dark" ? "切换至浅色主题" : "切换至深色主题"}
              className="group flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:border-violet-300 hover:text-violet-700 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-violet-400/40 dark:hover:text-violet-200"
              onClick={() => handleThemeChange(theme === "dark" ? "light" : "dark")}
              type="button"
            >
              <motion.span animate={{ rotate: theme === "dark" ? 0 : 180, scale: [1, 1.12, 1] }} transition={{ duration: 0.28 }}>
                {theme === "dark" ? <Sun aria-hidden="true" size={18} weight="duotone" /> : <Moon aria-hidden="true" size={18} weight="duotone" />}
              </motion.span>
            </button>
            <button
              className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-bold focus:outline-none focus:ring-4 ${isInitialized ? "border-zinc-200 bg-white text-zinc-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:ring-blue-500/10 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:border-violet-400/40 dark:hover:bg-violet-500/10 dark:hover:text-violet-100" : "border-violet-300 bg-violet-50 text-violet-800 shadow-md shadow-violet-400/15 hover:bg-violet-100 focus:ring-violet-500/20 dark:border-violet-400/40 dark:bg-violet-500/10 dark:text-violet-100 dark:hover:bg-violet-500/20"}`}
              onClick={() => setDrawerRequested(true)}
              type="button"
            >
              {isInitialized ? <ClipboardText aria-hidden="true" size={16} weight="bold" /> : <Lightning aria-hidden="true" size={16} weight="fill" />}
              <span className="hidden sm:inline">{isInitialized ? "修改背景" : "录入学术背景"}</span>
            </button>
            <button
              aria-label="打开个人设置"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-md shadow-indigo-500/25 hover:bg-indigo-500"
              onClick={() => setDrawerRequested(true)}
              type="button"
            >
              MP
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6 xl:px-8">
          <section className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.19em] text-blue-600 dark:text-blue-300">APPLICATION INTELLIGENCE</p>
              <h1 className="mt-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-3xl font-black tracking-[-0.04em] text-transparent sm:text-4xl dark:from-white dark:via-zinc-200 dark:to-zinc-400">申请总览</h1>
              <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">由你的学术背景驱动的选校策略、申请节奏与材料进度。</p>
            </div>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-bold text-white shadow-lg shadow-zinc-950/15 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-45 dark:border dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              disabled={!isInitialized || isLoading}
              onClick={handleRefreshRecommendations}
              type="button"
            >
              <Sparkle aria-hidden="true" size={17} weight="fill" />
              {isLoading ? "Loading..." : "刷新智能推荐"}
            </button>
          </section>

          <SchoolTierBoard isInitialized={isInitialized} onUnlock={() => setDrawerRequested(true)} onUseDefault={handleUseDefaultProfile} tiers={searchedTiers} />
          <div className="mt-7"><RecommendationCarousel isLoading={isLoading} onAdd={handleAddSchool} recommendations={recommendations} refreshVersion={recommendationVersion} savedSchoolIds={savedSchoolIds} /></div>
          <div className="mt-7 space-y-4">
            <DeadlineBanner schools={allSchools} />
            <ApplicationTimeline schools={selectedSchools} />
          </div>
          <footer className="mt-9 flex items-center justify-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
            <CalendarBlank aria-hidden="true" size={14} /> 你的资料仅保存在当前浏览器，可随时修改。
          </footer>
        </div>
      </main>
      <ProfileDrawer onClose={() => setDrawerRequested(false)} onSaved={handleProfileSaved} onThemeChange={handleThemeChange} open={drawerRequested} profile={profile} theme={theme} />
      <AnimatePresence>{toast && <Toast key={toast} message={toast} onClose={() => setToast(null)} />}</AnimatePresence>
    </div>
  );
}
