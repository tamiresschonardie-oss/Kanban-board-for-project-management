import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FolderKanban,
  PauseCircle,
  TrendingUp,
  Users,
} from 'lucide-react';
import { GovernanceFilters } from '../components/GovernanceFilters';
import { ProjectCard } from '../components/ProjectCard';
import { useProjectDetailNavigation } from '../hooks/useProjectDetailNavigation';
import { useAdmin } from '../context/AdminContext';
import { useProjects } from '../context/ProjectContext';
import { useTasks } from '../context/TaskContext';
import { canAccessGovernance } from '../utils/permissions';
import {
  DEFAULT_PROJECT_FILTERS,
  getDeliveryTrendByMonth,
  ExecutiveDistributionItem,
  filterProjects,
  getProjectClientDeliveryBreakdown,
  getProjectDeliveredAt,
  getProjectDistributionByProduct,
  getProjectDistributionByTeam,
  getExecutiveScopedProjects,
  getExecutiveSummary,
  getProjectFilterOptions,
  getProjectsByNamedClients,
  getProjectsDeliveredByTeamInYear,
  getProjectSituationDistribution,
  getProjectStatusDistribution,
  getProjectTaskCounts,
} from '../utils/projectSelectors';
import { getDynamicYearOptions } from '../utils/yearOptions';
import {
  getInProgressTaskCount,
  getTaskNodeTotalTrackedMinutes,
  getTaskCountsByClient,
  getTaskProductivityByAssignee,
  getTasksLinkedToProjects,
} from '../selectors/taskSelectors';
import { buildProjectHealth, buildSkillInsights, buildTeamCapacity } from '../utils/dashboardInsights';
import { getProjectExecutionPhases } from '../utils/projectSelectors';

