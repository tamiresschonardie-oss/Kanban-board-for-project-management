import type { EnrichedTask } from '../context/TaskContext';
import {
  AnalyticsFilters,
  AnalyticsFlowResponse,
  AnalyticsOverview,
  AnalyticsPerformanceUsersResponse,
  AnalyticsProjectItem,
  AnalyticsProjectsResponse,
  CostSettings,
  Project,
  User,
} from '../types';
import { getTaskNodeTotalTrackedMinutes } from '../selectors/taskSelectors';
import { buildPortfolioCostReports } from './projectCosts';
import { getTimeLogDurationSeconds } from './timeTracking';
import { getUserTeams } from './userTeams';
import {
  getProjectFilterYear,
  getProjectMetrics,
  isProjectDelivered,
  isProjectDueSoon,
  isProjectInProgress,
  isProjectOverdue,
} from './projectSelectors';
import { isTaskDoneStatus, isTaskInProgressStatus } from './taskStatus';
import { buildProjectHealth } from './dashboardInsights';

const DAY_MS = 24 * 60 * 60 * 1000;

const round = (value: number) => Number(value.toFixed(2));

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getPeriodStart = (filters: AnalyticsFilters) => {
  const now = new Date();
  if (filters.period === 'week') {
    const date = startOfDay(now);
    date.setDate(date.getDate() - 6);
    return date;
  }

  if (filters.period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const selectedYears = filters.years
    .map((year) => Number(year))
    .filter((year) => Number.isInteger(year))
    .sort((a, b) => a - b);
  const firstYear = selectedYears[0] || now.getFullYear();
  return new Date(firstYear, 0, 1);
};

const getPeriodEnd = (filters: AnalyticsFilters) => {
  const now = new Date();
  if (filters.period === 'year') {
    const selectedYears = filters.years
      .map((year) => Number(year))
      .filter((year) => Number.isInteger(year))
      .sort((a, b) => b - a);
    const lastYear = selectedYears[0] || now.getFullYear();
    return new Date(lastYear, 11, 31, 23, 59, 59, 999);
  }

  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
};

const isDateWithinRange = (value: string | undefined, start: Date, end: Date) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= start && date <= end;
};

const resolveTaskCreatedAt = (task: EnrichedTask) =>
  task.activities?.[0]?.timestamp || task.startDate || task.dueDate;

const resolveTaskStartedAt = (task: EnrichedTask) =>
  task.startDate ||
  task.activities?.find((activity) => activity.action.toLowerCase().includes('inici'))?.timestamp ||
  resolveTaskCreatedAt(task);

const resolveTaskCompletedAt = (task: EnrichedTask) =>
  task.completionDate ||
  task.activities
    ?.find((activity) => activity.action.toLowerCase().includes('conclu'))?.timestamp;

const getTaskDurationInHours = (start?: string, end?: string) => {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return null;
  }
  return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
};

const matchesUserFilter = (task: EnrichedTask, filters: AnalyticsFilters) => {
  return true;
};

const matchesTeamFilter = (
  task: EnrichedTask,
  relatedProject: Project | undefined,
  assignee: User | undefined,
  filters: AnalyticsFilters
) => {
  if (filters.teamNames.length === 0) return true;
  const userTeams = assignee ? getUserTeams(assignee) : [];
  return (
    (relatedProject?.group ? filters.teamNames.includes(relatedProject.group) : false) ||
    userTeams.some((teamName) => filters.teamNames.includes(teamName))
  );
};

const matchesProjectFilters = (project: Project | undefined, filters: AnalyticsFilters) => {
  if (!project) return false;
  if (filters.projectIds.length > 0 && !filters.projectIds.includes(project.id)) return false;
  if (filters.teamNames.length > 0 && !filters.teamNames.includes(project.group)) return false;
  if (filters.clientNames.length > 0 && !filters.clientNames.includes(project.client)) return false;
  if (filters.productNames.length > 0 && !project.product) return false;
  if (filters.productNames.length > 0 && !filters.productNames.includes(project.product || '')) return false;
  if (filters.responsibleNames.length > 0 && !filters.responsibleNames.includes(project.responsible)) return false;
  return true;
};

