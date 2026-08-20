"use client";

import {
  ArrowRight,
  ArrowsClockwise,
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
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import ApplicationTimeline from "@/components/ApplicationTimeline";
import ProfileDrawer from "@/components/ProfileDrawer";
import SchoolDetailModal from "@/components/SchoolDetailModal";
import SchoolLogo from "@/components/SchoolLogo";
import SchoolSearchDropdown from "@/components/SchoolSearchDropdown";
import Sidebar from "@/components/Sidebar";
import { schoolCatalog } from "@/data/schoolCatalog";
import { getInstitutionIdFromTargetId, getSchoolChineseName } from "@/data/schoolIdentity";
import type { SavedTargetSchool, SchoolDirectoryItem, SchoolItem, SchoolMatchInput, SchoolMatchResult, StudentProfile } from "@/types";
import { buildDirectorySchoolTiers, getDirectoryTierCount, type DirectorySchoolTiers } from "@/utils/directoryTierEngine";
import { matchSchools } from "@/utils/matchEngine";
import { parseSchoolDirectoryResponse } from "@/lib/undergraduateDirectory";
import { parseUndergraduateCatalog } from "@/lib/undergraduateCatalog";
import {
  createProfileFromPreset,
  parseSavedSchoolIds,
  parseSavedTargetSchools,
  parseStoredProfile,
  PROFILE_STORAGE_EVENT,
  PROFILE_STORAGE_KEY,
  SAVED_SCHOOL_IDS_STORAGE_EVENT,
  SAVED_SCHOOL_IDS_STORAGE_KEY,
  saveProfile,
  saveSavedSchoolIds,
  saveSavedTargetSchools,
  THEME_STORAGE_EVENT,
  THEME_STORAGE_KEY,
  TARGET_SCHOOLS_STORAGE_EVENT,
  TARGET_SCHOOLS_STORAGE_KEY,
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

function getTargetSchoolsSnapshot() {
  return window.localStorage.getItem(TARGET_SCHOOLS_STORAGE_KEY);
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

function hasConfirmedDeadline(deadline: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(deadline);
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

function findDirectorySchoolByName(schools: SchoolDirectoryItem[], schoolName: string) {
  const normalizedSchoolName = normalizeSchoolName(schoolName);

  return (
    schools.find((school) => normalizeSchoolName(school.name) === normalizedSchoolName) ??
    schools.find((school) => {
      const normalizedDirectoryName = normalizeSchoolName(school.name);
      return normalizedDirectoryName.includes(normalizedSchoolName) || normalizedSchoolName.includes(normalizedDirectoryName);
    }) ??
    null
  );
}

function takeRecommendationBatch<T>(items: readonly T[], batch: number, batchSize: number): T[] {
  if (items.length === 0) return [];

  const normalizedBatch = ((batch % Math.ceil(items.length / batchSize)) + Math.ceil(items.length / batchSize)) % Math.ceil(items.length / batchSize);
  const start = normalizedBatch * batchSize;
  return items.slice(start, start + batchSize);
}

function createSavedTargetSchool(school: SchoolMatchResult, addedAt = new Date().toISOString()): SavedTargetSchool {
  return {
    addedAt,
    deadline: school.deadline,
    id: school.id,
    lastAlgorithmStatus: school.status,
    name: school.name,
    notes: school.notes,
    officialWebsite: undefined,
    program: school.program,
    region: school.region,
    shortName: school.shortName,
    status: school.status,
    userOverrideStatus: false,
  };
}

function createSavedTargetSchoolFromDirectory(
  school: SchoolDirectoryItem,
  status: SchoolItem["status"],
  addedAt = new Date().toISOString(),
): SavedTargetSchool {
  return {
    addedAt,
    deadline: "",
    id: `directory-${school.ipedsUnitId}`,
    lastAlgorithmStatus: status,
    name: school.name,
    notes: "来自已核验的官方 / 政府公开院校数据。",
    officialWebsite: school.officialWebsite,
    program: "本科申请方向待确认",
    region: school.region,
    shortName: school.shortName,
    status,
    userOverrideStatus: false,
  };
}

function parseTargetStatus(value: string): SchoolItem["status"] | null {
  return value === "Reach" || value === "Target" || value === "Safety" ? value : null;
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

function TargetSchoolCard({
  onOpenSchool,
  onRemove,
  onStatusChange,
  school,
}: {
  onOpenSchool: (school: SavedTargetSchool) => void;
  onRemove: (schoolId: string) => void;
  onStatusChange: (schoolId: string, status: SchoolItem["status"]) => void;
  school: SavedTargetSchool;
}) {
  return (
    <article
      className="cursor-pointer rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_10px_25px_-5px_rgba(124,58,237,0.12)] dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-sm dark:backdrop-blur-md dark:hover:border-violet-500/40 dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]"
      onClick={() => onOpenSchool(school)}
    >
      <div className="flex items-start gap-3">
        <SchoolLogo
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          school={{ ipedsUnitId: getInstitutionIdFromTargetId(school.id), name: school.name, officialWebsite: school.officialWebsite, shortName: school.shortName }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate text-sm font-bold text-zinc-900 dark:text-white">
              <button
                aria-label={`查看 ${school.name} 的学校数据`}
                className="max-w-full truncate text-left outline-none hover:text-violet-700 focus-visible:text-violet-700 dark:hover:text-violet-200 dark:focus-visible:text-violet-200"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenSchool(school);
                }}
                type="button"
              >
                {school.name}
              </button>
            </h3>
            <button
              aria-label={`从目标库移除 ${school.name}`}
              className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-rose-600 active:scale-95 dark:hover:bg-zinc-800 dark:hover:text-rose-300"
              onClick={(event) => {
                event.stopPropagation();
                onRemove(school.id);
              }}
              type="button"
            >
              <X aria-hidden="true" size={15} weight="bold" />
            </button>
          </div>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-violet-700 dark:text-violet-200">{getSchoolChineseName({ ipedsUnitId: getInstitutionIdFromTargetId(school.id), name: school.name })}</p>
          <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{school.program}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <select
              aria-label={`${school.name} 的目标分组`}
              className="h-8 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-zinc-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15 dark:border-white/10 dark:bg-zinc-950/50 dark:text-zinc-200"
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                const nextStatus = parseTargetStatus(event.target.value);
                if (nextStatus) onStatusChange(school.id, nextStatus);
              }}
              value={school.status}
            >
              <option value="Reach">Reach 梦校</option>
              <option value="Target">Target 匹配</option>
              <option value="Safety">Safety 保底</option>
            </select>
            <span className="truncate text-[10px] text-zinc-400 dark:text-zinc-500">
              {school.userOverrideStatus ? `已锁定 · 算法建议 ${school.lastAlgorithmStatus}` : `算法建议 ${school.lastAlgorithmStatus}`}
            </span>
          </div>
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
  directoryTotal,
  directoryTiers,
  isInitialized,
  onOpenDirectory,
  onOpenSchool,
  onRemoveTarget,
  onSetTargetStatus,
  onUnlock,
  onUseDefault,
  targetSchools,
}: {
  directoryTotal: number;
  directoryTiers: DirectorySchoolTiers;
  isInitialized: boolean;
  onOpenDirectory: (tier: SchoolItem["status"] | null) => void;
  onOpenSchool: (school: SavedTargetSchool) => void;
  onRemoveTarget: (schoolId: string) => void;
  onSetTargetStatus: (schoolId: string, status: SchoolItem["status"]) => void;
  onUnlock: () => void;
  onUseDefault: () => void;
  targetSchools: SavedTargetSchool[];
}) {
  const previewLimit = 2;

  return (
    <section aria-label="动态选校梯度" className="grid gap-4 xl:grid-cols-3">
      {(Object.keys(tierDetails) as SchoolItem["status"][]).map((tier) => {
        const details = tierDetails[tier];
        const directorySchoolCount = directoryTiers[tier].length;
        const schools = targetSchools.filter((school) => school.status === tier);
        const previewSchools = schools.slice(0, previewLimit);
        const hasMoreSavedSchools = schools.length > previewLimit;

        return (
          <section
            className={`flex h-[420px] flex-col overflow-hidden rounded-3xl border p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_10px_25px_-5px_rgba(124,58,237,0.12)] dark:shadow-none dark:backdrop-blur-md dark:hover:border-violet-500/40 dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.12)] ${details.accent}`}
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
            <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-hidden">
              {!isInitialized ? (
                <UnlockCard onUnlock={onUnlock} onUseDefault={onUseDefault} tier={tier} />
              ) : schools.length > 0 ? (
                previewSchools.map((school) => (
                  <TargetSchoolCard
                    key={school.id}
                    onOpenSchool={onOpenSchool}
                    onRemove={onRemoveTarget}
                    onStatusChange={onSetTargetStatus}
                    school={school}
                  />
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-zinc-300 bg-white/80 p-4 text-sm leading-6 text-zinc-700 shadow-sm dark:border-white/15 dark:bg-zinc-900/70 dark:text-zinc-200">
                  从智能推荐或院校库加入学校后，它会在这里成为你的申请目标。
                </p>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
              {isInitialized && hasMoreSavedSchools && (
                <Link
                  className="inline-flex w-fit items-center gap-1 text-xs font-bold text-blue-700 transition-transform hover:text-violet-700 active:scale-95 dark:text-blue-300 dark:hover:text-violet-200"
                  href={`/target-schools/${tier.toLocaleLowerCase()}`}
                >
                  浏览更多已添加 · {schools.length} 所 <ArrowRight aria-hidden="true" size={13} weight="bold" />
                </Link>
              )}
              <button
                className="inline-flex w-fit items-center gap-1 text-xs font-bold text-blue-700 transition-transform hover:text-violet-700 active:scale-95 dark:text-blue-300 dark:hover:text-violet-200"
                onClick={() => onOpenDirectory(isInitialized ? tier : null)}
                type="button"
              >
                {isInitialized
                  ? `浏览候选 · ${directorySchoolCount}/${directoryTotal} 所`
                  : "浏览院校库"} <ArrowRight aria-hidden="true" size={13} weight="bold" />
              </button>
            </div>
          </section>
        );
      })}
    </section>
  );
}

function MatchedRecommendationCard({
  isLoading,
  isSaved,
  onAdd,
  onOpenSchool,
  school,
}: {
  isLoading: boolean;
  isSaved: boolean;
  onAdd: (school: SchoolMatchResult) => void;
  onOpenSchool?: () => void;
  school: SchoolMatchResult;
}) {
  return (
    <article
      className={`w-[248px] shrink-0 snap-start rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_10px_25px_-5px_rgba(124,58,237,0.12)] dark:border-white/10 dark:bg-zinc-950/40 dark:shadow-none dark:backdrop-blur-none dark:hover:border-violet-500/40 dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.12)] ${onOpenSchool ? "cursor-pointer" : ""}`}
      onClick={onOpenSchool}
    >
      <div className="flex items-center gap-3">
        <SchoolLogo className="flex size-10 items-center justify-center rounded-xl bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-800" school={school} />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-zinc-900 dark:text-white">{school.name}</h3>
          <p className="mt-1 truncate text-xs font-semibold text-violet-700 dark:text-violet-200">{getSchoolChineseName(school)}</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{school.region}</p>
        </div>
      </div>
      <p className="mt-4 h-9 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{school.program}</p>
      <button
        className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white text-xs font-bold text-blue-700 transition-transform hover:border-blue-400 hover:bg-blue-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-400/20 dark:bg-zinc-900/70 dark:text-blue-200 dark:hover:border-violet-400/45 dark:hover:bg-violet-500/10"
        disabled={isLoading || isSaved}
        onClick={(event) => {
          event.stopPropagation();
          onAdd(school);
        }}
        type="button"
      >
        {isSaved ? <Check aria-hidden="true" size={14} weight="bold" /> : <Plus aria-hidden="true" size={14} weight="bold" />}
        {isSaved ? "已加入选校" : isLoading ? "Loading..." : "加入选校"}
      </button>
    </article>
  );
}

function DirectoryRecommendationCard({
  isLoading,
  isSaved,
  onAdd,
  onOpenSchool,
  school,
}: {
  isLoading: boolean;
  isSaved: boolean;
  onAdd: (school: SchoolDirectoryItem) => void;
  onOpenSchool: () => void;
  school: SchoolDirectoryItem;
}) {
  return (
    <article
      className="w-[248px] shrink-0 snap-start cursor-pointer rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_10px_25px_-5px_rgba(124,58,237,0.12)] dark:border-white/10 dark:bg-zinc-950/40 dark:shadow-none dark:backdrop-blur-none dark:hover:border-violet-500/40 dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]"
      onClick={onOpenSchool}
    >
      <div className="flex items-center gap-3">
        <SchoolLogo className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-xs font-bold text-violet-700 dark:bg-violet-500/10 dark:text-violet-200" school={school} />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-zinc-900 dark:text-white">{school.name}</h3>
          <p className="mt-1 truncate text-xs font-semibold text-violet-700 dark:text-violet-200">{getSchoolChineseName(school)}</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{school.region}</p>
        </div>
      </div>
      <p className="mt-4 h-9 text-xs leading-5 text-zinc-500 dark:text-zinc-400">已接入官方 / 政府公开数据，可查看学费、录取率与成绩区间。</p>
      <button
        className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 text-xs font-bold text-violet-700 transition-transform hover:border-violet-400 hover:bg-violet-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-400/25 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:border-violet-400/50 dark:hover:bg-violet-500/15"
        disabled={isLoading || isSaved}
        onClick={(event) => {
          event.stopPropagation();
          onAdd(school);
        }}
        type="button"
      >
        {isSaved ? <Check aria-hidden="true" size={14} weight="bold" /> : <Plus aria-hidden="true" size={14} weight="bold" />}
        {isSaved ? "已加入选校" : isLoading ? "Loading..." : "加入选校"}
      </button>
    </article>
  );
}

function RecommendationCarousel({
  directorySuggestions,
  schoolDirectory,
  recommendations,
  onAdd,
  onAddDirectorySchool,
  onOpenSchool,
  onRefresh,
  isLoading,
  refreshVersion,
  savedSchoolIds,
  showDirectoryFirst,
}: {
  directorySuggestions: SchoolDirectoryItem[];
  schoolDirectory: SchoolDirectoryItem[];
  recommendations: SchoolMatchResult[];
  onAdd: (school: SchoolMatchResult) => void;
  onAddDirectorySchool: (school: SchoolDirectoryItem) => void;
  onOpenSchool: (school: SchoolDirectoryItem) => void;
  onRefresh: () => void;
  isLoading: boolean;
  refreshVersion: number;
  savedSchoolIds: Set<string>;
  showDirectoryFirst: boolean;
}) {
  const matchingCards = recommendations.filter((school) => !savedSchoolIds.has(school.id)).map((school) => (
    <MatchedRecommendationCard
      isLoading={isLoading}
      isSaved={savedSchoolIds.has(school.id)}
      key={school.id}
      onAdd={onAdd}
      onOpenSchool={(() => {
        const directorySchool = findDirectorySchoolByName(schoolDirectory, school.name);
        return directorySchool ? () => onOpenSchool(directorySchool) : undefined;
      })()}
      school={school}
    />
  ));
  const directoryCards = directorySuggestions.filter((school) => !savedSchoolIds.has(`directory-${school.ipedsUnitId}`)).map((school) => (
    <DirectoryRecommendationCard
      isLoading={isLoading}
      isSaved={savedSchoolIds.has(`directory-${school.ipedsUnitId}`)}
      key={`directory-${school.ipedsUnitId}`}
      onAdd={onAddDirectorySchool}
      onOpenSchool={() => onOpenSchool(school)}
      school={school}
    />
  ));

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-violet-400/50 hover:shadow-[0_10px_25px_-5px_rgba(124,58,237,0.12)] dark:border-white/10 dark:bg-zinc-900/50 dark:shadow-sm dark:backdrop-blur-md dark:hover:border-violet-500/40 dark:hover:shadow-[0_0_20px_rgba(139,92,246,0.12)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-blue-600 dark:text-blue-300">SMART RECOMMENDATIONS</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-zinc-950 dark:text-white">热门 / AI 智能推荐</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-3 text-xs font-bold text-zinc-700 transition-all hover:border-violet-400/50 hover:text-violet-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900/60 dark:text-zinc-200 dark:hover:border-violet-400/45 dark:hover:text-violet-100"
            disabled={isLoading}
            onClick={onRefresh}
            type="button"
          >
            <ArrowsClockwise aria-hidden="true" className={isLoading ? "animate-spin" : ""} size={15} weight="bold" />
            {isLoading ? "刷新中…" : "换一批"}
          </button>
        </div>
      </div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mt-5 flex snap-x gap-4 overflow-x-auto pb-2"
        initial={{ opacity: 0.55, y: 4 }}
        key={refreshVersion}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        {matchingCards.length > 0 || directoryCards.length > 0 ? (
          showDirectoryFirst ? <>{directoryCards}{matchingCards}</> : <>{matchingCards}{directoryCards}</>
        ) : (
          <p className="dashboard-shimmer rounded-2xl border border-dashed border-slate-200/80 bg-slate-200/80 p-4 text-sm text-zinc-600 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/15 dark:bg-zinc-950/30 dark:text-zinc-300 dark:shadow-none dark:backdrop-blur-none">完善背景后，即可获得按匹配度排序的推荐院校。</p>
        )}
      </motion.div>
    </section>
  );
}

function DeadlineBanner({ schools }: { schools: SavedTargetSchool[] }) {
  const schoolsWithConfirmedDeadlines = schools.filter((school) => hasConfirmedDeadline(school.deadline));
  const nearestSchool = [...schoolsWithConfirmedDeadlines].sort((first, second) => first.deadline.localeCompare(second.deadline))[0];
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
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white sm:text-3xl">{schools.length > 0 ? "目标院校的截止日期待确认" : "等待你的第一所申请院校"}</h2>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{schools.length > 0 ? "已加入院校，待接入项目级官方截止日期后将在这里提示。" : "保存背景后，系统会根据匹配院校突出显示最近截止日期。"}</p>
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
  const storedLegacySavedSchoolIds = useSyncExternalStore(
    subscribeToSavedSchoolIds,
    getSavedSchoolIdsSnapshot,
    getServerSnapshot,
  );
  const storedTargetSchools = useSyncExternalStore(
    subscribeToTargetSchools,
    getTargetSchoolsSnapshot,
    getServerSnapshot,
  );
  const storedTheme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerSnapshot);
  const profile = useMemo(() => parseStoredProfile(storedProfile), [storedProfile]);
  const legacySavedSchoolIds = useMemo(
    () => new Set(parseSavedSchoolIds(storedLegacySavedSchoolIds)),
    [storedLegacySavedSchoolIds],
  );
  const storedSavedTargets = useMemo(() => parseSavedTargetSchools(storedTargetSchools), [storedTargetSchools]);
  const isInitialized = profile?.isInitialized === true;
  const initializedProfile = isInitialized ? profile : null;
  const theme: ThemeMode = storedTheme === "dark" ? "dark" : "light";
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [drawerRequested, setDrawerRequested] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [recommendationBatch, setRecommendationBatch] = useState(0);
  const [recommendationVersion, setRecommendationVersion] = useState(0);
  const [undergraduateCatalog, setUndergraduateCatalog] = useState<SchoolMatchInput[]>([]);
  const [schoolDirectory, setSchoolDirectory] = useState<SchoolDirectoryItem[]>([]);
  const [isSchoolDirectoryLoading, setIsSchoolDirectoryLoading] = useState(true);
  const [selectedSchoolIpedsUnitId, setSelectedSchoolIpedsUnitId] = useState<string | null>(null);
  const { isLoading, run } = useActionLock();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadUndergraduateCatalog() {
      try {
        const response = await fetch("/api/undergraduate-programs", { signal: controller.signal });
        if (!response.ok) return;

        const payload: unknown = await response.json();
        const catalog = parseUndergraduateCatalog(payload);
        if (catalog.length > 0) setUndergraduateCatalog(catalog);
      } catch {
        // The verified API catalog is optional during initial Supabase setup.
      }
    }

    void loadUndergraduateCatalog();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSchoolDirectory() {
      setIsSchoolDirectoryLoading(true);
      try {
        const response = await fetch("/api/undergraduate-schools", { signal: controller.signal });
        if (!response.ok) return;

        const payload: unknown = await response.json();
        setSchoolDirectory(parseSchoolDirectoryResponse(payload));
      } catch {
        // The rest of the Dashboard remains available while the public directory is unavailable.
      } finally {
        if (!controller.signal.aborted) setIsSchoolDirectoryLoading(false);
      }
    }

    void loadSchoolDirectory();
    return () => controller.abort();
  }, []);

  const activeCatalog = useMemo(
    () => (profile?.degreeTarget === "undergraduate" && undergraduateCatalog.length > 0 ? undergraduateCatalog : schoolCatalog),
    [profile?.degreeTarget, undergraduateCatalog],
  );

  const tiers = useMemo(
    () => (initializedProfile ? matchSchools(initializedProfile, activeCatalog) : null),
    [activeCatalog, initializedProfile],
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
  const rankedRecommendations = useMemo(
    () =>
      searchedTiers
        ? [...Object.values(searchedTiers).flat()].sort((first, second) => second.matchScore - first.matchScore)
        : [],
    [searchedTiers],
  );
  const allSchools = useMemo(() => (tiers ? Object.values(tiers).flat() : []), [tiers]);
  const targetSchools = useMemo(() => {
    const algorithmSchoolsById = new Map(allSchools.map((school) => [school.id, school]));

    return storedSavedTargets.map((targetSchool) => {
      const updatedSchool = algorithmSchoolsById.get(targetSchool.id);
      const directorySchool = targetSchool.id.startsWith("directory-")
        ? schoolDirectory.find((school) => `directory-${school.ipedsUnitId}` === targetSchool.id)
        : findDirectorySchoolByName(schoolDirectory, targetSchool.name);
      if (!updatedSchool) {
        return { ...targetSchool, officialWebsite: directorySchool?.officialWebsite ?? targetSchool.officialWebsite };
      }

      return {
        ...targetSchool,
        deadline: updatedSchool.deadline,
        lastAlgorithmStatus: updatedSchool.status,
        name: updatedSchool.name,
        notes: updatedSchool.notes,
        officialWebsite: directorySchool?.officialWebsite ?? targetSchool.officialWebsite,
        program: updatedSchool.program,
        region: updatedSchool.region,
        shortName: updatedSchool.shortName,
        status: targetSchool.userOverrideStatus ? targetSchool.status : updatedSchool.status,
      };
    });
  }, [allSchools, schoolDirectory, storedSavedTargets]);
  const savedSchoolIds = useMemo(
    () => new Set(targetSchools.map((school) => school.id)),
    [targetSchools],
  );
  const savedSchoolNames = useMemo(
    () => new Set(targetSchools.map((school) => school.name)),
    [targetSchools],
  );
  const savedDirectoryIpedsUnitIds = useMemo(
    () => new Set(
      targetSchools.flatMap((school) => {
        if (school.id.startsWith("directory-")) return [school.id.slice("directory-".length)];

        const directorySchool = findDirectorySchoolByName(schoolDirectory, school.name);
        return directorySchool ? [directorySchool.ipedsUnitId] : [];
      }),
    ),
    [schoolDirectory, targetSchools],
  );
  const recommendations = useMemo(
    () =>
      rankedRecommendations
        .filter((school) => !savedSchoolIds.has(school.id) && !savedSchoolNames.has(school.name))
        .slice(0, 12),
    [rankedRecommendations, savedSchoolIds, savedSchoolNames],
  );
  const directoryCandidates = useMemo(() => {
    if (!isInitialized || schoolDirectory.length === 0) return [];

    const matchNames = new Set(recommendations.map((school) => school.name));
    const regions = profile?.targetRegions ?? [];
    const regionalSchools = schoolDirectory.filter((school) => {
      if (regions.length === 0) return true;
      return regions.some((region) => school.region.includes(region) || (region === "美国" && school.country === "United States"));
    });
    return (regionalSchools.length > 0 ? regionalSchools : schoolDirectory).filter(
      (school) =>
        !matchNames.has(school.name) &&
        !savedSchoolIds.has(`directory-${school.ipedsUnitId}`) &&
        !savedSchoolNames.has(school.name) &&
        !savedDirectoryIpedsUnitIds.has(school.ipedsUnitId),
    );
  }, [
    isInitialized,
    profile?.targetRegions,
    recommendations,
    savedDirectoryIpedsUnitIds,
    savedSchoolIds,
    savedSchoolNames,
    schoolDirectory,
  ]);
  const directoryBatchSize = Math.max(8, 12 - recommendations.length);
  const directorySuggestions = useMemo(
    () => takeRecommendationBatch(directoryCandidates, recommendationBatch, directoryBatchSize),
    [directoryBatchSize, directoryCandidates, recommendationBatch],
  );
  const directoryTiers = useMemo<DirectorySchoolTiers>(
    () => (initializedProfile ? buildDirectorySchoolTiers(initializedProfile, schoolDirectory) : { Reach: [], Target: [], Safety: [] }),
    [initializedProfile, schoolDirectory],
  );
  const selectedRegionDirectoryCount = useMemo(
    () => getDirectoryTierCount(directoryTiers),
    [directoryTiers],
  );
  const directoryStatusByIpedsUnitId = useMemo(() => {
    const statuses = new Map<string, SchoolItem["status"]>();

    (Object.keys(directoryTiers) as SchoolItem["status"][]).forEach((status) => {
      directoryTiers[status].forEach((school) => {
        statuses.set(school.ipedsUnitId, status);
      });
    });

    return statuses;
  }, [directoryTiers]);
  const handleOpenTargetSchool = (targetSchool: SavedTargetSchool) => {
    const directorySchool = targetSchool.id.startsWith("directory-")
      ? schoolDirectory.find((school) => `directory-${school.ipedsUnitId}` === targetSchool.id) ?? null
      : findDirectorySchoolByName(schoolDirectory, targetSchool.name);

    if (!directorySchool) {
      setToast(`${targetSchool.name} 的已核验详情数据正在接入`);
      return;
    }

    setSelectedSchoolIpedsUnitId(directorySchool.ipedsUnitId);
  };

  useEffect(() => {
    if (storedSavedTargets.length > 0 || legacySavedSchoolIds.size === 0 || allSchools.length === 0) return;

    const migratedTargets = allSchools
      .filter((school) => legacySavedSchoolIds.has(school.id))
      .map((school) => createSavedTargetSchool(school));

    if (migratedTargets.length > 0) {
      saveSavedTargetSchools(migratedTargets);
      saveSavedSchoolIds([]);
    }
  }, [allSchools, legacySavedSchoolIds, storedSavedTargets.length]);

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
      if (savedSchoolIds.has(school.id)) return;
      saveSavedTargetSchools([...targetSchools, createSavedTargetSchool(school)]);
      setToast(`${school.name} 已加入你的选校清单`);
    });
  };

  const handleAddDirectorySchool = (school: SchoolDirectoryItem) => {
    run(() => {
      const status = directoryStatusByIpedsUnitId.get(school.ipedsUnitId);
      const targetId = `directory-${school.ipedsUnitId}`;

      if (!status) {
        setToast("该院校不在当前目标地区的候选范围内");
        return;
      }

      if (savedSchoolIds.has(targetId)) return;

      saveSavedTargetSchools([...targetSchools, createSavedTargetSchoolFromDirectory(school, status)]);
      setToast(`${school.name} 已加入 ${tierDetails[status].title}`);
    });
  };

  const handleSetTargetStatus = (schoolId: string, status: SchoolItem["status"]) => {
    const nextTargets = targetSchools.map((school) =>
      school.id === schoolId
        ? {
            ...school,
            status,
            userOverrideStatus: status !== school.lastAlgorithmStatus,
          }
        : school,
    );

    saveSavedTargetSchools(nextTargets);
    setToast(status === nextTargets.find((school) => school.id === schoolId)?.lastAlgorithmStatus ? "已恢复算法建议分组" : "已锁定到你的自定义分组");
  };

  const handleRemoveTarget = (schoolId: string) => {
    const targetSchool = targetSchools.find((school) => school.id === schoolId);
    saveSavedTargetSchools(targetSchools.filter((school) => school.id !== schoolId));
    setToast(targetSchool ? `${targetSchool.name} 已从目标库移除` : "已从目标库移除");
  };

  const handleRefreshRecommendations = () => {
    if (!isInitialized) {
      setDrawerRequested(true);
      setToast("先录入学术背景，即可生成个性化推荐");
      return;
    }

    run(() => {
      setRecommendationVersion((currentVersion) => currentVersion + 1);
      setRecommendationBatch((currentBatch) => currentBatch + 1);
      setToast("已重新计算匹配结果，并切换至下一组已核验院校");
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
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400"><MagnifyingGlass aria-hidden="true" size={17} /></span>
              <input
                aria-label="全局搜索"
                className="h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50/80 pl-9 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-white/10 dark:bg-zinc-900/70 dark:text-white"
                onChange={(event) => setSearchQuery(event.target.value.slice(0, 80))}
                placeholder="搜索院校、项目或地区…"
                value={searchQuery}
              />
              <SchoolSearchDropdown
                isLoading={isSchoolDirectoryLoading}
                onSelect={(school) => {
                  setSearchQuery("");
                  setSelectedSchoolIpedsUnitId(school.ipedsUnitId);
                }}
                query={searchQuery}
                schools={schoolDirectory}
              />
            </div>
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
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-bold text-white shadow-lg shadow-zinc-950/15 transition-transform hover:bg-zinc-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 dark:border dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              disabled={isLoading}
              onClick={handleRefreshRecommendations}
              type="button"
            >
              <Sparkle aria-hidden="true" size={17} weight="fill" />
              {isLoading ? "Loading..." : "刷新智能推荐"}
            </button>
          </section>

          <SchoolTierBoard
            directoryTotal={selectedRegionDirectoryCount}
            directoryTiers={directoryTiers}
            isInitialized={isInitialized}
            onOpenDirectory={(tier) => {
              router.push(tier ? `/catalog?tier=${tier}` : "/catalog");
            }}
            onOpenSchool={handleOpenTargetSchool}
            onRemoveTarget={handleRemoveTarget}
            onSetTargetStatus={handleSetTargetStatus}
            onUnlock={() => setDrawerRequested(true)}
            onUseDefault={handleUseDefaultProfile}
            targetSchools={targetSchools}
          />
          <div className="mt-7">
            <RecommendationCarousel
              directorySuggestions={directorySuggestions}
              isLoading={isLoading}
              onAdd={handleAddSchool}
              onAddDirectorySchool={handleAddDirectorySchool}
              onOpenSchool={(school) => setSelectedSchoolIpedsUnitId(school.ipedsUnitId)}
              onRefresh={handleRefreshRecommendations}
              recommendations={recommendations}
              refreshVersion={recommendationVersion}
              savedSchoolIds={savedSchoolIds}
              schoolDirectory={schoolDirectory}
              showDirectoryFirst={recommendationBatch > 0}
            />
          </div>
          <div className="mt-7 space-y-4">
            <DeadlineBanner schools={targetSchools} />
            <ApplicationTimeline schools={targetSchools} />
          </div>
          <footer className="mt-9 flex items-center justify-center gap-2 text-xs text-zinc-400 dark:text-zinc-500">
            <CalendarBlank aria-hidden="true" size={14} /> 你的资料仅保存在当前浏览器，可随时修改。
          </footer>
        </div>
      </main>
      <SchoolDetailModal key={selectedSchoolIpedsUnitId ?? "no-school"} ipedsUnitId={selectedSchoolIpedsUnitId} onClose={() => setSelectedSchoolIpedsUnitId(null)} profile={profile} />
      <ProfileDrawer onClose={() => setDrawerRequested(false)} onSaved={handleProfileSaved} onThemeChange={handleThemeChange} open={drawerRequested} profile={profile} theme={theme} />
      <AnimatePresence>{toast && <Toast key={toast} message={toast} onClose={() => setToast(null)} />}</AnimatePresence>
    </div>
  );
}
