"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { schoolCatalog } from "@/data/schoolCatalog";
import type { SchoolItem, SchoolMatchResult, StudentProfile } from "@/types";
import { matchSchools } from "@/utils/matchEngine";
import {
  createProfileFromPreset,
  parseStoredProfile,
  PROFILE_STORAGE_EVENT,
  PROFILE_STORAGE_KEY,
  saveProfile,
  THEME_STORAGE_EVENT,
  THEME_STORAGE_KEY,
} from "@/utils/profileStorage";
import ProfileDrawer from "@/components/ProfileDrawer";
import Sidebar from "@/components/Sidebar";

type ThemeMode = "light" | "dark";
type MatchTiers = Record<SchoolItem["status"], SchoolMatchResult[]>;

const tierDetails: Record<SchoolItem["status"], { accent: string; description: string; title: string }> = {
  Reach: {
    title: "Reach 梦校",
    description: "高挑战 · 放大上限",
    accent: "border-violet-200 bg-violet-50/70 dark:border-violet-900/70 dark:bg-violet-950/20",
  },
  Target: {
    title: "Target 匹配",
    description: "稳健匹配 · 重点投入",
    accent: "border-blue-200 bg-blue-50/70 dark:border-blue-900/70 dark:bg-blue-950/20",
  },
  Safety: {
    title: "Safety 保底",
    description: "成功把握 · 风险对冲",
    accent: "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/20",
  },
};

const unlockMessages: Record<SchoolItem["status"], string> = {
  Reach: "录入背景后，自动匹配你的冲刺院校。",
  Target: "录入背景后，自动匹配你的重点申请院校。",
  Safety: "录入背景后，自动匹配你的保底院校。",
};

function subscribeToProfile(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === PROFILE_STORAGE_KEY) {
      onStoreChange();
    }
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

function subscribeToTheme(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      onStoreChange();
    }
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
  return `${profile.currentStage || "阶段待补充"} | GPA ${gpaSnapshot} | ${getLanguageSnapshot(profile)}`;
}

function getDaysUntil(dateString: string) {
  const deadline = new Date(`${dateString}T23:59:59`);
  const currentTime = new Date();
  const difference = Math.ceil((deadline.getTime() - currentTime.getTime()) / 86_400_000);

  return Math.max(0, difference);
}

