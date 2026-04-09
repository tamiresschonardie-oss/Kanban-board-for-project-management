import type { EnrichedTask } from '../context/TaskContext';
import {
  CostSettings,
  GovernanceAnalyticsFilters,
  Project,
  User,
} from '../types';
import { getTaskNodeOwnTrackedMinutes } from '../selectors/taskSelectors';
import { getTimeLogDurationSeconds } from '../utils/timeTracking';
import { buildProjectHealth, buildTeamCapacity } from '../utils/dashboardInsights';
import { buildPortfolioCostReports } from '../utils/projectCosts';
import {
  getProjectFilterYear,
  getProjectCurrentGovernancePhase,
  getProjectGovernancePhaseId,
  getProjectGovernanceSituation,
  getProjectMetrics,
  getProjectSmartStatus,
  isProjectDelivered,
  isProjectDueSoon,
  isProjectInProgress,
  isProjectOverdue,
} from '../utils/projectSelectors';
import { canAccessGovernance } from '../utils/permissions';
import { isTaskDoneStatus, isTaskInProgressStatus } from '../utils/taskStatus';
import { getUserTeams } from '../utils/userTeams';

type ForbiddenResponse = { status: 403; error: string };
type SuccessResponse<T> = { status: 200; data: T };

export type GovernanceEndpointResponse<T> = SuccessResponse<T> | ForbiddenResponse;

export interface GovernanceOverviewData {
  projectsInProgress: number;
  projectsDelayed: number;
  projectsCompleted: number;
  projectsPaused: number;
  tasksInProgress: number;
  tasksCompleted: number;
  tasksDelayed: number;
  criticalDemands: number;
  totalTrackedHours: number;
  totalCostReal: number;
  totalEconomy: number;
  highestLoadPerson?: GovernanceUserRow;
  lowestLoadPerson?: GovernanceUserRow;
  projectStatusChart: Array<{ label: string; value: number }>;
  taskStatusChart: Array<{ label: string; value: number }>;
  completedTrend: Array<{ label: string; value: number }>;
  hoursTrend: Array<{ label: string; value: number }>;
  costByTeam: Array<{ label: string; value: number }>;
  costDistribution: Array<{ label: string; value: number }>;
  weeklyFocusProjects: GovernanceProjectRow[];
  weeklyFocusTasks: GovernanceTaskRow[];
}

export interface GovernanceProjectRow {
  project_id: string;
  project: string;
  client: string;
  product?: string;
  team: string;
  responsible: string;
  requester?: string;
  status: string;
  progress: number;
  total_hours: number;
  cost_real: number;
  cost_internal: number;
  cost_external: number;
  economy: number;
  request_date?: string;
  deadline?: string;
  completion_date?: string;
  risk: 'baixo' | 'medio' | 'alto';
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  is_week_focus: boolean;
  smart_status: string;
  weekly_update?: string;
}

export interface GovernanceUserRow {
  user_id: string;
  collaborator: string;
  team: string;
  role?: string;
  salary_monthly: number;
  cost_per_hour: number;
  hours_period: number;
  cost_total: number;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  delayed_tasks: number;
  projects_count: number;
  productivity: number;
  efficiency: number;
  avg_cost_per_task: number;
  avg_cost_per_project: number;
  current_load: number;
  participation_cost_pct: number;
}

export interface GovernanceTaskRow {
  task_id: string;
  task: string;
  project?: string;
  type: string;
  responsible?: string;
  requester?: string;
  team?: string;
  status: string;
  priority?: string;
  hours: number;
  cost_real: number;
  cost_internal: number;
  cost_external: number;
  economy: number;
  created_at?: string;
  start_date?: string;
  due_date?: string;
  completion_date?: string;
  lead_time_hours: number;
  cycle_time_hours: number;
  is_blocked: boolean;
  is_week_focus: boolean;
}

export interface GovernanceCostsData {
  totalCostReal: number;
  totalCostInternal: number;
  totalCostExternal: number;
  totalEconomy: number;
  avgCostPerProject: number;
  avgCostPerPerson: number;
  avgCostPerTask: number;
  byProject: GovernanceProjectRow[];
  byUser: GovernanceUserRow[];
  byTask: GovernanceTaskRow[];
}

export interface GovernanceProductivityData {
  byPeople: GovernanceUserRow[];
  byTeam: Array<{ label: string; tasks_completed: number; productivity: number; hours: number }>;
  byProject: Array<{ label: string; tasks_completed: number; productivity: number; hours: number }>;
}

