"use client";

import {
  ArrowLeft,
  ArrowSquareOut,
  ArrowUpRight,
  Buildings,
  CalendarBlank,
  Check,
  FolderSimple,
  MapPin,
  Trash,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import SchoolDetailModal from "@/components/SchoolDetailModal";
import { parseSchoolDirectoryResponse } from "@/lib/undergraduateDirectory";
import type { SavedTargetSchool, SchoolDirectoryItem, SchoolItem, StudentProfile } from "@/types";
import {
  parseSavedTargetSchools,
  parseStoredProfile,
  PROFILE_STORAGE_EVENT,
  PROFILE_STORAGE_KEY,
  saveSavedTargetSchools,
  TARGET_SCHOOLS_STORAGE_EVENT,
  TARGET_SCHOOLS_STORAGE_KEY,
  THEME_STORAGE_EVENT,
  THEME_STORAGE_KEY,
} from "@/utils/profileStorage";

interface SavedTargetSchoolsPageProps {
  tier: SchoolItem["status"];
}

const tierMeta: Record<SchoolItem["status"], { eyebrow: string; title: string; description: string; accent: string }> = {
  Reach: {
    eyebrow: "REACH COLLECTION",
    title: "Reach 梦校清单",
    description: "高挑战院校，适合用来放大你的申请上限。",
    accent: "border-violet-200/80 bg-violet-50/55 dark:border-violet-400/20 dark:bg-violet-500/5",
  },
  Target: {
    eyebrow: "TARGET COLLECTION",
    title: "Target 匹配清单",
    description: "与你当前背景更稳健匹配的重点申请院校。",
    accent: "border-blue-200/80 bg-blue-50/55 dark:border-blue-400/20 dark:bg-blue-500/5",
  },
  Safety: {
    eyebrow: "SAFETY COLLECTION",
    title: "Safety 保底清单",
    description: "用于构建申请风险缓冲的保底院校。",
    accent: "border-emerald-200/80 bg-emerald-50/55 dark:border-emerald-400/20 dark:bg-emerald-500/5",
  },
};

function subscribeToTargetSchools(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === TARGET_SCHOOLS_STORAGE_KEY) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(TARGET_SCHOOLS_STORAGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(TARGET_SCHOOLS_STORAGE_EVENT, onStoreChange);
  };
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

function getServerSnapshot() {
  return null;
}

function normalizeSchoolName(name: string) {
  return name
    .toLocaleLowerCase()
    .replace(/^the\s+/, "")
    .replace(/\bat\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findDirectorySchool(directory: SchoolDirectoryItem[], school: SavedTargetSchool) {
  if (school.id.startsWith("directory-")) {
    return directory.find((item) => `directory-${item.ipedsUnitId}` === school.id) ?? null;
  }

  const normalizedSchoolName = normalizeSchoolName(school.name);
  return (
    directory.find((item) => normalizeSchoolName(item.name) === normalizedSchoolName) ??
    directory.find((item) => {
      const normalizedDirectoryName = normalizeSchoolName(item.name);
      return normalizedDirectoryName.includes(normalizedSchoolName) || normalizedSchoolName.includes(normalizedDirectoryName);
    }) ??
    null
  );
}

function formatAddedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "刚刚加入"
    : new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function TargetStatusSelect({
  school,
  onChange,
}: {
  school: SavedTargetSchool;
  onChange: (schoolId: string, status: SchoolItem["status"]) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
      分组
      <select
        aria-label={`${school.name} 的目标分组`}
        className="h-9 rounded-xl border border-slate-200/80 bg-white/80 px-2.5 text-xs font-bold text-zinc-700 outline-none transition focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/15 dark:border-white/10 dark:bg-zinc-950/45 dark:text-zinc-200"
        onChange={(event) => {
          const value = event.target.value;
          if (value === "Reach" || value === "Target" || value === "Safety") onChange(school.id, value);
        }}
        value={school.status}
      >
        <option value="Reach">Reach 梦校</option>
        <option value="Target">Target 匹配</option>
        <option value="Safety">Safety 保底</option>
      </select>
    </label>
  );
}

export default function SavedTargetSchoolsPage({ tier }: SavedTargetSchoolsPageProps) {
  const storedTargets = useSyncExternalStore(
    subscribeToTargetSchools,
    () => window.localStorage.getItem(TARGET_SCHOOLS_STORAGE_KEY),
    getServerSnapshot,
  );
  const storedProfile = useSyncExternalStore(
    subscribeToProfile,
    () => window.localStorage.getItem(PROFILE_STORAGE_KEY),
    getServerSnapshot,
  );
  const storedTheme = useSyncExternalStore(
    subscribeToTheme,
    () => window.localStorage.getItem(THEME_STORAGE_KEY),
    getServerSnapshot,
  );
  const [schoolDirectory, setSchoolDirectory] = useState<SchoolDirectoryItem[]>([]);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(true);
  const [selectedSchoolIpedsUnitId, setSelectedSchoolIpedsUnitId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const profile = useMemo<StudentProfile | null>(() => parseStoredProfile(storedProfile), [storedProfile]);
  const allSchools = useMemo(() => parseSavedTargetSchools(storedTargets), [storedTargets]);
  const tierSchools = useMemo(
    () => allSchools.filter((school) => school.status === tier).sort((first, second) => second.addedAt.localeCompare(first.addedAt)),
    [allSchools, tier],
  );
  const meta = tierMeta[tier];

  useEffect(() => {
    document.documentElement.classList.toggle("dark", storedTheme === "dark");
  }, [storedTheme]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDirectory() {
      setIsDirectoryLoading(true);
      try {
        const response = await fetch("/api/undergraduate-schools", { signal: controller.signal });
        if (!response.ok) return;

        const payload: unknown = await response.json();
        setSchoolDirectory(parseSchoolDirectoryResponse(payload));
      } catch {
        // Saved applications stay usable when the public directory is unavailable.
      } finally {
        if (!controller.signal.aborted) setIsDirectoryLoading(false);
      }
    }

    void loadDirectory();
    return () => controller.abort();
  }, []);

  const handleOpenSchool = (school: SavedTargetSchool) => {
    const directorySchool = findDirectorySchool(schoolDirectory, school);

    if (!directorySchool) {
      setNotice(isDirectoryLoading ? "正在读取该校的已核验详情数据…" : `${school.name} 的已核验详情数据正在接入`);
      return;
    }

    setSelectedSchoolIpedsUnitId(directorySchool.ipedsUnitId);
  };

  const handleStatusChange = (schoolId: string, status: SchoolItem["status"]) => {
    const school = allSchools.find((item) => item.id === schoolId);
    if (!school || school.status === status) return;

    saveSavedTargetSchools(
      allSchools.map((item) =>
        item.id === schoolId
          ? { ...item, status, userOverrideStatus: status !== item.lastAlgorithmStatus }
          : item,
      ),
    );
    setNotice(`${school.name} 已移动到 ${tierMeta[status].title}`);
  };

  const handleRemove = (school: SavedTargetSchool) => {
    saveSavedTargetSchools(allSchools.filter((item) => item.id !== school.id));
    setNotice(`${school.name} 已从目标库移除`);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f5f5f7] text-zinc-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-100">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <span className="absolute -top-20 left-1/4 h-96 w-96 rounded-full bg-violet-500/10 blur-[120px] dark:bg-violet-600/15" />
        <span className="absolute -bottom-24 -right-20 h-[28rem] w-[28rem] rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-600/15" />
      </div>

      <header className="relative z-10 sticky top-0 border-b border-slate-200/80 bg-white/80 px-4 py-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-none dark:backdrop-blur-md sm:px-7">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-3 text-sm font-bold text-zinc-700 transition-all hover:border-violet-400/50 hover:text-violet-700 active:scale-95 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-200 dark:hover:border-violet-500/40 dark:hover:text-violet-200"
            href="/"
          >
            <ArrowLeft aria-hidden="true" size={17} weight="bold" />
            返回申请总览
          </Link>
          <div className="hidden items-center gap-2 text-xs font-semibold text-zinc-500 sm:flex dark:text-zinc-400">
            <FolderSimple aria-hidden="true" className="text-violet-600 dark:text-violet-300" size={16} weight="duotone" />
            我的目标院校
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1600px] px-4 py-8 sm:px-7 lg:py-10">
        <section className={`rounded-3xl border p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:shadow-none dark:backdrop-blur-md sm:p-8 ${meta.accent}`}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-violet-700 dark:text-violet-300">{meta.eyebrow}</p>
              <h1 className="mt-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-3xl font-black tracking-[-0.04em] text-transparent sm:text-4xl dark:from-white dark:via-zinc-200 dark:to-zinc-400">{meta.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">{meta.description}</p>
            </div>
            <span className="w-fit rounded-full border border-violet-200/60 bg-violet-50 px-3 py-1.5 text-sm font-bold text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200">已添加 {tierSchools.length} 所</span>
          </div>
        </section>

        {notice && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-emerald-400/20 dark:bg-zinc-900/50 dark:text-emerald-200">
            <span className="flex items-center gap-2"><Check aria-hidden="true" size={16} weight="bold" />{notice}</span>
            <button aria-label="关闭提示" className="rounded-lg px-1 text-emerald-700 hover:bg-emerald-50 active:scale-95 dark:text-emerald-200 dark:hover:bg-emerald-500/10" onClick={() => setNotice(null)} type="button">×</button>
          </div>
        )}

        {tierSchools.length > 0 ? (
          <section aria-label={`${meta.title}中的院校`} className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tierSchools.map((school) => (
              <article className="group flex min-h-[264px] flex-col rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_10px_25px_-5px_rgba(124,58,237,0.12)] dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-sm dark:backdrop-blur-md dark:hover:border-violet-500/40 dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]" key={school.id}>
                <div className="flex items-start justify-between gap-4">
                  <button className="flex min-w-0 items-start gap-3 text-left" onClick={() => handleOpenSchool(school)} type="button">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-xs font-black text-white shadow-lg shadow-zinc-950/15 dark:bg-white dark:text-zinc-950">{school.shortName.slice(0, 4)}</span>
                    <span className="min-w-0">
                      <span className="flex items-start gap-2"><span className="truncate text-base font-extrabold text-zinc-950 transition-colors group-hover:text-violet-700 dark:text-white dark:group-hover:text-violet-200">{school.name}</span><ArrowUpRight aria-hidden="true" className="mt-1 shrink-0 text-violet-500 opacity-0 transition-opacity group-hover:opacity-100" size={15} weight="bold" /></span>
                      <span className="mt-1 block truncate text-sm text-zinc-500 dark:text-zinc-400">{school.program}</span>
                    </span>
                  </button>
                  <button aria-label={`从目标库移除 ${school.name}`} className="flex size-9 shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:bg-rose-50 hover:text-rose-600 active:scale-95 dark:hover:bg-rose-500/10 dark:hover:text-rose-300" onClick={() => handleRemove(school)} type="button"><Trash aria-hidden="true" size={17} weight="bold" /></button>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50/80 px-2.5 py-1.5 dark:border-white/10 dark:bg-zinc-950/45"><MapPin aria-hidden="true" className="text-violet-600 dark:text-violet-300" size={14} weight="fill" />{school.region}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50/80 px-2.5 py-1.5 dark:border-white/10 dark:bg-zinc-950/45"><CalendarBlank aria-hidden="true" className="text-violet-600 dark:text-violet-300" size={14} weight="duotone" />加入于 {formatAddedDate(school.addedAt)}</span>
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-4 dark:border-white/10">
                  <TargetStatusSelect onChange={handleStatusChange} school={school} />
                  <button className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs font-bold text-violet-700 transition-all hover:border-violet-400 hover:bg-violet-100 active:scale-95 dark:border-violet-400/25 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:border-violet-400/50 dark:hover:bg-violet-500/15" onClick={() => handleOpenSchool(school)} type="button">
                    查看数据 <ArrowSquareOut aria-hidden="true" size={14} weight="bold" />
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className="mt-6 flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200/80 bg-white/80 p-8 text-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-none">
            <Buildings aria-hidden="true" className="text-violet-600 dark:text-violet-300" size={34} weight="duotone" />
            <h2 className="mt-4 text-xl font-extrabold text-zinc-950 dark:text-white">这个分组还没有已添加院校</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500 dark:text-zinc-400">回到申请总览，从智能推荐或候选院校库中加入学校；系统会按照你的匹配梯度分配到对应分组。</p>
            <Link className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-bold text-white transition-transform hover:bg-zinc-800 active:scale-95 dark:border dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800" href="/">
              <ArrowLeft aria-hidden="true" size={16} weight="bold" />返回申请总览
            </Link>
          </section>
        )}
      </main>

      <SchoolDetailModal ipedsUnitId={selectedSchoolIpedsUnitId} onClose={() => setSelectedSchoolIpedsUnitId(null)} profile={profile} />
    </div>
  );
}
