import type { EnrichedTask } from '../context/TaskContext';
import type {
  OperationalPriorityEntry,
  OperationalPriorityLane,
  OperationalPrioritySource,
  OperationalPrioritySyncState,
} from '../types';

export interface FlowMeta {
  flowId: string;
  flowLabel: string;
}

interface OperationalPriorityResolver {
  defaultTaskEntries: Map<string, OperationalPriorityEntry>;
  defaultProjectEntries: Map<string, OperationalPriorityEntry>;
  flowTaskEntries: Map<string, OperationalPriorityEntry>;
  flowProjectEntries: Map<string, OperationalPriorityEntry>;
  syncedAt: string;
}

export interface PrioritySegment {
  assigneeId: string;
  lane?: OperationalPriorityLane;
  itemType?: OperationalPriorityEntry['itemType'];
  flowId?: string;
}

const DEFAULT_FLOW_ID = 'flow:unassigned';
const DEFAULT_FLOW_LABEL = 'Operacional';

function buildScopedKey(itemId: string, flowId?: string) {
  return `${flowId || DEFAULT_FLOW_ID}::${itemId}`;
}

function getManualOrder(task: EnrichedTask) {
  return task.order ?? Number.MAX_SAFE_INTEGER;
}

function getComparableTitle(task: EnrichedTask) {
  return task.title || '';
}

function getSafeDueTime(task: EnrichedTask) {
  if (!task.dueDate) return Number.MAX_SAFE_INTEGER;
  const time = new Date(task.dueDate).getTime();
  return Number.isNaN(time) ? Number.MAX_SAFE_INTEGER : time;
}

export function resolveFlowMeta(task: Pick<EnrichedTask, 'flowId' | 'flowLabel' | 'projectGroup' | 'projectName'>): FlowMeta {
  if (task.flowId && task.flowLabel) {
    return {
      flowId: task.flowId,
      flowLabel: task.flowLabel,
    };
  }

  if (task.projectGroup) {
    return {
      flowId: `workspace:${task.projectGroup}`,
      flowLabel: task.projectGroup,
    };
  }

  if (task.projectName) {
    return {
      flowId: `project:${task.projectName}`,
      flowLabel: task.projectName,
    };
  }

  return {
    flowId: DEFAULT_FLOW_ID,
    flowLabel: DEFAULT_FLOW_LABEL,
  };
}

export function matchesPrioritySegment(entry: OperationalPriorityEntry, segment: PrioritySegment) {
  const lane = entry.lane || 'default';

  if (entry.assigneeId !== segment.assigneeId) return false;
  if (segment.lane && lane !== segment.lane) return false;
  if (segment.itemType && entry.itemType !== segment.itemType) return false;
  if (segment.lane === 'flow' && (entry.flowId || DEFAULT_FLOW_ID) !== (segment.flowId || DEFAULT_FLOW_ID)) {
    return false;
  }

  return true;
}

function mapEntryToSyncState(
  entry: OperationalPriorityEntry,
  source: OperationalPrioritySource,
  syncedAt: string,
  lane: OperationalPriorityLane
): Partial<OperationalPrioritySyncState> {
  if (lane === 'flow') {
    return {
      isFlowPrioritized: true,
      flowPriorityOrder: entry.order,
      flowPrioritySource: source,
      flowPrioritySourceItemId: entry.itemId,
      flowPriorityEntryId: entry.id,
      isWeeklyFocus: entry.isWeeklyFocus,
      flowId: entry.flowId,
      flowLabel: entry.flowLabel,
      syncedAt,
    };
  }

  return {
    isOperationallyPrioritized: true,
    operationalPriorityOrder: entry.order,
    prioritySource: source,
    prioritySourceItemId: entry.itemId,
    operationalPriorityEntryId: entry.id,
    isWeeklyFocus: entry.isWeeklyFocus,
    syncedAt,
  };
}

export function buildOperationalPriorityResolver(
  entries: OperationalPriorityEntry[],
  assigneeId?: string
): OperationalPriorityResolver {
  const scopedEntries = entries
    .filter((entry) => !assigneeId || entry.assigneeId === assigneeId)
    .slice()
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));

  const defaultTaskEntries = new Map<string, OperationalPriorityEntry>();
  const defaultProjectEntries = new Map<string, OperationalPriorityEntry>();
  const flowTaskEntries = new Map<string, OperationalPriorityEntry>();
  const flowProjectEntries = new Map<string, OperationalPriorityEntry>();

  scopedEntries.forEach((entry) => {
    const lane = entry.lane || 'default';
    if (lane === 'flow') {
      const key = buildScopedKey(entry.itemId, entry.flowId);
      if (entry.itemType === 'task') {
        flowTaskEntries.set(key, entry);
        return;
      }

      flowProjectEntries.set(key, entry);
      return;
    }

    if (entry.itemType === 'task') {
      defaultTaskEntries.set(entry.itemId, entry);
      return;
    }

    defaultProjectEntries.set(entry.itemId, entry);
  });

  return {
    defaultTaskEntries,
    defaultProjectEntries,
    flowTaskEntries,
    flowProjectEntries,
    syncedAt: new Date().toISOString(),
  };
}

