import { ReactNode } from 'react';

interface ActivitySidebarShellTab {
  id: string;
  label: string;
  count?: number;
}

interface ActivitySidebarShellProps {
  title: string;
  subtitle?: string;
  tabs: ActivitySidebarShellTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  listHeader?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ActivitySidebarShell({
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  listHeader,
  footer,
  children,
  className = '',
}: ActivitySidebarShellProps) {
  return (
    <section
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-[0_12px_32px_rgba(15,23,42,0.06)] ${className}`.trim()}
    >
      <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <div className="inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
                {typeof tab.count === 'number' ? (
                  <span className={`ml-2 text-xs ${activeTab === tab.id ? 'text-slate-200' : 'text-slate-400'}`}>
                    {tab.count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {listHeader ? <div className="border-b border-slate-200 px-5 py-3 text-sm text-slate-500">{listHeader}</div> : null}

      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

      {footer ? (
        <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