const matchesSelectedYears = (dates: Array<string | undefined>, years: string[]) => {
  if (years.length === 0) return true;
  return dates.some((value) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return years.includes(String(date.getFullYear()));
  });
};

const taskTouchesPeriod = (task: EnrichedTask, start: Date, end: Date) => {
  if (
    isDateWithinRange(resolveTaskCreatedAt(task), start, end) ||
    isDateWithinRange(resolveTaskStartedAt(task), start, end) ||
    isDateWithinRange(resolveTaskCompletedAt(task), start, end) ||
    isDateWithinRange(task.dueDate, start, end)
  ) {
    return true;
  }

  return (task.timeTracking || task.timeLogs || []).some((log) =>
    isDateWithinRange(log.endTime || log.startTime || log.createdAt, start, end)
  );
};

const taskTouchesSelectedYears = (task: EnrichedTask, years: string[]) =>
  matchesSelectedYears(
    [
      resolveTaskCreatedAt(task),
      resolveTaskStartedAt(task),
      resolveTaskCompletedAt(task),
      task.dueDate,
      ...(task.timeTracking || task.timeLogs || []).map((log) => log.endTime || log.startTime || log.createdAt),
    ],
    years
  );

const projectTouchesPeriod = (
  project: Project,
  projectTasks: EnrichedTask[],
  start: Date,
  end: Date
) => {
  if (
    isDateWithinRange(project.requestDate, start, end) ||
    isDateWithinRange(project.startDate, start, end) ||
    isDateWithinRange(project.deadline, start, end) ||
    isDateWithinRange(project.completionDate || project.deliveredAt, start, end)
  ) {
    return true;
  }

  return projectTasks.some((task) => taskTouchesPeriod(task, start, end));
};

const projectTouchesSelectedYears = (
  project: Project,
  projectTasks: EnrichedTask[],
  years: string[]
) =>
  matchesSelectedYears(
    [project.requestDate, project.startDate, project.deadline, project.completionDate || project.deliveredAt],
    years
  ) || projectTasks.some((task) => taskTouchesSelectedYears(task, years));

export function getScopedAnalyticsData(
  projects: Project[],
  tasks: EnrichedTask[],
  users: User[],
  filters: AnalyticsFilters
) {
  const start = getPeriodStart(filters);
  const end = getPeriodEnd(filters);
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  const usersById = new Map(users.map((user) => [user.id, user]));

  const linkedTasks = tasks.filter((task) => Boolean(task.projectId));
  const scopedTasks = linkedTasks.filter((task) => {
    const relatedProject = task.projectId ? projectsById.get(task.projectId) : undefined;
    const assignee = task.assigneeId ? usersById.get(task.assigneeId) : undefined;
    if (!matchesProjectFilters(relatedProject, filters)) return false;
    if (!matchesUserFilter(task, filters)) return false;
    if (!matchesTeamFilter(task, relatedProject, assignee, filters)) return false;
    if (filters.period === 'year') return taskTouchesSelectedYears(task, filters.years);
    return taskTouchesPeriod(task, start, end);
  });

  const scopedProjectIds = new Set(scopedTasks.map((task) => task.projectId).filter(Boolean) as string[]);
  const scopedProjects = projects.filter((project) => {
    if (!matchesProjectFilters(project, filters)) return false;
    const projectTasks = linkedTasks.filter((task) => task.projectId === project.id);
    if (filters.period === 'year') {
      return scopedProjectIds.has(project.id) || projectTouchesSelectedYears(project, projectTasks, filters.years);
    }
    return scopedProjectIds.has(project.id) || projectTouchesPeriod(project, projectTasks, start, end);
  });

  return {
    start,
    end,
    scopedProjects,
    scopedTasks,
  };
}

