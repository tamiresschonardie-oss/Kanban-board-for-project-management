import {
  DependencyEntityType,
  GanttDependency,
  GanttDependencyType,
  GanttItemType,
  Milestone,
  Phase,
  Project,
  TaskDependency,
  WBSTask,
} from '../types';
import type { EnrichedTask } from '../context/TaskContext';
import { getMilestoneDisplayDates, getPhaseControlDates } from './ganttCalculator';
import { normalizeDependencyRecord } from './taskDependencies';
import {
  getProjectExecutionPhases,
  getProjectGovernancePhaseId,
  getProjectGovernanceSituation,
} from './projectSelectors';

export type GanttZoomLevel = 'month' | 'quarter';
export type GanttPresentationMode = 'detailed' | 'summary';
export type GanttHealth = 'planned' | 'done' | 'delayed' | 'blocked' | 'risk';

export interface GanttItem {
  id: string;
  rawId: string;
  itemType: GanttItemType;
  projectId: string;
  projectName: string;
  title: string;
  subtitle?: string;
  parentId?: string;
  depth: number;
  order: number;
  isGroup: boolean;
  isExpandable: boolean;
  plannedStart?: string;
  plannedEnd?: string;
  startDate?: string;
  endDate?: string;
  progress: number;
  assignee?: string;
  statusLabel: string;
  health: GanttHealth;
  milestoneType?: Milestone['type'];
  dependencyBlocked?: boolean;
  source: Phase | Milestone | EnrichedTask | Project;
}

export interface GanttRow extends GanttItem {
  visibleChildrenCount: number;
}

export interface GanttColumn {
  key: string;
  label: string;
  start: Date;
  end: Date;
  dayNumber: string;
  weekdayLabel: string;
  monthKey: string;
  isWeekend: boolean;
  isToday: boolean;
}

export interface GanttColumnGroup {
  key: string;
  label: string;
  startIndex: number;
  span: number;
}

export interface GanttBarLayout {
  left: number;
  width: number;
}

export interface GanttConnectorLayout {
  id: string;
  dependencyId: string;
  path: string;
  state: 'ok' | 'warning';
}

export interface GanttConflict {
  type: 'cycle' | 'invalid' | 'date';
  message: string;
}

export interface CreateGanttDependencyInput {
  projectId: string;
  sourceItemId: string;
  targetItemId: string;
  dependencyType: GanttDependencyType;
  lagDays?: number;
  createdBy?: string;
}

const DAY = 1000 * 60 * 60 * 24;
const RISK_WINDOW_DAYS = 3;

export const GANTT_DEPENDENCY_LABELS: Record<GanttDependencyType, string> = {
  FS: 'Finish-to-Start',
  SS: 'Start-to-Start',
  FF: 'Finish-to-Finish',
  SF: 'Start-to-Finish',
};

export const GANTT_ITEM_LABELS: Record<GanttItemType, string> = {
  project: 'Projeto',
  phase: 'Fase',
  milestone: 'Marco',
  task: 'Tarefa',
  subtask: 'Subtarefa',
};

export const buildGanttItemId = (itemType: GanttItemType, rawId: string) => `${itemType}:${rawId}`;

const toDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatGanttDate = (value?: string) =>
  value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : 'Sem data';

export const shiftDateString = (value: string | undefined, deltaDays: number) => {
  const parsed = toDate(value);
  if (!parsed) return value;
  const next = new Date(parsed.getTime() + deltaDays * DAY);
  return next.toISOString().slice(0, 10);
};

export const clampProgress = (value?: number) =>
  Math.max(0, Math.min(100, Math.round(value || 0)));

const daysBetween = (start: Date, end: Date) => Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY) + 1);

const minDate = (values: Array<string | undefined>) => {
  const dates = values.map(toDate).filter(Boolean) as Date[];
  if (dates.length === 0) return undefined;
  return new Date(Math.min(...dates.map((item) => item.getTime()))).toISOString().slice(0, 10);
};

const maxDate = (values: Array<string | undefined>) => {
  const dates = values.map(toDate).filter(Boolean) as Date[];
  if (dates.length === 0) return undefined;
  return new Date(Math.max(...dates.map((item) => item.getTime()))).toISOString().slice(0, 10);
};

