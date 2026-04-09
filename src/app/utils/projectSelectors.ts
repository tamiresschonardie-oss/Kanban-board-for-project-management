import { OperationalPriorityEntry, Project, ProjectSituation, Subtask, User, WBSTask } from '../types';
import { isTaskNodeDeleted } from '../selectors/taskSelectors';
import { getProjectProgress } from './progressCalculator';
import { getDynamicYearOptions } from './yearOptions';

export const ALL_PROJECT_FILTER_VALUE = 'Todos';

export interface ProjectFilterState {
  searchTerm: string;
  team: string[];
  projectId: string[];
  governancePhaseId: string[];
  situation: string[];
  responsible: string[];
  client: string[];
  requester: string[];
  product: string[];
  year: string[];
  onlyWeeklyFocus: boolean;
}

export interface ProjectFilterOptions {
  teams: string[];
  projects: Array<{ id: string; name: string }>;
  governancePhases: Array<{ id: string; label: string }>;
  situations: Array<{ id: ProjectSituation; label: string }>;
  responsibles: string[];
  clients: string[];
  requesters: string[];
  products: string[];
  years: string[];
}

type WeeklyFocusTaskLike = Pick<WBSTask, 'id' | 'projectId' | 'isWeeklyFocus'>;

export interface ExecutiveSummaryMetric {
  label: string;
  value: number;
}

export interface ExecutiveDistributionItem {
  key: string;
  label: string;
  count: number;
  progressAverage?: number;
  trackedHours?: number;
}

export interface ClientDeliveryBreakdownItem {
  client: string;
  inProgress: number;
  delivered: number;
  inProgressPercentage: number;
  deliveredPercentage: number;
}

export interface MonthlyDeliveryTrendItem {
  month: string;
  year: number;
  count: number;
}

export const DEFAULT_PROJECT_FILTERS: ProjectFilterState = {
  searchTerm: '',
  team: [],
  projectId: [],
  governancePhaseId: [],
  situation: [],
  responsible: [],
  client: [],
  requester: [],
  product: [],
  year: [],
  onlyWeeklyFocus: false,
};

const FALLBACK_PROJECT_METRICS = {
  progress: 0,
  tasksTotal: 0,
  tasksCompleted: 0,
  hoursRemaining: 0,
  totalTimeTracked: 0,
  hoursRemainingSeconds: 0,
  totalTimeTrackedSeconds: 0,
} as const;

const GOVERNANCE_PHASE_LABELS: Record<string, string> = {
  backlog: 'Backlog',
  'pre-analysis': 'Em análise',
  documentation: 'Documentação',
  'waiting-approval': 'Aguardando aprovação',
  construction: 'Em execução',
};

const SITUATION_LABELS: Record<ProjectSituation, string> = {
  ativo: 'Ativo',
  pausado: 'Pausado',
  cancelado: 'Cancelado',
};

const uniqueSorted = (items: Array<string | undefined>) =>
  Array.from(new Set(items.filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));

const getGovernancePhaseLabelMap = (projects: Project[]) =>
  projects.reduce<Record<string, string>>((accumulator, project) => {
    (project.governance?.phases || []).forEach((phase) => {
      accumulator[String(phase.id)] = phase.name;
    });
    return accumulator;
  }, {});

export function getProjectFilterYear(project: Project): string | undefined {
  if (project.year) return String(project.year);

  const candidateDate =
    project.deliveredAt ||
    project.requestDate ||
    project.startDate ||
    project.deadline ||
    project.completionDate;

  if (!candidateDate) return undefined;

  const parsed = new Date(candidateDate);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return String(parsed.getFullYear());
}