export function getAnalyticsOverview(
  projects: Project[],
  tasks: EnrichedTask[],
  users: User[],
  filters: AnalyticsFilters
): AnalyticsOverview {
  const { scopedProjects, scopedTasks } = getScopedAnalyticsData(projects, tasks, users, filters);

  return {
    total_projects: scopedProjects.length,
    projects_in_progress: scopedProjects.filter((project) => isProjectInProgress(project)).length,
    projects_completed: scopedProjects.filter((project) => isProjectDelivered(project)).length,
    projects_delayed: scopedProjects.filter((project) => isProjectOverdue(project)).length,
    upcoming_deadlines: scopedProjects.filter((project) => isProjectDueSoon(project, new Date(), 7)).length,
    total_tasks: scopedTasks.length,
    tasks_completed: scopedTasks.filter((task) => isTaskDoneStatus(task.status, task.completed)).length,
    tasks_in_progress: scopedTasks.filter((task) => isTaskInProgressStatus(task.status, task.completed)).length,
  };
}

export function getAnalyticsPerformanceUsers(
  projects: Project[],
  tasks: EnrichedTask[],
  users: User[],
  filters: AnalyticsFilters
): AnalyticsPerformanceUsersResponse {
  const { scopedTasks } = getScopedAnalyticsData(projects, tasks, users, filters);
  const usersById = new Map(users.map((user) => [user.id, user]));

  const grouped = scopedTasks.reduce<Record<string, {
    user_id: string;
    name: string;
    totalHours: number;
    tasksCompleted: number;
    tasksInProgress: number;
    avgTaskTimes: number[];
  }>>((accumulator, task) => {
    const userId = task.assigneeId || 'unknown';
    const user = task.assigneeId ? usersById.get(task.assigneeId) : undefined;
    const name = user?.name || task.assignee || 'Sem responsável';
    if (!accumulator[userId]) {
      accumulator[userId] = {
        user_id: userId,
        name,
        totalHours: 0,
        tasksCompleted: 0,
        tasksInProgress: 0,
        avgTaskTimes: [],
      };
    }

    accumulator[userId].totalHours += getTaskNodeTotalTrackedMinutes(task) / 60;
    if (isTaskDoneStatus(task.status, task.completed)) {
      accumulator[userId].tasksCompleted += 1;
      const cycleHours = getTaskDurationInHours(resolveTaskStartedAt(task), resolveTaskCompletedAt(task));
      if (cycleHours !== null) accumulator[userId].avgTaskTimes.push(cycleHours);
    }
    if (isTaskInProgressStatus(task.status, task.completed)) {
      accumulator[userId].tasksInProgress += 1;
    }

    return accumulator;
  }, {});

  return {
    users: Object.values(grouped)
      .map((entry) => {
        const avgTaskTime =
          entry.avgTaskTimes.length > 0
            ? entry.avgTaskTimes.reduce((sum, value) => sum + value, 0) / entry.avgTaskTimes.length
            : 0;
        const productivityScore =
          entry.totalHours > 0 ? entry.tasksCompleted / entry.totalHours : 0;

        return {
          user_id: entry.user_id,
          name: entry.name,
          total_hours: round(entry.totalHours),
          tasks_completed: entry.tasksCompleted,
          tasks_in_progress: entry.tasksInProgress,
          avg_task_time: round(avgTaskTime),
          productivity_score: round(productivityScore),
        };
      })
      .sort((a, b) => b.productivity_score - a.productivity_score || b.tasks_completed - a.tasks_completed),
  };
}