export const getTaskTimelineDates = (task: EnrichedTask | WBSTask) => {
  const subtasks = (task.subtasks || []) as WBSTask[];
  const nestedRanges = subtasks.map((subtask) => getTaskTimelineDates(subtask as unknown as EnrichedTask));
  return {
    startDate: task.startDate || minDate(nestedRanges.map((item) => item.startDate)),
    endDate: task.dueDate || maxDate(nestedRanges.map((item) => item.endDate)),
  };
};

export const getMilestoneTimelineDates = (milestone: Milestone, tasks: EnrichedTask[]) => {
  const controlDates = getMilestoneDisplayDates(milestone);
  return {
    startDate:
      controlDates.startDate ||
      minDate(tasks.map((task) => getTaskTimelineDates(task).startDate)),
    endDate:
      controlDates.endDate ||
      maxDate(tasks.map((task) => getTaskTimelineDates(task).endDate)),
  };
};

export const getPhaseTimelineDates = (phase: Phase, tasks: EnrichedTask[], milestones: Milestone[]) => {
  const controlDates = getPhaseControlDates(phase);
  return {
    startDate:
      controlDates.actualStartDate ||
      controlDates.plannedStartDate ||
      minDate([
        ...milestones.map((milestone) => milestone.plannedStartDate || milestone.startDate),
        ...tasks.map((task) => getTaskTimelineDates(task).startDate),
      ]),
    endDate:
      controlDates.actualEndDate ||
      controlDates.plannedEndDate ||
      maxDate([
        ...milestones.map((milestone) => milestone.plannedEndDate || milestone.endDate),
        ...tasks.map((task) => getTaskTimelineDates(task).endDate),
      ]),
  };
};

const getHealth = (params: {
  endDate?: string;
  progress?: number;
  blocked?: boolean;
}) => {
  const progress = clampProgress(params.progress);
  if (params.blocked) return 'blocked' as const;
  if (progress >= 100) return 'done' as const;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = toDate(params.endDate);
  if (end && end.getTime() < today.getTime()) return 'delayed' as const;
  if (end && end.getTime() - today.getTime() <= RISK_WINDOW_DAYS * DAY) return 'risk' as const;
  return 'planned' as const;
};

const getProgressFromMilestoneTasks = (tasks: EnrichedTask[]) => {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((task) => clampProgress(task.progress) >= 100 || task.status === 'done').length;
  return clampProgress((done / tasks.length) * 100);
};

const getProgressFromPhaseContent = (phaseMilestones: Milestone[], tasks: EnrichedTask[]) => {
  if (tasks.length > 0) {
    const total = tasks.reduce((acc, task) => acc + clampProgress(task.progress), 0);
    return clampProgress(total / tasks.length);
  }
  if (phaseMilestones.length === 0) return 0;
  const total = phaseMilestones.reduce((acc, milestone) => {
    const done = milestone.status === 'completed' ? 100 : milestone.status === 'in-progress' ? 50 : 0;
    return acc + done;
  }, 0);
  return clampProgress(total / phaseMilestones.length);
};

export const normalizeLegacyTaskDependencies = (project: Project): GanttDependency[] =>
  ((project.execution?.dependencies || []) as TaskDependency[])
    .map(normalizeDependencyRecord)
    .filter((dependency) => dependency.kind === 'dependency' && dependency.dependencyType)
    .map((dependency) => ({
      id: dependency.id,
      projectId: dependency.projectId,
      sourceItemId: buildGanttItemId(
        mapDependencyEntityTypeToGanttItemType(dependency.sourceType, dependency.metadata?.rawSourceType as string | undefined),
        dependency.sourceId
      ),
      targetItemId: buildGanttItemId(
        mapDependencyEntityTypeToGanttItemType(dependency.targetType, dependency.metadata?.rawTargetType as string | undefined),
        dependency.targetId
      ),
      sourceItemType: mapDependencyEntityTypeToGanttItemType(
        dependency.sourceType,
        dependency.metadata?.rawSourceType as string | undefined
      ),
      targetItemType: mapDependencyEntityTypeToGanttItemType(
        dependency.targetType,
        dependency.metadata?.rawTargetType as string | undefined
      ),
      dependencyType: mapDependencyTypeToGanttType(dependency.dependencyType),
      lagDays: dependency.lagDays,
      createdBy: dependency.createdBy,
      createdAt: dependency.createdAt,
    }));

