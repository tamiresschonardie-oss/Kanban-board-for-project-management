import { UIEvent, useMemo, useRef, useState } from 'react';
import { Briefcase, ChevronDown, ChevronRight, Filter, Layers3 } from 'lucide-react';
import { SearchableMultiSelect } from '../components/filters/SearchableMultiSelect';
import { useProjectDetailNavigation } from '../hooks/useProjectDetailNavigation';
import { useProjects } from '../context/ProjectContext';
import { useTasks } from '../context/TaskContext';
import {
  GanttZoomLevel,
  buildProjectGanttRows,
  buildTimelineColumns,
  buildTimelineMonthGroups,
  filterGovernanceProjects,
  formatGanttDate,
  getBarLayout,
  getGanttDateRange,
  getTimelineColumnWidth,
} from '../utils/ganttPlanner';
import {
  getProjectExecutionPhases,
  getProjectGovernancePhaseId,
  getProjectMetrics,
} from '../utils/projectSelectors';

const ROW_HEIGHT = 54;

const BAR_STYLE = {
  project: 'bg-sky-600',
  phase: 'bg-slate-500',
};

export function GanttView() {
  const { projects } = useProjects();
  const { allTasks } = useTasks();
  const { openProjectDetail } = useProjectDetailNavigation();
  const timelineHeaderRef = useRef<HTMLDivElement | null>(null);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState<GanttZoomLevel>('month');
  const [filters, setFilters] = useState({
    projectIds: [] as string[],
    teams: [] as string[],
    products: [] as string[],
    clients: [] as string[],
    responsibles: [] as string[],
    requesters: [] as string[],
    years: [] as string[],
    statuses: [] as string[],
    startDate: '',
    endDate: '',
    hideCancelled: true,
  });

  const filterOptions = useMemo(
    () => ({
      projects: projects.map((project) => ({ value: project.id, label: project.name })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
      teams: Array.from(new Set(projects.map((project) => project.group).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      products: Array.from(new Set(projects.map((project) => project.product).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      clients: Array.from(new Set(projects.map((project) => project.client).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      responsibles: Array.from(new Set(projects.map((project) => project.responsible).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      requesters: Array.from(new Set(projects.map((project) => project.requestedBy).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      statuses: Array.from(new Set(projects.map((project) => String(getProjectGovernancePhaseId(project))))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      years: Array.from(
        new Set(
          projects
            .map((project) => String(new Date(project.requestDate || project.deadline || new Date().toISOString()).getFullYear()))
        )
      ).sort(),
    }),
    [projects]
  );

  const filteredProjects = useMemo(
    () =>
      filterGovernanceProjects({
        projects,
        filters,
      }),
    [filters, projects]
  );

  const rows = useMemo(() => {
    const collection: Array<{
      id: string;
      projectId: string;
      itemType: 'project' | 'phase';
      title: string;
      subtitle?: string;
      startDate?: string;
      endDate?: string;
      progress: number;
      depth: number;
    }> = [];

    filteredProjects.forEach((project) => {
      const projectTasks = allTasks.filter((task) => task.projectId === project.id);
      const model = buildProjectGanttRows({
        project,
        tasks: projectTasks,
        mode: 'summary',
        expandedIds: new Set(getProjectExecutionPhases(project).map((phase) => `phase:${phase.id}`)),
      });
      const topRange = getGanttDateRange(model.items);
      collection.push({
        id: `project:${project.id}`,
        projectId: project.id,
        itemType: 'project',
        title: project.name,
        subtitle: [project.group, project.product, project.client].filter(Boolean).join(' • '),
        startDate: topRange?.start.toISOString().slice(0, 10),
        endDate: topRange?.end.toISOString().slice(0, 10),
        progress: getProjectMetrics(project).progress,
        depth: 0,
      });

      if (expandedProjectIds.has(project.id)) {
        model.items
          .filter((item) => item.itemType === 'phase')
          .forEach((item) => {
            collection.push({
              id: item.id,
              projectId: project.id,
              itemType: 'phase',
              title: item.title,
              subtitle: item.assignee,
              startDate: item.startDate,
              endDate: item.endDate,
              progress: item.progress,
              depth: 1,
            });
          });
      }
    });

    return collection;
  }, [allTasks, expandedProjectIds, filteredProjects]);

  const dateRange = useMemo(() => getGanttDateRange(rows), [rows]);
  const columns = useMemo(
    () => (dateRange ? buildTimelineColumns(dateRange.start, dateRange.end, zoom) : []),
    [dateRange, zoom]
  );
  const monthGroups = useMemo(() => buildTimelineMonthGroups(columns), [columns]);
  const columnWidth = useMemo(() => getTimelineColumnWidth(zoom), [zoom]);
  const timelineGridTemplate = useMemo(
    () => (columns.length > 0 ? `repeat(${columns.length}, ${columnWidth}px)` : 'minmax(0,1fr)'),
    [columnWidth, columns.length]
  );
  const timelineWidth = useMemo(() => columns.length * columnWidth, [columnWidth, columns.length]);

  const toggleProject = (projectId: string) => {
    setExpandedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const handleTimelineScroll = (event: UIEvent<HTMLDivElement>) => {
    if (timelineHeaderRef.current) {
      timelineHeaderRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
  };

  return (
    <div className="space-y-5 px-8 py-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-slate-400" />
              <h2 className="text-xl font-semibold text-slate-950">Gantt da Governança</h2>
            </div>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Visão macro do portfólio com todos os projetos em timeline, filtros globais e expansão opcional por fases.
            </p>
          </div>

          <div className="flex gap-2">
            <ZoomPill active={zoom === 'month'} label="Mensal" onClick={() => setZoom('month')} />
            <ZoomPill active={zoom === 'quarter'} label="Trimestral" onClick={() => setZoom('quarter')} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FilterBlock label="Projeto">
            <SearchableMultiSelect
              value={filters.projectIds}
              onChange={(value) => setFilters((current) => ({ ...current, projectIds: value }))}
              placeholder="Todos"
              allLabel="Todos"
              searchPlaceholder="Buscar projeto..."
              options={filterOptions.projects}
            />
          </FilterBlock>
          <FilterBlock label="Equipe">
            <SearchableMultiSelect
              value={filters.teams}
              onChange={(value) => setFilters((current) => ({ ...current, teams: value }))}
              placeholder="Todas"
              allLabel="Todas"
              searchPlaceholder="Buscar equipe..."
              options={filterOptions.teams.map((item) => ({ value: item, label: item }))}
            />
          </FilterBlock>
          <FilterBlock label="Produto">
            <SearchableMultiSelect
              value={filters.products}
              onChange={(value) => setFilters((current) => ({ ...current, products: value }))}
              placeholder="Todos"
              allLabel="Todos"
              searchPlaceholder="Buscar produto..."
              options={filterOptions.products.map((item) => ({ value: item, label: item }))}
            />
          </FilterBlock>
          <FilterBlock label="Cliente">
            <SearchableMultiSelect
              value={filters.clients}
              onChange={(value) => setFilters((current) => ({ ...current, clients: value }))}
              placeholder="Todos"
              allLabel="Todos"
              searchPlaceholder="Buscar cliente..."
              options={filterOptions.clients.map((item) => ({ value: item, label: item }))}
            />
          </FilterBlock>
          <FilterBlock label="Responsável">
            <SearchableMultiSelect
              value={filters.responsibles}
              onChange={(value) => setFilters((current) => ({ ...current, responsibles: value }))}
              placeholder="Todos"
              allLabel="Todos"
              searchPlaceholder="Buscar responsável..."
              options={filterOptions.responsibles.map((item) => ({ value: item, label: item }))}
            />
          </FilterBlock>
          <FilterBlock label="Solicitante">
            <SearchableMultiSelect
              value={filters.requesters}
              onChange={(value) => setFilters((current) => ({ ...current, requesters: value }))}
              placeholder="Todos"
              allLabel="Todos"
              searchPlaceholder="Buscar solicitante..."
              options={filterOptions.requesters.map((item) => ({ value: item, label: item }))}
            />
          </FilterBlock>
          <FilterBlock label="Ano">
            <SearchableMultiSelect
              value={filters.years}
              onChange={(value) => setFilters((current) => ({ ...current, years: value }))}
              placeholder="Todos"
              allLabel="Todos"
              searchPlaceholder="Buscar ano..."
              options={filterOptions.years.map((item) => ({ value: item, label: item }))}
            />
          </FilterBlock>
          <FilterBlock label="Status">
            <SearchableMultiSelect
              value={filters.statuses}
              onChange={(value) => setFilters((current) => ({ ...current, statuses: value }))}
              placeholder="Todos"
              allLabel="Todos"
              searchPlaceholder="Buscar status..."
              options={filterOptions.statuses.map((item) => ({ value: item, label: item }))}
            />
          </FilterBlock>
          <FilterBlock label="Período inicial">
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            />
          </FilterBlock>
          <FilterBlock label="Período final">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.endDate}
                onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                onClick={() => setFilters((current) => ({ ...current, hideCancelled: !current.hideCancelled }))}
                className={`whitespace-nowrap rounded-2xl px-3 py-2 text-sm font-medium ${
                  filters.hideCancelled ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700'
                }`}
              >
                {filters.hideCancelled ? 'Oculta cancelados' : 'Mostra cancelados'}
              </button>
            </div>
          </FilterBlock>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[360px_minmax(860px,1fr)] border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            <Filter className="h-4 w-4" />
            Portfólio
          </div>
          <div ref={timelineHeaderRef} className="overflow-hidden">
            <div style={{ width: `${timelineWidth}px` }}>
              <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: timelineGridTemplate }}>
                {monthGroups.map((group) => (
                  <div
                    key={group.key}
                    className="border-l border-slate-200 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 first:border-l-0"
                    style={{ gridColumn: `${group.startIndex + 1} / span ${group.span}` }}
                  >
                    {group.label}
                  </div>
                ))}
              </div>
              <div className="grid" style={{ gridTemplateColumns: timelineGridTemplate }}>
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className={`border-l px-1 py-2 text-center first:border-l-0 ${
                      column.isToday
                        ? 'border-sky-200 bg-sky-50/80'
                        : column.isWeekend
                          ? 'border-slate-200 bg-slate-50/70'
                          : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-700">{column.dayNumber}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-400">
                      {column.weekdayLabel}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[360px_minmax(860px,1fr)]">
          <div>
            {rows.map((row) => (
              <div key={row.id} className="flex h-[54px] items-center gap-3 border-b border-slate-100 px-4">
                {row.itemType === 'project' ? (
                  <button
                    onClick={() => toggleProject(row.projectId)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                  >
                    {expandedProjectIds.has(row.projectId) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                ) : (
                  <span className="w-6" />
                )}

                <div className="min-w-0 flex-1" style={{ paddingLeft: `${row.depth * 20}px` }}>
                  <button
                    onClick={() => row.itemType === 'project' && openProjectDetail(row.projectId)}
                    className="truncate text-left text-sm font-medium text-slate-900 hover:text-sky-700"
                    title={row.title}
                  >
                    {row.title}
                  </button>
                  <p className="truncate text-xs text-slate-500" title={row.subtitle || 'Sem contexto adicional'}>
                    {row.subtitle || 'Sem contexto adicional'}
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {row.progress}%
                </span>
              </div>
            ))}
          </div>

          <div
            className="relative overflow-x-auto bg-[linear-gradient(180deg,rgba(248,250,252,0.85)_0%,rgba(255,255,255,1)_100%)]"
            onScroll={handleTimelineScroll}
          >
            <div style={{ width: `${timelineWidth}px` }}>
              <div
                className="absolute inset-y-0 left-0 grid"
                style={{ gridTemplateColumns: timelineGridTemplate, width: `${timelineWidth}px` }}
              >
                {columns.map((column) => (
                  <div
                    key={column.key}
                    className={`border-l first:border-l-0 ${
                      column.isToday
                        ? 'border-sky-200 bg-sky-50/30'
                        : column.isWeekend
                          ? 'border-slate-100 bg-slate-50/50'
                          : 'border-slate-100'
                    }`}
                  />
                ))}
              </div>

              <div className="relative">
                {rows.map((row) => {
                  const layout =
                    dateRange && row.startDate && row.endDate
                      ? getBarLayout(row.startDate, row.endDate, dateRange.start, dateRange.totalDays)
                      : { left: 0, width: 0 };
                  return (
                    <div key={row.id} className="relative h-[54px] border-b border-slate-100">
                      {layout.width > 0 && (
                        <button
                          onClick={() => row.itemType === 'project' && openProjectDetail(row.projectId)}
                          className={`absolute top-1/2 h-3.5 -translate-y-1/2 rounded-full ${
                            BAR_STYLE[row.itemType]
                          }`}
                          style={{ left: `${layout.left}%`, width: `${layout.width}%` }}
                          title={`${row.title}: ${formatGanttDate(row.startDate)} - ${formatGanttDate(row.endDate)}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {rows.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Nenhum projeto encontrado para os filtros aplicados.
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard label="Projetos visíveis" value={String(filteredProjects.length)} icon={<Briefcase className="h-4 w-4" />} />
        <InfoCard label="Projetos expandidos" value={String(expandedProjectIds.size)} icon={<Layers3 className="h-4 w-4" />} />
        <InfoCard
          label="Período em tela"
          value={dateRange ? `${formatGanttDate(dateRange.start.toISOString().slice(0, 10))} - ${formatGanttDate(dateRange.end.toISOString().slice(0, 10))}` : 'Sem dados'}
          icon={<Filter className="h-4 w-4" />}
        />
      </section>
    </div>
  );
}

function ZoomPill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-3 py-2 text-sm font-medium ${
        active ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

function FilterBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      {children}
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}