export interface GovernancePerformanceData {
  rows: Array<{
    scope: string;
    label: string;
    cost_per_completed_task: number;
    hours_per_completed_task: number;
    on_time_rate: number;
    delay_rate: number;
    delivery_efficiency: number;
  }>;
}

export interface GovernanceCapacityData {
  people: GovernanceUserRow[];
  byTeam: Array<{ label: string; load: number; hours: number; overdue: number }>;
}

export interface GovernanceRisksData {
  projectRisks: GovernanceProjectRow[];
  taskRisks: GovernanceTaskRow[];
  overloadedPeople: GovernanceUserRow[];
  insights: Array<{ title: string; description: string; tone: 'danger' | 'warning' | 'success' }>;
}

const round = (value: number) => Number(value.toFixed(2));
const MS_PER_HOUR = 1000 * 60 * 60;

const normalizeText = (value?: string) => (value || '').trim().toLocaleLowerCase('pt-BR');

const startOfDay = (value: string | undefined) => {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const endOfDay = (value: string | undefined) => {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const matchesDate = (value: string | undefined, filters: GovernanceAnalyticsFilters) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return false;
  const start = startOfDay(filters.startDate);
  const end = endOfDay(filters.endDate);
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
};

const taskReferenceDate = (task: EnrichedTask) =>
  task.completionDate ||
  task.dueDate ||
  task.startDate ||
  task.activities?.[0]?.timestamp ||
  task.timeLogs?.[0]?.createdAt;

const matchesSearch = (values: Array<string | undefined>, search: string) => {
  if (!search.trim()) return true;
  const query = normalizeText(search);
  return values.some((value) => normalizeText(value).includes(query));
};

const resolveUserCostPerHour = (user: User | undefined, settings: CostSettings) => {
  if (!user) return 0;
  if (typeof user.costPerHour === 'number' && Number.isFinite(user.costPerHour)) return user.costPerHour;
  if (typeof user.salaryMonthly === 'number' && Number.isFinite(user.salaryMonthly)) {
    return user.salaryMonthly / Math.max(settings.monthlyHoursStandard || 160, 1);
  }
  return 0;
};

const getTaskOwnHours = (task: EnrichedTask) => round(getTaskNodeOwnTrackedMinutes(task) / 60);

const getTaskLeadTimeHours = (task: EnrichedTask) => {
  const createdAt = task.activities?.[0]?.timestamp || task.startDate;
  const completedAt = task.completionDate;
  if (!createdAt || !completedAt) return 0;
  const diff = new Date(completedAt).getTime() - new Date(createdAt).getTime();
  return diff > 0 ? round(diff / MS_PER_HOUR) : 0;
};

const getTaskCycleTimeHours = (task: EnrichedTask) => {
  if (!task.startDate || !task.completionDate) return 0;
  const diff = new Date(task.completionDate).getTime() - new Date(task.startDate).getTime();
  return diff > 0 ? round(diff / MS_PER_HOUR) : 0;
};

const getProjectRisk = (project: Project, health: ReturnType<typeof buildProjectHealth>[number] | undefined): GovernanceProjectRow['risk'] => {
  if (isProjectOverdue(project) || health?.health === 'critical') return 'alto';
  if (health?.health === 'attention' || isProjectDueSoon(project)) return 'medio';
  return 'baixo';
};

const defaultFilters = (): GovernanceAnalyticsFilters => ({
  startDate: '',
  endDate: '',
  years: [String(new Date().getFullYear())],
  teamNames: [],
  projectIds: [],
  productNames: [],
  responsibleNames: [],
  userIds: [],
  statuses: [],
  demandTypes: [],
  clientNames: [],
  requesterNames: [],
  search: '',
  includeCancelled: false,
  onlyWeeklyFocus: false,
});

function filterProjects(projects: Project[], filters: GovernanceAnalyticsFilters) {
  return projects.filter((project) => {
    if (filters.onlyWeeklyFocus && !project.isWeeklyFocus) return false;
    if (!filters.includeCancelled && getProjectGovernanceSituation(project) === 'cancelado') return false;
    if (filters.projectIds.length > 0 && !filters.projectIds.includes(project.id)) return false;
    if (filters.teamNames.length > 0 && ![project.group, ...(project.teams || [])].some((team) => filters.teamNames.includes(team))) return false;
    if (filters.productNames.length > 0 && !filters.productNames.includes(project.product || '')) return false;
    if (filters.responsibleNames.length > 0 && !filters.responsibleNames.includes(project.responsible)) return false;
    if (filters.clientNames.length > 0 && !filters.clientNames.includes(project.client)) return false;
    if (filters.requesterNames.length > 0 && !filters.requesterNames.includes(project.requestedBy || '')) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(getProjectGovernancePhaseId(project))) return false;
    if (filters.years.length > 0 && !filters.years.includes(getProjectFilterYear(project) || '')) return false;
    const touchesPeriod =
      !filters.startDate &&
      !filters.endDate
        ? true
        : matchesDate(project.requestDate, filters) ||
          matchesDate(project.deadline, filters) ||
          matchesDate(project.completionDate, filters);
    if (!touchesPeriod) return false;
    return matchesSearch(
      [project.name, project.client, project.product, project.responsible, project.requestedBy],
      filters.search
    );
  });
}