export function getAnalyticsFlow(
  projects: Project[],
  tasks: EnrichedTask[],
  users: User[],
  filters: AnalyticsFilters
): AnalyticsFlowResponse {
  const { start, end, scopedTasks } = getScopedAnalyticsData(projects, tasks, users, filters);
  const completedTasks = scopedTasks.filter(
    (task) =>
      isTaskDoneStatus(task.status, task.completed) &&
      isDateWithinRange(resolveTaskCompletedAt(task), start, end)
  );

  const leadTimes = completedTasks
    .map((task) => getTaskDurationInHours(resolveTaskCreatedAt(task), resolveTaskCompletedAt(task)))
    .filter((value): value is number => value !== null);
  const cycleTimes = completedTasks
    .map((task) => getTaskDurationInHours(resolveTaskStartedAt(task), resolveTaskCompletedAt(task)))
    .filter((value): value is number => value !== null);

  return {
    lead_time_avg:
      leadTimes.length > 0 ? round(leadTimes.reduce((sum, value) => sum + value, 0) / leadTimes.length) : 0,
    cycle_time_avg:
      cycleTimes.length > 0 ? round(cycleTimes.reduce((sum, value) => sum + value, 0) / cycleTimes.length) : 0,
    throughput: completedTasks.length,
    wip: scopedTasks.filter((task) => isTaskInProgressStatus(task.status, task.completed)).length,
  };
}

export function getAnalyticsProjects(
  projects: Project[],
  tasks: EnrichedTask[],
  users: User[],
  settings: CostSettings,
  filters: AnalyticsFilters
): AnalyticsProjectsResponse {
  const { scopedProjects, scopedTasks } = getScopedAnalyticsData(projects, tasks, users, filters);
  const healthByProjectId = new Map(
    buildProjectHealth(scopedProjects, scopedTasks).map((item) => [item.projectId, item.health])
  );
  const costReports = new Map(
    buildPortfolioCostReports(scopedProjects, users, settings, {
      startDate: getPeriodStart(filters).toISOString().slice(0, 10),
      endDate: getPeriodEnd(filters).toISOString().slice(0, 10),
      teamNames: filters.teamNames,
      projectIds: scopedProjects.map((project) => project.id),
    }).map((report) => [report.project_id, report])
  );

  const items: AnalyticsProjectItem[] = scopedProjects.map((project) => {
    const metrics = getProjectMetrics(project);
    const health = healthByProjectId.get(project.id);
    const delayStatus: AnalyticsProjectItem['delay_status'] = isProjectOverdue(project)
      ? 'atrasado'
      : health === 'attention' || health === 'critical'
        ? 'risco'
        : 'ok';

    return {
      project_id: project.id,
      name: project.name,
      progress: metrics.progress,
      delay_status: delayStatus,
      total_hours: round((costReports.get(project.id)?.total_hours || 0)),
      total_tasks: metrics.tasksTotal,
      completed_tasks: metrics.tasksCompleted,
      cost_real: costReports.get(project.id)?.total_cost_real || 0,
      deadline: project.deadline,
    };
  });

  return {
    projects: items.sort((a, b) => {
      const weight = { atrasado: 0, risco: 1, ok: 2 };
      return weight[a.delay_status] - weight[b.delay_status] || b.cost_real - a.cost_real;
    }),
  };
}

