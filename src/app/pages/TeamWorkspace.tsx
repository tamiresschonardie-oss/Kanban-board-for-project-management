import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { LayoutGrid, LayoutList, Users, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { KanbanPageHeader, KanbanToolbar } from '../components/kanban/KanbanLayout';
import { GovernanceFilters } from '../components/GovernanceFilters';
import { ProjectListTable } from '../components/ProjectListTable';
import { GovernanceKanbanBoard } from '../components/governance/GovernanceKanbanBoard';
import { AppErrorBoundary } from '../components/shared/AppErrorBoundary';
import { useProjects } from '../context/ProjectContext';
import { useAdmin } from '../context/AdminContext';
import { useTasks } from '../context/TaskContext';
import { Project } from '../types';
import {
  DEFAULT_PROJECT_FILTERS,
  filterProjects,
  getProjectFilterOptions,
  getProjectMetrics,
} from '../utils/projectSelectors';
import { canUserPerform } from '../utils/permissions';
import { getUserTeams } from '../utils/userTeams';
import { useProjectDetailNavigation } from '../hooks/useProjectDetailNavigation';

type WorkspaceTab = 'kanban' | 'list';

export function TeamWorkspace() {
  const navigate = useNavigate();
  const { openProjectDetail } = useProjectDetailNavigation();
  const { team } = useParams<{ team: string }>();
  const { projects } = useProjects();
  const { currentUser } = useAdmin();
  const { allTasks } = useTasks();
  const canManagePhases = canUserPerform(currentUser, 'governance:manage');
  const canMoveProjects = !!currentUser && currentUser.status === 'active';
  const isGlobalWorkspace = !team;
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('kanban');

  const accessibleTeams = useMemo(() => {
    if (currentUser?.role === 'user') return getUserTeams(currentUser);
    return Array.from(new Set(projects.map((project) => project.group).filter(Boolean) as string[]));
  }, [currentUser, projects]);

  const initialTeamFilter = useMemo(
    () => (team ? [team] : accessibleTeams),
    [accessibleTeams, team]
  );
  const [filters, setFilters] = useState({
    ...DEFAULT_PROJECT_FILTERS,
    team: initialTeamFilter,
  });

  useEffect(() => {
    setFilters((previous) => ({
      ...previous,
      team: team ? [team] : accessibleTeams,
    }));
  }, [accessibleTeams, team]);

  const isRestrictedWorkspaceView =
    currentUser?.role === 'user' &&
    Boolean(team) &&
    !accessibleTeams.includes(team);

  const workspaceProjects = useMemo(
    () =>
      projects.filter((project) =>
        filters.team.length > 0 ? filters.team.includes(project.group || '') : accessibleTeams.includes(project.group || '')
      ),
    [accessibleTeams, filters.team, projects]
  );
  const filterOptions = useMemo(
    () => getProjectFilterOptions(workspaceProjects),
    [workspaceProjects]
  );
  const visibleProjects = useMemo(
    () => {
      return filterProjects(projects, {
        ...filters,
        searchTerm: '',
        team: filters.team.length > 0 ? filters.team : accessibleTeams,
      });
    },
    [accessibleTeams, filters, projects]
  );

  if (isRestrictedWorkspaceView) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="rounded-2xl border border-yellow-200 bg-white px-8 py-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Workspace restrito</h1>
          <p className="mt-2 text-gray-600">
            O perfil atual pode visualizar apenas o workspace da própria equipe.
          </p>
          <button
            onClick={() => navigate('/workspace')}
            className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Ir para meu workspace
          </button>
        </div>
      </div>
    );
  }

  const stats = {
    total: visibleProjects.length,
    inProgress: visibleProjects.filter(
      (project) =>
        getProjectMetrics(project).progress > 0 && getProjectMetrics(project).progress < 100
    ).length,
    completed: visibleProjects.filter((project) => getProjectMetrics(project).progress === 100)
      .length,
    avgProgress:
      visibleProjects.length > 0
        ? Math.round(
            visibleProjects.reduce((sum, project) => sum + getProjectMetrics(project).progress, 0) /
              visibleProjects.length
          )
        : 0,
  };

  const handleEdit = (project: Project) => {
    openProjectDetail(project.id);
  };

  const hasActiveFilters =
    filters.projectId.length > 0 ||
    filters.governancePhaseId.length > 0 ||
    filters.situation.length > 0 ||
    filters.responsible.length > 0 ||
    filters.client.length > 0 ||
    filters.requester.length > 0 ||
    filters.product.length > 0 ||
    filters.year.length > 0 ||
    filters.onlyWeeklyFocus ||
    (isGlobalWorkspace
      ? filters.team.length !== accessibleTeams.length
      : filters.team.join('|') !== (team ? [team] : []).join('|'));

  const workspaceTitle = isGlobalWorkspace ? 'Workspace Principal' : `Workspace - ${team}`;
  const workspaceDescription = isGlobalWorkspace
    ? 'Quadro operacional principal com todos os projetos em execução, filtros globais e foco na entrega do dia a dia.'
    : `Recorte operacional do workspace ${team}, mantendo a mesma base de execução do quadro principal.`;

  return (
    <div className="page-shell space-y-6">
      <KanbanPageHeader
        eyebrow="Workspace"
        title={workspaceTitle}
        description={workspaceDescription}
        actions={
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricTile label="Projetos" value={String(stats.total)} tone="dark" />
            <MetricTile label="Em andamento" value={String(stats.inProgress)} />
            <MetricTile label="Concluídos" value={String(stats.completed)} />
            <MetricTile label="Progresso médio" value={`${stats.avgProgress}%`} />
          </div>
        }
      />

      <AppErrorBoundary
        area="workspace-filters"
        title="Os filtros do workspace falharam"
        message="O quadro e a lista continuam disponíveis mesmo se este bloco apresentar erro."
      >
        <GovernanceFilters
          filters={filters}
          options={filterOptions}
          showTeamFilter={isGlobalWorkspace}
          title={isGlobalWorkspace ? 'Filtros globais do workspace' : 'Filtros do workspace'}
          subtitle={
            isGlobalWorkspace
              ? 'Refine o quadro principal da operação sem perder sincronização com lista, Gantt e governança.'
              : 'Use o mesmo padrão estrutural da governança para recortar a carteira operacional da equipe.'
          }
          actionsSlot={
            hasActiveFilters ? (
              <button
                onClick={() =>
                  setFilters({
                    ...DEFAULT_PROJECT_FILTERS,
                    team: team ? [team] : accessibleTeams,
                  })
                }
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Limpar filtros
              </button>
            ) : null
          }
          onChange={(updates) => setFilters((previous) => ({ ...previous, ...updates }))}
        />
      </AppErrorBoundary>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)} className="space-y-6">
        <KanbanToolbar
          title={isGlobalWorkspace ? 'Operação principal' : 'Quadro da equipe'}
          description={
            isGlobalWorkspace
              ? 'Kanban principal da operação, com todos os projetos em execução e foco no trabalho do time.'
              : 'Mesmo layout-base do quadro principal, agora dentro do recorte operacional da equipe.'
          }
          controls={
            <>
              <TabsList className="inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1">
                <TabsTrigger value="kanban" className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium">
                  <LayoutGrid className="h-4 w-4" />
                  Kanban principal
                </TabsTrigger>
                <TabsTrigger value="list" className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium">
                  <LayoutList className="h-4 w-4" />
                  Lista
                </TabsTrigger>
              </TabsList>
            </>
          }
        />

        <TabsContent value="kanban">
          {visibleProjects.length > 0 ? (
            <GovernanceKanbanBoard
              projects={visibleProjects}
              boardMode="workspace"
              workspaceId={isGlobalWorkspace ? undefined : team}
              workspaceIds={isGlobalWorkspace ? filters.team : undefined}
              onProjectOpen={handleEdit}
              allTasks={allTasks}
              canManagePhases={canManagePhases}
              canMoveProjects={canMoveProjects}
              highlightWeeklyFocus={filters.onlyWeeklyFocus}
            />
          ) : (
            <WorkspaceEmptyState hasActiveFilters={hasActiveFilters} />
          )}
        </TabsContent>

        <TabsContent value="list">
          {visibleProjects.length > 0 ? (
            <ProjectListTable
              projects={visibleProjects}
              onEdit={handleEdit}
              onlyWeeklyFocus={filters.onlyWeeklyFocus}
              highlightWeeklyFocus={filters.onlyWeeklyFocus}
            />
          ) : (
            <WorkspaceEmptyState hasActiveFilters={hasActiveFilters} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricTile({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'dark';
}) {
  return (
    <div
      className={
        tone === 'dark'
          ? 'rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-sm'
          : 'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900'
      }
    >
      <p className={`text-xs font-medium uppercase tracking-wide ${tone === 'dark' ? 'text-white/75' : 'text-slate-500'}`}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function WorkspaceEmptyState({ hasActiveFilters }: { hasActiveFilters: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
      <Users className="mx-auto mb-4 h-16 w-16 text-gray-300" />
      <h3 className="mb-2 text-lg font-semibold text-gray-900">Nenhum projeto encontrado</h3>
      <p className="text-gray-500">
        {hasActiveFilters
          ? 'Tente ajustar os filtros para ver mais projetos.'
          : 'Ainda não existem projetos disponíveis neste recorte.'}
      </p>
    </div>
  );
}