function filterTasks(tasks: EnrichedTask[], projectsById: Map<string, Project>, usersById: Map<string, User>, filters: GovernanceAnalyticsFilters) {
  return tasks.filter((task) => {
    const project = task.projectId ? projectsById.get(task.projectId) : undefined;
    const user = task.assigneeId ? usersById.get(task.assigneeId) : undefined;
    const projectYear = project ? getProjectFilterYear(project) : undefined;
    if (filters.onlyWeeklyFocus && !task.isWeeklyFocus) return false;
    if (!filters.includeCancelled && project && getProjectGovernanceSituation(project) === 'cancelado') return false;
    if (filters.projectIds.length > 0 && (!task.projectId || !filters.projectIds.includes(task.projectId))) return false;
    if (filters.userIds.length > 0 && (!task.assigneeId || !filters.userIds.includes(task.assigneeId))) return false;
    if (filters.responsibleNames.length > 0 && !filters.responsibleNames.includes(task.assignee || '')) return false;
    if (filters.teamNames.length > 0) {
      const matchesTeam = (project?.group && filters.teamNames.includes(project.group)) || getUserTeams(user).some((team) => filters.teamNames.includes(team));
      if (!matchesTeam) return false;
    }
    if (filters.productNames.length > 0 && !filters.productNames.includes(project?.product || '')) return false;
    if (filters.clientNames.length > 0 && !filters.clientNames.includes(project?.client || '')) return false;
    if (filters.requesterNames.length > 0 && !filters.requesterNames.includes(task.requestedBy || project?.requestedBy || '')) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) return false;
    if (filters.demandTypes.length > 0 && !filters.demandTypes.includes(project?.demandType || 'projeto')) return false;
    if (filters.years.length > 0 && !filters.years.includes(projectYear || '')) return false;
    if ((filters.startDate || filters.endDate) && !matchesDate(taskReferenceDate(task), filters)) return false;
    return matchesSearch([task.title, task.projectName, task.assignee, task.requestedBy], filters.search);
  });
}

function buildProjectRows(projects: Project[], tasks: EnrichedTask[], users: User[], settings: CostSettings) {
  const healthByProject = new Map(buildProjectHealth(projects, tasks).map((item) => [item.projectId, item]));
  const reports = new Map(buildPortfolioCostReports(projects, users, settings, {
    projectIds: projects.map((project) => project.id),
  }).map((report) => [report.project_id, report]));

  return projects.map<GovernanceProjectRow>((project) => {
    const projectTasks = tasks.filter((task) => task.projectId === project.id);
    const metrics = getProjectMetrics(project);
    const report = reports.get(project.id);
    const health = healthByProject.get(project.id);
    return {
      project_id: project.id,
      project: project.name,
      client: project.client,
      product: project.product,
      team: project.group,
      responsible: project.responsible,
      requester: project.requestedBy,
      status: getProjectCurrentGovernancePhase(project)?.name || getProjectGovernancePhaseId(project),
      progress: metrics.progress,
      total_hours: report?.total_hours || 0,
      cost_real: report?.total_cost_real || 0,
      cost_internal: report?.total_cost_base || 0,
      cost_external: report?.total_cost_external || 0,
      economy: report?.economy || 0,
      request_date: project.requestDate,
      deadline: project.deadline,
      completion_date: project.completionDate,
      risk: getProjectRisk(project, health),
      total_tasks: projectTasks.length,
      completed_tasks: projectTasks.filter((task) => isTaskDoneStatus(task.status, task.completed)).length,
      in_progress_tasks: projectTasks.filter((task) => isTaskInProgressStatus(task.status, task.completed)).length,
      is_week_focus: Boolean(project.isWeeklyFocus),
      smart_status: getProjectSmartStatus(project),
      weekly_update: project.weeklyUpdate,
    };
  });
}