export function getTaskStatusChartData(tasks: EnrichedTask[]) {
  const labels: Record<string, string> = {
    not_started: 'Não iniciadas',
    in_progress: 'Em andamento',
    blocked: 'Bloqueadas',
    done: 'Concluídas',
  };

  return Object.entries(
    tasks.reduce<Record<string, number>>((accumulator, task) => {
      const key = isTaskDoneStatus(task.status, task.completed) ? 'done' : task.status;
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {})
  ).map(([key, value]) => ({
    key,
    label: labels[key] || key,
    value,
  }));
}

export function getProjectStatusChartData(projects: Project[]) {
  return [
    { key: 'in_progress', label: 'Em andamento', value: projects.filter((project) => isProjectInProgress(project)).length },
    { key: 'completed', label: 'Concluídos', value: projects.filter((project) => isProjectDelivered(project)).length },
    { key: 'delayed', label: 'Atrasados', value: projects.filter((project) => isProjectOverdue(project)).length },
  ].filter((item) => item.value > 0);
}

export function getCompletedTasksTrend(tasks: EnrichedTask[], filters: AnalyticsFilters) {
  if (filters.period === 'year') {
    const years = [...filters.years].sort((a, b) => Number(a) - Number(b));
    const items = years.map((year) => ({
      key: year,
      label: year,
      value: 0,
    }));
    const map = new Map(items.map((item) => [item.key, item]));

    tasks.forEach((task) => {
      if (!isTaskDoneStatus(task.status, task.completed)) return;
      const completedAt = resolveTaskCompletedAt(task);
      if (!completedAt) return;
      const year = String(new Date(completedAt).getFullYear());
      const target = map.get(year);
      if (target) target.value += 1;
    });

    return items;
  }

  const start = getPeriodStart(filters);
  const dayCount = filters.period === 'week' ? 7 : Math.max(1, Math.ceil((getPeriodEnd(filters).getTime() - start.getTime()) / DAY_MS) + 1);
  const labels = Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: 0,
    };
  });

  const map = new Map(labels.map((item) => [item.key, item]));
  tasks.forEach((task) => {
    if (!isTaskDoneStatus(task.status, task.completed)) return;
    const completedAt = resolveTaskCompletedAt(task);
    if (!completedAt) return;
    const key = new Date(completedAt).toISOString().slice(0, 10);
    const target = map.get(key);
    if (target) target.value += 1;
  });

  return labels;
}

export function getTrackedHoursTrend(tasks: EnrichedTask[], filters: AnalyticsFilters) {
  if (filters.period === 'year') {
    const years = [...filters.years].sort((a, b) => Number(a) - Number(b));
    const items = years.map((year) => ({
      key: year,
      label: year,
      value: 0,
    }));
    const map = new Map(items.map((item) => [item.key, item]));

    tasks.forEach((task) => {
      (task.timeTracking || task.timeLogs || []).forEach((log) => {
        const date = new Date(log.endTime || log.startTime || log.createdAt);
        if (Number.isNaN(date.getTime())) return;
        const target = map.get(String(date.getFullYear()));
        if (!target) return;
        target.value += getTimeLogDurationSeconds(log) / 3600;
      });
    });

    return items.map((item) => ({ ...item, value: round(item.value) }));
  }

  const start = getPeriodStart(filters);
  const dayCount = filters.period === 'week' ? 7 : Math.max(1, Math.ceil((getPeriodEnd(filters).getTime() - start.getTime()) / DAY_MS) + 1);
  const labels = Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: 0,
    };
  });
  const map = new Map(labels.map((item) => [item.key, item]));

  tasks.forEach((task) => {
    (task.timeTracking || task.timeLogs || []).forEach((log) => {
      const key = new Date(log.endTime || log.startTime || log.createdAt).toISOString().slice(0, 10);
      const target = map.get(key);
      if (!target) return;
      target.value += getTimeLogDurationSeconds(log) / 3600;
    });
  });

  return labels.map((item) => ({ ...item, value: round(item.value) }));
}

export function getCompletedProjectsByYearChartData(projects: Project[], selectedYears: string[]) {
  const grouped = projects.reduce<Map<string, number>>((accumulator, project) => {
    if (!isProjectDelivered(project)) return accumulator;
    const referenceDate = project.completionDate || project.deliveredAt || project.deadline;
    if (!referenceDate) return accumulator;
    const year = String(new Date(referenceDate).getFullYear());
    if (selectedYears.length > 0 && !selectedYears.includes(year)) return accumulator;
    accumulator.set(year, (accumulator.get(year) || 0) + 1);
    return accumulator;
  }, new Map<string, number>());

  return Array.from(grouped.entries())
    .sort((left, right) => Number(left[0]) - Number(right[0]))
    .map(([year, total], index, items) => {
      const previous = index > 0 ? items[index - 1][1] : null;
      const variationPct =
        previous && previous > 0 ? round(((total - previous) / previous) * 100) : null;

      return {
        year,
        total,
        variationPct,
        isCurrentYear: year === String(new Date().getFullYear()),
      };
    });
}