function useActionLock(cooldownMs = 3000) {
  const [isLoading, setIsLoading] = useState(false);
  const locked = useRef(false);
  const timeoutId = useRef<number | null>(null);

  useEffect(() => () => {
    if (timeoutId.current !== null) {
      window.clearTimeout(timeoutId.current);
    }
  }, []);

  const run = (action: () => void) => {
    if (locked.current) {
      return;
    }

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
  return (
    <div className="fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-2xl shadow-slate-900/15 dark:border-emerald-900 dark:bg-slate-900">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">✓</span>
      <p className="text-sm font-semibold leading-6 text-slate-800 dark:text-slate-100">{message}</p>
      <button aria-label="关闭提示" className="ml-1 text-slate-400 transition hover:text-slate-700 dark:hover:text-white" onClick={onClose} type="button">×</button>
    </div>
  );
}

function SchoolCard({ school }: { school: SchoolMatchResult }) {
  const badgeStyle =
    school.status === "Reach"
      ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
      : school.status === "Target"
        ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";

  return (
    <article className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white dark:bg-slate-700">{school.shortName}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{school.name}</h3>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${badgeStyle}`}>约 {school.matchScore}%</span>
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">{school.program}</p>
          <p className="mt-2 text-[11px] leading-4 text-slate-500">{school.matchingReason}</p>
        </div>
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
          <section className={`min-h-[320px] rounded-3xl border p-4 ${details.accent}`} key={tier}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">{details.title}</h2>
                <p className="mt-1 text-xs text-slate-500">{details.description}</p>
              </div>
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">{isInitialized ? `${schools.length} 所` : "待解锁"}</span>
            </div>
            <div className="mt-4 space-y-3">
              {!isInitialized ? (
                <article className="rounded-2xl border border-dashed border-blue-300 bg-white/75 p-5 shadow-sm dark:border-blue-700 dark:bg-slate-950/75">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-lg text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">🔒</span>
                  <h3 className="mt-4 text-sm font-extrabold text-slate-900 dark:text-white">解锁 {details.title} 选校梯度</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{unlockMessages[tier]}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20" onClick={onUnlock} type="button">⚡️ 录入学术背景</button>
                    <button className="inline-flex h-9 items-center justify-center rounded-xl border border-blue-200 bg-white px-3 text-xs font-bold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-blue-950" onClick={onUseDefault} type="button">💡 一键使用默认基准</button>
                  </div>
                </article>
              ) : tiers ? (
                schools.length > 0 ? schools.slice(0, 2).map((school) => <SchoolCard key={school.id} school={school} />) : <p className="rounded-2xl border border-dashed border-slate-300 bg-white/85 p-4 text-sm leading-6 text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-950/85 dark:text-slate-200">当前筛选条件下暂无院校，可调整目标地区或补充背景资料。</p>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/85 p-5 text-sm leading-6 text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-950/85 dark:text-slate-200">保存个人背景后，这里会基于 GPA 与语言门槛自动计算院校梯度。</div>
              )}
            </div>
            <button className="mt-4 inline-flex text-xs font-bold text-blue-700 transition hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-200" type="button">查看全部 &gt;</button>
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
  savedSchoolIds,
}: {
  recommendations: SchoolMatchResult[];
  onAdd: (school: SchoolMatchResult) => void;
  isLoading: boolean;
  savedSchoolIds: Set<string>;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-blue-600">SMART RECOMMENDATIONS</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950 dark:text-white">热门 / AI 智能推荐</h2>
        </div>
        <p className="text-sm text-slate-500">依据你的匹配梯度优先排序</p>
      </div>
      <div className="mt-5 flex snap-x gap-4 overflow-x-auto pb-2">
        {recommendations.length > 0 ? recommendations.map((school) => {
          const isAdded = savedSchoolIds.has(school.id);
          return (
            <article className="w-[248px] shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900" key={school.id}>
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-xs font-bold text-white">{school.shortName}</span>
                <div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{school.name}</h3><p className="mt-1 text-xs text-slate-500">{school.region}</p></div>
              </div>
              <p className="mt-4 h-9 text-xs leading-5 text-slate-500">{school.program}</p>
              <button className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-xl border border-blue-200 bg-white text-xs font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900 dark:bg-slate-950 dark:text-blue-300" disabled={isLoading || isAdded} onClick={() => onAdd(school)} type="button">{isAdded ? "✓ 已加入选校" : isLoading ? "Loading..." : "+ 加入选校"}</button>
            </article>
          );
        }) : <p className="py-6 text-sm text-slate-500">完善背景后，即可获得按匹配度排序的推荐院校。</p>}
      </div>
    </section>
  );
}

function DeadlineChecklist({ schools }: { schools: SchoolMatchResult[] }) {
  const nearestSchool = [...schools].sort((first, second) => first.deadline.localeCompare(second.deadline))[0];
  const daysLeft = nearestSchool ? getDaysUntil(nearestSchool.deadline) : null;
  const checklist = [
    ["准备成绩单与在读证明", true],
    ["完成个人陈述初稿", false],
    ["确认推荐信提交状态", false],
  ] as const;

  return (
    <section className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
      <article className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-900/15 dark:bg-slate-900">
        <p className="text-xs font-bold tracking-[0.16em] text-blue-300">NEXT DEADLINE</p>
        {nearestSchool ? (
          <>
            <div className="mt-4 flex items-end justify-between gap-4"><div><h2 className="text-2xl font-extrabold">{nearestSchool.name}</h2><p className="mt-2 text-sm text-slate-300">{nearestSchool.program}</p></div><div className="text-right"><span className="text-4xl font-black text-blue-300">{daysLeft}</span><p className="mt-1 text-xs font-bold text-slate-400">天后截止</p></div></div>
            <p className="mt-5 border-t border-white/10 pt-4 text-sm text-slate-300">截止日期：{nearestSchool.deadline}</p>
          </>
        ) : <p className="mt-4 text-sm leading-6 text-slate-300">保存背景后，将根据匹配院校展示最近申请截止日期。</p>}
      </article>
      <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-xs font-bold tracking-[0.16em] text-blue-600">MATERIAL CHECKLIST</p>
        <h2 className="mt-1 text-xl font-extrabold text-slate-950 dark:text-white">材料准备清单</h2>
        <ul className="mt-4 space-y-3">
          {checklist.map(([item, complete]) => <li className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300" key={item}><span className={`flex size-5 items-center justify-center rounded-full text-xs ${complete ? "bg-emerald-500 text-white" : "border border-slate-300 text-transparent dark:border-slate-600"}`}>✓</span>{item}</li>)}
        </ul>
      </article>
    </section>
  );
}

export default function DashboardShell() {
  const storedProfile = useSyncExternalStore(subscribeToProfile, getProfileSnapshot, getServerSnapshot);
  const storedTheme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerSnapshot);
  const profile = useMemo(() => parseStoredProfile(storedProfile), [storedProfile]);
  const isInitialized = profile !== null;
  const theme: ThemeMode = storedTheme === "dark" ? "dark" : "light";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [drawerRequested, setDrawerRequested] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [savedSchoolIds, setSavedSchoolIds] = useState<Set<string>>(new Set());
  const { isLoading, run } = useActionLock();
  const drawerOpen = drawerRequested;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const tiers = useMemo(() => profile ? matchSchools(profile, schoolCatalog) : null, [profile]);
  const searchedTiers = useMemo(() => {
    if (!tiers) {
      return null;
    }

    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
      return tiers;
    }

    return Object.fromEntries(
      Object.entries(tiers).map(([tier, schools]) => [
        tier,
        schools.filter((school) => `${school.name} ${school.program} ${school.region}`.toLocaleLowerCase().includes(normalizedQuery)),
      ]),
    ) as MatchTiers;
  }, [searchQuery, tiers]);
  const recommendations = useMemo(() => searchedTiers ? Object.values(searchedTiers).flat().sort((first, second) => second.matchScore - first.matchScore).slice(0, 6) : [], [searchedTiers]);
  const allSchools = useMemo(() => tiers ? Object.values(tiers).flat() : [], [tiers]);

  const handleThemeChange = (nextTheme: ThemeMode) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event(THEME_STORAGE_EVENT));
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
      setSavedSchoolIds((currentIds) => new Set(currentIds).add(school.id));
      setToast(`${school.name} 已加入你的选校清单`);
    });
  };

  const handleRefreshRecommendations = () => {
    run(() => setToast("推荐已按当前背景重新排序"));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
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
      <main className={`min-h-screen transition-[padding] duration-300 ${sidebarCollapsed ? "xl:pl-[84px]" : "xl:pl-[264px]"}`}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur xl:px-8 dark:border-slate-800 dark:bg-slate-950/85">
          <div className="mx-auto flex max-w-[1600px] items-center gap-3">
            <button aria-label="打开侧边栏" aria-expanded={mobileSidebarOpen} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-700 dark:hover:bg-slate-800 dark:hover:text-blue-300 xl:hidden" onClick={() => setMobileSidebarOpen(true)} type="button">☰</button>
            <div className="relative min-w-0 flex-1"><span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">⌕</span><input aria-label="全局搜索" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white" onChange={(event) => setSearchQuery(event.target.value.slice(0, 80))} placeholder="搜索院校、项目或地区…" value={searchQuery} /></div>
            {profile && <p className="hidden whitespace-nowrap text-xs font-semibold text-slate-500 2xl:block">{getProfileSnapshotText(profile)}</p>}
            <button className={`inline-flex h-10 shrink-0 items-center rounded-xl border px-3 text-sm font-bold transition focus:outline-none focus:ring-4 ${isInitialized ? "border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:ring-blue-500/10 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800" : "animate-pulse border-amber-300 bg-amber-50 text-amber-900 shadow-md shadow-amber-400/20 hover:bg-amber-100 focus:ring-amber-400/30 dark:border-amber-500/70 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-950"}`} onClick={() => setDrawerRequested(true)} type="button">{isInitialized ? "✏️ 修改背景" : "⚡️ 录入学术背景"}</button>
            <button aria-label="打开个人设置" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 text-xs font-bold text-white" onClick={() => setDrawerRequested(true)} type="button">MP</button>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6 xl:px-8">
          {!isInitialized && <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200"><span><strong>选校看板已就绪。</strong>录入学术背景后即可解锁个性化匹配与申请梯度。</span><button className="font-bold underline underline-offset-4" onClick={() => setDrawerRequested(true)} type="button">立即解锁</button></div>}

          <section className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-xs font-bold tracking-[0.16em] text-blue-600">APPLICATION INTELLIGENCE</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">申请仪表盘</h1><p className="mt-2 text-sm leading-6 text-slate-500">由你的学术背景驱动的选校策略、申请节奏与材料进度。</p></div>
            <button className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500" disabled={!isInitialized || isLoading} onClick={handleRefreshRecommendations} type="button">{isLoading ? "Loading..." : "✦ 刷新智能推荐"}</button>
          </section>

          <SchoolTierBoard isInitialized={isInitialized} onUnlock={() => setDrawerRequested(true)} onUseDefault={handleUseDefaultProfile} tiers={searchedTiers} />
          <div className="mt-7"><RecommendationCarousel isLoading={isLoading} onAdd={handleAddSchool} recommendations={recommendations} savedSchoolIds={savedSchoolIds} /></div>
          <div className="mt-7"><DeadlineChecklist schools={allSchools} /></div>
        </div>
      </main>
      <ProfileDrawer onClose={() => setDrawerRequested(false)} onSaved={handleProfileSaved} onThemeChange={handleThemeChange} open={drawerOpen} profile={profile} theme={theme} />
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
