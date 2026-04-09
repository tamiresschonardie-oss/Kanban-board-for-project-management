import type { CSSProperties, ReactNode } from 'react';
import { Plus } from 'lucide-react';

export function KanbanPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="section-card">
      <div className="kanban-page-header">
        <div className="max-w-3xl">
          {eyebrow ? <p className="kanban-page-eyebrow">{eyebrow}</p> : null}
          <h1 className="kanban-page-title">{title}</h1>
          <p className="kanban-page-description">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}

export function KanbanToolbar({
  title,
  description,
  controls,
}: {
  title: string;
  description?: string;
  controls?: ReactNode;
}) {
  return (
    <section className="section-card">
      <div className="kanban-toolbar">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {controls ? <div className="flex flex-wrap items-center gap-2">{controls}</div> : null}
      </div>
    </section>
  );
}

export function KanbanBoardViewport({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="section-card">
      <div className="kanban-board-scroll">{children}</div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}

export function KanbanColumnFrame({
  title,
  count,
  tone,
  headerStyle,
  actions,
  children,
  isActive = false,
}: {
  title: string;
  count: number;
  tone?: string;
  headerStyle?: CSSProperties;
  actions?: ReactNode;
  children: ReactNode;
  isActive?: boolean;
}) {
  return (
    <div className="kanban-column-frame">
      <div className={`kanban-column-header ${tone || ''}`} style={headerStyle}>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="kanban-column-count">{count}</span>
          {actions}
        </div>
      </div>

      <div className={`kanban-column-body ${isActive ? 'kanban-column-body-active' : ''}`}>{children}</div>
    </div>
  );
}

export function KanbanEmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="kanban-empty-state">
      {icon ? <div className="kanban-empty-icon">{icon}</div> : null}
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 max-w-[220px] text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export function KanbanAddColumnButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="w-80 flex-shrink-0">
      <button onClick={onClick} className="kanban-add-column">
        <Plus className="h-7 w-7" />
        <span className="font-medium">{label}</span>
      </button>
    </div>
  );
}