function buildTaskRows(tasks: EnrichedTask[], projectsById: Map<string, Project>, usersById: Map<string, User>, settings: CostSettings) {
  return tasks.map<GovernanceTaskRow>((task) => {
    const project = task.projectId ? projectsById.get(task.projectId) : undefined;
    const user = task.assigneeId ? usersById.get(task.assigneeId) : undefined;
    const hours = getTaskOwnHours(task);
    const costPerHour = resolveUserCostPerHour(user, settings);
    const costReal = round(hours * costPerHour);
    const costInternal = round(hours * settings.defaultInternalHourRate);
    const costExternal = round(hours * settings.defaultExternalHourRate);
    return {
      task_id: task.id,
      task: task.title,
      project: task.projectName,
      type: project?.demandType || 'projeto',
      responsible: task.assignee,
      requester: task.requestedBy || project?.requestedBy,
      team: project?.group || user?.team,
      status: task.status,
      priority: task.priority,
      hours,
      cost_real: costReal,
      cost_internal: costInternal,
      cost_external: costExternal,
      economy: round(costExternal - costReal),
      created_at: task.activities?.[0]?.timestamp || task.startDate,
      start_date: task.startDate,
      due_date: task.dueDate,
      completion_date: task.completionDate,
      lead_time_hours: getTaskLeadTimeHours(task),
      cycle_time_hours: getTaskCycleTimeHours(task),
      is_blocked: Boolean(task.isDependencyBlocked),
      is_week_focus: Boolean(task.isWeeklyFocus),
    };
  });
}

function buildUserRows(users: User[], tasks: EnrichedTask[], projects: Project[], settings: CostSettings): GovernanceUserRow[] {
  const totalOperationCost = round(
    users.reduce((sum, user) => {
      const userTasks = tasks.filter((task) => task.assigneeId === user.id);
      const hours = userTasks.reduce((taskSum, task) => taskSum + getTaskOwnHours(task), 0);
      return sum + hours * resolveUserCostPerHour(user, settings);
    }, 0)
  );

  return users
    .filter((user) => user.status === 'active')
    .map((user) => {
      const userTasks = tasks.filter((task) => task.assigneeId === user.id);
      const hours = round(userTasks.reduce((sum, task) => sum + getTaskOwnHours(task), 0));
      const completed = userTasks.filter((task) => isTaskDoneStatus(task.status, task.completed)).length;
      const inProgress = userTasks.filter((task) => isTaskInProgressStatus(task.status, task.completed)).length;
      const delayed = userTasks.filter((task) => !isTaskDoneStatus(task.status, task.completed) && !!task.dueDate && new Date(task.dueDate).getTime() < Date.now()).length;
      const relatedProjects = new Set(userTasks.map((task) => task.projectId).filter(Boolean));
      const costPerHour = round(resolveUserCostPerHour(user, settings));
      const costTotal = round(hours * costPerHour);
      return {
        user_id: user.id,
        collaborator: user.name,
        team: getUserTeams(user).join(', ') || user.team,
        role: user.cargo,
        salary_monthly: user.salaryMonthly || 0,
        cost_per_hour: costPerHour,
        hours_period: hours,
        cost_total: costTotal,
        total_tasks: userTasks.length,
        completed_tasks: completed,
        in_progress_tasks: inProgress,
        delayed_tasks: delayed,
        projects_count: relatedProjects.size || projects.filter((project) => project.responsible === user.name).length,
        productivity: round(completed / Math.max(hours, 1)),
        efficiency: round(completed / Math.max(inProgress + delayed, 1)),
        avg_cost_per_task: round(costTotal / Math.max(userTasks.length, 1)),
        avg_cost_per_project: round(costTotal / Math.max(relatedProjects.size || 1, 1)),
        current_load: inProgress,
        participation_cost_pct: totalOperationCost > 0 ? round((costTotal / totalOperationCost) * 100) : 0,
      };
    })
    .sort((a, b) => b.cost_total - a.cost_total || b.hours_period - a.hours_period);
}

function buildCompletedTrend(tasks: EnrichedTask[], filters: GovernanceAnalyticsFilters) {
  const days = 7;
  const start = filters.startDate ? new Date(filters.startDate) : new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
  const labels = Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: 0,
    };
  });
  const map = new Map(labels.map((item) => [item.key, item]));
  tasks.forEach((task) => {
    if (!isTaskDoneStatus(task.status, task.completed) || !task.completionDate) return;
    const item = map.get(new Date(task.completionDate).toISOString().slice(0, 10));
    if (item) item.value += 1;
  });
  return labels.map(({ label, value }) => ({ label, value }));
}

