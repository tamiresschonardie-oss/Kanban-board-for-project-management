import type { EnrichedTask } from '../context/TaskContext';
import type { Project } from '../types';
import { getProjectExecutionPhases, getProjectMetrics } from './projectSelectors';
import { isTaskDoneStatus, isTaskInProgressStatus } from './taskStatus';

export type ProjectHealthStatus = 'healthy' | 'attention' | 'critical';

export interface ProjectHealthItem {
  projectId: string;
  projectName: string;
  health: ProjectHealthStatus;
  overdueTasks: number;
  blockedTasks: number;
  dependencyPending: number;
  delayedPhases: number;
  responsible?: string;
  progress: number;
}

export interface SkillInsightItem {
  skillId: string;
  skillName: string;
  status?: string;
  projectCount: number;
  openTasks: number;
  inProgressTasks: number;
}

export interface UserPriorityItem {
  id: string;
  title: string;
  dueDate?: string;
  priority?: string;
  projectName?: string;
  reason: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function isOverdue(date?: string) {
  if (!date) return false;
  return new Date(date).getTime() < Date.now();
}

function isToday(date?: string) {
  if (!date) return false;
  const today = new Date();
  const target = new Date(date);
  return today.toDateString() === target.toDateString();
}

function isTomorrow(date?: string) {
  if (!date) return false;
  const tomorrow = new Date(Date.now() + DAY_MS);
  const target = new Date(date);
  return tomorrow.toDateString() === target.toDateString();
}

function isDueSoon(date?: string, days = 7) {
  if (!date) return false;
  const diff = new Date(date).getTime() - Date.now();
  return diff >= 0 && diff <= days * DAY_MS;
}

export function buildProjectHealth(projects: Project[], tasks: EnrichedTask[]): ProjectHealthItem[] {
  return projects.map((project) => {
    const relatedTasks = tasks.filter((task) => task.projectId === project.id);
    const overdueTasks = relatedTasks.filter((task) => !isTaskDoneStatus(task.status) && isOverdue(task.dueDate)).length;
    const blockedTasks = relatedTasks.filter((task) => task.isDependencyBlocked).length;
    const dependencyPending = relatedTasks.filter(
      (task) => (task.predecessorDependencies?.length || 0) > 0 && !isTaskDoneStatus(task.status)
    ).length;
    const delayedPhases = getProjectExecutionPhases(project).filter((phase) => {
      const phaseTasks = phase.milestones.flatMap((milestone) => milestone.tasks);
      const hasOpenOverdueTask = phaseTasks.some((task) => !isTaskDoneStatus(task.status) && isOverdue(task.dueDate));
      const plannedEnd = phase.plannedEndDate || phase.endDate;
      return hasOpenOverdueTask || (!!plannedEnd && new Date(plannedEnd).getTime() < Date.now() && phaseTasks.some((task) => !isTaskDoneStatus(task.status)));
    }).length;

    const issueScore = overdueTasks * 2 + blockedTasks * 2 + dependencyPending + delayedPhases * 2;
    const health: ProjectHealthStatus =
      issueScore >= 5 ? 'critical' : issueScore >= 2 ? 'attention' : 'healthy';

    return {
      projectId: project.id,
      projectName: project.name,
      health,
      overdueTasks,
      blockedTasks,
      dependencyPending,
      delayedPhases,
      responsible: project.responsible,
      progress: getProjectMetrics(project).progress,
    };
  });
}

export function buildTeamCapacity(tasks: EnrichedTask[]) {
  const grouped = tasks.reduce<Record<string, { total: number; inProgress: number; overdue: number }>>(
    (acc, task) => {
      const owner = task.assignee || 'Sem responsável';
      if (!acc[owner]) {
        acc[owner] = { total: 0, inProgress: 0, overdue: 0 };
      }
      acc[owner].total += 1;
      acc[owner].inProgress += isTaskInProgressStatus(task.status) ? 1 : 0;
      acc[owner].overdue += !isTaskDoneStatus(task.status) && isOverdue(task.dueDate) ? 1 : 0;
      return acc;
    },
    {}
  );

  return Object.entries(grouped)
    .map(([name, values]) => ({
      name,
      ...values,
      overload: values.inProgress >= 6 || values.overdue >= 3,
    }))
    .sort((a, b) => b.inProgress - a.inProgress || b.overdue - a.overdue);
}

export function buildSkillInsights(projects: Project[], tasks: EnrichedTask[]): SkillInsightItem[] {
  const skillMap = new Map<string, SkillInsightItem>();

  projects.forEach((project) => {
    if (!project.skillId) return;
    const current = skillMap.get(project.skillId) || {
      skillId: project.skillId,
      skillName: project.skillName || 'Habilidade sem nome',
      status: undefined,
      projectCount: 0,
      openTasks: 0,
      inProgressTasks: 0,
    };
    current.projectCount += 1;
    skillMap.set(project.skillId, current);
  });

  tasks.forEach((task) => {
    if (!task.skillId) return;
    const current = skillMap.get(task.skillId) || {
      skillId: task.skillId,
      skillName: task.skillName || 'Habilidade sem nome',
      status: undefined,
      projectCount: 0,
      openTasks: 0,
      inProgressTasks: 0,
    };
    if (!isTaskDoneStatus(task.status)) current.openTasks += 1;
    if (isTaskInProgressStatus(task.status)) current.inProgressTasks += 1;
    skillMap.set(task.skillId, current);
  });

  return [...skillMap.values()].sort((a, b) => b.openTasks - a.openTasks || b.projectCount - a.projectCount);
}

export function buildUserPriorityItems(tasks: EnrichedTask[]): UserPriorityItem[] {
  return tasks
    .filter((task) => !isTaskDoneStatus(task.status))
    .map((task) => {
      let reason = 'Fila operacional';
      if (task.isDependencyBlocked) {
        reason = 'Bloqueada por dependência';
      } else if (isOverdue(task.dueDate)) {
        reason = 'Vencida';
      } else if (isToday(task.dueDate)) {
        reason = 'Vence hoje';
      } else if (isTomorrow(task.dueDate)) {
        reason = 'Vence amanhã';
      } else if (task.priority === 'high') {
        reason = 'Alta prioridade';
      } else if (isDueSoon(task.dueDate)) {
        reason = 'Próximos 7 dias';
      }
      return {
        id: task.id,
        title: task.title,
        dueDate: task.dueDate,
        priority: task.priority,
        projectName: task.projectName,
        reason,
      };
    })
    .sort((a, b) => {
      const reasonScore = (item: UserPriorityItem) =>
        item.reason === 'Vencida'
          ? 0
          : item.reason === 'Vence hoje'
            ? 1
            : item.reason === 'Bloqueada por dependência'
              ? 2
              : item.reason === 'Vence amanhã'
                ? 3
                : item.reason === 'Alta prioridade'
                  ? 4
                  : 5;
      return reasonScore(a) - reasonScore(b) || (a.dueDate || '').localeCompare(b.dueDate || '');
    })
    .slice(0, 8);
}

export function buildWeeklyLoad(tasks: EnrichedTask[]) {
  const buckets = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((label, index) => ({
    label,
    value: 0,
    index,
  }));

  tasks.forEach((task) => {
    const date = task.dueDate || task.startDate;
    if (!date) return;
    const weekday = new Date(date).getDay();
    const normalized = weekday === 0 ? 6 : weekday - 1;
    buckets[normalized].value += 1;
  });

  return buckets;
}
