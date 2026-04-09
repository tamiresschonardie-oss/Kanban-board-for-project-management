import { ChecklistItem, Subtask, TaskScopeStatus, TimeLog, User, WBSTask } from '../types';
import type { EnrichedTask } from '../context/TaskContext';
import type { Project } from '../types';
import { getTimeLogDurationSeconds } from '../utils/timeTracking';
import {
  getTaskStatusProgressValue,
  getTaskVisualColumn,
  isTaskDoneStatus,
  isTaskInProgressStatus,
  normalizeTaskStatus,
} from '../utils/taskStatus';

export type TaskNode = WBSTask | Subtask;
export type TaskOriginFilter = 'linked' | 'independent';

export interface TaskFilterState {
  searchTerm: string;
  projectIds: string[];
  teams: string[];
  assignees: string[];
  clients: string[];
  products: string[];
  priorities: string[];
  statuses: string[];
  projectStatuses: string[];
  origins: TaskOriginFilter[];
}

export interface TaskFilterOptions {
  projects: Array<{ value: string; label: string }>;
  teams: string[];
  assignees: string[];
  clients: string[];
  products: string[];
  priorities: string[];
  projectStatuses: string[];
  origins: Array<{ value: TaskOriginFilter; label: string }>;
}

export const DEFAULT_TASK_FILTERS: TaskFilterState = {
  searchTerm: '',
  projectIds: [],
  teams: [],
  assignees: [],
  clients: [],
  products: [],
  priorities: [],
  statuses: [],
  projectStatuses: [],
  origins: [],
};

export interface TaskHierarchyNode {
  id: string;
  title: string;
  parentId?: string;
  isRoot: boolean;
}

export function findTaskNode(rootTask: WBSTask, nodeId?: string): TaskNode | null {
  if (!nodeId || nodeId === rootTask.id) return rootTask;

  const visit = (items: Subtask[]): TaskNode | null => {
    for (const item of items) {
      if (item.id === nodeId) return item;
      const nested = visit(item.subtasks || []);
      if (nested) return nested;
    }
    return null;
  };

  return visit(rootTask.subtasks || []);
}

export function buildTaskHierarchy(rootTask: WBSTask, nodeId?: string): TaskHierarchyNode[] {
  const targetId = nodeId || rootTask.id;
  const path: TaskHierarchyNode[] = [];

  const visit = (node: TaskNode, parentId?: string): boolean => {
    const current: TaskHierarchyNode = {
      id: node.id,
      title: 'title' in node ? node.title : rootTask.title,
      parentId,
      isRoot: node.id === rootTask.id,
    };

    if (node.id === targetId) {
      path.push(current);
      return true;
    }

    const subtasks = 'subtasks' in node ? node.subtasks || [] : [];
    for (const subtask of subtasks) {
      if (visit(subtask, node.id)) {
        path.unshift(current);
        return true;
      }
    }

    return false;
  };

  visit(rootTask);
  return path.length > 0
    ? path
    : [{ id: rootTask.id, title: rootTask.title, isRoot: true }];
}

export function insertSubtask(
  items: Subtask[],
  parentId: string | undefined,
  newSubtask: Subtask
): Subtask[] {
  if (!parentId) {
    return [...items, newSubtask];
  }

  return items.map((item) => {
    if (item.id === parentId) {
      return {
        ...item,
        subtasks: [...(item.subtasks || []), newSubtask],
      };
    }

    if (item.subtasks && item.subtasks.length > 0) {
      return {
        ...item,
        subtasks: insertSubtask(item.subtasks, parentId, newSubtask),
      };
    }

    return item;
  });
}

export function updateSubtaskTree(
  items: Subtask[],
  subtaskId: string,
  updater: (subtask: Subtask) => Subtask
): Subtask[] {
  return items.map((item) => {
    if (item.id === subtaskId) {
      return updater(item);
    }

    if (item.subtasks && item.subtasks.length > 0) {
      return {
        ...item,
        subtasks: updateSubtaskTree(item.subtasks, subtaskId, updater),
      };
    }

    return item;
  });
}