export const mergeProjectGanttDependencies = (project: Project): GanttDependency[] => {
  const explicit = project.execution?.ganttDependencies || [];
  const merged = new Map<string, GanttDependency>();

  [...normalizeLegacyTaskDependencies(project), ...explicit].forEach((dependency) => {
    const key = [
      dependency.sourceItemId,
      dependency.targetItemId,
      dependency.dependencyType,
      dependency.lagDays || 0,
    ].join('|');
    if (!merged.has(key)) {
      merged.set(key, dependency);
    }
  });

  return Array.from(merged.values());
};

const countVisibleChildren = (itemId: string, items: GanttItem[], expandedIds: Set<string>) =>
  items.filter((item) => item.parentId === itemId).reduce((total, child) => {
    if (!expandedIds.has(itemId)) return total;
    return total + 1 + countVisibleChildren(child.id, items, expandedIds);
  }, 0);

export const buildProjectGanttRows = (params: {
  project: Project;
  tasks: EnrichedTask[];
  mode: GanttPresentationMode;
  expandedIds: Set<string>;
}) => {
  const { project, tasks, mode, expandedIds } = params;
  const items: GanttItem[] = [];
  const projectTasks = tasks.filter((task) => task.projectId === project.id);
  const rootTasks = projectTasks.filter((task) => !task.parentTaskId);

  const phases = [...getProjectExecutionPhases(project)].sort((a, b) => (a.order || 0) - (b.order || 0));

  phases.forEach((phase, phaseIndex) => {
    const phaseTasks = rootTasks.filter((task) => task.phaseId === phase.id);
    const phaseDates = getPhaseTimelineDates(phase, phaseTasks, phase.milestones || []);
    const phaseProgress = getProgressFromPhaseContent(phase.milestones || [], phaseTasks);
    const phaseItemId = buildGanttItemId('phase', phase.id);
    items.push({
      id: phaseItemId,
      rawId: phase.id,
      itemType: 'phase',
      projectId: project.id,
      projectName: project.name,
      title: phase.name,
      subtitle: phase.responsible,
      depth: 0,
      order: phaseIndex,
      isGroup: true,
      isExpandable: true,
      plannedStart: phase.plannedStartDate,
      plannedEnd: phase.plannedEndDate,
      startDate: phaseDates.startDate,
      endDate: phaseDates.endDate,
      progress: phaseProgress,
      assignee: phase.responsible,
      statusLabel: phaseProgress >= 100 ? 'Concluída' : 'Em planejamento',
      health: getHealth({ endDate: phaseDates.endDate, progress: phaseProgress }),
      source: phase,
    });

    (phase.milestones || [])
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .forEach((milestone, milestoneIndex) => {
        const milestoneTasks = phaseTasks.filter((task) => task.milestoneId === milestone.id);
        const milestoneDates = getMilestoneTimelineDates(milestone, milestoneTasks);
        const milestoneProgress = getProgressFromMilestoneTasks(milestoneTasks);
        const milestoneItemId = buildGanttItemId('milestone', milestone.id);

        items.push({
          id: milestoneItemId,
          rawId: milestone.id,
          itemType: 'milestone',
          projectId: project.id,
          projectName: project.name,
          title: milestone.name,
          subtitle: milestone.responsible,
          parentId: phaseItemId,
          depth: 1,
          order: phaseIndex * 1000 + milestoneIndex,
          isGroup: true,
          isExpandable: mode === 'detailed' && milestoneTasks.length > 0,
          plannedStart: milestone.plannedStartDate,
          plannedEnd: milestone.plannedEndDate,
          startDate: milestoneDates.startDate,
          endDate: milestoneDates.endDate,
          progress: milestoneProgress,
          assignee: milestone.responsible,
          statusLabel: milestone.status === 'completed' ? 'Concluído' : 'Marco',
          health: getHealth({ endDate: milestoneDates.endDate, progress: milestoneProgress }),
          milestoneType: milestone.type,
          source: milestone,
        });

        if (mode === 'detailed') {
          milestoneTasks
            .slice()
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .forEach((task, taskIndex) => {
              pushTaskRows(items, task, {
                project,
                depth: 2,
                parentId: milestoneItemId,
                order: phaseIndex * 1000 + milestoneIndex * 100 + taskIndex,
              });
            });
        }
      });
  });

  const visibleRows = flattenVisibleRows(items, expandedIds);
  const itemsById = new Map(items.map((item) => [item.id, item]));
  return {
    items,
    itemsById,
    rows: visibleRows.map((item) => ({
      ...item,
      visibleChildrenCount: countVisibleChildren(item.id, items, expandedIds),
    })),
    dateRange: getGanttDateRange(items),
  };
};

