import {
  CostSettings,
  CostsOverviewProjectItem,
  CostsOverviewResponse,
  Project,
  ProjectCostFilters,
  ProjectCostReport,
  User,
} from '../types';
import { buildProjectCostReport } from '../utils/projectCosts';
import { canViewCosts } from '../utils/permissions';
import { getProjectGovernancePhaseId, getProjectMetrics } from '../utils/projectSelectors';

interface EndpointSuccess<T> {
  status: 200;
  data: T;
}

interface EndpointForbidden {
  status: 403;
  error: string;
}

interface EndpointNotFound {
  status: 404;
  error: string;
}

export type ProjectCostsEndpointResponse =
  | EndpointSuccess<ProjectCostReport>
  | EndpointForbidden
  | EndpointNotFound;

export type CostsOverviewEndpointResponse =
  | EndpointSuccess<CostsOverviewResponse>
  | EndpointForbidden;

const round = (value: number) => Number(value.toFixed(2));

const matchesProjectFilters = (project: Project, filters: ProjectCostFilters) => {
  if (filters.projectIds?.length && !filters.projectIds.includes(project.id)) return false;
  if (
    filters.projectTeamNames?.length &&
    !filters.projectTeamNames.some((team) => [project.group, ...(project.teams || [])].includes(team))
  ) {
    return false;
  }
  if (
    filters.responsibleNames?.length &&
    !filters.responsibleNames.includes(project.responsible)
  ) {
    return false;
  }
  if (filters.productNames?.length && !filters.productNames.includes(project.product || '')) {
    return false;
  }
  if (filters.query?.trim()) {
    const normalizedQuery = filters.query.trim().toLocaleLowerCase('pt-BR');
    if (!project.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery)) return false;
  }

  return true;
};

const getEfficiencyScore = (report: ProjectCostReport, progress: number) => {
  const progressFactor = Math.max(progress, 5) / 100;
  return round(report.total_cost_real / progressFactor);
};

const mapOverviewProject = (
  project: Project,
  report: ProjectCostReport
): CostsOverviewProjectItem => ({
  project_id: project.id,
  name: project.name,
  total_hours: report.total_hours,
  cost_real: report.total_cost_real,
  cost_internal: report.total_cost_base,
  cost_external: report.total_cost_external,
  economy: report.economy,
  progress: getProjectMetrics(project).progress,
  status: getProjectGovernancePhaseId(project),
  team: project.group,
  responsible: project.responsible,
  product: project.product,
  efficiency_score: getEfficiencyScore(report, getProjectMetrics(project).progress),
});

export function getProjectCostsEndpointResponse(params: {
  projectId: string;
  currentUser?: User;
  projects: Project[];
  users: User[];
  settings: CostSettings;
  filters?: ProjectCostFilters;
}): ProjectCostsEndpointResponse {
  const { projectId, currentUser, projects, users, settings, filters = {} } = params;

  if (!canViewCosts(currentUser)) {
    return {
      status: 403,
      error: 'Acesso negado ao endpoint GET /projects/:id/costs.',
    };
  }

  const project = projects.find((item) => item.id === projectId);
  if (!project) {
    return {
      status: 404,
      error: 'Projeto não encontrado.',
    };
  }

  return {
    status: 200,
    data: buildProjectCostReport(project, users, settings, {
      ...filters,
      projectIds: [projectId],
    }),
  };
}

export function getCostsOverviewEndpointResponse(params: {
  currentUser?: User;
  projects: Project[];
  users: User[];
  settings: CostSettings;
  filters?: ProjectCostFilters;
}): CostsOverviewEndpointResponse {
  const { currentUser, projects, users, settings, filters = {} } = params;

  if (!canViewCosts(currentUser)) {
    return {
      status: 403,
      error: 'Acesso negado ao endpoint GET /analytics/costs/overview.',
    };
  }

  const scopedProjects = projects.filter((project) => matchesProjectFilters(project, filters));
  const overviewProjects = scopedProjects
    .map((project) => {
      const report = buildProjectCostReport(project, users, settings, filters);
      return mapOverviewProject(project, report);
    })
    .sort((a, b) => b.cost_real - a.cost_real || b.total_hours - a.total_hours);

  return {
    status: 200,
    data: {
      total_hours: round(overviewProjects.reduce((sum, item) => sum + item.total_hours, 0)),
      total_cost_real: round(overviewProjects.reduce((sum, item) => sum + item.cost_real, 0)),
      total_cost_internal: round(
        overviewProjects.reduce((sum, item) => sum + item.cost_internal, 0)
      ),
      total_cost_external: round(
        overviewProjects.reduce((sum, item) => sum + item.cost_external, 0)
      ),
      total_economy: round(overviewProjects.reduce((sum, item) => sum + item.economy, 0)),
      projects: overviewProjects,
    },
  };
}
