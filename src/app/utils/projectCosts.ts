import {
  CostSettings,
  Project,
  ProjectCostFilters,
  ProjectCostReport,
  ProjectCostUserBreakdown,
  Subtask,
  TimeLog,
  User,
  WBSTask,
} from '../types';
import { getTimeLogMinutes } from '../selectors/taskSelectors';
import { getProjectExecutionPhases } from './projectSelectors';
import { getUserTeams } from './userTeams';

const roundCurrency = (value: number) => Number(value.toFixed(2));
const roundHours = (value: number) => Number(value.toFixed(2));

const resolveUserCostPerHour = (user: User | undefined, settings: CostSettings) => {
  if (!user) return 0;
  if (typeof user.costPerHour === 'number' && Number.isFinite(user.costPerHour)) {
    return user.costPerHour;
  }
  if (typeof user.salaryMonthly === 'number' && Number.isFinite(user.salaryMonthly)) {
    return user.salaryMonthly / Math.max(settings.monthlyHoursStandard || 160, 1);
  }
  return 0;
};

const normalizeDateBoundary = (date: string | undefined, endOfDay = false) => {
  if (!date) return null;
  const value = new Date(`${date}${endOfDay ? 'T23:59:59.999' : 'T00:00:00.000'}`);
  return Number.isNaN(value.getTime()) ? null : value;
};

const isLogInPeriod = (log: TimeLog, filters: ProjectCostFilters) => {
  const startBoundary = normalizeDateBoundary(filters.startDate);
  const endBoundary = normalizeDateBoundary(filters.endDate, true);
  if (!startBoundary && !endBoundary) return true;

  const referenceValue = log.endTime || log.startTime || log.createdAt;
  const referenceDate = new Date(referenceValue);
  if (Number.isNaN(referenceDate.getTime())) return false;
  if (startBoundary && referenceDate < startBoundary) return false;
  if (endBoundary && referenceDate > endBoundary) return false;
  return true;
};

const matchesTeamFilter = (user: User | undefined, teamNames: string[] | undefined) => {
  if (!teamNames || teamNames.length === 0) return true;
  if (!user) return false;
  const userTeams = getUserTeams(user);
  return teamNames.some((teamName) => userTeams.includes(teamName));
};

const resolveLogUser = (
  log: TimeLog,
  fallbackUserId: string | undefined,
  fallbackUserName: string | undefined,
  usersById: Map<string, User>,
  usersByName: Map<string, User>
) => {
  const user =
    (log.userId ? usersById.get(log.userId) : undefined) ||
    (fallbackUserId ? usersById.get(fallbackUserId) : undefined) ||
    (fallbackUserName ? usersByName.get(fallbackUserName) : undefined);

  return {
    userId: user?.id || log.userId || fallbackUserId || 'unknown',
    userName: user?.name || fallbackUserName || 'Não identificado',
    user,
  };
};

const accumulateNodeLogs = (
  node: WBSTask | Subtask,
  filters: ProjectCostFilters,
  usersById: Map<string, User>,
  usersByName: Map<string, User>,
  userTotals: Map<string, ProjectCostUserBreakdown>,
  settings: CostSettings
) => {
  (node.timeLogs || []).forEach((log) => {
    if (!isLogInPeriod(log, filters)) return;

    const { userId, userName, user } = resolveLogUser(
      log,
      node.assigneeId,
      node.assignee,
      usersById,
      usersByName
    );

    if (filters.userIds?.length && !filters.userIds.includes(userId)) return;
    if (!matchesTeamFilter(user, filters.teamNames)) return;

    const hours = getTimeLogMinutes(log) / 60;
    if (hours <= 0) return;

    const costPerHour = resolveUserCostPerHour(user, settings);
    const entry = userTotals.get(userId) || {
      user_id: userId,
      user_name: userName,
      hours: 0,
      cost_per_hour: costPerHour,
      total_cost: 0,
    };

    entry.hours += hours;
    entry.cost_per_hour = costPerHour;
    entry.total_cost += hours * costPerHour;
    userTotals.set(userId, entry);
  });

  (node.subtasks || []).forEach((subtask) =>
    accumulateNodeLogs(subtask, filters, usersById, usersByName, userTotals, settings)
  );
};

export function buildProjectCostReport(
  project: Project,
  users: User[],
  settings: CostSettings,
  filters: ProjectCostFilters = {}
): ProjectCostReport {
  const usersById = new Map(users.map((user) => [user.id, user]));
  const usersByName = new Map(users.map((user) => [user.name, user]));
  const userTotals = new Map<string, ProjectCostUserBreakdown>();

  getProjectExecutionPhases(project).forEach((phase) => {
    (phase.milestones || []).forEach((milestone) => {
      (milestone.tasks || []).forEach((task) =>
        accumulateNodeLogs(task, filters, usersById, usersByName, userTotals, settings)
      );
    });
  });

  const breakdownByUser = Array.from(userTotals.values())
    .map((entry) => ({
      ...entry,
      hours: roundHours(entry.hours),
      cost_per_hour: roundCurrency(entry.cost_per_hour),
      total_cost: roundCurrency(entry.total_cost),
    }))
    .sort((a, b) => b.total_cost - a.total_cost || b.hours - a.hours);

  const totalHours = breakdownByUser.reduce((sum, entry) => sum + entry.hours, 0);
  const totalCostReal = breakdownByUser.reduce((sum, entry) => sum + entry.total_cost, 0);
  const totalCostBase = totalHours * settings.defaultInternalHourRate;
  const totalCostExternal = totalHours * settings.defaultExternalHourRate;

  return {
    project_id: project.id,
    project_name: project.name,
    total_hours: roundHours(totalHours),
    total_cost_real: roundCurrency(totalCostReal),
    total_cost_base: roundCurrency(totalCostBase),
    total_cost_external: roundCurrency(totalCostExternal),
    economy: roundCurrency(totalCostExternal - totalCostReal),
    breakdown_by_user: breakdownByUser,
  };
}

export function buildPortfolioCostReports(
  projects: Project[],
  users: User[],
  settings: CostSettings,
  filters: ProjectCostFilters = {}
) {
  return projects
    .filter((project) => !filters.projectIds?.length || filters.projectIds.includes(project.id))
    .map((project) => buildProjectCostReport(project, users, settings, filters))
    .sort((a, b) => b.total_cost_real - a.total_cost_real || b.total_hours - a.total_hours);
}

export function getProjectCostsApiResponse(
  projectId: string,
  projects: Project[],
  users: User[],
  settings: CostSettings,
  filters: ProjectCostFilters = {}
) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return null;
  return buildProjectCostReport(project, users, settings, { ...filters, projectIds: [projectId] });
}
