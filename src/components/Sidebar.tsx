"use client";

interface SidebarProps {
  collapsed: boolean;
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

export default function Sidebar({ collapsed, onOpenProfile, onToggle }: SidebarProps) {
  return (
    <aside className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-slate-200 bg-white/90 px-3 py-4 shadow-[8px_0_32px_-24px_rgba(15,23,42,0.32)] backdrop-blur xl:flex dark:border-slate-800 dark:bg-slate-950/90 ${collapsed ? "w-[84px]" : "w-[264px]"} transition-[width] duration-300`}>
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <div className="flex items-center gap-3 px-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-lg text-white shadow-lg shadow-blue-600/20">✦</span>
            <span className="text-sm font-extrabold tracking-tight text-slate-950 dark:text-white">MY GRAD PATH</span>
          </div>
        )}
        <button aria-label="切换侧边栏" className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-blue-700 dark:hover:bg-slate-800 dark:hover:text-blue-300" onClick={onToggle} type="button"><MenuIcon /></button>
      </div>

      <nav aria-label="主导航" className="mt-9 space-y-2">
        {navigationItems.map((item) => (
          <button aria-current={item.active ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${item.active ? "bg-blue-600 text-white shadow-md shadow-blue-600/20" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"} ${collapsed ? "justify-center" : ""}`} key={item.label} type="button">
            <span className="text-base" role="img" aria-label="">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="mt-auto border-t border-slate-200 pt-4 dark:border-slate-800">
        <button className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-slate-100 dark:hover:bg-slate-800 ${collapsed ? "justify-center" : ""}`} onClick={onOpenProfile} type="button">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-700 text-xs font-bold text-white">MP</span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-800 dark:text-slate-100">个人设置</span>
              <span className="block truncate text-xs text-slate-500">背景与系统偏好</span>
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