export function removeSubtaskTree(items: Subtask[], subtaskId: string): Subtask[] {
  return items
    .filter((item) => item.id !== subtaskId)
    .map((item) => ({
      ...item,
      subtasks: removeSubtaskTree(item.subtasks || [], subtaskId),
    }));
}

export function getChecklistProgress(node: TaskNode) {
  const checklistItems = node.checklistItems || [];
  const completed = checklistItems.filter((item) => item.completed).length;
  return {
    completed,
    total: checklistItems.length,
    percentage:
      checklistItems.length > 0
        ? Math.round((completed / checklistItems.length) * 100)
        : 0,
  };
}

export function getTimeLogSeconds(log: TimeLog): number {
  return getTimeLogDurationSeconds(log);
}

export function getTimeLogMinutes(log: TimeLog): number {
  return getTimeLogSeconds(log) / 60;
}

export function getTaskNodeOwnTrackedSeconds(node: TaskNode): number {
  return (node.timeLogs || []).reduce((total, log) => total + getTimeLogSeconds(log), 0);
}

export function getTaskNodeOwnTrackedMinutes(node: TaskNode): number {
  return getTaskNodeOwnTrackedSeconds(node) / 60;
}

export function getTaskNodeTotalTrackedSeconds(node: TaskNode): number {
  const childSeconds = (node.subtasks || []).reduce(
    (total, subtask) => total + getTaskNodeTotalTrackedSeconds(subtask),
    0
  );
  return getTaskNodeOwnTrackedSeconds(node) + childSeconds;
}

export function getTaskNodeTotalTrackedMinutes(node: TaskNode): number {
  return getTaskNodeTotalTrackedSeconds(node) / 60;
}

export function getTaskNodeScopeStatus(node: TaskNode): TaskScopeStatus {
  return node.scopeStatus || 'active';
}

export function isTaskNodeDeleted(node: TaskNode): boolean {
  return getTaskNodeScopeStatus(node) === 'deleted';
}

export function isTaskNodeRemovedFromOperationalScope(node: TaskNode): boolean {
  return ['not_applicable', 'out_of_scope', 'discarded', 'deleted'].includes(
    getTaskNodeScopeStatus(node)
  );
}

export function isTaskNodeStructurallyResolved(node: TaskNode): boolean {
  return ['not_applicable', 'out_of_scope', 'discarded'].includes(getTaskNodeScopeStatus(node));
}

export function isTaskNodeOperationallyVisible(node: TaskNode): boolean {
  return getTaskNodeScopeStatus(node) === 'active';
}

export function isTaskNodeEffectivelyComplete(node: TaskNode): boolean {
  if (isTaskNodeDeleted(node) || isTaskNodeStructurallyResolved(node)) {
    return true;
  }

  const selfCompleted = isTaskDoneStatus(node.status, node.completed);

  const subtasks = node.subtasks || [];
  const descendantsCompleted = subtasks.every((subtask) => isTaskNodeEffectivelyComplete(subtask));
  return selfCompleted && descendantsCompleted;
}

export function canTaskNodeBeCompleted(node: TaskNode): boolean {
  if (isTaskNodeDeleted(node) || isTaskNodeStructurallyResolved(node)) {
    return true;
  }

  return (node.subtasks || []).every((subtask) => isTaskNodeEffectivelyComplete(subtask));
}

function getNodeStatusProgress(node: TaskNode): number {
  return getTaskStatusProgressValue(node.status, node.completed);
}

export function getTaskNodeProgress(node: TaskNode): number {
  if (isTaskNodeDeleted(node) || isTaskNodeStructurallyResolved(node)) {
    return 100;
  }

  const progressParts: number[] = [getNodeStatusProgress(node)];
  const subtasks = node.subtasks || [];

  if (subtasks.length > 0) {
    const subtaskAverage =
      subtasks.reduce((total, subtask) => total + getTaskNodeProgress(subtask), 0) /
      subtasks.length;
    progressParts.push(Math.round(subtaskAverage));
  }

  const checklist = getChecklistProgress(node);
  if (checklist.total > 0) {
    progressParts.push(checklist.percentage);
  }

  return Math.round(
    progressParts.reduce((total, value) => total + value, 0) / progressParts.length
  );
}