const pushTaskRows = (
  items: GanttItem[],
  task: EnrichedTask,
  params: { project: Project; depth: number; parentId: string; order: number }
) => {
  const range = getTaskTimelineDates(task);
  const itemType: GanttItemType = params.depth > 2 ? 'subtask' : task.isSubtaskNode ? 'subtask' : 'task';
  const itemId = buildGanttItemId(itemType, task.id);
  const children = (task.subtasks || []) as EnrichedTask[];
  const progress = clampProgress(task.progress);

  items.push({
    id: itemId,
    rawId: task.id,
    itemType,
    projectId: params.project.id,
    projectName: params.project.name,
    title: task.title,
    subtitle: task.milestoneName,
    parentId: params.parentId,
    depth: params.depth,
    order: params.order,
    isGroup: children.length > 0,
    isExpandable: children.length > 0,
    startDate: range.startDate,
    endDate: range.endDate,
    progress,
    assignee: task.assignee,
    statusLabel: task.status === 'done' ? 'Concluído' : task.status === 'blocked' ? 'Bloqueado' : 'Em execução',
    health: getHealth({
      endDate: range.endDate,
      progress,
      blocked: Boolean(task.isDependencyBlocked || task.status === 'blocked'),
    }),
    dependencyBlocked: Boolean(task.isDependencyBlocked || task.status === 'blocked'),
    source: task,
  });

  children
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .forEach((child, index) => {
      pushTaskRows(items, child as EnrichedTask, {
        project: params.project,
        depth: params.depth + 1,
        parentId: itemId,
        order: params.order * 100 + index,
      });
    });
};

const flattenVisibleRows = (items: GanttItem[], expandedIds: Set<string>) => {
  const byParent = new Map<string | undefined, GanttItem[]>();
  items.forEach((item) => {
    const siblings = byParent.get(item.parentId) || [];
    siblings.push(item);
    byParent.set(item.parentId, siblings);
  });
  byParent.forEach((siblings, key) => {
    byParent.set(
      key,
      siblings.sort((a, b) => (a.order || 0) - (b.order || 0) || a.title.localeCompare(b.title, 'pt-BR'))
    );
  });

  const visit = (parentId?: string): GanttItem[] =>
    (byParent.get(parentId) || []).flatMap((item) => {
      if (!item.isExpandable || !expandedIds.has(item.id)) return [item];
      return [item, ...visit(item.id)];
    });

  return visit(undefined);
};

export const getGanttDateRange = (items: Array<Pick<GanttItem, 'startDate' | 'endDate'>>) => {
  const starts = items.map((item) => toDate(item.startDate)).filter(Boolean) as Date[];
  const ends = items.map((item) => toDate(item.endDate)).filter(Boolean) as Date[];
  if (starts.length === 0 || ends.length === 0) return null;
  const start = new Date(Math.min(...starts.map((item) => item.getTime())));
  const end = new Date(Math.max(...ends.map((item) => item.getTime())));
  return {
    start,
    end,
    totalDays: daysBetween(start, end),
  };
};

