import type { EnrichedTask } from '../context/TaskContext';
import type { KanbanColumn } from '../context/UserKanbanContext';
import type { Project, User } from '../types';
import { getTaskNodeProgress, getTaskNodeTotalTrackedSeconds } from '../selectors/taskSelectors';
import {
  buildUserPriorityItems,
  buildWeeklyLoad,
} from './dashboardInsights';
import { getTaskVisualColumn, isTaskBlockedStatus, isTaskInProgressStatus } from './taskStatus';
import { formatDurationClock } from './timeTracking';

export interface DashboardMetric {
  label: string;
  value: number;
}

export interface MyTasksDashboardSummary {
  total: number;
  inProgress: number;
  completed: number;
  blocked: number;
  overdue: number;
  totalTrackedSeconds: number;
}

export interface MyTasksDashboardData {
  summary: MyTasksDashboardSummary;
  byStatus: DashboardMetric[];
  byProject: DashboardMetric[];
  byPriority: DashboardMetric[];
  byTeam: DashboardMetric[];
  byFlow: DashboardMetric[];
  bySkill: DashboardMetric[];
  weeklyLoad: DashboardMetric[];
  priorityToday: Array<{
    id: string;
    title: string;
    dueDate?: string;
    priority?: string;
    projectName?: string;
    reason: string;
  }>;
  blockedTasks: Array<{
    id: string;
    title: string;
    reason?: string | null;
    projectName?: string;
  }>;
}

const PERSONAL_TASK_LABEL = 'Pessoais';
const SPRINT_TASK_LABEL = 'Sprint';
const NO_TEAM_LABEL = 'Sem equipe';

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

function sortMetrics(items: DashboardMetric[]) {
  return items.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'pt-BR'));
}

function isTaskBlocked(task: EnrichedTask) {
  const values = [
    task.title,
    task.description,
    ...(task.tags || []),
    ...(task.checklistItems || []).map((item) => item.title),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return values.includes('bloquead') || values.includes('imped');
}

function getStatusLabel(task: EnrichedTask, columns: KanbanColumn[]) {
  const personalStatus = getTaskVisualColumn(task.status, task.completed);
  const matchedColumn = columns.find((column) => column.id === personalStatus);
  if (matchedColumn) return matchedColumn.name;

  switch (personalStatus) {
    case 'in-progress':
      return 'Em andamento';
    case 'review':
      return 'Em revisão';
    case 'testing':
      return 'Em testes';
    case 'done':
      return 'Concluído';
    case 'backlog':
    default:
      return 'Backlog';
  }
}

function getProjectLabel(task: EnrichedTask) {
  if (task.projectName) return task.projectName;
  if (task.taskType === 'sprint') return SPRINT_TASK_LABEL;
  return PERSONAL_TASK_LABEL;
}

function getTeamLabel(task: EnrichedTask, projects: Project[], currentUser?: User) {
  if (task.projectId) {
    const relatedProject = projects.find((project) => project.id === task.projectId);
    return relatedProject?.group || NO_TEAM_LABEL;
  }

  if (task.taskType === 'sprint') {
    return currentUser?.team || SPRINT_TASK_LABEL;
  }

  return PERSONAL_TASK_LABEL;
}

function getFlowLabel(task: EnrichedTask) {
  return task.flowLabel || task.projectGroup || task.projectName || PERSONAL_TASK_LABEL;
}

function getSkillLabel(task: EnrichedTask) {
  return task.skillName || 'Sem habilidade';
}

function countByLabel(items: EnrichedTask[], getLabel: (task: EnrichedTask) => string) {
  const grouped = items.reduce<Record<string, number>>((accumulator, task) => {
    const label = getLabel(task);
    accumulator[label] = (accumulator[label] || 0) + 1;
    return accumulator;
  }, {});

  return sortMetrics(
    Object.entries(grouped).map(([label, value]) => ({
      label,
      value,
    }))
  );
}

export function formatTrackedTime(totalTrackedSeconds: number) {
  return formatDurationClock(totalTrackedSeconds);
}

export function buildMyTasksDashboardData(
  tasks: EnrichedTask[],
  options: {
    columns: KanbanColumn[];
    projects: Project[];
    currentUser?: User;
  }
): MyTasksDashboardData {
  const { columns, projects, currentUser } = options;
  const summary = tasks.reduce<MyTasksDashboardSummary>(
    (accumulator, task) => {
      const isCompleted = getTaskNodeProgress(task) === 100;
      const isOverdue =
        !!task.dueDate && !isCompleted && new Date(task.dueDate).getTime() < Date.now();

      accumulator.total += 1;
      accumulator.completed += isCompleted ? 1 : 0;
      accumulator.inProgress += isTaskInProgressStatus(task.status) ? 1 : 0;
      accumulator.blocked += isTaskBlockedStatus(task.status, task.completed) || isTaskBlocked(task) ? 1 : 0;
      accumulator.overdue += isOverdue ? 1 : 0;
      accumulator.totalTrackedSeconds += getTaskNodeTotalTrackedSeconds(task);
      return accumulator;
    },
    {
      total: 0,
      inProgress: 0,
      completed: 0,
      blocked: 0,
      overdue: 0,
      totalTrackedSeconds: 0,
    }
  );

  return {
    summary,
    byStatus: countByLabel(tasks, (task) => getStatusLabel(task, columns)),
    byProject: countByLabel(tasks, getProjectLabel),
    byPriority: sortMetrics(
      Object.entries(
        tasks.reduce<Record<string, number>>((accumulator, task) => {
          const key = task.priority || 'medium';
          accumulator[key] = (accumulator[key] || 0) + 1;
          return accumulator;
        }, {})
      ).map(([priority, value]) => ({
        label: PRIORITY_LABELS[priority] || priority,
        value,
      }))
    ),
    byTeam: countByLabel(tasks, (task) => getTeamLabel(task, projects, currentUser)),
    byFlow: countByLabel(tasks, getFlowLabel),
    bySkill: countByLabel(tasks, getSkillLabel),
    weeklyLoad: buildWeeklyLoad(tasks).map(({ label, value }) => ({ label, value })),
    priorityToday: buildUserPriorityItems(tasks),
    blockedTasks: tasks
      .filter((task) => task.isDependencyBlocked)
      .slice(0, 8)
      .map((task) => ({
        id: task.id,
        title: task.title,
        reason: task.dependencyBlockedReason,
        projectName: task.projectName,
      })),
  };
}