export function getOperationalPriorityStateForTask(
  task: EnrichedTask,
  resolver: OperationalPriorityResolver
): OperationalPrioritySyncState {
  const flowMeta = resolveFlowMeta(task);
  const flowScopedTaskKey = buildScopedKey(task.id, flowMeta.flowId);
  const flowScopedProjectKey = buildScopedKey(task.projectId || '', flowMeta.flowId);

  const defaultDirectEntry = resolver.defaultTaskEntries.get(task.id);
  const defaultProjectEntry = task.projectId
    ? resolver.defaultProjectEntries.get(task.projectId)
    : undefined;
  const flowDirectEntry = resolver.flowTaskEntries.get(flowScopedTaskKey);
  const flowProjectEntry = task.projectId
    ? resolver.flowProjectEntries.get(flowScopedProjectKey)
    : undefined;

  const baseState: OperationalPrioritySyncState = {
    isOperationallyPrioritized: false,
    isFlowPrioritized: false,
    isWeeklyFocus: false,
    flowId: flowMeta.flowId,
    flowLabel: flowMeta.flowLabel,
    syncedAt: resolver.syncedAt,
  };

  const defaultState = defaultDirectEntry
    ? mapEntryToSyncState(defaultDirectEntry, 'governance-task', resolver.syncedAt, 'default')
    : defaultProjectEntry
      ? mapEntryToSyncState(defaultProjectEntry, 'governance-project', resolver.syncedAt, 'default')
      : {};

  const flowState = flowDirectEntry
    ? mapEntryToSyncState(flowDirectEntry, 'governance-task', resolver.syncedAt, 'flow')
    : flowProjectEntry
      ? mapEntryToSyncState(flowProjectEntry, 'governance-project', resolver.syncedAt, 'flow')
      : {};

  return {
    ...baseState,
    ...defaultState,
    ...flowState,
    isWeeklyFocus:
      Boolean(defaultDirectEntry?.isWeeklyFocus) ||
      Boolean(defaultProjectEntry?.isWeeklyFocus) ||
      Boolean(flowDirectEntry?.isWeeklyFocus) ||
      Boolean(flowProjectEntry?.isWeeklyFocus),
  };
}

export function syncOperationalPriorityForTasks(
  tasks: EnrichedTask[],
  entries: OperationalPriorityEntry[],
  assigneeId?: string
): EnrichedTask[] {
  const resolver = buildOperationalPriorityResolver(entries, assigneeId);

  return tasks.map((task) => ({
    ...task,
    ...getOperationalPriorityStateForTask(task, resolver),
  }));
}

export function compareTasksByOperationalPriority(a: EnrichedTask, b: EnrichedTask) {
  const aPrioritized = Boolean(a.isOperationallyPrioritized);
  const bPrioritized = Boolean(b.isOperationallyPrioritized);

  if (aPrioritized !== bPrioritized) {
    return aPrioritized ? -1 : 1;
  }

  if (aPrioritized && bPrioritized) {
    const byOfficialOrder =
      (a.operationalPriorityOrder ?? Number.MAX_SAFE_INTEGER) -
      (b.operationalPriorityOrder ?? Number.MAX_SAFE_INTEGER);

    if (byOfficialOrder !== 0) {
      return byOfficialOrder;
    }
  }

  const byManualOrder = getManualOrder(a) - getManualOrder(b);
  if (byManualOrder !== 0) {
    return byManualOrder;
  }

  return getComparableTitle(a).localeCompare(getComparableTitle(b), 'pt-BR');
}

export function compareTasksByFlowPriority(a: EnrichedTask, b: EnrichedTask) {
  const aFlowPrioritized = Boolean(a.isFlowPrioritized);
  const bFlowPrioritized = Boolean(b.isFlowPrioritized);

  if (aFlowPrioritized !== bFlowPrioritized) {
    return aFlowPrioritized ? -1 : 1;
  }

  if (aFlowPrioritized && bFlowPrioritized) {
    const byFlowOrder =
      (a.flowPriorityOrder ?? Number.MAX_SAFE_INTEGER) -
      (b.flowPriorityOrder ?? Number.MAX_SAFE_INTEGER);

    if (byFlowOrder !== 0) {
      return byFlowOrder;
    }
  }

  return compareTasksByOperationalPriority(a, b);
}

export function compareTasksByDueDate(a: EnrichedTask, b: EnrichedTask) {
  const byDueDate = getSafeDueTime(a) - getSafeDueTime(b);
  if (byDueDate !== 0) {
    return byDueDate;
  }

  return compareTasksByOperationalPriority(a, b);
}

export function sortTasksByOperationalPriority(tasks: EnrichedTask[]) {
  return tasks.slice().sort(compareTasksByOperationalPriority);
}

export function sortTasksByFlowPriority(tasks: EnrichedTask[]) {
  return tasks.slice().sort(compareTasksByFlowPriority);
}

export function sortTasksByDueDate(tasks: EnrichedTask[]) {
  return tasks.slice().sort(compareTasksByDueDate);
}

export function partitionTasksByOperationalPriority(tasks: EnrichedTask[]) {
  return {
    prioritized: tasks.filter((task) => task.isOperationallyPrioritized),
    manual: tasks.filter((task) => !task.isOperationallyPrioritized),
  };
}

export function groupTasksByFlow(tasks: EnrichedTask[]) {
  const groups = tasks.reduce<Record<string, { flow: FlowMeta; tasks: EnrichedTask[] }>>(
    (accumulator, task) => {
      const flow = resolveFlowMeta(task);
      if (!accumulator[flow.flowId]) {
        accumulator[flow.flowId] = {
          flow,
          tasks: [],
        };
      }

      accumulator[flow.flowId].tasks.push(task);
      return accumulator;
    },
    {}
  );

  return Object.values(groups)
    .map((group) => ({
      ...group,
      tasks: sortTasksByFlowPriority(group.tasks),
    }))
    .sort((a, b) => a.flow.flowLabel.localeCompare(b.flow.flowLabel, 'pt-BR'));
}