function buildHoursTrend(tasks: EnrichedTask[], filters: GovernanceAnalyticsFilters) {
  const days = 7;
  const start = filters.startDate ? new Date(filters.startDate) : new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
  const labels = Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      value: 0,
    };
  });
  const map = new Map(labels.map((item) => [item.key, item]));
  tasks.forEach((task) => {
    (task.timeLogs || []).forEach((log) => {
      const item = map.get(new Date(log.endTime || log.startTime || log.createdAt).toISOString().slice(0, 10));
      if (item) item.value += getTimeLogDurationSeconds(log) / 3600;
    });
  });
  return labels.map(({ label, value }) => ({ label, value: round(value) }));
}

function forbidIfNeeded<T>(currentUser: User | undefined, producer: () => T): GovernanceEndpointResponse<T> {
  if (!canAccessGovernance(currentUser)) {
    return {
      status: 403,
      error: 'Acesso negado ao módulo de Governança.',
    };
  }
  return {
    status: 200,
    data: producer(),
  };
}

function getScopedData(params: {
  filters?: Partial<GovernanceAnalyticsFilters>;
  projects: Project[];
  tasks: EnrichedTask[];
  users: User[];
}) {
  const filters = { ...defaultFilters(), ...params.filters };
  const usersById = new Map(params.users.map((user) => [user.id, user]));
  const projectsById = new Map(params.projects.map((project) => [project.id, project]));
  const filteredProjects = filterProjects(params.projects, filters);
  const filteredProjectIds = new Set(filteredProjects.map((project) => project.id));
  const filteredTasks = filterTasks(
    params.tasks.filter((task) => !task.projectId || filteredProjectIds.has(task.projectId)),
    projectsById,
    usersById,
    filters
  );
  return {
    filters,
    projectsById,
    usersById,
    projects: filteredProjects,
    tasks: filteredTasks,
  };
}

export function getAnalyticsOverviewEndpointResponse(params: {
  currentUser?: User;
  filters?: Partial<GovernanceAnalyticsFilters>;
  projects: Project[];
  tasks: EnrichedTask[];
  users: User[];
  settings: CostSettings;
}) {
  return forbidIfNeeded(params.currentUser, () => {
    const scoped = getScopedData(params);
    const projectRows = buildProjectRows(scoped.projects, scoped.tasks, params.users, params.settings);
    const userRows = buildUserRows(params.users, scoped.tasks, scoped.projects, params.settings);
    const taskRows = buildTaskRows(scoped.tasks, scoped.projectsById, scoped.usersById, params.settings);
    return {
      projectsInProgress: scoped.projects.filter((project) => isProjectInProgress(project)).length,
      projectsDelayed: scoped.projects.filter((project) => isProjectOverdue(project)).length,
      projectsCompleted: scoped.projects.filter((project) => isProjectDelivered(project)).length,
      projectsPaused: scoped.projects.filter((project) => project.situation === 'pausado').length,
      tasksInProgress: scoped.tasks.filter((task) => isTaskInProgressStatus(task.status, task.completed)).length,
      tasksCompleted: scoped.tasks.filter((task) => isTaskDoneStatus(task.status, task.completed)).length,
      tasksDelayed: scoped.tasks.filter((task) => !isTaskDoneStatus(task.status, task.completed) && !!task.dueDate && new Date(task.dueDate).getTime() < Date.now()).length,
      criticalDemands: scoped.tasks.filter((task) => task.priority === 'high' || task.isDependencyBlocked).length,
      totalTrackedHours: round(taskRows.reduce((sum, row) => sum + row.hours, 0)),
      totalCostReal: round(projectRows.reduce((sum, row) => sum + row.cost_real, 0)),
      totalEconomy: round(projectRows.reduce((sum, row) => sum + row.economy, 0)),
      highestLoadPerson: [...userRows].sort((a, b) => b.current_load - a.current_load || b.hours_period - a.hours_period)[0],
      lowestLoadPerson: [...userRows].sort((a, b) => a.current_load - b.current_load || a.hours_period - b.hours_period)[0],
      projectStatusChart: [
        { label: 'Em andamento', value: scoped.projects.filter((project) => isProjectInProgress(project)).length },
        { label: 'Concluídos', value: scoped.projects.filter((project) => isProjectDelivered(project)).length },
        { label: 'Atrasados', value: scoped.projects.filter((project) => isProjectOverdue(project)).length },
        { label: 'Pausados', value: scoped.projects.filter((project) => project.situation === 'pausado').length },
      ].filter((item) => item.value > 0),
      taskStatusChart: [
        { label: 'Em andamento', value: scoped.tasks.filter((task) => isTaskInProgressStatus(task.status, task.completed)).length },
        { label: 'Concluídas', value: scoped.tasks.filter((task) => isTaskDoneStatus(task.status, task.completed)).length },
        { label: 'Bloqueadas', value: scoped.tasks.filter((task) => task.isDependencyBlocked).length },
        { label: 'Atrasadas', value: scoped.tasks.filter((task) => !isTaskDoneStatus(task.status, task.completed) && !!task.dueDate && new Date(task.dueDate).getTime() < Date.now()).length },
      ].filter((item) => item.value > 0),
      completedTrend: buildCompletedTrend(scoped.tasks, scoped.filters),
      hoursTrend: buildHoursTrend(scoped.tasks, scoped.filters),
      costByTeam: Object.values(
        projectRows.reduce<Record<string, { label: string; value: number }>>((acc, row) => {
          acc[row.team] = acc[row.team] || { label: row.team, value: 0 };
          acc[row.team].value += row.cost_real;
          return acc;
        }, {})
      ).map((item) => ({ ...item, value: round(item.value) })),
      costDistribution: [
        { label: 'Real', value: round(projectRows.reduce((sum, row) => sum + row.cost_real, 0)) },
        { label: 'Interno', value: round(projectRows.reduce((sum, row) => sum + row.cost_internal, 0)) },
        { label: 'Terceirizado', value: round(projectRows.reduce((sum, row) => sum + row.cost_external, 0)) },
      ],
      weeklyFocusProjects: [...projectRows]
        .filter((row) => row.is_week_focus)
        .sort((a, b) => Number(b.progress < a.progress) || Number(b.risk === 'alto') - Number(a.risk === 'alto')),
      weeklyFocusTasks: [...taskRows]
        .filter((row) => row.is_week_focus)
        .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority) || Number(Boolean(b.is_blocked)) - Number(Boolean(a.is_blocked))),
    } satisfies GovernanceOverviewData;
  });
}