export function Dashboards() {
  const { openProjectDetail } = useProjectDetailNavigation();
  const { currentUser, skills } = useAdmin();
  const { projects } = useProjects();
  const { allTasks } = useTasks();
  const [filters, setFilters] = useState(DEFAULT_PROJECT_FILTERS);

  const scopedProjects = useMemo(
    () => getExecutiveScopedProjects(projects, currentUser),
    [projects, currentUser]
  );

  const filteredProjects = useMemo(
    () => filterProjects(scopedProjects, filters),
    [scopedProjects, filters]
  );

  const linkedTasks = useMemo(
    () => getTasksLinkedToProjects(allTasks, filteredProjects.map((project) => project.id)),
    [allTasks, filteredProjects]
  );
  const deliveryYears = useMemo(() => {
    return getDynamicYearOptions(
      filteredProjects
        .map((project) => getProjectDeliveredAt(project))
        .filter(Boolean)
        .map((deliveredAt) => new Date(deliveredAt as string).getFullYear())
    )
      .map((year) => Number(year))
      .sort((a, b) => b - a);
  }, [filteredProjects]);
  const [selectedDeliveryYear, setSelectedDeliveryYear] = useState(
    deliveryYears[0] || new Date().getFullYear()
  );
  useEffect(() => {
    if (!deliveryYears.includes(selectedDeliveryYear)) {
      setSelectedDeliveryYear(deliveryYears[0] || new Date().getFullYear());
    }
  }, [deliveryYears, selectedDeliveryYear]);

  const summary = useMemo(() => getExecutiveSummary(filteredProjects), [filteredProjects]);
  const statusDistribution = useMemo(
    () => getProjectStatusDistribution(filteredProjects),
    [filteredProjects]
  );
  const situationDistribution = useMemo(
    () => getProjectSituationDistribution(filteredProjects),
    [filteredProjects]
  );
  const teamDistribution = useMemo(
    () => getProjectDistributionByTeam(filteredProjects),
    [filteredProjects]
  );
  const clientDeliveryBreakdown = useMemo(
    () => getProjectClientDeliveryBreakdown(filteredProjects),
    [filteredProjects]
  );
  const deliveredByTeam = useMemo(
    () => getProjectsDeliveredByTeamInYear(filteredProjects, selectedDeliveryYear),
    [filteredProjects, selectedDeliveryYear]
  );
  const productDistribution = useMemo(
    () => getProjectDistributionByProduct(filteredProjects),
    [filteredProjects]
  );
  const keyClientCards = useMemo(
    () =>
      getProjectsByNamedClients(filteredProjects, [
        'Romance Moda',
        'Favorita',
        'Crisdu Labs',
        'Grupo Crisdu',
      ]),
    [filteredProjects]
  );
  const inProgressTaskCount = useMemo(
    () => getInProgressTaskCount(linkedTasks),
    [linkedTasks]
  );
  const taskCountsByClient = useMemo(
    () => getTaskCountsByClient(linkedTasks, filteredProjects),
    [linkedTasks, filteredProjects]
  );
  const deliveryComparisonYears = useMemo(() => {
    const baseYear = selectedDeliveryYear || new Date().getFullYear();
    return [baseYear - 2, baseYear - 1, baseYear];
  }, [selectedDeliveryYear]);
  const annualDeliveryTrend = useMemo(
    () => getDeliveryTrendByMonth(filteredProjects, deliveryComparisonYears),
    [filteredProjects, deliveryComparisonYears]
  );
  const assigneeProductivity = useMemo(
    () => getTaskProductivityByAssignee(linkedTasks),
    [linkedTasks]
  );
  const projectHealth = useMemo(
    () => buildProjectHealth(filteredProjects, linkedTasks),
    [filteredProjects, linkedTasks]
  );
  const delayedProjects = useMemo(
    () => projectHealth.filter((item) => item.health !== 'healthy'),
    [projectHealth]
  );
  const blockedTasks = useMemo(
    () => linkedTasks.filter((task) => task.isDependencyBlocked),
    [linkedTasks]
  );
  const overdueTasks = useMemo(
    () =>
      linkedTasks.filter(
        (task) => task.status !== 'done' && task.dueDate && new Date(task.dueDate).getTime() < Date.now()
      ),
    [linkedTasks]
  );
  const delayedPhases = useMemo(
    () =>
      filteredProjects.flatMap((project) =>
        getProjectExecutionPhases(project)
          .filter((phase) => {
            const plannedEnd = phase.plannedEndDate || phase.endDate;
            return !!plannedEnd && new Date(plannedEnd).getTime() < Date.now();
          })
          .map((phase) => ({
            projectId: project.id,
            projectName: project.name,
            phaseName: phase.name,
            plannedEnd: phase.plannedEndDate || phase.endDate,
          }))
      ),
    [filteredProjects]
  );
  const teamCapacity = useMemo(
    () => buildTeamCapacity(linkedTasks),
    [linkedTasks]
  );
  const skillInsights = useMemo(
    () =>
      buildSkillInsights(filteredProjects, linkedTasks).map((item) => ({
        ...item,
        status:
          skills.find((skill) => skill.id === item.skillId)?.status || 'active',
      })),
    [filteredProjects, linkedTasks, skills]
  );
  const timeSummary = useMemo(() => {
    const estimatedHours = linkedTasks.reduce((total, task) => total + (task.estimatedHours || 0), 0);
    const trackedHours = linkedTasks.reduce(
      (total, task) => total + getTaskNodeTotalTrackedMinutes(task) / 60,
      0
    );
    const remainingHours = Math.max(estimatedHours - trackedHours, 0);
    const activeOwners = new Set(
      linkedTasks
        .filter((task) => task.status === 'in_progress' && task.assignee)
        .map((task) => task.assignee as string)
    ).size;
    const throughputPerDay = Math.max(activeOwners, 1) * 4;
    const forecastDays = remainingHours > 0 ? Math.ceil(remainingHours / throughputPerDay) : 0;

    return {
      estimatedHours: Number(estimatedHours.toFixed(1)),
      trackedHours: Number(trackedHours.toFixed(1)),
      remainingHours: Number(remainingHours.toFixed(1)),
      forecastLabel:
        remainingHours === 0
          ? 'Execução dentro do estimado'
          : activeOwners === 0
            ? 'Sem base suficiente para previsão'
            : `Previsão simples: ~${forecastDays} dia(s) úteis`,
    };
  }, [linkedTasks]);
  const filterOptions = useMemo(
    () => getProjectFilterOptions(scopedProjects),
    [scopedProjects]
  );
  const spotlightProjects = useMemo(
    () =>
      [...filteredProjects]
        .sort((a, b) => {
          const aCounts = getProjectTaskCounts(a);
          const bCounts = getProjectTaskCounts(b);
          const aRatio = aCounts.total > 0 ? aCounts.completed / aCounts.total : 0;
          const bRatio = bCounts.total > 0 ? bCounts.completed / bCounts.total : 0;
          return aRatio - bRatio;
        })
        .slice(0, 4),
    [filteredProjects]
  );
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

  if (!canAccessGovernance(currentUser)) {
    return (
      <div className="page-shell flex h-full items-center justify-center">
        <div className="section-card max-w-xl border-red-200 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Acesso restrito</h1>
          <p className="mt-2 text-slate-600">
            Seu perfil atual não possui permissão para acessar o dashboard executivo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6">
      <div className="page-header gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Dashboard Executivo</h1>
          <p className="mt-2 text-sm text-slate-500">
            Recorte analítico real da operação, com base em projetos, execução e horas apontadas.
          </p>
        </div>
      </div>

      <GovernanceFilters
        filters={filters}
        options={filterOptions}
        onChange={(updates) => setFilters((prev) => ({ ...prev, ...updates }))}
      />

      {hasActiveFilters && (
        <div className="-mt-2 flex justify-end">
          <button
            onClick={() => setFilters(DEFAULT_PROJECT_FILTERS)}
            className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Limpar filtros
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Projetos em andamento" value={summary.inProgress} icon={<FolderKanban className="h-5 w-5 text-blue-600" />} />
        <MetricCard label="Projetos atrasados" value={summary.overdue} icon={<AlertCircle className="h-5 w-5 text-red-600" />} />
        <MetricCard label="Próximos do prazo" value={summary.dueSoon} icon={<CalendarClock className="h-5 w-5 text-orange-600" />} />
        <MetricCard label="Concluídos no ano" value={summary.completedThisYear} icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} />
        <MetricCard label="Tempo total apontado" value={`${summary.totalTrackedHours}h`} icon={<Clock3 className="h-5 w-5 text-purple-600" />} />
        <MetricCard label="Progresso médio" value={`${summary.avgProgress}%`} icon={<TrendingUp className="h-5 w-5 text-cyan-600" />} />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tarefas bloqueadas" value={blockedTasks.length} icon={<PauseCircle className="h-5 w-5 text-amber-600" />} />
        <MetricCard label="Dependências pendentes" value={projectHealth.reduce((acc, item) => acc + item.dependencyPending, 0)} icon={<AlertCircle className="h-5 w-5 text-orange-600" />} />
        <MetricCard label="Fases atrasadas" value={delayedPhases.length} icon={<CalendarClock className="h-5 w-5 text-red-600" />} />
        <MetricCard label="Tarefas vencidas" value={overdueTasks.length} icon={<Clock3 className="h-5 w-5 text-red-600" />} />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {keyClientCards.map((item) => (
          <MetricCard
            key={item.key}
            label={item.label}
            value={`${item.active} ativos`}
            supportingText={`${item.delivered} entregues`}
            icon={<Users className="h-5 w-5 text-indigo-600" />}
          />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="section-card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Saúde dos projetos</h2>
            <p className="mt-1 text-sm text-gray-500">
              Combina tarefas vencidas, bloqueios, dependências pendentes e fases atrasadas.
            </p>
          </div>
          <div className="space-y-3">
            {projectHealth.length > 0 ? projectHealth.slice(0, 6).map((item) => (
              <button
                key={item.projectId}
                onClick={() => openProjectDetail(item.projectId)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left hover:bg-white"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{item.projectName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.overdueTasks} vencidas • {item.blockedTasks} bloqueadas • {item.delayedPhases} fases atrasadas
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  item.health === 'critical'
                    ? 'bg-red-100 text-red-700'
                    : item.health === 'attention'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {item.health === 'critical' ? 'Crítico' : item.health === 'attention' ? 'Atenção' : 'Saudável'}
                </span>
              </button>
            )) : <EmptyState message="Sem dados suficientes para calcular saúde dos projetos." />}
          </div>
        </div>

        <DistributionCard
          title="Distribuição por equipe"
          description="Projetos, progresso médio e horas apontadas por equipe."
          items={teamDistribution}
          accent="blue"
          metricLabel="projetos"
          extraLabel={(item) =>
            `${item.progressAverage || 0}% médio • ${item.trackedHours || 0}h`
          }
        />

        <DistributionCard
          title="Distribuição por fase macro"
          description="Recorte de governança a partir do status real dos projetos."
          items={statusDistribution}
          accent="emerald"
          metricLabel="projetos"
          extraLabel={(item) => `${item.progressAverage || 0}% médio`}
        />

        <DistributionCard
          title="Distribuição por situação"
          description="Mostra ativos, pausados e cancelados no recorte atual."
          items={situationDistribution}
          accent="amber"
          metricLabel="projetos"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="section-card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Capacidade da equipe</h2>
            <p className="mt-1 text-sm text-gray-500">
              Volume por responsável para identificar sobrecarga e distribuição operacional.
            </p>
          </div>
          <div className="space-y-3">
            {teamCapacity.length > 0 ? teamCapacity.slice(0, 6).map((item) => (
              <div key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-900">{item.name}</p>
                  {item.overload && (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                      Sobrecarga
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {item.inProgress} em andamento • {item.overdue} atrasadas • {item.total} no total
                </p>
              </div>
            )) : <EmptyState message="Nenhuma tarefa disponível para leitura de capacidade." />}
          </div>
        </div>

        <div className="section-card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Visão por habilidade</h2>
            <p className="mt-1 text-sm text-gray-500">
              Mostra quais capacidades concentram mais projetos e tarefas abertas.
            </p>
          </div>
          <div className="space-y-3">
            {skillInsights.length > 0 ? skillInsights.slice(0, 6).map((item) => (
              <div key={item.skillId} className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-900">{item.skillName}</p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {item.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {item.projectCount} projetos • {item.openTasks} tarefas abertas • {item.inProgressTasks} em andamento
                </p>
              </div>
            )) : <EmptyState message="Nenhuma habilidade vinculada aos projetos filtrados." />}
          </div>
        </div>

        <div className="section-card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Atrasos e gargalos</h2>
            <p className="mt-1 text-sm text-gray-500">
              Itens que estão atrasando o fluxo atual de entrega.
            </p>
          </div>
          <div className="space-y-3">
            {overdueTasks.slice(0, 6).map((task) => (
              <div key={task.id} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium text-red-950">{task.title}</p>
                <p className="mt-1 text-xs text-red-800">
                  {[task.projectName, task.assignee, task.dueDate ? `Prazo ${new Date(task.dueDate).toLocaleDateString('pt-BR')}` : '']
                    .filter(Boolean)
                    .join(' • ')}
                </p>
              </div>
            ))}
            {overdueTasks.length === 0 && blockedTasks.length === 0 && (
              <EmptyState message="Nenhum atraso ou gargalo relevante no recorte atual." />
            )}
            {blockedTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-medium text-amber-950">{task.title}</p>
                <p className="mt-1 text-xs text-amber-800">
                  {[task.projectName, task.dependencyBlockedReason].filter(Boolean).join(' • ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="section-card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Tempo e previsão</h2>
            <p className="mt-1 text-sm text-gray-500">
              Leitura simples de estimado vs realizado para apoiar cobrança e previsão de entrega.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Estimado</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{timeSummary.estimatedHours}h</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Realizado</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{timeSummary.trackedHours}h</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Restante</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{timeSummary.remainingHours}h</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
            <p className="text-sm font-medium text-blue-950">{timeSummary.forecastLabel}</p>
            <p className="mt-1 text-xs text-blue-800">
              Projeção baseada nas horas restantes e na quantidade atual de responsáveis em execução.
            </p>
          </div>
        </div>

        <DistributionCard
          title="Progresso por equipe"
          description="Avanço médio e horas apontadas por equipe no recorte atual."
          items={teamDistribution}
          accent="blue"
          metricLabel="projetos"
          extraLabel={(item) => `${item.progressAverage || 0}% médio • ${item.trackedHours || 0}h`}
        />

        <DistributionCard
          title="Progresso por habilidade"
          description="Capacidades com mais carga aberta e projetos em curso."
          items={skillInsights.map((item) => ({
            key: item.skillId,
            label: item.skillName,
            count: item.openTasks,
            progressAverage:
              item.projectCount > 0
                ? Math.round((item.inProgressTasks / Math.max(item.openTasks, 1)) * 100)
                : 0,
            trackedHours: undefined,
          }))}
          accent="emerald"
          metricLabel="tarefas abertas"
          extraLabel={(item) => `${item.progressAverage || 0}% em execução`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ClientDeliveryCard items={clientDeliveryBreakdown} />

        <DistributionCard
          title="Entregues por equipe no ano"
          description="Considera apenas projetos com entrega real registrada."
          items={deliveredByTeam}
          accent="blue"
          metricLabel="entregas"
          headerAction={(
            <select
              value={selectedDeliveryYear}
              onChange={(event) => setSelectedDeliveryYear(Number(event.target.value))}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              {deliveryYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="section-card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Produtividade por responsável</h2>
            <p className="mt-1 text-sm text-gray-500">
              Considera tarefas ligadas aos projetos filtrados, com horas apontadas e volume de execução.
            </p>
          </div>

          <div className="space-y-4">
            {assigneeProductivity.length > 0 ? (
              assigneeProductivity.map((item) => (
                <div key={item.assignee} className="surface-card-muted p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{item.assignee}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {item.completed}/{item.total} tarefas concluídas • {item.inProgress} em andamento
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-slate-900">{item.trackedHours}h</p>
                      <p className="text-xs text-slate-500">tempo apontado</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900"
                      style={{
                        width: `${item.total > 0 ? Math.max(8, Math.round((item.completed / item.total) * 100)) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="Nenhum dado de produtividade disponível para o recorte atual." />
            )}
          </div>
        </div>

        <div className="section-card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Distribuição por produto</h2>
            <p className="mt-1 text-sm text-gray-500">
              Produtos mais representativos no recorte atual.
            </p>
          </div>

          <div className="space-y-4">
            {productDistribution.length > 0 ? (
              productDistribution.map((item) => (
                <div key={item.key}>
                  <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-gray-800">{item.label}</span>
                    <span className="text-gray-500">
                      {item.count} projetos • {item.progressAverage || 0}% • {item.trackedHours || 0}h
                    </span>
                  </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-900"
                      style={{
                        width: `${Math.max(
                          6,
                          filteredProjects.length > 0 ? Math.round((item.count / filteredProjects.length) * 100) : 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="Nenhum produto encontrado para os filtros atuais." />
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <AnnualDeliveryTrendCard years={deliveryComparisonYears} items={annualDeliveryTrend} />

        <div className="section-card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Tarefas em andamento</h2>
            <p className="mt-1 text-sm text-gray-500">
              Total operacional em execução e distribuição por cliente do recorte atual.
            </p>
          </div>

          <div className="surface-card-muted px-4 py-3">
            <p className="text-xs text-slate-500">Total em andamento</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{inProgressTaskCount}</p>
          </div>

          <div className="mt-4 space-y-4">
            {taskCountsByClient.length > 0 ? (
              taskCountsByClient.map((item) => (
                <div key={item.client}>
                  <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                    <span className="font-medium text-gray-800">{item.client}</span>
                    <span className="text-gray-500">{item.count} tarefas</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900"
                      style={{
                        width: `${Math.max(
                          6,
                          taskCountsByClient.length > 0
                            ? Math.round((item.count / Math.max(...taskCountsByClient.map((candidate) => candidate.count), 1)) * 100)
                            : 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="Nenhuma tarefa vinculada aos projetos filtrados." />
            )}
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Projetos que exigem atenção</h2>
            <p className="mt-1 text-sm text-gray-500">
              Ordenados pelo menor avanço proporcional dentro do recorte atual.
            </p>
          </div>
        </div>

        {spotlightProjects.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {spotlightProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => openProjectDetail(project.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState message="Nenhum projeto encontrado para o recorte analítico atual." />
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
  supportingText,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  supportingText?: string;
}) {
  return (
    <div className="metric-card">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-slate-50 p-2.5">{icon}</div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{value}</p>
          {supportingText && <p className="mt-1 text-xs text-slate-500">{supportingText}</p>}
        </div>
      </div>
    </div>
  );
}

function DistributionCard({
  title,
  description,
  items,
  accent,
  metricLabel,
  extraLabel,
  headerAction,
}: {
  title: string;
  description: string;
  items: ExecutiveDistributionItem[];
  accent: 'blue' | 'emerald' | 'amber';
  metricLabel: string;
  extraLabel?: (item: ExecutiveDistributionItem) => string;
  headerAction?: ReactNode;
}) {
  const colorClass =
    accent === 'blue'
      ? 'bg-blue-600'
      : accent === 'emerald'
        ? 'bg-emerald-600'
        : 'bg-amber-500';

  const maxCount = Math.max(...items.map((item) => item.count), 0);

  return (
    <div className="section-card">
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          </div>
          {headerAction}
        </div>
      </div>

      <div className="space-y-4">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.key}>
              <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-gray-800">{item.label}</span>
                <span className="text-gray-500">
                  {item.count} {metricLabel}
                  {extraLabel ? ` • ${extraLabel(item)}` : ''}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full ${colorClass}`}
                  style={{
                    width: `${maxCount > 0 ? Math.max(6, Math.round((item.count / maxCount) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <EmptyState message="Sem dados suficientes para montar esta distribuição." />
        )}
      </div>
    </div>
  );
}

function ClientDeliveryCard({
  items,
}: {
  items: Array<{
    client: string;
    inProgress: number;
    delivered: number;
    inProgressPercentage: number;
    deliveredPercentage: number;
  }>;
}) {
  return (
    <div className="section-card">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Projetos por cliente</h2>
        <p className="mt-1 text-sm text-gray-500">
          Comparativo entre projetos em andamento e entregues no recorte atual.
        </p>
      </div>

      <div className="space-y-4">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.client} className="surface-card-muted p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium text-gray-900">{item.client}</p>
                <p className="text-sm text-gray-500">
                  {item.inProgress} andamento • {item.delivered} entregues
                </p>
              </div>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="bg-blue-600"
                  style={{ width: `${item.inProgressPercentage}%` }}
                />
                <div
                  className="bg-emerald-500"
                  style={{ width: `${item.deliveredPercentage}%` }}
                />
              </div>
      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                <span>Azul: andamento {item.inProgressPercentage}%</span>
                <span>Verde: entregue {item.deliveredPercentage}%</span>
              </div>
            </div>
          ))
        ) : (
          <EmptyState message="Nenhum cliente com projetos entregues ou em andamento no recorte atual." />
        )}
      </div>
    </div>
  );
}

function AnnualDeliveryTrendCard({
  years,
  items,
}: {
  years: number[];
  items: Array<{ month: string; year: number; count: number }>;
}) {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const maxCount = Math.max(...items.map((item) => item.count), 1);
  const colors = ['bg-slate-300', 'bg-blue-400', 'bg-emerald-500'];
  const scaleSteps = Array.from({ length: maxCount + 1 }, (_, index) => maxCount - index);

  return (
    <div className="section-card">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Entregas anuais por mês</h2>
        <p className="mt-1 text-sm text-slate-500">
          Considera exclusivamente projetos concluídos com `deliveredAt` válido.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-xs text-slate-500">
        {years.map((year, index) => (
          <span key={year} className="inline-flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${colors[index] || 'bg-slate-300'}`} />
            {year}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-4">
        <div className="flex flex-col justify-between pb-7 text-right text-xs text-slate-400">
          {scaleSteps.map((step) => (
            <span key={step}>{step}</span>
          ))}
        </div>

        <div>
          <div className="grid h-72 grid-cols-12 gap-3 border-b border-l border-slate-200 px-3 pt-3">
            {months.map((month) => (
              <div key={month} className="flex h-full min-w-0 flex-col justify-end">
                <div className="relative flex h-full items-end justify-center gap-1">
                  {years.map((year, index) => {
                    const count =
                      items.find((item) => item.month === month && item.year === year)?.count || 0;
                    const height = count > 0 ? Math.max(10, Math.round((count / maxCount) * 100)) : 0;

                    return (
                      <div key={year} className="group relative flex h-full flex-1 items-end">
                        <div
                          className={`w-full rounded-t-md transition-opacity group-hover:opacity-85 ${colors[index] || 'bg-slate-300'}`}
                          style={{ height: `${height}%` }}
                          title={`${month}/${year}: ${count}`}
                        />
                        <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[10px] text-white shadow-sm group-hover:block">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="pt-3 text-center text-xs font-medium text-gray-500">
                  {month}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
            {months.map((month) => (
              <span key={month} className="hidden">
                {month}
              </span>
            ))}
            <span>Eixo X: meses</span>
            <span>Barras agrupadas por ano</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}
