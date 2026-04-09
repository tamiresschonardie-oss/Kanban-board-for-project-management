import { useMemo, useState } from 'react';
import { Briefcase, Building2, X } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import { useAdmin } from '../context/AdminContext';
import { ProjectCard } from '../components/ProjectCard';
import { useProjectDetailNavigation } from '../hooks/useProjectDetailNavigation';
import { GovernanceFilters } from '../components/GovernanceFilters';
import {
  DEFAULT_PROJECT_FILTERS,
  filterProjects,
  getProjectFilterOptions,
  getProjectMetrics,
  isProjectCompleted,
} from '../utils/projectSelectors';

export function ByClient() {
  const { openProjectDetail } = useProjectDetailNavigation();
  const { projects } = useProjects();
  const { currentUser } = useAdmin();
  const [filters, setFilters] = useState(DEFAULT_PROJECT_FILTERS);

  const scopedProjects = useMemo(() => {
    if (!currentUser) return projects;
    if (currentUser.role === 'user') {
      return projects.filter((project) => project.group === currentUser.team);
    }
    return projects;
  }, [currentUser, projects]);

  const filteredProjects = useMemo(
    () => filterProjects(scopedProjects, filters),
    [filters, scopedProjects]
  );

  const filterOptions = useMemo(
    () => getProjectFilterOptions(scopedProjects),
    [scopedProjects]
  );

  const projectsByClient = useMemo(() => {
    const clients = Array.from(new Set(filteredProjects.map((project) => project.client))).sort((a, b) =>
      a.localeCompare(b)
    );

    return clients.map((client) => ({
      name: client,
      projects: filteredProjects.filter((project) => project.client === client),
    }));
  }, [filteredProjects]);

  const hasActiveFilters =
    filters.team.length > 0 ||
    filters.projectId.length > 0 ||
    filters.governancePhaseId.length > 0 ||
    filters.situation.length > 0 ||
    filters.responsible.length > 0 ||
    filters.client.length > 0 ||
    filters.requester.length > 0 ||
    filters.product.length > 0 ||
    filters.year.length > 0 ||
    filters.onlyWeeklyFocus;

  return (
    <div className="space-y-6 px-8 py-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-blue-50 p-3">
          <Building2 className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Projetos por Cliente</h1>
          <p className="text-sm text-gray-500">
            Agrupamento real dos projetos por cliente, usando a mesma base canônica do restante do sistema.
          </p>
        </div>
      </div>

      <div className="relative">
        <GovernanceFilters
          filters={filters}
          options={filterOptions}
          onChange={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
        />
        {hasActiveFilters && (
          <button
            onClick={() => setFilters(DEFAULT_PROJECT_FILTERS)}
            className="absolute right-8 top-4 flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-blue-600 transition-colors hover:bg-blue-50"
          >
            <X className="h-4 w-4" />
            Limpar filtros
          </button>
        )}
      </div>

      {projectsByClient.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Building2 className="mx-auto mb-3 h-12 w-12 text-gray-400" />
          <p className="text-gray-500">Nenhum projeto encontrado para os filtros atuais.</p>
        </div>
      ) : (
        projectsByClient.map(({ name, projects: clientProjects }) => {
          const total = clientProjects.length;
          const averageProgress =
            total > 0
              ? Math.round(
                  clientProjects.reduce((sum, project) => sum + getProjectMetrics(project).progress, 0) / total
                )
              : 0;
          const inProgress = clientProjects.filter((project) => {
            const progress = getProjectMetrics(project).progress;
            return progress > 0 && progress < 100;
          }).length;
          const completed = clientProjects.filter((project) => isProjectCompleted(project)).length;

          return (
            <section key={name} className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3">
                      <Briefcase className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{name}</h2>
                      <p className="mt-0.5 text-sm text-gray-500">{total} projetos no recorte atual</p>
                    </div>
                  </div>

                  <div className="flex gap-6">
                    <ClientStat label="Em andamento" value={String(inProgress)} accent="text-blue-600" />
                    <ClientStat label="Concluídos" value={String(completed)} accent="text-green-600" />
                    <ClientStat label="Progresso médio" value={`${averageProgress}%`} accent="text-gray-900" />
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all"
                    style={{ width: `${averageProgress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {clientProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => openProjectDetail(project.id)}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function ClientStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}