function priorityWeight(priority?: string) {
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  if (priority === 'low') return 1;
  return 0;
}

export function getAnalyticsProjectsEndpointResponse(params: {
  currentUser?: User;
  filters?: Partial<GovernanceAnalyticsFilters>;
  projects: Project[];
  tasks: EnrichedTask[];
  users: User[];
  settings: CostSettings;
}) {
  return forbidIfNeeded(params.currentUser, () => {
    const scoped = getScopedData(params);
    return buildProjectRows(scoped.projects, scoped.tasks, params.users, params.settings).sort(
      (a, b) => b.cost_real - a.cost_real || b.total_hours - a.total_hours
    );
  });
}

export function getAnalyticsUsersEndpointResponse(params: {
  currentUser?: User;
  filters?: Partial<GovernanceAnalyticsFilters>;
  projects: Project[];
  tasks: EnrichedTask[];
  users: User[];
  settings: CostSettings;
}) {
  return forbidIfNeeded(params.currentUser, () => {
    const scoped = getScopedData(params);
    return buildUserRows(params.users, scoped.tasks, scoped.projects, params.settings);
  });
}

export function getAnalyticsTasksEndpointResponse(params: {
  currentUser?: User;
  filters?: Partial<GovernanceAnalyticsFilters>;
  projects: Project[];
  tasks: EnrichedTask[];
  users: User[];
  settings: CostSettings;
}) {
  return forbidIfNeeded(params.currentUser, () => {
    const scoped = getScopedData(params);
    return buildTaskRows(scoped.tasks, scoped.projectsById, scoped.usersById, params.settings).sort(
      (a, b) => b.cost_real - a.cost_real || b.hours - a.hours
    );
  });
}

