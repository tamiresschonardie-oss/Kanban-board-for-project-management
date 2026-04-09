import { UIEvent, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Flag,
  Link2,
  Milestone,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { DependencyEntityType, Phase, Project, TaskDependency, TaskRelationshipType } from '../types';
import { useAdmin } from '../context/AdminContext';
import { useFeedback } from '../context/FeedbackContext';
import { useProjects } from '../context/ProjectContext';
import { EnrichedTask, useTasks } from '../context/TaskContext';
import { canUserPerform } from '../utils/permissions';
import { getProjectExecutionDependencies, getProjectExecutionPhases } from '../utils/projectSelectors';
import {
  GANTT_DEPENDENCY_LABELS,
  GANTT_ITEM_LABELS,
  GanttDependency,
  GanttPresentationMode,
  GanttRow,
  GanttZoomLevel,
  buildConnectorLayouts,
  buildProjectGanttRows,
  buildTimelineColumns,
  buildTimelineMonthGroups,
  createGanttDependency,
  formatGanttDate,
  getBarLayout,
  getTimelineColumnWidth,
  mergeProjectGanttDependencies,
} from '../utils/ganttPlanner';
import { TaskModal } from './TaskModal';
import {
  TASK_DEPENDENCY_TYPE_LABELS,
  TASK_RELATIONSHIP_TYPE_LABELS,
  normalizeDependencyRecord,
} from '../utils/taskDependencies';

interface ProjectGanttTabProps {
  project: Project;
}

interface DependencyDraft {
  sourceItemId: string;
  targetItemId: string;
  dependencyType: 'FS' | 'SS' | 'FF' | 'SF';
  mode: 'dependency' | 'relationship';
  relationshipType: TaskRelationshipType;
  lagDays: number;
}

const ROW_HEIGHT = 56;

const HEALTH_STYLES = {
  planned: {
    badge: 'bg-slate-100 text-slate-700',
    bar: 'bg-sky-500',
  },
  done: {
    badge: 'bg-emerald-100 text-emerald-700',
    bar: 'bg-emerald-500',
  },
  delayed: {
    badge: 'bg-rose-100 text-rose-700',
    bar: 'bg-rose-500',
  },
  blocked: {
    badge: 'bg-amber-100 text-amber-800',
    bar: 'bg-amber-500',
  },
  risk: {
    badge: 'bg-orange-100 text-orange-700',
    bar: 'bg-orange-500',
  },
} as const;

const emptyDraft = (): DependencyDraft => ({
  sourceItemId: '',
  targetItemId: '',
  mode: 'dependency',
  dependencyType: 'FS',
  relationshipType: 'related_to',
  lagDays: 0,
});

const mapRowItemTypeToDependencyEntityType = (itemType: string): DependencyEntityType => {
  if (itemType === 'project') return 'project';
  if (itemType === 'phase' || itemType === 'milestone') return 'phase';
  return 'task';
};

export function ProjectGanttTab({ project }: ProjectGanttTabProps) {
  const { updateProject } = useProjects();
  const { currentUser } = useAdmin();
  const { showFeedback } = useFeedback();
  const { allTasks, updateTask, updateSubtask, addProjectDependency, removeProjectDependency } = useTasks();
  const canManageGantt = canUserPerform(currentUser, 'gantt:manage');
  const timelineHeaderRef = useRef<HTMLDivElement | null>(null);
  const projectTasks = useMemo(
    () => allTasks.filter((task) => task.projectId === project.id),
    [allTasks, project.id]
  );
  const [mode, setMode] = useState<GanttPresentationMode>('detailed');
  const [zoom, setZoom] = useState<GanttZoomLevel>('month');
  const [showDependencies, setShowDependencies] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [dependencyDraft, setDependencyDraft] = useState<DependencyDraft>(emptyDraft);
  const [dependencyValidation, setDependencyValidation] = useState<string[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  const { rows, itemsById, dateRange } = useMemo(
    () =>
      buildProjectGanttRows({
        project,
        tasks: projectTasks,
        mode,
        expandedIds,
      }),
    [expandedIds, mode, project, projectTasks]
  );
  const dependencies = useMemo(() => mergeProjectGanttDependencies(project), [project]);
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
  const connectors = useMemo(
    () =>
      dateRange && showDependencies
        ? buildConnectorLayouts({
            dependencies,
            visibleRows: rows,
            timelineStart: dateRange.start,
            totalDays: dateRange.totalDays,
            rowHeight: ROW_HEIGHT,
          })
        : [],
    [dateRange, dependencies, rows, showDependencies]
  );
  const selectedItem = selectedItemId ? itemsById.get(selectedItemId) : null;

  const toggleExpand = (itemId: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const openItem = (itemId: string) => {
    setSelectedItemId(itemId);
    setPanelOpen(true);
  };

  const persistPhaseMutation = (mutator: (phases: Phase[]) => Phase[]) => {
    updateProject(project.id, {
      execution: {
        ...project.execution,
        phases: mutator(getProjectExecutionPhases(project)),
      },
    });
  };

  const updateSelectedItem = (field: 'title' | 'assignee' | 'startDate' | 'endDate', value: string) => {
    if (!selectedItem || !canManageGantt) return;
    if (selectedItem.itemType === 'phase') {
      persistPhaseMutation((phases) =>
        phases.map((phase) =>
          phase.id === selectedItem.rawId
            ? {
                ...phase,
                name: field === 'title' ? value : phase.name,
                responsible: field === 'assignee' ? value : phase.responsible,
                plannedStartDate: field === 'startDate' ? value || undefined : phase.plannedStartDate,
                plannedEndDate: field === 'endDate' ? value || undefined : phase.plannedEndDate,
              }
            : phase
        )
      );
      return;
    }

    if (selectedItem.itemType === 'milestone') {
      persistPhaseMutation((phases) =>
        phases.map((phase) => ({
          ...phase,
          milestones: phase.milestones.map((milestone) =>
            milestone.id === selectedItem.rawId
              ? {
                  ...milestone,
                  name: field === 'title' ? value : milestone.name,
                  responsible: field === 'assignee' ? value : milestone.responsible,
                  startDate: field === 'startDate' ? value || milestone.startDate : milestone.startDate,
                  endDate: field === 'endDate' ? value || milestone.endDate : milestone.endDate,
                  plannedStartDate:
                    field === 'startDate'
                      ? value || undefined
                      : milestone.plannedStartDate,
                  plannedEndDate:
                    field === 'endDate'
                      ? value || undefined
                      : milestone.plannedEndDate,
                }
              : milestone
          ),
        }))
      );
      return;
    }

    const taskNode = selectedItem.source as EnrichedTask;
    if (selectedItem.itemType === 'task') {
      updateTask(taskNode.id, {
        title: field === 'title' ? value : taskNode.title,
        assignee: field === 'assignee' ? value : taskNode.assignee,
        startDate: field === 'startDate' ? value || undefined : taskNode.startDate,
        dueDate: field === 'endDate' ? value || undefined : taskNode.dueDate,
      });
      return;
    }

    if (selectedItem.itemType === 'subtask' && taskNode.rootTaskId) {
      updateSubtask(taskNode.rootTaskId, taskNode.id, {
        title: field === 'title' ? value : taskNode.title,
        assignee: field === 'assignee' ? value : taskNode.assignee,
        startDate: field === 'startDate' ? value || undefined : taskNode.startDate,
        dueDate: field === 'endDate' ? value || undefined : taskNode.dueDate,
      });
    }
  };

  const saveDependency = () => {
    if (dependencyDraft.mode === 'relationship') {
      const sourceRow = itemsById.get(dependencyDraft.sourceItemId);
      const targetRow = itemsById.get(dependencyDraft.targetItemId);
      if (!sourceRow || !targetRow) {
        showFeedback({
          tone: 'error',
          title: 'Relacionamento inválido',
          message: 'Selecione origem e destino válidos.',
        });
        return;
      }

      const createResult = addProjectDependency({
        projectId: project.id,
        sourceId: sourceRow.rawId,
        sourceType: mapRowItemTypeToDependencyEntityType(sourceRow.itemType),
        targetId: targetRow.rawId,
        targetType: mapRowItemTypeToDependencyEntityType(targetRow.itemType),
        relationshipType: dependencyDraft.relationshipType,
        dependencyClass: 'soft',
        createdBy: currentUser?.name,
        metadata: {
          rawSourceType: sourceRow.itemType,
          rawTargetType: targetRow.itemType,
        },
      });

      if (!createResult.success) {
        showFeedback({
          tone: 'error',
          title: 'Relacionamento inválido',
          message: createResult.reason || 'Não foi possível salvar o relacionamento.',
        });
        return;
      }

      showFeedback({
        tone: 'success',
        title: 'Relacionamento criado',
        message: 'O vínculo contextual já aparece no painel do item.',
      });
      setDependencyDraft(emptyDraft());
      setDependencyValidation([]);
      return;
    }

    const result = createGanttDependency({
      input: {
        projectId: project.id,
        sourceItemId: dependencyDraft.sourceItemId,
        targetItemId: dependencyDraft.targetItemId,
        dependencyType: dependencyDraft.dependencyType,
        lagDays: dependencyDraft.lagDays || undefined,
        createdBy: currentUser?.name,
      },
      itemsById,
      dependencies,
    });

    const messages = result.validation.conflicts.map((conflict) => conflict.message);
    setDependencyValidation(messages);

    if (!result.dependency) {
      showFeedback({
        tone: 'error',
        title: 'Dependência inválida',
        message: messages[0] || 'Não foi possível criar a dependência.',
      });
      return;
    }

    const sourceRow = itemsById.get(result.dependency.sourceItemId);
    const targetRow = itemsById.get(result.dependency.targetItemId);
    if (!sourceRow || !targetRow) return;

    const createResult = addProjectDependency({
      projectId: project.id,
      sourceId: sourceRow.rawId,
      sourceType: mapRowItemTypeToDependencyEntityType(sourceRow.itemType),
      targetId: targetRow.rawId,
      targetType: mapRowItemTypeToDependencyEntityType(targetRow.itemType),
      dependencyType: dependencyDraft.dependencyType,
      dependencyClass: 'hard',
      lagDays: dependencyDraft.lagDays || undefined,
      createdBy: currentUser?.name,
      metadata: {
        rawSourceType: sourceRow.itemType,
        rawTargetType: targetRow.itemType,
      },
    });

    if (!createResult.success) {
      showFeedback({
        tone: 'error',
        title: 'Vínculo inválido',
        message: createResult.reason || 'Não foi possível salvar o vínculo.',
      });
      return;
    }

    showFeedback({
      tone: messages.length > 0 ? 'info' : 'success',
      title: messages.length > 0 ? 'Dependência criada com alerta' : 'Dependência criada',
      message: messages[0] || 'A nova relação já aparece na timeline.',
    });
    setDependencyDraft(emptyDraft());
    setDependencyValidation([]);
  };

  const removeDependency = (dependencyId: string) => {
    removeProjectDependency(project.id, dependencyId);
  };

  const handleTimelineScroll = (event: UIEvent<HTMLDivElement>) => {
    if (timelineHeaderRef.current) {
      timelineHeaderRef.current.scrollLeft = event.currentTarget.scrollLeft;
    }
  };

  if (!dateRange) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <CalendarRange className="h-5 w-5 text-slate-400" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Gantt do Projeto</h3>
            <p className="text-sm text-slate-500">
              Configure datas em fases, marcos e tarefas para ativar o planejamento visual.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-950">Gantt do Projeto</h3>
            </div>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Planejamento operacional com fases, marcos, tarefas, subtarefas e dependências sincronizados com Kanban e lista.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                {formatGanttDate(dateRange.start.toISOString().slice(0, 10))} a {formatGanttDate(dateRange.end.toISOString().slice(0, 10))}
              </span>
              <span className="rounded-full bg-sky-50 px-3 py-1 text-sky-700">
                {rows.length} itens visíveis
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                {dependencies.length} dependência(s)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ToolbarPill
              active={mode === 'summary'}
              label="Simplificado"
              onClick={() => setMode('summary')}
            />
            <ToolbarPill
              active={mode === 'detailed'}
              label="Detalhado"
              onClick={() => setMode('detailed')}
            />
            <ToolbarPill active={zoom === 'month'} label="Mensal" onClick={() => setZoom('month')} />
            <ToolbarPill active={zoom === 'quarter'} label="Trimestral" onClick={() => setZoom('quarter')} />
            <ToolbarPill
              active={showDependencies}
              label="Dependências"
              onClick={() => setShowDependencies((value) => !value)}
            />
            <button
              onClick={() => setPanelOpen((value) => !value)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {panelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              Painel
            </button>
          </div>
        </div>
      </div>

      <div className={`grid gap-5 ${panelOpen ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'}`}>
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[400px_minmax(0,1fr)] border-b border-slate-200 bg-slate-50">
            <div className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Estrutura do planejamento
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

          <div className="grid grid-cols-[400px_minmax(0,1fr)]">
            <div>
              {rows.map((row) => (
                <div
                  key={row.id}
                  className={`flex h-14 items-center gap-3 border-b border-slate-100 px-4 ${
                    selectedItemId === row.id ? 'bg-slate-50' : 'bg-white'
                  }`}
                >
                  <button
                    onClick={() => row.isExpandable && toggleExpand(row.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                  >
                    {row.isExpandable ? (
                      expandedIds.has(row.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )
                    ) : (
                      <span className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => openItem(row.id)}
                    className="min-w-0 flex-1 text-left"
                    style={{ paddingLeft: `${row.depth * 18}px` }}
                    title={row.title}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${HEALTH_STYLES[row.health].badge}`}>
                        {GANTT_ITEM_LABELS[row.itemType]}
                      </span>
                      <span className="truncate text-sm font-medium text-slate-900">{row.title}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      {row.assignee && <span title={row.assignee}>{row.assignee}</span>}
                      <span>{formatGanttDate(row.startDate)} - {formatGanttDate(row.endDate)}</span>
                      <span>{row.progress}%</span>
                      {row.visibleChildrenCount > 0 && <span>{row.visibleChildrenCount} filho(s)</span>}
                    </div>
                  </button>
                  {canManageGantt && (
                    <button
                      onClick={() => {
                        setDependencyDraft((current) => ({ ...current, sourceItemId: row.id }));
                        setPanelOpen(true);
                      }}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                      title="Usar como origem de dependência"
                    >
                      <Link2 className="h-4 w-4" />
                    </button>
                  )}
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

              {showDependencies && (
                <svg
                  className="pointer-events-none absolute left-0 top-0 z-10 h-full w-full"
                  viewBox={`0 0 100 ${rows.length * ROW_HEIGHT}`}
                  preserveAspectRatio="none"
                >
                  {connectors.map((connector) => (
                    <path
                      key={connector.id}
                      d={connector.path}
                      fill="none"
                      stroke={connector.state === 'warning' ? '#dc2626' : '#64748b'}
                      strokeWidth="1.8"
                      strokeDasharray={connector.state === 'warning' ? '3 3' : '0'}
                      opacity="0.9"
                    />
                  ))}
                </svg>
              )}

              <div className="relative z-20">
                {rows.map((row) => {
                  const layout = getBarLayout(row.startDate, row.endDate, dateRange.start, dateRange.totalDays);
                  const healthStyle = HEALTH_STYLES[row.health];
                  return (
                    <div key={row.id} className="relative h-14 border-b border-slate-100">
                      {layout.width > 0 && (
                        <>
                          {row.itemType === 'milestone' ? (
                            <button
                              onClick={() => openItem(row.id)}
                              className="absolute top-1/2 -translate-y-1/2"
                              style={{ left: `${layout.left}%` }}
                            >
                              <span className={`block h-4 w-4 rotate-45 rounded-[3px] ${healthStyle.bar}`} />
                            </button>
                          ) : (
                            <button
                              onClick={() => openItem(row.id)}
                              className={`absolute top-1/2 -translate-y-1/2 rounded-full ${healthStyle.bar} ${
                                row.itemType === 'phase'
                                  ? 'h-4'
                                  : row.itemType === 'subtask'
                                    ? 'h-2.5'
                                    : 'h-3'
                              }`}
                              style={{
                                left: `${layout.left}%`,
                                width: `${layout.width}%`,
                              }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              </div>
            </div>
          </div>
        </div>

        {panelOpen && (
          <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            {selectedItem ? (
              <ItemPanel
                item={selectedItem}
                dependencies={getProjectExecutionDependencies(project)
                  .map(normalizeDependencyRecord)
                  .filter(
                    (dependency) =>
                      dependency.sourceId === selectedItem.rawId || dependency.targetId === selectedItem.rawId
                  )}
                canManageGantt={canManageGantt}
                onChange={updateSelectedItem}
                onRemoveDependency={removeDependency}
                onOpenTaskModal={() => setIsTaskModalOpen(true)}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-sm text-slate-500">
                Selecione uma fase, marco, tarefa ou subtarefa para editar datas, responsável e relações.
              </div>
            )}

            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
              <p className="text-sm font-semibold text-slate-900">Novo vínculo</p>
              <p className="mt-1 text-xs text-slate-500">
                Separe relacionamento de dependência real. Dependências desenham conectores na timeline; relacionamentos ficam como contexto do item.
              </p>

              <div className="mt-4 space-y-3">
                <PanelField label="Modo">
                  <select
                    value={dependencyDraft.mode}
                    onChange={(event) =>
                      setDependencyDraft((current) => ({
                        ...current,
                        mode: event.target.value as DependencyDraft['mode'],
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="dependency">Dependência</option>
                    <option value="relationship">Relacionamento</option>
                  </select>
                </PanelField>
                <PanelField label="Origem">
                  <select
                    value={dependencyDraft.sourceItemId}
                    onChange={(event) =>
                      setDependencyDraft((current) => ({ ...current, sourceItemId: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Selecione</option>
                    {rows.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.title} ({GANTT_ITEM_LABELS[row.itemType]})
                      </option>
                    ))}
                  </select>
                </PanelField>

                <PanelField label="Destino">
                  <select
                    value={dependencyDraft.targetItemId}
                    onChange={(event) =>
                      setDependencyDraft((current) => ({ ...current, targetItemId: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Selecione</option>
                    {rows.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.title} ({GANTT_ITEM_LABELS[row.itemType]})
                      </option>
                    ))}
                  </select>
                </PanelField>

                <div className="grid grid-cols-2 gap-3">
                  <PanelField label="Tipo">
                    {dependencyDraft.mode === 'dependency' ? (
                      <select
                        value={dependencyDraft.dependencyType}
                        onChange={(event) =>
                          setDependencyDraft((current) => ({
                            ...current,
                            dependencyType: event.target.value as DependencyDraft['dependencyType'],
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        {Object.entries(GANTT_DEPENDENCY_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={dependencyDraft.relationshipType}
                        onChange={(event) =>
                          setDependencyDraft((current) => ({
                            ...current,
                            relationshipType: event.target.value as TaskRelationshipType,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="related_to">Relacionado a</option>
                        <option value="derives_from">Deriva de</option>
                        <option value="refers_to">Referente a</option>
                      </select>
                    )}
                  </PanelField>

                  <PanelField label="Lag (dias)">
                    <input
                      type="number"
                      disabled={dependencyDraft.mode === 'relationship'}
                      value={dependencyDraft.lagDays}
                      onChange={(event) =>
                        setDependencyDraft((current) => ({
                          ...current,
                          lagDays: Number(event.target.value || 0),
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                    />
                  </PanelField>
                </div>

                {dependencyValidation.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                    {dependencyValidation.map((message) => (
                      <p key={message}>{message}</p>
                    ))}
                  </div>
                )}

                <button
                  onClick={saveDependency}
                  disabled={!canManageGantt}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {dependencyDraft.mode === 'relationship' ? 'Salvar relacionamento' : 'Salvar dependência'}
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {isTaskModalOpen && selectedItem && (selectedItem.itemType === 'task' || selectedItem.itemType === 'subtask') && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          editingTask={selectedItem.source as EnrichedTask}
          projectId={project.id}
          phaseId={(selectedItem.source as EnrichedTask).phaseId}
          milestoneId={(selectedItem.source as EnrichedTask).milestoneId}
        />
      )}
    </section>
  );
}

function ItemPanel({
  item,
  dependencies,
  canManageGantt,
  onChange,
  onRemoveDependency,
  onOpenTaskModal,
}: {
  item: GanttRow | ReturnType<typeof buildProjectGanttRows>['items'][number];
  dependencies: TaskDependency[];
  canManageGantt: boolean;
  onChange: (field: 'title' | 'assignee' | 'startDate' | 'endDate', value: string) => void;
  onRemoveDependency: (dependencyId: string) => void;
  onOpenTaskModal: () => void;
}) {
  const blockingDependencies = dependencies.filter((dependency) => dependency.kind === 'dependency');
  const relationships = dependencies.filter((dependency) => dependency.kind === 'relationship');
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${HEALTH_STYLES[item.health].badge}`}>
            {GANTT_ITEM_LABELS[item.itemType]}
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
            {item.statusLabel}
          </span>
        </div>
        <h4 className="mt-3 text-lg font-semibold text-slate-950">{item.title}</h4>
        <p className="mt-1 text-sm text-slate-500">
          {item.projectName} • {formatGanttDate(item.startDate)} - {formatGanttDate(item.endDate)}
        </p>
      </div>

      <div className="grid gap-3">
        <PanelField label="Título">
          <input
            value={item.title}
            disabled={!canManageGantt}
            onChange={(event) => onChange('title', event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          />
        </PanelField>

        <PanelField label="Responsável">
          <input
            value={item.assignee || ''}
            disabled={!canManageGantt}
            onChange={(event) => onChange('assignee', event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
          />
        </PanelField>

        <div className="grid grid-cols-2 gap-3">
          <PanelField label="Início">
            <input
              type="date"
              value={item.startDate || ''}
              disabled={!canManageGantt}
              onChange={(event) => onChange('startDate', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            />
          </PanelField>
          <PanelField label="Fim">
            <input
              type="date"
              value={item.endDate || ''}
              disabled={!canManageGantt}
              onChange={(event) => onChange('endDate', event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
            />
          </PanelField>
        </div>
      </div>

      {(item.itemType === 'task' || item.itemType === 'subtask') && (
        <button
          onClick={onOpenTaskModal}
          className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Abrir edição completa da tarefa
        </button>
      )}

      <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-sm font-semibold text-slate-900">Sinais visuais</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <SignalChip icon={<CheckCircle2 className="h-3.5 w-3.5" />} label={`${item.progress}% concluído`} />
          {item.health === 'delayed' && <SignalChip icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Atrasado" />}
          {item.health === 'risk' && <SignalChip icon={<Flag className="h-3.5 w-3.5" />} label="Em risco" />}
          {item.health === 'blocked' && <SignalChip icon={<Link2 className="h-3.5 w-3.5" />} label="Bloqueado" />}
          {item.itemType === 'milestone' && <SignalChip icon={<Milestone className="h-3.5 w-3.5" />} label="Marco" />}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-sm font-semibold text-slate-900">Dependências</p>
        {blockingDependencies.length > 0 ? (
          <div className="mt-3 space-y-2">
            {blockingDependencies.map((dependency) => (
              <div key={dependency.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-xs font-medium text-slate-800">
                  {dependency.dependencyType ? TASK_DEPENDENCY_TYPE_LABELS[dependency.dependencyType] : 'Dependência'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {dependency.sourceType}:{dependency.sourceId} → {dependency.targetType}:{dependency.targetId}
                </p>
                <button
                  onClick={() => onRemoveDependency(dependency.id)}
                  className="mt-2 text-xs font-medium text-rose-600"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Nenhuma dependência ligada a este item ainda.</p>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-sm font-semibold text-slate-900">Relacionamentos</p>
        {relationships.length > 0 ? (
          <div className="mt-3 space-y-2">
            {relationships.map((dependency) => (
              <div key={dependency.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-xs font-medium text-slate-800">
                  {dependency.relationshipType
                    ? TASK_RELATIONSHIP_TYPE_LABELS[dependency.relationshipType]
                    : 'Relacionamento'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {dependency.sourceType}:{dependency.sourceId} → {dependency.targetType}:{dependency.targetId}
                </p>
                <button
                  onClick={() => onRemoveDependency(dependency.id)}
                  className="mt-2 text-xs font-medium text-rose-600"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Nenhum relacionamento contextual ligado a este item ainda.</p>
        )}
      </div>
    </div>
  );
}

function ToolbarPill({
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
      className={`rounded-2xl px-3 py-2 text-sm font-medium transition-colors ${
        active ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

function PanelField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function SignalChip({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700">
      {icon}
      {label}
    </span>
  );
}