export const buildTimelineColumns = (start: Date, end: Date, zoom: GanttZoomLevel): GanttColumn[] => {
  const columns: GanttColumn[] = [];
  const cursor = new Date(start);
  const todayKey = new Date().toISOString().slice(0, 10);

  while (cursor <= end) {
    const columnStart = new Date(cursor);
    columns.push({
      key: columnStart.toISOString().slice(0, 10),
      label: columnStart.toLocaleDateString('pt-BR', { day: '2-digit' }),
      start: columnStart,
      end: columnStart,
      dayNumber: columnStart.toLocaleDateString('pt-BR', { day: '2-digit' }),
      weekdayLabel: columnStart
        .toLocaleDateString('pt-BR', { weekday: 'short' })
        .replace('.', '')
        .slice(0, zoom === 'month' ? 3 : 2),
      monthKey: `${columnStart.getFullYear()}-${columnStart.getMonth()}`,
      isWeekend: columnStart.getDay() === 0 || columnStart.getDay() === 6,
      isToday: columnStart.toISOString().slice(0, 10) === todayKey,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return columns;
};

export const buildTimelineMonthGroups = (columns: GanttColumn[]): GanttColumnGroup[] => {
  const groups: GanttColumnGroup[] = [];

  columns.forEach((column, index) => {
    const currentGroup = groups[groups.length - 1];
    if (currentGroup && currentGroup.key === column.monthKey) {
      currentGroup.span += 1;
      return;
    }

    groups.push({
      key: column.monthKey,
      label: column.start.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      startIndex: index,
      span: 1,
    });
  });

  return groups;
};

export const getTimelineColumnWidth = (zoom: GanttZoomLevel) => (zoom === 'month' ? 44 : 28);

export const getBarLayout = (
  startDate: string | undefined,
  endDate: string | undefined,
  timelineStart: Date,
  totalDays: number
): GanttBarLayout => {
  const start = toDate(startDate);
  const end = toDate(endDate);
  if (!start || !end) return { left: 0, width: 0 };
  const leftDays = Math.max(0, Math.floor((start.getTime() - timelineStart.getTime()) / DAY));
  const widthDays = Math.max(1, daysBetween(start, end));
  return {
    left: (leftDays / totalDays) * 100,
    width: Math.max((widthDays / totalDays) * 100, 1.4),
  };
};

export const buildConnectorLayouts = (params: {
  dependencies: GanttDependency[];
  visibleRows: GanttRow[];
  timelineStart: Date;
  totalDays: number;
  rowHeight: number;
}) => {
  const rowIndexById = new Map(params.visibleRows.map((row, index) => [row.id, index]));
  return params.dependencies.flatMap((dependency) => {
    const source = params.visibleRows.find((row) => row.id === dependency.sourceItemId);
    const target = params.visibleRows.find((row) => row.id === dependency.targetItemId);
    if (!source || !target) return [];
    const sourceBar = getBarLayout(source.startDate, source.endDate, params.timelineStart, params.totalDays);
    const targetBar = getBarLayout(target.startDate, target.endDate, params.timelineStart, params.totalDays);
    const sourceIndex = rowIndexById.get(source.id) || 0;
    const targetIndex = rowIndexById.get(target.id) || 0;
    const startX = sourceBar.left + sourceBar.width;
    const endX = targetBar.left;
    const startY = sourceIndex * params.rowHeight + params.rowHeight / 2;
    const endY = targetIndex * params.rowHeight + params.rowHeight / 2;
    const middleX = Math.max(startX + 2, (startX + endX) / 2);
    return [{
      id: `connector-${dependency.id}`,
      dependencyId: dependency.id,
      state: hasDateConflict(source, target, dependency) ? 'warning' as const : 'ok' as const,
      path: `M ${startX} ${startY} C ${middleX} ${startY}, ${middleX} ${endY}, ${endX} ${endY}`,
    }];
  });
};

const getAncestorIds = (itemsById: Map<string, GanttItem>, itemId: string) => {
  const ancestors = new Set<string>();
  let cursor = itemsById.get(itemId);
  while (cursor?.parentId) {
    ancestors.add(cursor.parentId);
    cursor = itemsById.get(cursor.parentId);
  }
  return ancestors;
};

const buildDependencyGraph = (dependencies: GanttDependency[]) => {
  const graph = new Map<string, string[]>();
  dependencies.forEach((dependency) => {
    const current = graph.get(dependency.sourceItemId) || [];
    current.push(dependency.targetItemId);
    graph.set(dependency.sourceItemId, current);
  });
  return graph;
};

const hasPath = (graph: Map<string, string[]>, sourceId: string, targetId: string, visited = new Set<string>()): boolean => {
  if (sourceId === targetId) return true;
  if (visited.has(sourceId)) return false;
  visited.add(sourceId);
  return (graph.get(sourceId) || []).some((childId) => hasPath(graph, childId, targetId, visited));
};

export const hasDateConflict = (
  source: Pick<GanttItem, 'title' | 'startDate' | 'endDate'>,
  target: Pick<GanttItem, 'title' | 'startDate' | 'endDate'>,
  dependency: Pick<GanttDependency, 'dependencyType' | 'lagDays'>
) => {
  const lag = dependency.lagDays || 0;
  const sourceStart = toDate(source.startDate);
  const sourceEnd = toDate(source.endDate);
  const targetStart = toDate(target.startDate);
  const targetEnd = toDate(target.endDate);
  if (!targetStart && !targetEnd) return false;

  if (dependency.dependencyType === 'FS' && sourceEnd && targetStart) {
    return targetStart.getTime() < sourceEnd.getTime() + lag * DAY;
  }
  if (dependency.dependencyType === 'SS' && sourceStart && targetStart) {
    return targetStart.getTime() < sourceStart.getTime() + lag * DAY;
  }
  if (dependency.dependencyType === 'FF' && sourceEnd && targetEnd) {
    return targetEnd.getTime() < sourceEnd.getTime() + lag * DAY;
  }
  if (dependency.dependencyType === 'SF' && sourceStart && targetEnd) {
    return targetEnd.getTime() < sourceStart.getTime() + lag * DAY;
  }
  return false;
};

export const validateGanttDependency = (params: {
  input: CreateGanttDependencyInput;
  itemsById: Map<string, GanttItem>;
  dependencies: GanttDependency[];
}) => {
  const { input, itemsById, dependencies } = params;
  const source = itemsById.get(input.sourceItemId);
  const target = itemsById.get(input.targetItemId);
  const conflicts: GanttConflict[] = [];

  if (!source || !target) {
    return { isValid: false, conflicts: [{ type: 'invalid', message: 'Selecione itens válidos para a dependência.' }] };
  }
  if (source.projectId !== target.projectId || source.projectId !== input.projectId) {
    return { isValid: false, conflicts: [{ type: 'invalid', message: 'A dependência precisa ligar itens do mesmo projeto.' }] };
  }
  if (source.id === target.id) {
    return { isValid: false, conflicts: [{ type: 'invalid', message: 'Um item não pode depender dele mesmo.' }] };
  }

  const sourceAncestors = getAncestorIds(itemsById, source.id);
  const targetAncestors = getAncestorIds(itemsById, target.id);
  if (sourceAncestors.has(target.id) || targetAncestors.has(source.id)) {
    conflicts.push({ type: 'invalid', message: 'Não é permitido criar dependência entre pai e filho diretos da mesma hierarquia.' });
  }

  const duplicate = dependencies.some((dependency) =>
    dependency.projectId === input.projectId &&
    dependency.sourceItemId === input.sourceItemId &&
    dependency.targetItemId === input.targetItemId &&
    dependency.dependencyType === input.dependencyType
  );
  if (duplicate) {
    conflicts.push({ type: 'invalid', message: 'Essa dependência já existe.' });
  }

  const candidate: GanttDependency = {
    id: 'candidate',
    projectId: input.projectId,
    sourceItemId: input.sourceItemId,
    targetItemId: input.targetItemId,
    sourceItemType: source.itemType,
    targetItemType: target.itemType,
    dependencyType: input.dependencyType,
    lagDays: input.lagDays,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString(),
  };
  const graph = buildDependencyGraph([...dependencies, candidate]);
  if (hasPath(graph, input.targetItemId, input.sourceItemId)) {
    conflicts.push({ type: 'cycle', message: 'Essa relação cria uma dependência circular.' });
  }
  if (hasDateConflict(source, target, candidate)) {
    conflicts.push({ type: 'date', message: 'As datas atuais entram em conflito com a regra da dependência.' });
  }

  return { isValid: conflicts.every((conflict) => conflict.type === 'date'), conflicts };
};

export const createGanttDependency = (params: {
  input: CreateGanttDependencyInput;
  itemsById: Map<string, GanttItem>;
  dependencies: GanttDependency[];
}) => {
  const validation = validateGanttDependency(params);
  if (!validation.isValid) {
    return { dependency: null, validation };
  }
  const source = params.itemsById.get(params.input.sourceItemId)!;
  const target = params.itemsById.get(params.input.targetItemId)!;
  return {
    dependency: {
      id: `gantt-dependency-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      projectId: params.input.projectId,
      sourceItemId: params.input.sourceItemId,
      targetItemId: params.input.targetItemId,
      sourceItemType: source.itemType,
      targetItemType: target.itemType,
      dependencyType: params.input.dependencyType,
      lagDays: params.input.lagDays,
      createdBy: params.input.createdBy,
      createdAt: new Date().toISOString(),
    },
    validation,
  };
};

export const mapTaskDependencyFromGantt = (
  dependency: GanttDependency
): TaskDependency | null => {
  const sourceId = dependency.sourceItemId.replace(/^[^:]+:/, '');
  const targetId = dependency.targetItemId.replace(/^[^:]+:/, '');
  const sourceType = mapGanttItemTypeToDependencyEntityType(dependency.sourceItemType);
  const targetType = mapGanttItemTypeToDependencyEntityType(dependency.targetItemType);

  return normalizeDependencyRecord({
    id: dependency.id,
    projectId: dependency.projectId,
    sourceId,
    sourceType,
    targetId,
    targetType,
    kind: 'dependency',
    dependencyType: dependency.dependencyType,
    dependencyClass: 'hard',
    externalDependency: false,
    isActive: true,
    createdBy: dependency.createdBy,
    metadata: {
      rawSourceType: dependency.sourceItemType,
      rawTargetType: dependency.targetItemType,
    },
    predecessorTaskId: sourceType === 'task' ? sourceId : undefined,
    successorTaskId: targetType === 'task' ? targetId : undefined,
    lagDays: dependency.lagDays,
    createdAt: dependency.createdAt,
    updatedAt: dependency.createdAt,
  });
};

const mapDependencyTypeToGanttType = (type?: TaskDependency['dependencyType']): GanttDependencyType =>
  type === 'SS' || type === 'FF' || type === 'SF' ? type : 'FS';

const mapGanttItemTypeToDependencyEntityType = (itemType: GanttItemType): DependencyEntityType => {
  if (itemType === 'project') return 'project';
  if (itemType === 'phase' || itemType === 'milestone') return 'phase';
  return 'task';
};

const mapDependencyEntityTypeToGanttItemType = (
  itemType: DependencyEntityType,
  rawItemType?: string
): GanttItemType => {
  if (rawItemType === 'milestone') return 'milestone';
  if (rawItemType === 'subtask') return 'subtask';
  if (itemType === 'project') return 'project';
  if (itemType === 'phase') return 'phase';
  return 'task';
};

export const filterGovernanceProjects = (params: {
  projects: Project[];
  filters: {
    projectIds: string[];
    teams: string[];
    products: string[];
    clients: string[];
    responsibles: string[];
    requesters: string[];
    years: string[];
    statuses: string[];
    startDate?: string;
    endDate?: string;
    hideCancelled: boolean;
  };
}) =>
  params.projects.filter((project) => {
    const range = getGanttDateRange(
      buildProjectGanttRows({
        project,
        tasks: [],
        mode: 'summary',
        expandedIds: new Set(),
      }).items
    );
    if (params.filters.projectIds.length > 0 && !params.filters.projectIds.includes(project.id)) return false;
    if (params.filters.teams.length > 0 && !params.filters.teams.includes(project.group || '')) return false;
    if (params.filters.products.length > 0 && !params.filters.products.includes(project.product || '')) return false;
    if (params.filters.clients.length > 0 && !params.filters.clients.includes(project.client || '')) return false;
    if (params.filters.responsibles.length > 0 && !params.filters.responsibles.includes(project.responsible || '')) return false;
    if (params.filters.requesters.length > 0 && !params.filters.requesters.includes(project.requestedBy || '')) return false;
    if (params.filters.statuses.length > 0 && !params.filters.statuses.includes(String(getProjectGovernancePhaseId(project)))) return false;
    if (params.filters.hideCancelled && getProjectGovernanceSituation(project) === 'cancelado') return false;
    if (params.filters.years.length > 0) {
      const year = String((range?.start || toDate(project.requestDate || project.deadline || ''))?.getFullYear() || '');
      if (!params.filters.years.includes(year)) return false;
    }
    const filterStart = toDate(params.filters.startDate);
    const filterEnd = toDate(params.filters.endDate);
    if (range && filterStart && range.end.getTime() < filterStart.getTime()) return false;
    if (range && filterEnd && range.start.getTime() > filterEnd.getTime()) return false;
    return true;
  });