export function getAnalyticsCostsOverviewEndpointResponse(params: {
  currentUser?: User;
  filters?: Partial<GovernanceAnalyticsFilters>;
  projects: Project[];
  tasks: EnrichedTask[];
  users: User[];
  settings: CostSettings;
}) {
  return forbidIfNeeded(params.currentUser, () => {
    const scoped = getScopedData(params);
    const byProject = buildProjectRows(scoped.projects, scoped.tasks, params.users, params.settings);
    const byUser = buildUserRows(params.users, scoped.tasks, scoped.projects, params.settings);
    const byTask = buildTaskRows(scoped.tasks, scoped.projectsById, scoped.usersById, params.settings);
    return {
      totalCostReal: round(byProject.reduce((sum, row) => sum + row.cost_real, 0)),
      totalCostInternal: round(byProject.reduce((sum, row) => sum + row.cost_internal, 0)),
      totalCostExternal: round(byProject.reduce((sum, row) => sum + row.cost_external, 0)),
      totalEconomy: round(byProject.reduce((sum, row) => sum + row.economy, 0)),
      avgCostPerProject: round(byProject.reduce((sum, row) => sum + row.cost_real, 0) / Math.max(byProject.length, 1)),
      avgCostPerPerson: round(byUser.reduce((sum, row) => sum + row.cost_total, 0) / Math.max(byUser.length, 1)),
      avgCostPerTask: round(byTask.reduce((sum, row) => sum + row.cost_real, 0) / Math.max(byTask.length, 1)),
      byProject,
      byUser,
      byTask,
    } satisfies GovernanceCostsData;
  });
}

export function getAnalyticsProductivityEndpointResponse(params: {
  currentUser?: User;
  filters?: Partial<GovernanceAnalyticsFilters>;
  projects: Project[];
  tasks: EnrichedTask[];
  users: User[];
  settings: CostSettings;
}) {
  return forbidIfNeeded(params.currentUser, () => {
    const scoped = getScopedData(params);
    const byPeople = buildUserRows(params.users, scoped.tasks, scoped.projects, params.settings).sort(
      (a, b) => b.productivity - a.productivity || b.completed_tasks - a.completed_tasks
    );
    const byProject = buildProjectRows(scoped.projects, scoped.tasks, params.users, params.settings).map((row) => ({
      label: row.project,
      tasks_completed: row.completed_tasks,
      productivity: round(row.completed_tasks / Math.max(row.total_hours, 1)),
      hours: row.total_hours,
    }));
    const byTeam = Object.values(
      scoped.tasks.reduce<Record<string, { label: string; tasks_completed: number; productivity: number; hours: number }>>((acc, task) => {
        const label = task.projectGroup || 'Sem equipe';
        acc[label] = acc[label] || { label, tasks_completed: 0, productivity: 0, hours: 0 };
        acc[label].hours += getTaskOwnHours(task);
        if (isTaskDoneStatus(task.status, task.completed)) acc[label].tasks_completed += 1;
        acc[label].productivity = round(acc[label].tasks_completed / Math.max(acc[label].hours, 1));
        return acc;
      }, {})
    );
    return { byPeople, byTeam, byProject } satisfies GovernanceProductivityData;
  });
}

export function getAnalyticsPerformanceEndpointResponse(params: {
  currentUser?: User;
  filters?: Partial<GovernanceAnalyticsFilters>;
  projects: Project[];
  tasks: EnrichedTask[];
  users: User[];
  settings: CostSettings;
}) {
  return forbidIfNeeded(params.currentUser, () => {
    const scoped = getScopedData(params);
    const userRows = buildUserRows(params.users, scoped.tasks, scoped.projects, params.settings).map((row) => ({
      scope: 'Pessoa',
      label: row.collaborator,
      cost_per_completed_task: row.avg_cost_per_task,
      hours_per_completed_task: round(row.hours_period / Math.max(row.completed_tasks, 1)),
      on_time_rate: round(((row.completed_tasks - row.delayed_tasks) / Math.max(row.completed_tasks, 1)) * 100),
      delay_rate: round((row.delayed_tasks / Math.max(row.total_tasks, 1)) * 100),
      delivery_efficiency: row.productivity,
    }));
    const projectRows = buildProjectRows(scoped.projects, scoped.tasks, params.users, params.settings).map((row) => ({
      scope: 'Projeto',
      label: row.project,
      cost_per_completed_task: round(row.cost_real / Math.max(row.completed_tasks, 1)),
      hours_per_completed_task: round(row.total_hours / Math.max(row.completed_tasks, 1)),
      on_time_rate: row.risk === 'alto' ? 30 : row.risk === 'medio' ? 65 : 100,
      delay_rate: row.risk === 'alto' ? 70 : row.risk === 'medio' ? 35 : 0,
      delivery_efficiency: round(row.completed_tasks / Math.max(row.total_hours, 1)),
    }));
    return { rows: [...projectRows, ...userRows].sort((a, b) => b.delivery_efficiency - a.delivery_efficiency) } satisfies GovernancePerformanceData;
  });
}

