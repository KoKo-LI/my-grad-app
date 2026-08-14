"use client";

import {
  ChartBar,
  FolderSimple,
  GearSix,
  GlobeHemisphereWest,
  GraduationCap,
  List,
  Sparkle,
  X,
} from "@phosphor-icons/react";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenSchoolDirectory: () => void;
  onOpenProfile: () => void;
  onToggle: () => void;
}

const navigationItems = [
  { Icon: ChartBar, label: "申请总览", active: true },
  { Icon: GlobeHemisphereWest, label: "全球院校库", active: false },
  { Icon: FolderSimple, label: "申请材料网盘", active: false },
];

export default function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onOpenSchoolDirectory,
  onOpenProfile,
  onToggle,
}: SidebarProps) {
  const showExpanded = !collapsed || mobileOpen;

  return (
    <>
      <button
        aria-label="关闭移动侧边栏"
        className={`fixed inset-0 z-30 bg-zinc-950/50 backdrop-blur-[2px] transition-opacity xl:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onCloseMobile}
        tabIndex={mobileOpen ? 0 : -1}
        type="button"
      />
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[264px] -translate-x-full flex-col border-r border-slate-200/80 bg-white/80 px-3 py-4 shadow-[8px_0_32px_-24px_rgba(24,24,27,0.28)] backdrop-blur-xl transition-[width,transform] duration-300 dark:border-white/10 dark:bg-zinc-950/90 ${mobileOpen ? "translate-x-0" : ""} ${collapsed ? "xl:w-[84px]" : "xl:w-[264px]"} xl:translate-x-0`}>
        <div className={`flex items-center ${showExpanded ? "justify-between" : "justify-center"}`}>
          {showExpanded && (
            <div className="flex items-center gap-3 px-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-lg shadow-zinc-950/20 dark:bg-white dark:text-zinc-950">
                <GraduationCap aria-hidden="true" size={20} weight="fill" />
              </span>
              <span className="text-sm font-extrabold tracking-[-0.03em] text-zinc-950 dark:text-white">MY GRAD PATH</span>
            </div>
          )}
          <button
            aria-label="切换侧边栏"
            className="hidden rounded-xl p-2.5 text-zinc-500 hover:bg-zinc-100 hover:text-violet-700 dark:hover:bg-zinc-900 dark:hover:text-violet-200 xl:inline-flex"
            onClick={onToggle}
            type="button"
          >
            <List aria-hidden="true" size={19} weight="bold" />
          </button>
          <button
            aria-label="关闭移动侧边栏"
            className="rounded-xl p-2.5 text-zinc-500 hover:bg-zinc-100 hover:text-violet-700 dark:hover:bg-zinc-900 dark:hover:text-violet-200 xl:hidden"
            onClick={onCloseMobile}
            type="button"
          >
            <X aria-hidden="true" size={19} weight="bold" />
          </button>
        </div>

        <nav aria-label="主导航" className="mt-9 space-y-2">
          {navigationItems.map(({ Icon, active, label }) => (
            <button
              aria-current={active ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition-colors ${active ? "bg-zinc-950 text-white shadow-lg shadow-zinc-950/15 dark:bg-violet-500/15 dark:text-violet-100" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"} ${showExpanded ? "" : "justify-center"}`}
              key={label}
              onClick={label === "全球院校库" ? onOpenSchoolDirectory : undefined}
              type="button"
            >
              <Icon aria-hidden="true" size={18} weight={active ? "fill" : "regular"} />
              {showExpanded && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {showExpanded && (
          <section className="mt-7 rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/45 dark:shadow-none dark:backdrop-blur-none">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-200">
              <Sparkle aria-hidden="true" className="text-violet-600 dark:text-violet-300" size={15} weight="fill" />
              选校引擎已准备就绪
            </div>
            <p className="mt-1.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">录入背景后，立即生成适配你的三档院校梯度。</p>
          </section>
        )}

        <div className="mt-auto border-t border-zinc-200/80 pt-4 dark:border-white/10">
          <button
            className={`flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900 ${showExpanded ? "" : "justify-center"}`}
            onClick={onOpenProfile}
            type="button"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-md shadow-indigo-500/25">MP</span>
            {showExpanded && (
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 truncate text-sm font-bold text-zinc-800 dark:text-zinc-100"><GearSix aria-hidden="true" size={14} weight="bold" />个人设置</span>
                <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">背景与系统偏好</span>
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
