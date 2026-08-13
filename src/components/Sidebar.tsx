"use client";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenProfile: () => void;
  onToggle: () => void;
}

const navigationItems = [
  { icon: "📊", label: "申请仪表盘", active: true },
  { icon: "🔍", label: "全球院校库", active: false },
  { icon: "📂", label: "申请材料网盘", active: false },
];

function MenuIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.9">
      <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export default function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onOpenProfile,
  onToggle,
}: SidebarProps) {
  const showExpanded = !collapsed || mobileOpen;

  return (
    <>
      <button
        aria-label="关闭移动侧边栏"
        className={`fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[2px] transition-opacity xl:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onCloseMobile}
        tabIndex={mobileOpen ? 0 : -1}
        type="button"
      />
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[264px] -translate-x-full flex-col border-r border-slate-200 bg-white/90 px-3 py-4 shadow-[8px_0_32px_-24px_rgba(15,23,42,0.32)] backdrop-blur transition-[width,transform] duration-300 dark:border-slate-800 dark:bg-slate-950/90 ${mobileOpen ? "translate-x-0" : ""} ${collapsed ? "xl:w-[84px]" : "xl:w-[264px]"} xl:translate-x-0`}>
      <div className={`flex items-center ${showExpanded ? "justify-between" : "justify-center"}`}>
        {showExpanded && (
          <div className="flex items-center gap-3 px-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-lg text-white shadow-lg shadow-blue-600/20">✦</span>
            <span className="text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">MY GRAD PATH</span>
          </div>
        )}
        <button aria-label="切换侧边栏" className="hidden rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-blue-700 dark:hover:bg-slate-800 dark:hover:text-blue-300 xl:inline-flex" onClick={onToggle} type="button"><MenuIcon /></button>
        <button aria-label="关闭移动侧边栏" className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-blue-700 dark:hover:bg-slate-800 dark:hover:text-blue-300 xl:hidden" onClick={onCloseMobile} type="button"><CloseSidebarIcon /></button>
      </div>

      <nav aria-label="主导航" className="mt-9 space-y-2">
        {navigationItems.map((item) => (
          <button aria-current={item.active ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${item.active ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"} ${showExpanded ? "" : "justify-center"}`} key={item.label} type="button">
            <span className="text-base" role="img" aria-label="">{item.icon}</span>
            {showExpanded && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-200 pt-4 dark:border-slate-800">
        <button className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800 ${showExpanded ? "" : "justify-center"}`} onClick={onOpenProfile} type="button">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 text-xs font-bold text-white">MP</span>
          {showExpanded && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">个人设置</span>
              <span className="block truncate text-xs text-slate-500">背景与系统偏好</span>
            </span>
          )}
        </button>
      </div>
      </aside>
    </>
  );
}

function CloseSidebarIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.9">
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}