export function getAnalyticsCapacityEndpointResponse(params: {
  currentUser?: User;
  filters?: Partial<GovernanceAnalyticsFilters>;
  projects: Project[];
  tasks: EnrichedTask[];
  users: User[];
  settings: CostSettings;
}) {
  return forbidIfNeeded(params.currentUser, () => {
    const scoped = getScopedData(params);
    const people = buildUserRows(params.users, scoped.tasks, scoped.projects, params.settings).sort(
      (a, b) => b.current_load - a.current_load || b.hours_period - a.hours_period
    );
    const byTeam = buildTeamCapacity(scoped.tasks).map((item) => ({
      label: item.name,
      load: item.inProgress,
      hours: round(scoped.tasks.filter((task) => task.assignee === item.name).reduce((sum, task) => sum + getTaskOwnHours(task), 0)),
      overdue: item.overdue,
    }));
    return { people, byTeam } satisfies GovernanceCapacityData;
  });
}

export function getAnalyticsRisksEndpointResponse(params: {
  currentUser?: User;
  filters?: Partial<GovernanceAnalyticsFilters>;
  projects: Project[];
  tasks: EnrichedTask[];
  users: User[];
  settings: CostSettings;
}) {
  return forbidIfNeeded(params.currentUser, () => {
    const scoped = getScopedData(params);
    const projectRisks = buildProjectRows(scoped.projects, scoped.tasks, params.users, params.settings)
      .filter((row) => row.risk !== 'baixo')
      .sort((a, b) => riskWeight(b.risk) - riskWeight(a.risk) || b.cost_real - a.cost_real);
    const taskRisks = buildTaskRows(scoped.tasks, scoped.projectsById, scoped.usersById, params.settings)
      .filter((row) => row.is_blocked || (!!row.due_date && !['done'].includes(row.status) && new Date(row.due_date).getTime() < Date.now()))
      .sort((a, b) => Number(b.is_blocked) - Number(a.is_blocked) || b.cost_real - a.cost_real);
    const overloadedPeople = buildUserRows(params.users, scoped.tasks, scoped.projects, params.settings)
      .filter((row) => row.current_load >= 5 || row.delayed_tasks >= 2)
      .sort((a, b) => b.current_load - a.current_load || b.delayed_tasks - a.delayed_tasks);

    const insights = [
      projectRisks[0]
        ? {
            title: 'Maior risco financeiro',
            description: `${projectRisks[0].project} combina ${projectRisks[0].risk} risco com ${projectRisks[0].progress}% de progresso e ${projectRisks[0].cost_real.toFixed(2)} de custo real.`,
            tone: 'danger' as const,
          }
        : null,
      taskRisks[0]
        ? {
            title: 'Maior gargalo operacional',
            description: `${taskRisks[0].task} está ${taskRisks[0].is_blocked ? 'bloqueada' : 'em atraso'} e concentra ${taskRisks[0].hours}h apontadas.`,
            tone: 'warning' as const,
          }
        : null,
      overloadedPeople[0]
        ? {
            title: 'Sobrecarga mais alta',
            description: `${overloadedPeople[0].collaborator} está com ${overloadedPeople[0].current_load} itens em andamento e ${overloadedPeople[0].delayed_tasks} atrasos.`,
            tone: 'warning' as const,
          }
        : null,
    ].filter(Boolean) as GovernanceRisksData['insights'];

    return { projectRisks, taskRisks, overloadedPeople, insights } satisfies GovernanceRisksData;
  });
}

export function getAnalyticsCostSettingsEndpointResponse(params: {
  currentUser?: User;
  settings: CostSettings;
}) {
  return forbidIfNeeded(params.currentUser, () => params.settings);
}

export function patchAnalyticsCostSettingsEndpointResponse(params: {
  currentUser?: User;
  nextSettings: Partial<CostSettings>;
  settings: CostSettings;
  updateCostSettings: (updates: Partial<CostSettings>) => void;
}) {
  return forbidIfNeeded(params.currentUser, () => {
    params.updateCostSettings(params.nextSettings);
    return {
      ...params.settings,
      ...params.nextSettings,
    };
  });
}

export function patchAnalyticsCostUserEndpointResponse(params: {
  currentUser?: User;
  userId: string;
  users: User[];
  updateUser: (id: string, updates: Partial<User>) => void;
  updates: Partial<Pick<User, 'salaryMonthly' | 'costPerHour' | 'cargo'>>;
}) {
  return forbidIfNeeded(params.currentUser, () => {
    params.updateUser(params.userId, params.updates);
    return params.users.find((user) => user.id === params.userId);
  });
}

function riskWeight(risk: GovernanceProjectRow['risk']) {
  return risk === 'alto' ? 3 : risk === 'medio' ? 2 : 1;
}