export function getProjectFilterOptions(projects: Project[]): ProjectFilterOptions {
  const phaseLabels = getGovernancePhaseLabelMap(projects);
  const governancePhases = uniqueSorted(projects.map((project) => getProjectGovernancePhaseId(project)))
    .map((phaseId) => ({
      id: phaseId,
      label: phaseLabels[phaseId] || GOVERNANCE_PHASE_LABELS[phaseId] || phaseId,
    }));

  const situations = uniqueSorted(projects.map((project) => getProjectGovernanceSituation(project)))
    .map((situation) => ({
      id: situation as ProjectSituation,
      label: SITUATION_LABELS[situation as ProjectSituation] || situation,
    }));

  return {
    teams: uniqueSorted(projects.map((project) => project.group)),
    projects: projects
      .map((project) => ({ id: project.id, name: project.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    governancePhases,
    situations,
    responsibles: uniqueSorted(projects.map((project) => project.responsible)),
    clients: uniqueSorted(projects.map((project) => project.client)),
    requesters: uniqueSorted(projects.map((project) => getProjectRequester(project))),
    products: uniqueSorted(projects.map((project) => project.product)),
    years: getDynamicYearOptions(projects.map((project) => getProjectFilterYear(project))),
  };
}

export function filterProjects(projects: Project[], filters: ProjectFilterState): Project[] {
  return projects.filter((project) => {
    if (
      filters.searchTerm &&
      !project.name.toLowerCase().includes(filters.searchTerm.toLowerCase())
    ) {
      return false;
    }

    if (filters.team.length > 0 && !filters.team.includes(project.group || '')) {
      return false;
    }

    if (filters.projectId.length > 0 && !filters.projectId.includes(project.id)) {
      return false;
    }

    if (
      filters.governancePhaseId.length > 0 &&
      !filters.governancePhaseId.includes(getProjectGovernancePhaseId(project))
    ) {
      return false;
    }

    if (
      filters.situation.length > 0 &&
      !filters.situation.includes(getProjectGovernanceSituation(project))
    ) {
      return false;
    }

    if (
      filters.responsible.length > 0 &&
      !filters.responsible.includes(project.responsible || '')
    ) {
      return false;
    }

    if (filters.client.length > 0 && !filters.client.includes(project.client || '')) {
      return false;
    }

    const requester = getProjectRequester(project);
    if (filters.requester.length > 0 && !filters.requester.includes(requester)) {
      return false;
    }

    if (filters.product.length > 0 && !filters.product.includes(project.product || '')) {
      return false;
    }

    if (
      filters.year.length > 0 &&
      !filters.year.includes(getProjectFilterYear(project) || '')
    ) {
      return false;
    }

    if (filters.onlyWeeklyFocus && !isProjectWeeklyFocus(project)) {
      return false;
    }

    return true;
  });
}

export function getProjectGovernancePhaseId(project: Project): string {
  return (
    project?.governance?.currentPhaseId ||
    project?.status ||
    'backlog'
  );
}

export function getProjectWorkspaceStageId(project: Project, workspaceId?: string): string | undefined {
  const normalizedWorkspaceId = workspaceId || project.group;
  return (project.workspaceBoardStates || []).find(
    (state) => state.workspaceId === normalizedWorkspaceId
  )?.stageId;
}

export function getProjectCurrentGovernancePhase(project: Project) {
  return (project.governance?.phases || []).find(
    (phase) => String(phase.id) === String(getProjectGovernancePhaseId(project))
  );
}

export function isProjectInCompletedPhase(project: Project): boolean {
  const currentPhase = getProjectCurrentGovernancePhase(project);
  if (currentPhase?.isTerminal) return true;

  const phaseName = (currentPhase?.name || getProjectGovernancePhaseId(project))
    .toLocaleLowerCase('pt-BR');
  return phaseName.includes('conclu');
}

export function getProjectDeliveredAt(project: Project): string | undefined {
  return project.deliveredAt || project.completionDate;
}

export function getProjectGovernanceSituation(project: Project): ProjectSituation {
  return (
    project?.governance?.situation ||
    project?.situation ||
    (project?.isPaused ? 'pausado' : 'ativo')
  ) as ProjectSituation;
}

export function isProjectPaused(project: Project): boolean {
  return getProjectGovernanceSituation(project) === 'pausado';
}

export function getProjectExecutionTemplateId(project: Project): string | undefined {
  return project.execution?.eapTemplateId || project.eapId;
}

export function getProjectExecutionPhases(project: Project) {
  return project.execution?.phases || project.phases || [];
}

export function getProjectExecutionDependencies(project: Project) {
  return project.execution?.dependencies || [];
}

export function getProjectExecutionManualTimelineEntries(project: Project) {
  return project.execution?.manualTimelineEntries || [];
}

export function getProjectRequester(project: Project): string {
  return project.requestedBy || '';
}

export function getProjectMetrics(project: Project) {
  const hoursRemaining = project.metrics?.hoursRemaining ?? project.hoursRemaining ?? FALLBACK_PROJECT_METRICS.hoursRemaining;
  const totalTimeTracked =
    project.metrics?.totalTimeTracked ?? project.totalTimeTracked ?? FALLBACK_PROJECT_METRICS.totalTimeTracked;
  return {
    progress: project.metrics?.progress ?? project.progress ?? FALLBACK_PROJECT_METRICS.progress,
    tasksTotal: project.metrics?.tasksTotal ?? project.tasksTotal ?? FALLBACK_PROJECT_METRICS.tasksTotal,
    tasksCompleted:
      project.metrics?.tasksCompleted ?? project.tasksCompleted ?? FALLBACK_PROJECT_METRICS.tasksCompleted,
    hoursRemaining,
    totalTimeTracked,
    hoursRemainingSeconds:
      project.metrics?.hoursRemainingSeconds ??
      Math.max(0, Math.round(hoursRemaining * 3600)),
    totalTimeTrackedSeconds:
      project.metrics?.totalTimeTrackedSeconds ??
      Math.max(0, Math.round(totalTimeTracked * 3600)),
  };
}

function flattenProjectNodeList(items: Array<WBSTask | Subtask>): Array<WBSTask | Subtask> {
  return items.flatMap((item) => [item, ...flattenProjectNodeList(item.subtasks || [])]);
}

export function getProjectExecutionItems(project: Project): Array<WBSTask | Subtask> {
  return getProjectExecutionPhases(project).flatMap((phase) =>
    (phase.milestones || []).flatMap((milestone) => flattenProjectNodeList(milestone.tasks || []))
  );
}

export function getProjectCurrentExecutionPhaseLabel(project: Project): string {
  const currentPhase = getProjectExecutionPhases(project).find((phase) =>
    phase.milestones.some((milestone) =>
      (milestone.tasks || []).some(
        (task) => !isTaskNodeDeleted(task) && !task.completed && task.status !== 'done'
      )
    )
  );

  return currentPhase?.name || getProjectExecutionPhases(project)[0]?.name || 'Planejamento';
}

export function getProjectSmartStatus(project: Project, referenceDate = new Date()): string {
  const items = getProjectExecutionItems(project);
  const activeItems = items.filter((item) => !isTaskNodeDeleted(item) && item.status === 'in_progress');
  const overdueItems = items.filter(
    (item) =>
      !isTaskNodeDeleted(item) &&
      item.dueDate &&
      item.status !== 'done' &&
      !item.completed &&
      new Date(item.dueDate).getTime() < referenceDate.getTime()
  );
  const overdueCriticalItems = overdueItems.filter((item) => item.priority === 'high');
  const recentActivityTimestamps = [
    ...(project.activities || []).map((activity) => activity.timestamp),
    ...items.flatMap((item) => [
      ...(item.activities || []).map((activity) => activity.timestamp),
      ...(item.timeLogs || []).map((log) => log.createdAt),
      item.startDate,
      item.dueDate,
    ]),
  ].filter(Boolean) as string[];
  const latestActivity = recentActivityTimestamps
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0];
  const threeDaysAgo = referenceDate.getTime() - 3 * 24 * 60 * 60 * 1000;
  const sprintItems = items.filter((item) => item.sprintId);

  if (overdueCriticalItems.length > 0) {
    return `Projeto com atraso em ${overdueCriticalItems.length} tarefa${overdueCriticalItems.length > 1 ? 's críticas' : ' crítica'}`;
  }

  if (overdueItems.length > 0) {
    return `Projeto com ${overdueItems.length} item${overdueItems.length > 1 ? 's atrasados' : ' atrasado'}`;
  }

  if (activeItems.length > 0) {
    return `Projeto em desenvolvimento com ${activeItems.length} tarefa${activeItems.length > 1 ? 's ativas' : ' ativa'}`;
  }

  if (latestActivity && latestActivity < threeDaysAgo) {
    return 'Sem progresso recente (últimos 3 dias)';
  }

  if (sprintItems.length > 0) {
    return `Projeto em execução com ${sprintItems.length} item${sprintItems.length > 1 ? 's em sprint' : ' em sprint'}`;
  }

  return `Projeto em planejamento na fase ${getProjectCurrentExecutionPhaseLabel(project)}`;
}

export function isProjectWeeklyFocus(project: Project): boolean {
  return Boolean(project.isWeeklyFocus);
}

export function getWeeklyFocusTaskIds(
  tasks: WeeklyFocusTaskLike[],
  operationalPriorityEntries: OperationalPriorityEntry[] = []
): Set<string> {
  const focusedTaskIds = new Set<string>();

  tasks.forEach((task) => {
    if (task.isWeeklyFocus) {
      focusedTaskIds.add(task.id);
    }
  });

  operationalPriorityEntries.forEach((entry) => {
    if (entry.itemType === 'task' && entry.isWeeklyFocus) {
      focusedTaskIds.add(entry.itemId);
    }
  });

  return focusedTaskIds;
}

export function getWeeklyFocusProjectIds(
  projects: Project[],
  tasks: WeeklyFocusTaskLike[],
  operationalPriorityEntries: OperationalPriorityEntry[] = []
): Set<string> {
  const focusedProjectIds = new Set<string>();
  const focusedTaskIds = getWeeklyFocusTaskIds(tasks, operationalPriorityEntries);
  const taskProjectIdMap = new Map(
    tasks
      .filter((task) => task.projectId)
      .map((task) => [task.id, task.projectId as string])
  );

  projects.forEach((project) => {
    if (project.isWeeklyFocus) {
      focusedProjectIds.add(project.id);
    }
  });

  operationalPriorityEntries.forEach((entry) => {
    if (!entry.isWeeklyFocus) return;

    if (entry.itemType === 'project') {
      focusedProjectIds.add(entry.itemId);
      return;
    }

    const projectId = taskProjectIdMap.get(entry.itemId);
    if (projectId) {
      focusedProjectIds.add(projectId);
    }
  });

  focusedTaskIds.forEach((taskId) => {
    const projectId = taskProjectIdMap.get(taskId);
    if (projectId) {
      focusedProjectIds.add(projectId);
    }
  });

  return focusedProjectIds;
}

export function getWeeklyFocusTaskCountByProject(
  tasks: WeeklyFocusTaskLike[],
  operationalPriorityEntries: OperationalPriorityEntry[] = []
): Map<string, number> {
  const counts = new Map<string, number>();
  const focusedTaskIds = getWeeklyFocusTaskIds(tasks, operationalPriorityEntries);

  tasks.forEach((task) => {
    if (!task.projectId || !focusedTaskIds.has(task.id)) return;
    const projectId = task.projectId as string;
    counts.set(projectId, (counts.get(projectId) || 0) + 1);
  });

  return counts;
}

export function applyResolvedWeeklyFocusToProjects(
  projects: Project[],
  tasks: WeeklyFocusTaskLike[],
  operationalPriorityEntries: OperationalPriorityEntry[] = []
): Project[] {
  const focusedProjectIds = getWeeklyFocusProjectIds(projects, tasks, operationalPriorityEntries);

  return projects.map((project) => ({
    ...project,
    isWeeklyFocus: focusedProjectIds.has(project.id),
  }));
}

export function getProjectTaskCounts(project: Project) {
  const metrics = getProjectMetrics(project);
  return {
    completed: metrics.tasksCompleted,
    total: metrics.tasksTotal,
  };
}

export function getProjectRiskLevel(project: Project) {
  const metrics = getProjectMetrics(project);
  if (metrics.progress < 30 && metrics.hoursRemaining > 120) {
    return { color: 'bg-red-500', label: 'Alto risco' };
  }
  if (metrics.progress < 60 && metrics.hoursRemaining > 80) {
    return { color: 'bg-yellow-500', label: 'Médio risco' };
  }
  return { color: 'bg-green-500', label: 'No prazo' };
}

export function getProjectDerivedProgress(project: Project, allTasks: Parameters<typeof getProjectProgress>[1]) {
  return getProjectProgress(project, allTasks);
}

export function isProjectCompleted(project: Project): boolean {
  return isProjectDelivered(project);
}

export function isProjectDelivered(project: Project): boolean {
  return isProjectInCompletedPhase(project) && Boolean(getProjectDeliveredAt(project));
}

export function isProjectInProgress(project: Project): boolean {
  return !isProjectDelivered(project) && getProjectGovernanceSituation(project) !== 'cancelado';
}

export function isProjectOverdue(project: Project, referenceDate = new Date()): boolean {
  if (!project.deadline || isProjectDelivered(project)) return false;
  return new Date(project.deadline).getTime() < referenceDate.getTime();
}

export function isProjectDueSoon(
  project: Project,
  referenceDate = new Date(),
  daysAhead = 7
): boolean {
  if (!project.deadline || isProjectDelivered(project)) return false;
  const deadline = new Date(project.deadline);
  const limit = new Date(referenceDate);
  limit.setDate(limit.getDate() + daysAhead);
  return deadline.getTime() >= referenceDate.getTime() && deadline.getTime() <= limit.getTime();
}

export function getProjectsCompletedByYear(projects: Project[]) {
  return projects.reduce<Record<string, number>>((accumulator, project) => {
    if (!isProjectDelivered(project)) return accumulator;

    const completionDate = getProjectDeliveredAt(project);
    if (!completionDate) return accumulator;

    const year = new Date(completionDate).getFullYear();
    if (Number.isNaN(year)) return accumulator;

    accumulator[String(year)] = (accumulator[String(year)] || 0) + 1;
    return accumulator;
  }, {});
}

export function getRecentProjectActivities(projects: Project[], limit = 8) {
  return projects
    .flatMap((project) =>
      (project.activities || []).map((activity) => ({
        ...activity,
        projectId: project.id,
        projectName: project.name,
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export function getWorkspaceProjects(projects: Project[], teamName: string) {
  return projects.filter((project) => project.group === teamName);
}

export function getExecutiveScopedProjects(projects: Project[], currentUser?: User) {
  if (!currentUser) return [];
  if (currentUser.role === 'user') {
    return projects.filter((project) => project.group === currentUser.team);
  }
  return projects;
}

export function getProjectStatusDistribution(projects: Project[]): ExecutiveDistributionItem[] {
  const labels = {
    ...GOVERNANCE_PHASE_LABELS,
    ...getGovernancePhaseLabelMap(projects),
  };

  return uniqueSorted(projects.map((project) => getProjectGovernancePhaseId(project))).map((phaseId) => {
    const phaseProjects = projects.filter(
      (project) => getProjectGovernancePhaseId(project) === phaseId
    );
    const progressAverage =
      phaseProjects.length > 0
        ? Math.round(
            phaseProjects.reduce((sum, project) => sum + getProjectMetrics(project).progress, 0) /
              phaseProjects.length
          )
        : 0;

    return {
      key: phaseId,
      label: labels[phaseId] || phaseId,
      count: phaseProjects.length,
      progressAverage,
    };
  });
}

export function getProjectSituationDistribution(projects: Project[]): ExecutiveDistributionItem[] {
  return uniqueSorted(projects.map((project) => getProjectGovernanceSituation(project))).map((situation) => ({
    key: situation,
    label: SITUATION_LABELS[situation as ProjectSituation] || situation,
    count: projects.filter((project) => getProjectGovernanceSituation(project) === situation).length,
  }));
}

export function getProjectDistributionByTeam(projects: Project[]): ExecutiveDistributionItem[] {
  return uniqueSorted(projects.map((project) => project.group)).map((team) => {
    const teamProjects = projects.filter((project) => project.group === team);
    const progressAverage =
      teamProjects.length > 0
        ? Math.round(
            teamProjects.reduce((sum, project) => sum + getProjectMetrics(project).progress, 0) /
              teamProjects.length
          )
        : 0;
    const trackedHours = Number(
      teamProjects.reduce((sum, project) => sum + getProjectMetrics(project).totalTimeTracked, 0).toFixed(2)
    );

    return {
      key: team,
      label: team,
      count: teamProjects.length,
      progressAverage,
      trackedHours,
    };
  });
}

export function getProjectDistributionByProduct(projects: Project[]): ExecutiveDistributionItem[] {
  return uniqueSorted(projects.map((project) => project.product)).map((product) => {
    const productProjects = projects.filter((project) => project.product === product);
    return {
      key: product,
      label: product,
      count: productProjects.length,
      progressAverage:
        productProjects.length > 0
          ? Math.round(
              productProjects.reduce((sum, project) => sum + getProjectMetrics(project).progress, 0) /
                productProjects.length
            )
          : 0,
      trackedHours: Number(
        productProjects.reduce((sum, project) => sum + getProjectMetrics(project).totalTimeTracked, 0).toFixed(2)
      ),
    };
  });
}

export function getExecutiveSummary(projects: Project[], referenceDate = new Date()) {
  const currentYear = String(referenceDate.getFullYear());
  const completedByYear = getProjectsCompletedByYear(projects);

  return {
    totalProjects: projects.length,
    inProgress: projects.filter((project) => isProjectInProgress(project)).length,
    overdue: projects.filter((project) => isProjectOverdue(project, referenceDate)).length,
    dueSoon: projects.filter((project) => isProjectDueSoon(project, referenceDate)).length,
    completedThisYear: completedByYear[currentYear] || 0,
    totalTrackedHours: Number(
      projects.reduce((sum, project) => sum + getProjectMetrics(project).totalTimeTracked, 0).toFixed(2)
    ),
    avgProgress:
      projects.length > 0
        ? Math.round(
            projects.reduce((sum, project) => sum + getProjectMetrics(project).progress, 0) /
              projects.length
          )
        : 0,
  };
}

export function getProjectClientDeliveryBreakdown(projects: Project[]): ClientDeliveryBreakdownItem[] {
  return uniqueSorted(projects.map((project) => project.client)).map((client) => {
    const clientProjects = projects.filter((project) => project.client === client);
    const inProgress = clientProjects.filter((project) => isProjectInProgress(project)).length;
    const delivered = clientProjects.filter((project) => isProjectDelivered(project)).length;
    const total = inProgress + delivered;

    return {
      client,
      inProgress,
      delivered,
      inProgressPercentage: total > 0 ? Math.round((inProgress / total) * 100) : 0,
      deliveredPercentage: total > 0 ? Math.round((delivered / total) * 100) : 0,
    };
  });
}

export function getProjectsDeliveredByTeamInYear(projects: Project[], year: number): ExecutiveDistributionItem[] {
  return uniqueSorted(projects.map((project) => project.group)).map((team) => {
    const deliveredProjects = projects.filter((project) => {
      if (project.group !== team || !isProjectDelivered(project)) return false;
      const deliveredAt = getProjectDeliveredAt(project);
      if (!deliveredAt) return false;
      return new Date(deliveredAt).getFullYear() === year;
    });

    return {
      key: team,
      label: team,
      count: deliveredProjects.length,
    };
  });
}

export function getDeliveryTrendByMonth(projects: Project[], years: number[]): MonthlyDeliveryTrendItem[] {
  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return years.flatMap((year) =>
    monthLabels.map((month, monthIndex) => ({
      month,
      year,
      count: projects.filter((project) => {
        if (!isProjectDelivered(project)) return false;
        const deliveredAt = getProjectDeliveredAt(project);
        if (!deliveredAt) return false;
        const parsed = new Date(deliveredAt);
        return parsed.getFullYear() === year && parsed.getMonth() === monthIndex;
      }).length,
    }))
  );
}

export function getProjectsByNamedClients(
  projects: Project[],
  clientNames: string[]
): Array<{ key: string; label: string; active: number; delivered: number }> {
  return clientNames.map((clientName) => {
    const clientProjects = projects.filter(
      (project) => project.client === clientName || project.group === clientName
    );
    return {
      key: clientName,
      label: clientName,
      active: clientProjects.filter((project) => isProjectInProgress(project)).length,
      delivered: clientProjects.filter((project) => isProjectDelivered(project)).length,
    };
  });
}