export function createChecklistItem(title: string): ChecklistItem {
  return {
    id: `checklist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    completed: false,
  };
}

const uniqueSorted = (items: Array<string | undefined>) =>
  Array.from(new Set(items.filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));

export function getTaskFilterOptions(tasks: EnrichedTask[], projects: Project[]): TaskFilterOptions {
  const projectMap = new Map(projects.map((project) => [project.id, project]));

  return {
    projects: Array.from(
      new Map(
        tasks
          .filter((task) => task.projectId && task.projectName)
          .map((task) => [task.projectId as string, { value: task.projectId as string, label: task.projectName as string }])
      ).values()
    ).sort((a, b) => a.label.localeCompare(b.label)),
    teams: uniqueSorted(
      tasks.map((task) => {
        const relatedProject = task.projectId ? projectMap.get(task.projectId) : undefined;
        return task.projectGroup || relatedProject?.group;
      })
    ),
    assignees: uniqueSorted(tasks.map((task) => task.assignee)),
    clients: uniqueSorted(
      tasks.map((task) => (task.projectId ? projectMap.get(task.projectId)?.client : undefined))
    ),
    products: uniqueSorted(
      tasks.map((task) => (task.projectId ? projectMap.get(task.projectId)?.product : undefined))
    ),
    priorities: ['high', 'medium', 'low'],
    projectStatuses: uniqueSorted(tasks.map((task) => normalizeTaskStatus(task.status))),
    origins: [
      { value: 'linked', label: 'Projeto' },
      { value: 'independent', label: 'Operacional' },
    ],
  };
}

export function filterTasks(
  tasks: EnrichedTask[],
  projects: Project[],
  filters: TaskFilterState
): EnrichedTask[] {
  const projectMap = new Map(projects.map((project) => [project.id, project]));

  return tasks.filter((task) => {
    if (
      filters.searchTerm &&
      !task.title.toLowerCase().includes(filters.searchTerm.toLowerCase())
    ) {
      return false;
    }

    if (filters.projectIds.length > 0) {
      if (!task.projectId || !filters.projectIds.includes(task.projectId)) {
        return false;
      }
    }

    if (filters.assignees.length > 0 && !filters.assignees.includes(task.assignee || '')) {
      return false;
    }

    const relatedProject = task.projectId ? projectMap.get(task.projectId) : undefined;
    const relatedTeam = task.projectGroup || relatedProject?.group || '';

    if (filters.teams.length > 0 && !filters.teams.includes(relatedTeam)) {
      return false;
    }

    if (filters.clients.length > 0 && !filters.clients.includes(relatedProject?.client || '')) {
      return false;
    }

    if (filters.products.length > 0 && !filters.products.includes(relatedProject?.product || '')) {
      return false;
    }

    if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority || '')) {
      return false;
    }

    const personalColumn = task.personalStatus || getTaskVisualColumn(task.status);
    if (filters.statuses.length > 0 && !filters.statuses.includes(personalColumn)) {
      return false;
    }

    const projectStatus = normalizeTaskStatus(task.status);
    if (filters.projectStatuses.length > 0 && !filters.projectStatuses.includes(projectStatus)) {
      return false;
    }

    if (filters.origins.length > 0) {
      const origin: TaskOriginFilter = task.isLinkedToProject ? 'linked' : 'independent';
      if (!filters.origins.includes(origin)) {
        return false;
      }
    }

    return true;
  });
}

function doesTaskBelongToUser(task: EnrichedTask, user?: User) {
  if (!user || user.status !== 'active') return false;
  const matchesById = !!task.assigneeId && task.assigneeId === user.id;
  const matchesByName = !!task.assignee && task.assignee === user.name;
  return matchesById || matchesByName;
}

export function getTasksAssignedToUser(tasks: EnrichedTask[], user?: User | string) {
  if (!user) return [];

  if (typeof user === 'string') {
    return tasks.filter((task) => task.assignee === user);
  }

  return tasks.filter((task) => doesTaskBelongToUser(task, user));
}

export function isTaskCurrentlyAssignedToUser(task: EnrichedTask, user?: User) {
  return doesTaskBelongToUser(task, user);
}

export function hasUserEverBeenResponsibleForTask(task: EnrichedTask, user?: User) {
  if (!user || user.status !== 'active') return false;
  return (task.assigneeHistory || []).some(
    (entry) => entry.fromAssignee === user.name || entry.toAssignee === user.name
  );
}

export function isTaskFollowedByUser(task: EnrichedTask, user?: User) {
  if (!user || user.status !== 'active') return false;
  if ((task.followerUserIds || []).includes(user.id)) return true;
  if ((task.stakeholders || []).includes(user.name)) return true;
  return hasUserEverBeenResponsibleForTask(task, user);
}

export function getTaskOperationalStats(tasks: EnrichedTask[], referenceDate = new Date()) {
  const completed = tasks.filter((task) => getTaskNodeProgress(task) === 100).length;
  const overdue = tasks.filter((task) => {
    if (!task.dueDate || getTaskNodeProgress(task) === 100) return false;
    return new Date(task.dueDate).getTime() < referenceDate.getTime();
  }).length;
  const dueToday = tasks.filter((task) => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return (
      dueDate.getDate() === referenceDate.getDate() &&
      dueDate.getMonth() === referenceDate.getMonth() &&
      dueDate.getFullYear() === referenceDate.getFullYear()
    );
  }).length;
  const upcoming = tasks.filter((task) => {
    if (!task.dueDate || getTaskNodeProgress(task) === 100) return false;
    const dueDate = new Date(task.dueDate);
    const limit = new Date(referenceDate);
    limit.setDate(limit.getDate() + 7);
    return dueDate.getTime() >= referenceDate.getTime() && dueDate.getTime() <= limit.getTime();
  }).length;
  const inProgress = tasks.filter((task) => isTaskInProgressStatus(task.status)).length;
  const trackedHours = Number(
    (tasks.reduce((total, task) => total + getTaskNodeTotalTrackedMinutes(task), 0) / 60).toFixed(2)
  );

  return {
    total: tasks.length,
    completed,
    overdue,
    dueToday,
    upcoming,
    inProgress,
    trackedHours,
  };
}

export function getTasksLinkedToProjects(tasks: EnrichedTask[], projectIds: string[]) {
  const projectIdSet = new Set(projectIds);
  return tasks.filter((task) => task.projectId && projectIdSet.has(task.projectId));
}

export function getTaskProductivityByAssignee(tasks: EnrichedTask[], limit = 8) {
  const grouped = tasks.reduce<
    Record<
      string,
      { assignee: string; total: number; completed: number; inProgress: number; trackedMinutes: number }
    >
  >((accumulator, task) => {
    const assignee = task.assignee || 'Sem responsável';
    if (!accumulator[assignee]) {
      accumulator[assignee] = {
        assignee,
        total: 0,
        completed: 0,
        inProgress: 0,
        trackedMinutes: 0,
      };
    }

    accumulator[assignee].total += 1;
    accumulator[assignee].trackedMinutes += getTaskNodeTotalTrackedMinutes(task);

    if (getTaskNodeProgress(task) === 100) {
      accumulator[assignee].completed += 1;
    }

    if (isTaskInProgressStatus(task.status)) {
      accumulator[assignee].inProgress += 1;
    }

    return accumulator;
  }, {});

  return Object.values(grouped)
    .map((item) => ({
      ...item,
      trackedHours: Number((item.trackedMinutes / 60).toFixed(2)),
    }))
    .sort((a, b) => {
      if (b.trackedHours !== a.trackedHours) return b.trackedHours - a.trackedHours;
      return b.total - a.total;
    })
    .slice(0, limit);
}

export function getInProgressTaskCount(tasks: EnrichedTask[]) {
  return tasks.filter((task) => isTaskInProgressStatus(task.status)).length;
}

export function getTaskCountsByClient(tasks: EnrichedTask[], projects: Project[]) {
  const projectMap = new Map(projects.map((project) => [project.id, project]));
  const grouped = tasks.reduce<Record<string, number>>((accumulator, task) => {
    if (!task.projectId) return accumulator;
    const client = projectMap.get(task.projectId)?.client;
    if (!client) return accumulator;
    accumulator[client] = (accumulator[client] || 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(grouped)
    .map(([client, count]) => ({ client, count }))
    .sort((a, b) => b.count - a.count || a.client.localeCompare(b.client));
}
