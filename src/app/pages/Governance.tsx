import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Briefcase,
  CalendarClock,
  Download,
  Gauge,
  HandCoins,
  History,
  LayoutGrid,
  MessageSquareQuote,
  Settings2,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis } from 'recharts';
import { SearchableMultiSelect } from '../components/filters/SearchableMultiSelect';
import { TaskModal } from '../components/TaskModal';
import { KanbanPageHeader } from '../components/kanban/KanbanLayout';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAdmin } from '../context/AdminContext';
import { useProjects } from '../context/ProjectContext';
import { EnrichedTask, useTasks } from '../context/TaskContext';
import { downloadCsv, downloadExcelHtml } from '../services/exportUtils';
import { getProjectFilterYear } from '../utils/projectSelectors';
import { getProjectGovernancePhaseId } from '../utils/projectSelectors';
import {
  GovernanceAnalyticsFilters,
  Project,
} from '../types';
import {
  getAnalyticsCapacityEndpointResponse,
  getAnalyticsCostSettingsEndpointResponse,
  getAnalyticsCostsOverviewEndpointResponse,
  getAnalyticsOverviewEndpointResponse,
  getAnalyticsPerformanceEndpointResponse,
  getAnalyticsProductivityEndpointResponse,
  getAnalyticsProjectsEndpointResponse,
  getAnalyticsRisksEndpointResponse,
  getAnalyticsTasksEndpointResponse,
  getAnalyticsUsersEndpointResponse,
  patchAnalyticsCostSettingsEndpointResponse,
  patchAnalyticsCostUserEndpointResponse,
} from '../services/governanceAnalyticsApi';
import { canAccessGovernance, canManageOperationalPriority, canManageWeeklyFocus } from '../utils/permissions';
import { isTaskDoneStatus, isTaskInProgressStatus } from '../utils/taskStatus';
import { getDynamicYearOptions } from '../utils/yearOptions';

type GovernanceSection =
  | 'overview'
  | 'projects'
  | 'tasks'
  | 'people'
  | 'collaborators'
  | 'productivity'
  | 'performance'
  | 'capacity'
  | 'risks'
  | 'settings';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const PIE_COLORS = ['#0f766e', '#2563eb', '#f97316', '#dc2626'];

const createDefaultFilters = (): GovernanceAnalyticsFilters => ({
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

export function Governance() {
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { allTasks } = useTasks();
  const {
    currentUser,
    users,
    teams,
    products,
    clients,
    costSettings,
    updateCostSettings,
    updateUser,
  } = useAdmin();
  const [filters, setFilters] = useState<GovernanceAnalyticsFilters>(() => createDefaultFilters());
  const [activeSection, setActiveSection] = useState<GovernanceSection>('overview');
  const [expandedCollaborators, setExpandedCollaborators] = useState<string[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    defaultInternalHourRate: String(costSettings.defaultInternalHourRate),
    defaultExternalHourRate: String(costSettings.defaultExternalHourRate),
    monthlyHoursStandard: String(costSettings.monthlyHoursStandard),
  });
  const [editingUserCosts, setEditingUserCosts] = useState<Record<string, { salaryMonthly: string; costPerHour: string }>>({});
  const deferredFilters = useDeferredValue(filters);

  const hasGovernanceAccess = canAccessGovernance(currentUser);
  const canAccessPriority =
    canManageOperationalPriority(currentUser) || canManageWeeklyFocus(currentUser);

  const teamOptions = useMemo(
    () => teams.map((team) => ({ value: team.name, label: team.name })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [teams]
  );
  const projectOptions = useMemo(
    () => projects.map((project) => ({ value: project.id, label: project.name })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [projects]
  );
  const productOptions = useMemo(
    () => products.map((product) => ({ value: product.name, label: product.name })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [products]
  );
  const userOptions = useMemo(
    () => users.map((user) => ({ value: user.id, label: user.name })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [users]
  );
  const responsibleOptions = useMemo(
    () => Array.from(new Set(projects.map((project) => project.responsible))).map((name) => ({ value: name, label: name })),
    [projects]
  );
  const statusOptions = useMemo(
    () =>
      Array.from(new Set(projects.map((project) => getProjectGovernancePhaseId(project))))
        .map((status) => ({ value: status, label: status }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [projects]
  );
  const yearOptions = useMemo(
    () =>
      getDynamicYearOptions(projects.map((project) => getProjectFilterYear(project))).map((year) => ({
        value: year,
        label: year,
      })),
    [projects]
  );
  const clientOptions = useMemo(
    () => clients.map((client) => ({ value: client.name, label: client.name })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [clients]
  );
  const requesterOptions = useMemo(
    () =>
      Array.from(new Set(projects.map((project) => project.requestedBy).filter(Boolean) as string[]))
        .map((name) => ({ value: name, label: name }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [projects]
  );
  const demandTypeOptions = useMemo(
    () =>
      Array.from(new Set(projects.map((project) => project.demandType).filter(Boolean) as string[]))
        .map((type) => ({ value: type, label: type }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [projects]
  );

  const overviewResponse = useMemo(
    () =>
      getAnalyticsOverviewEndpointResponse({
        currentUser,
        filters: deferredFilters,
        projects,
        tasks: allTasks,
        users,
        settings: costSettings,
      }),
    [currentUser, deferredFilters, projects, allTasks, users, costSettings]
  );
  const projectsResponse = useMemo(
    () =>
      getAnalyticsProjectsEndpointResponse({
        currentUser,
        filters: deferredFilters,
        projects,
        tasks: allTasks,
        users,
        settings: costSettings,
      }),
    [currentUser, deferredFilters, projects, allTasks, users, costSettings]
  );
  const usersResponse = useMemo(
    () =>
      getAnalyticsUsersEndpointResponse({
        currentUser,
        filters: deferredFilters,
        projects,
        tasks: allTasks,
        users,
        settings: costSettings,
      }),
    [currentUser, deferredFilters, projects, allTasks, users, costSettings]
  );
  const tasksResponse = useMemo(
    () =>
      getAnalyticsTasksEndpointResponse({
        currentUser,
        filters: deferredFilters,
        projects,
        tasks: allTasks,
        users,
        settings: costSettings,
      }),
    [currentUser, deferredFilters, projects, allTasks, users, costSettings]
  );
  const costsResponse = useMemo(
    () =>
      getAnalyticsCostsOverviewEndpointResponse({
        currentUser,
        filters: deferredFilters,
        projects,
        tasks: allTasks,
        users,
        settings: costSettings,
      }),
    [currentUser, deferredFilters, projects, allTasks, users, costSettings]
  );
  const productivityResponse = useMemo(
    () =>
      getAnalyticsProductivityEndpointResponse({
        currentUser,
        filters: deferredFilters,
        projects,
        tasks: allTasks,
        users,
        settings: costSettings,
      }),
    [currentUser, deferredFilters, projects, allTasks, users, costSettings]
  );
  const performanceResponse = useMemo(
    () =>
      getAnalyticsPerformanceEndpointResponse({
        currentUser,
        filters: deferredFilters,
        projects,
        tasks: allTasks,
        users,
        settings: costSettings,
      }),
    [currentUser, deferredFilters, projects, allTasks, users, costSettings]
  );
  const capacityResponse = useMemo(
    () =>
      getAnalyticsCapacityEndpointResponse({
        currentUser,
        filters: deferredFilters,
        projects,
        tasks: allTasks,
        users,
        settings: costSettings,
      }),
    [currentUser, deferredFilters, projects, allTasks, users, costSettings]
  );
  const risksResponse = useMemo(
    () =>
      getAnalyticsRisksEndpointResponse({
        currentUser,
        filters: deferredFilters,
        projects,
        tasks: allTasks,
        users,
        settings: costSettings,
      }),
    [currentUser, deferredFilters, projects, allTasks, users, costSettings]
  );
  const costSettingsResponse = useMemo(
    () =>
      getAnalyticsCostSettingsEndpointResponse({
        currentUser,
        settings: costSettings,
      }),
    [currentUser, costSettings]
  );

  if (!hasGovernanceAccess || overviewResponse.status === 403) {
    return (
      <div className="page-shell flex h-full items-center justify-center">
        <div className="section-card max-w-xl border-red-200 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Acesso restrito</h1>
          <p className="mt-2 text-slate-600">
            Apenas perfis `admin`, `gestor` e `pmo` podem acessar a Governança completa.
          </p>
        </div>
      </div>
    );
  }

  const overview = overviewResponse.data;
  const projectRows = projectsResponse.status === 200 ? projectsResponse.data : [];
  const userRows = usersResponse.status === 200 ? usersResponse.data : [];
  const taskRows = tasksResponse.status === 200 ? tasksResponse.data : [];
  const costs = costsResponse.status === 200 ? costsResponse.data : null;
  const productivity = productivityResponse.status === 200 ? productivityResponse.data : null;
  const performance = performanceResponse.status === 200 ? performanceResponse.data : null;
  const capacity = capacityResponse.status === 200 ? capacityResponse.data : null;
  const risks = risksResponse.status === 200 ? risksResponse.data : null;
  const currentSettings = costSettingsResponse.status === 200 ? costSettingsResponse.data : costSettings;
  const selectedTask = useMemo(
    () => allTasks.find((task) => task.id === selectedTaskId) || null,
    [allTasks, selectedTaskId]
  );
  const currentYear = String(new Date().getFullYear());
  const isDefaultGovernanceScope =
    filters.years.length === 1 &&
    filters.years[0] === currentYear &&
    !filters.includeCancelled &&
    !filters.startDate &&
    !filters.endDate;
  const scopeSummary = filters.years.length > 0
    ? filters.years.length === 1
      ? `Exibindo projetos de ${filters.years[0]}`
      : `Exibindo projetos de ${filters.years.slice().sort().join(', ')}`
    : 'Exibindo histórico completo';

  const expensiveProjects = [...projectRows].sort((a, b) => b.cost_real - a.cost_real).slice(0, 5);
  const economicalProjects = [...projectRows].sort((a, b) => b.economy - a.economy).slice(0, 5);
  const topPeopleByCost = [...userRows].sort((a, b) => b.cost_total - a.cost_total).slice(0, 8);
  const topPeopleByProductivity = [...userRows].sort((a, b) => b.productivity - a.productivity).slice(0, 8);
  const teamCapacityChart = capacity?.byTeam.slice(0, 8) || [];
  const taskStatusChart = overview.taskStatusChart;
  const projectStatusChart = overview.projectStatusChart;
  const costDistribution = overview.costDistribution;
  const exportProjects = () =>
    downloadCsv(
      'governanca-projetos.csv',
      ['Projeto', 'Cliente', 'Produto', 'Equipe', 'Responsável', 'Solicitante', 'Status', 'Progresso', 'Horas', 'Custo real', 'Custo interno', 'Custo terceirizado', 'Economia', 'Solicitação', 'Entrega', 'Conclusão', 'Risco', 'Tarefas', 'Concluídas', 'Em andamento'],
      projectRows.map((row) => [
        row.project,
        row.client,
        row.product,
        row.team,
        row.responsible,
        row.requester,
        row.status,
        row.progress,
        row.total_hours,
        row.cost_real,
        row.cost_internal,
        row.cost_external,
        row.economy,
        row.request_date,
        row.deadline,
        row.completion_date,
        row.risk,
        row.total_tasks,
        row.completed_tasks,
        row.in_progress_tasks,
      ])
    );

  const exportUsers = () =>
    downloadExcelHtml(
      'governanca-pessoas.xls',
      ['Colaborador', 'Equipe', 'Cargo', 'Salário', 'Custo/hora', 'Horas', 'Custo total', 'Tarefas', 'Concluídas', 'Em andamento', 'Atrasadas', 'Projetos', 'Produtividade', 'Eficiência'],
      userRows.map((row) => [
        row.collaborator,
        row.team,
        row.role,
        row.salary_monthly,
        row.cost_per_hour,
        row.hours_period,
        row.cost_total,
        row.total_tasks,
        row.completed_tasks,
        row.in_progress_tasks,
        row.delayed_tasks,
        row.projects_count,
        row.productivity,
        row.efficiency,
      ])
    );

  const exportTasks = () =>
    downloadCsv(
      'governanca-tarefas.csv',
      ['Tarefa', 'Projeto', 'Tipo', 'Responsável', 'Solicitante', 'Equipe', 'Status', 'Prioridade', 'Horas', 'Custo real', 'Custo interno', 'Custo terceirizado', 'Economia', 'Criação', 'Início', 'Prazo', 'Conclusão', 'Lead time', 'Cycle time'],
      taskRows.map((row) => [
        row.task,
        row.project,
        row.type,
        row.responsible,
        row.requester,
        row.team,
        row.status,
        row.priority,
        row.hours,
        row.cost_real,
        row.cost_internal,
        row.cost_external,
        row.economy,
        row.created_at,
        row.start_date,
        row.due_date,
        row.completion_date,
        row.lead_time_hours,
        row.cycle_time_hours,
      ])
    );

  const saveSettings = () => {
    patchAnalyticsCostSettingsEndpointResponse({
      currentUser,
      settings: costSettings,
      updateCostSettings,
      nextSettings: {
        defaultInternalHourRate: Number(settingsForm.defaultInternalHourRate) || currentSettings.defaultInternalHourRate,
        defaultExternalHourRate: Number(settingsForm.defaultExternalHourRate) || currentSettings.defaultExternalHourRate,
        monthlyHoursStandard: Number(settingsForm.monthlyHoursStandard) || currentSettings.monthlyHoursStandard,
      },
    });
  };

  const saveUserCost = (userId: string) => {
    const draft = editingUserCosts[userId];
    if (!draft) return;
    patchAnalyticsCostUserEndpointResponse({
      currentUser,
      userId,
      users,
      updateUser,
      updates: {
        salaryMonthly: draft.salaryMonthly ? Number(draft.salaryMonthly) : undefined,
        costPerHour: draft.costPerHour ? Number(draft.costPerHour) : undefined,
      },
    });
  };

  return (
    <div className="page-shell space-y-6">
      <KanbanPageHeader
        eyebrow="Gestão Completa"
        title="Governança da Operação"
        description="Centro completo de gestão para acompanhar pessoas, projetos, tarefas, custos, produtividade, performance, capacidade e riscos em um único lugar."
      />

      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_28%),linear-gradient(135deg,#ffffff_0%,#f8fafc_45%,#eef6ff_100%)] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700">
              Leitura executiva + operação + analytics
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Um hub único para gestão da operação inteira
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Os filtros globais abaixo atualizam portfólio, equipe, tarefas, produtividade, capacidade, desempenho e riscos.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Navegação da governança
              </p>
            </div>
            <ShortcutCard
              title="Dashboard analítico"
              description="Abrir a visão executiva dedicada"
              icon={<BarChart3 className="h-5 w-5" />}
              to="/governanca/dashboard"
            />
            <ShortcutCard
              title="Workspace principal"
              description="Abrir o Kanban pai da operação"
              icon={<LayoutGrid className="h-5 w-5" />}
              to="/workspace"
            />
            {canAccessPriority && (
              <ShortcutCard
                title="Priorização"
                description="Abrir a fila oficial de projetos e tarefas"
                icon={<Target className="h-5 w-5" />}
                to="/operational-priority"
              />
            )}
            <ShortcutCard
              title="Custos detalhados"
              description="Abrir a central especializada de custos"
              icon={<HandCoins className="h-5 w-5" />}
              to="/governanca/custos"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <FilterField label="Ano">
            <SearchableMultiSelect
              value={filters.years}
              onChange={(value) => setFilters((current) => ({ ...current, years: value }))}
              options={yearOptions}
              placeholder="Ano atual"
              allLabel="Histórico completo"
              searchPlaceholder="Buscar ano..."
            />
          </FilterField>
          <FilterField label="Início">
            <input type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} className={INPUT_CLASS} />
          </FilterField>
          <FilterField label="Fim">
            <input type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} className={INPUT_CLASS} />
          </FilterField>
          <FilterField label="Equipe">
            <SearchableMultiSelect value={filters.teamNames} onChange={(value) => setFilters((current) => ({ ...current, teamNames: value }))} options={teamOptions} placeholder="Todas" />
          </FilterField>
          <FilterField label="Projeto">
            <SearchableMultiSelect value={filters.projectIds} onChange={(value) => setFilters((current) => ({ ...current, projectIds: value }))} options={projectOptions} placeholder="Todos" />
          </FilterField>
          <FilterField label="Produto">
            <SearchableMultiSelect value={filters.productNames} onChange={(value) => setFilters((current) => ({ ...current, productNames: value }))} options={productOptions} placeholder="Todos" />
          </FilterField>
          <FilterField label="Responsável">
            <SearchableMultiSelect value={filters.responsibleNames} onChange={(value) => setFilters((current) => ({ ...current, responsibleNames: value }))} options={responsibleOptions} placeholder="Todos" />
          </FilterField>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200/80 bg-white/70 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{scopeSummary}</p>
            <p className="text-xs text-slate-500">
              {isDefaultGovernanceScope
                ? 'Filtro padrão aplicado: ano atual, com projetos cancelados ocultos para manter a leitura gerencial leve.'
                : 'Indicadores, gráficos e relatórios estão respeitando exatamente este recorte.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFilters(createDefaultFilters())}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            <Target className="h-4 w-4" />
            Ano atual
          </button>
          <button
            type="button"
            onClick={() =>
              setFilters((current) => ({
                ...current,
                years: [String(Number(currentYear) - 1), currentYear],
                includeCancelled: false,
              }))
            }
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            <History className="h-4 w-4" />
            Ultimos 2 anos
          </button>
          <button
            type="button"
            onClick={() =>
              setFilters((current) => ({
                ...current,
                years: [],
                includeCancelled: true,
              }))
            }
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            <Download className="h-4 w-4" />
            Historico completo
          </button>
          <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(filters.includeCancelled)}
              onChange={(event) => setFilters((current) => ({ ...current, includeCancelled: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
            />
            Incluir cancelados
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <FilterField label="Pessoa">
            <SearchableMultiSelect value={filters.userIds} onChange={(value) => setFilters((current) => ({ ...current, userIds: value }))} options={userOptions} placeholder="Todas" />
          </FilterField>
          <FilterField label="Status">
            <SearchableMultiSelect value={filters.statuses} onChange={(value) => setFilters((current) => ({ ...current, statuses: value }))} options={statusOptions} placeholder="Todos" />
          </FilterField>
          <FilterField label="Tipo de demanda">
            <SearchableMultiSelect value={filters.demandTypes} onChange={(value) => setFilters((current) => ({ ...current, demandTypes: value }))} options={demandTypeOptions} placeholder="Todos" />
          </FilterField>
          <FilterField label="Cliente">
            <SearchableMultiSelect value={filters.clientNames} onChange={(value) => setFilters((current) => ({ ...current, clientNames: value }))} options={clientOptions} placeholder="Todos" />
          </FilterField>
          <FilterField label="Solicitante">
            <SearchableMultiSelect value={filters.requesterNames} onChange={(value) => setFilters((current) => ({ ...current, requesterNames: value }))} options={requesterOptions} placeholder="Todos" />
          </FilterField>
        </div>

      </section>

      <Tabs value={activeSection} onValueChange={(value) => setActiveSection(value as GovernanceSection)} className="space-y-6">
        <TabsList className="inline-flex h-auto flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
          {SECTIONS.map((section) => (
            <TabsTrigger key={section.value} value={section.value} className="rounded-2xl px-4 py-2.5">
              {section.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            <MetricCard title="Projetos em andamento" value={String(overview.projectsInProgress)} tone="default" icon={<Briefcase className="h-5 w-5" />} />
            <MetricCard title="Projetos atrasados" value={String(overview.projectsDelayed)} tone="danger" icon={<CalendarClock className="h-5 w-5" />} />
            <MetricCard title="Tarefas em andamento" value={String(overview.tasksInProgress)} tone="default" icon={<LayoutGrid className="h-5 w-5" />} />
            <MetricCard title="Demandas críticas" value={String(overview.criticalDemands)} tone="warning" icon={<ShieldAlert className="h-5 w-5" />} />
            <MetricCard title="Horas totais" value={`${numberFormatter.format(overview.totalTrackedHours)}h`} tone="default" icon={<Gauge className="h-5 w-5" />} />
            <MetricCard title="Custo total real" value={currencyFormatter.format(overview.totalCostReal)} tone="danger" icon={<HandCoins className="h-5 w-5" />} />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <HighlightCard title="Maior carga" subtitle={overview.highestLoadPerson?.collaborator || 'Sem dados'} detail={overview.highestLoadPerson ? `${overview.highestLoadPerson.current_load} itens em andamento` : '—'} tone="warning" />
            <HighlightCard title="Menor alocação" subtitle={overview.lowestLoadPerson?.collaborator || 'Sem dados'} detail={overview.lowestLoadPerson ? `${overview.lowestLoadPerson.hours_period}h no período` : '—'} tone="success" />
            <HighlightCard title="Economia total" subtitle={currencyFormatter.format(overview.totalEconomy)} detail="Comparativo entre terceirização e custo real do período" tone="success" />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard
              title="Projetos por status"
              content={
                <ChartContainer config={{ value: { label: 'Projetos', color: '#2563eb' } }} className="h-[300px] w-full">
                  <BarChart data={projectStatusChart}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--color-value)" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              }
            />
            <ChartCard
              title="Tarefas por status"
              content={
                <ChartContainer config={{ value: { label: 'Tarefas', color: '#0f766e' } }} className="h-[300px] w-full">
                  <PieChart>
                    <Pie data={taskStatusChart} dataKey="value" nameKey="label" innerRadius={65} outerRadius={100}>
                      {taskStatusChart.map((_, index) => (
                        <Cell key={`task-status-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              }
            />
            <ChartCard
              title="Evolução de concluídas"
              content={
                <ChartContainer config={{ value: { label: 'Concluídas', color: '#16a34a' } }} className="h-[300px] w-full">
                  <LineChart data={overview.completedTrend}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={3} dot={false} />
                  </LineChart>
                </ChartContainer>
              }
            />
            <ChartCard
              title="Horas por período"
              content={
                <ChartContainer config={{ value: { label: 'Horas', color: '#7c3aed' } }} className="h-[300px] w-full">
                  <BarChart data={overview.hoursTrend}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--color-value)" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              }
            />
          </section>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <SummarySection title="Projetos" description="Dashboard gerencial e relatório detalhado do portfólio." actions={<ExportButtons onCsv={exportProjects} onExcel={exportProjects} />}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard title="Total" value={String(projectRows.length)} icon={<Briefcase className="h-5 w-5" />} />
              <MetricCard title="Ativos" value={String(projectRows.filter((row) => row.status !== 'done').length)} icon={<TrendingUp className="h-5 w-5" />} />
              <MetricCard title="Atrasados" value={String(projectRows.filter((row) => row.risk === 'alto').length)} tone="danger" icon={<AlertTriangle className="h-5 w-5" />} />
              <MetricCard title="Concluídos" value={String(projectRows.filter((row) => row.completion_date).length)} tone="success" icon={<Target className="h-5 w-5" />} />
              <MetricCard title="Próx. vencimento" value={String(projectRows.filter((row) => row.risk === 'medio').length)} tone="warning" icon={<CalendarClock className="h-5 w-5" />} />
            </div>
          </SummarySection>
          <ChartGrid
            leftTitle="Custo por projeto"
            leftData={expensiveProjects.map((row) => ({ label: truncate(row.project), value: row.cost_real }))}
            leftColor="#dc2626"
            rightTitle="Economia por projeto"
            rightData={economicalProjects.map((row) => ({ label: truncate(row.project), value: row.economy }))}
            rightColor="#16a34a"
          />
          <DataTable
            columns={['Projeto', 'Cliente', 'Produto', 'Equipe', 'Responsável', 'Status', 'Status inteligente', 'Progresso', 'Horas', 'Custo real', 'Economia', 'Risco']}
            rows={projectRows.map((row) => ({
              key: row.project_id,
              onClick: () => navigate(`/project/${row.project_id}`),
              cells: [row.project, row.client, row.product || '—', row.team, row.responsible, row.status, row.smart_status, `${row.progress}%`, `${numberFormatter.format(row.total_hours)}h`, currencyFormatter.format(row.cost_real), currencyFormatter.format(row.economy), row.risk],
            }))}
          />
        </TabsContent>

        <TabsContent value="people" className="space-y-6">
          <SummarySection title="Equipe" description="Custos, carga, produtividade, tarefas e participação da equipe na operação." actions={<ExportButtons onCsv={exportUsers} onExcel={exportUsers} />}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard title="Colaboradores ativos" value={String(userRows.length)} icon={<Users className="h-5 w-5" />} />
              <MetricCard title="Maior custo total" value={topPeopleByCost[0] ? currencyFormatter.format(topPeopleByCost[0].cost_total) : '—'} tone="danger" icon={<HandCoins className="h-5 w-5" />} />
              <MetricCard title="Maior produtividade" value={topPeopleByProductivity[0] ? numberFormatter.format(topPeopleByProductivity[0].productivity) : '—'} tone="success" icon={<TrendingUp className="h-5 w-5" />} />
              <MetricCard title="Maior carga" value={userRows[0] ? String(userRows[0].current_load) : '0'} tone="warning" icon={<Gauge className="h-5 w-5" />} />
            </div>
          </SummarySection>
          <ChartGrid
            leftTitle="Custo por pessoa"
            leftData={topPeopleByCost.map((row) => ({ label: truncate(row.collaborator), value: row.cost_total }))}
            leftColor="#2563eb"
            rightTitle="Produtividade por pessoa"
            rightData={topPeopleByProductivity.map((row) => ({ label: truncate(row.collaborator), value: row.productivity }))}
            rightColor="#16a34a"
          />
          <DataTable
            columns={['Colaborador', 'Equipe', 'Cargo', 'Salário', 'Custo/hora', 'Horas', 'Custo total', 'Tarefas', 'Concluídas', 'Em andamento', 'Atrasadas', 'Projetos', 'Produtividade', 'Eficiência']}
            rows={userRows.map((row) => ({
              key: row.user_id,
              cells: [row.collaborator, row.team, row.role || '—', currencyFormatter.format(row.salary_monthly), currencyFormatter.format(row.cost_per_hour), `${numberFormatter.format(row.hours_period)}h`, currencyFormatter.format(row.cost_total), row.total_tasks, row.completed_tasks, row.in_progress_tasks, row.delayed_tasks, row.projects_count, numberFormatter.format(row.productivity), numberFormatter.format(row.efficiency)],
            }))}
          />
        </TabsContent>

        <TabsContent value="collaborators" className="space-y-6">
          <SummarySection title="Carga por colaborador" description="Leitura operacional para acompanhar rapidamente o que cada pessoa está executando e onde existe concentração de carga.">
            <CollaboratorKanbanView
              taskRows={taskRows}
              allTasks={allTasks}
              users={users}
              expandedUserIds={expandedCollaborators}
              onToggleUser={(userId) =>
                setExpandedCollaborators((current) =>
                  current.includes(userId)
                    ? current.filter((item) => item !== userId)
                    : [...current, userId]
                )
              }
              onTaskOpen={setSelectedTaskId}
            />
          </SummarySection>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <SummarySection title="Tarefas dos projetos" description="Fluxo, custo, lead time, cycle time e gargalos operacionais das entregas em andamento." actions={<ExportButtons onCsv={exportTasks} onExcel={exportTasks} />}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
              <MetricCard title="Total" value={String(taskRows.length)} icon={<LayoutGrid className="h-5 w-5" />} />
              <MetricCard title="Concluídas" value={String(taskRows.filter((row) => row.status === 'done').length)} tone="success" icon={<Target className="h-5 w-5" />} />
              <MetricCard title="Em andamento" value={String(taskRows.filter((row) => row.status === 'in_progress').length)} icon={<TrendingUp className="h-5 w-5" />} />
              <MetricCard title="Atrasadas" value={String(taskRows.filter((row) => row.due_date && row.status !== 'done' && new Date(row.due_date).getTime() < Date.now()).length)} tone="danger" icon={<CalendarClock className="h-5 w-5" />} />
              <MetricCard title="Bloqueadas" value={String(taskRows.filter((row) => row.is_blocked).length)} tone="warning" icon={<ShieldAlert className="h-5 w-5" />} />
              <MetricCard title="Custo médio" value={currencyFormatter.format(costs?.avgCostPerTask || 0)} icon={<HandCoins className="h-5 w-5" />} />
            </div>
          </SummarySection>
          <ChartGrid
            leftTitle="Tarefas por responsável"
            leftData={groupBy(taskRows, (row) => row.responsible || 'Sem responsável', (items) => items.length).slice(0, 8)}
            leftColor="#2563eb"
            rightTitle="Custo por tarefa"
            rightData={[...taskRows].sort((a, b) => b.cost_real - a.cost_real).slice(0, 8).map((row) => ({ label: truncate(row.task), value: row.cost_real }))}
            rightColor="#f97316"
          />
          <DataTable
            columns={['Tarefa', 'Projeto', 'Tipo', 'Responsável', 'Equipe', 'Status', 'Prioridade', 'Horas', 'Custo real', 'Economia', 'Prazo', 'Lead', 'Cycle']}
            rows={taskRows.map((row) => ({
              key: row.task_id,
              onClick: () => navigate(`/my-tasks?task=${row.task_id}`),
              cells: [row.task, row.project || '—', row.type, row.responsible || '—', row.team || '—', row.status, row.priority || '—', `${numberFormatter.format(row.hours)}h`, currencyFormatter.format(row.cost_real), currencyFormatter.format(row.economy), row.due_date || '—', `${numberFormatter.format(row.lead_time_hours)}h`, `${numberFormatter.format(row.cycle_time_hours)}h`],
            }))}
          />
        </TabsContent>

        <TabsContent value="productivity" className="space-y-6">
          <SummarySection title="Produtividade" description="Indicadores objetivos: tarefas concluídas, horas apontadas e produtividade relativa por hora." />
          <ChartGrid
            leftTitle="Produtividade por pessoa"
            leftData={(productivity?.byPeople || []).slice(0, 8).map((row) => ({ label: truncate(row.collaborator), value: row.productivity }))}
            leftColor="#16a34a"
            rightTitle="Produtividade por equipe"
            rightData={(productivity?.byTeam || []).slice(0, 8).map((row) => ({ label: truncate(row.label), value: row.productivity }))}
            rightColor="#2563eb"
          />
          <DataTable
            columns={['Escopo', 'Concluídas', 'Produtividade', 'Horas']}
            rows={[
              ...(productivity?.byTeam || []).map((row) => ({ key: `team-${row.label}`, cells: [`Equipe: ${row.label}`, row.tasks_completed, numberFormatter.format(row.productivity), `${numberFormatter.format(row.hours)}h`] })),
              ...(productivity?.byProject || []).slice(0, 12).map((row) => ({ key: `project-${row.label}`, cells: [`Projeto: ${row.label}`, row.tasks_completed, numberFormatter.format(row.productivity), `${numberFormatter.format(row.hours)}h`] })),
            ]}
          />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <SummarySection title="Desempenho" description="Métricas auditáveis de custo por entrega, horas por item concluído e taxa de atraso." />
          <DataTable
            columns={['Escopo', 'Nome', 'Custo por concluída', 'Horas por concluída', 'No prazo', 'Atraso', 'Eficiência']}
            rows={(performance?.rows || []).map((row, index) => ({
              key: `${row.scope}-${index}`,
              cells: [row.scope, row.label, currencyFormatter.format(row.cost_per_completed_task), `${numberFormatter.format(row.hours_per_completed_task)}h`, `${numberFormatter.format(row.on_time_rate)}%`, `${numberFormatter.format(row.delay_rate)}%`, numberFormatter.format(row.delivery_efficiency)],
            }))}
          />
        </TabsContent>

        <TabsContent value="capacity" className="space-y-6">
          <SummarySection title="Capacidade da equipe" description="Distribuição da carga atual para equilibrar melhor a operação." />
          <ChartGrid
            leftTitle="Carga por pessoa"
            leftData={(capacity?.people || []).slice(0, 8).map((row) => ({ label: truncate(row.collaborator), value: row.current_load }))}
            leftColor="#f97316"
            rightTitle="Carga por equipe"
            rightData={teamCapacityChart.map((row) => ({ label: truncate(row.label), value: row.load }))}
            rightColor="#7c3aed"
          />
          <DataTable
            columns={['Pessoa', 'Equipe', 'Carga atual', 'Horas', 'Atrasadas', 'Projetos', 'Produtividade']}
            rows={(capacity?.people || []).map((row) => ({
              key: row.user_id,
              cells: [row.collaborator, row.team, row.current_load, `${numberFormatter.format(row.hours_period)}h`, row.delayed_tasks, row.projects_count, numberFormatter.format(row.productivity)],
            }))}
          />
        </TabsContent>

        <TabsContent value="risks" className="space-y-6">
          <SummarySection title="Riscos e gargalos" description="Projetos e tarefas em atraso, sobrecarga, risco financeiro e gargalos operacionais." />
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {(risks?.insights || []).map((insight) => (
              <HighlightCard key={insight.title} title={insight.title} subtitle={insight.description} detail="" tone={insight.tone === 'danger' ? 'danger' : 'warning'} />
            ))}
          </section>
          <DataTable
            columns={['Projeto', 'Equipe', 'Responsável', 'Risco', 'Progresso', 'Custo real']}
            rows={(risks?.projectRisks || []).map((row) => ({
              key: row.project_id,
              onClick: () => navigate(`/project/${row.project_id}`),
              cells: [row.project, row.team, row.responsible, row.risk, `${row.progress}%`, currencyFormatter.format(row.cost_real)],
            }))}
          />
          <DataTable
            columns={['Tarefa', 'Projeto', 'Responsável', 'Status', 'Horas', 'Custo real', 'Bloqueio']}
            rows={(risks?.taskRisks || []).slice(0, 20).map((row) => ({
              key: row.task_id,
              onClick: () => navigate(`/my-tasks?task=${row.task_id}`),
              cells: [row.task, row.project || '—', row.responsible || '—', row.status, `${numberFormatter.format(row.hours)}h`, currencyFormatter.format(row.cost_real), row.is_blocked ? 'Sim' : 'Não'],
            }))}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SummarySection title="Configurações" description="Parâmetros globais de custo e manutenção dos custos por colaborador." />
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <EditableFieldCard label="Hora interna padrão" value={settingsForm.defaultInternalHourRate} onChange={(value) => setSettingsForm((current) => ({ ...current, defaultInternalHourRate: value }))} />
            <EditableFieldCard label="Hora terceirizada" value={settingsForm.defaultExternalHourRate} onChange={(value) => setSettingsForm((current) => ({ ...current, defaultExternalHourRate: value }))} />
            <EditableFieldCard label="Jornada mensal padrão" value={settingsForm.monthlyHoursStandard} onChange={(value) => setSettingsForm((current) => ({ ...current, monthlyHoursStandard: value }))} />
          </section>
          <div className="flex justify-end">
            <button type="button" onClick={saveSettings} className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800">
              Salvar parâmetros
            </button>
          </div>
          <section className="section-card space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Custos por colaborador</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Se custo/hora manual existir, ele prevalece; caso contrário, o sistema usa salário mensal / jornada padrão.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {users.filter((user) => user.status === 'active').map((user) => {
                const draft = editingUserCosts[user.id] || {
                  salaryMonthly: typeof user.salaryMonthly === 'number' ? String(user.salaryMonthly) : '',
                  costPerHour: typeof user.costPerHour === 'number' ? String(user.costPerHour) : '',
                };
                return (
                  <div key={user.id} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:grid-cols-[minmax(0,1.3fr)_180px_180px_auto]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">{user.name}</p>
                      <p className="truncate text-xs text-slate-500">{user.team} • {user.cargo || 'Sem cargo'}</p>
                    </div>
                    <input
                      type="number"
                      value={draft.salaryMonthly}
                      onChange={(event) =>
                        setEditingUserCosts((current) => ({
                          ...current,
                          [user.id]: { ...draft, salaryMonthly: event.target.value },
                        }))
                      }
                      className={INPUT_CLASS}
                      placeholder="Salário mensal"
                    />
                    <input
                      type="number"
                      value={draft.costPerHour}
                      onChange={(event) =>
                        setEditingUserCosts((current) => ({
                          ...current,
                          [user.id]: { ...draft, costPerHour: event.target.value },
                        }))
                      }
                      className={INPUT_CLASS}
                      placeholder="Custo/h manual"
                    />
                    <button
                      type="button"
                      onClick={() => saveUserCost(user.id)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      Salvar
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <TaskModal
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTaskId(null)}
        editingTask={selectedTask || undefined}
        projectId={selectedTask?.projectId}
        phaseId={selectedTask?.phaseId}
        milestoneId={selectedTask?.milestoneId}
      />
    </div>
  );
}

const SECTIONS: Array<{ value: GovernanceSection; label: string }> = [
  { value: 'overview', label: 'Resumo executivo' },
  { value: 'projects', label: 'Portfólio de projetos' },
  { value: 'tasks', label: 'Tarefas dos projetos' },
  { value: 'people', label: 'Equipe' },
  { value: 'collaborators', label: 'Carga por colaborador' },
  { value: 'productivity', label: 'Produtividade' },
  { value: 'performance', label: 'Desempenho' },
  { value: 'capacity', label: 'Capacidade da equipe' },
  { value: 'risks', label: 'Riscos e gargalos' },
  { value: 'settings', label: 'Configurações' },
];

const INPUT_CLASS =
  'w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30';

type CollaboratorTaskRow = {
  task_id: string;
  task: string;
  project?: string;
  responsible?: string;
  status: string;
  is_week_focus: boolean;
};

function getCollaboratorLane(status: string) {
  if (isTaskDoneStatus(status)) return 'done';
  if (isTaskInProgressStatus(status)) return 'in-progress';
  return 'backlog';
}

function CollaboratorKanbanView(props: {
  taskRows: CollaboratorTaskRow[];
  allTasks: EnrichedTask[];
  users: Array<{ id: string; name: string; team: string; cargo?: string }>;
  expandedUserIds: string[];
  onToggleUser: (userId: string) => void;
  onTaskOpen: (taskId: string) => void;
}) {
  const tasksById = useMemo(
    () => new Map(props.allTasks.map((task) => [task.id, task])),
    [props.allTasks]
  );

  const summaries = useMemo(() => {
    const grouped = new Map<
      string,
      {
        userId: string;
        name: string;
        team: string;
        role?: string;
        backlog: CollaboratorTaskRow[];
        inProgress: CollaboratorTaskRow[];
        done: CollaboratorTaskRow[];
      }
    >();

    props.taskRows.forEach((row) => {
      const task = tasksById.get(row.task_id);
      const matchedUser =
        (task?.assigneeId
          ? props.users.find((user) => user.id === task.assigneeId)
          : undefined) ||
        props.users.find((user) => user.name === (row.responsible || task?.assignee || ''));

      const userId = matchedUser?.id || `name:${row.responsible || 'sem-responsavel'}`;
      const entry =
        grouped.get(userId) ||
        {
          userId,
          name: matchedUser?.name || row.responsible || 'Sem responsável',
          team: matchedUser?.team || 'Sem equipe',
          role: matchedUser?.cargo,
          backlog: [],
          inProgress: [],
          done: [],
        };

      const lane = getCollaboratorLane(row.status);
      if (lane === 'done') entry.done.push(row);
      else if (lane === 'in-progress') entry.inProgress.push(row);
      else entry.backlog.push(row);

      grouped.set(userId, entry);
    });

    return Array.from(grouped.values()).sort(
      (a, b) =>
        b.inProgress.length - a.inProgress.length ||
        b.backlog.length - a.backlog.length ||
        a.name.localeCompare(b.name, 'pt-BR')
    );
  }, [props.taskRows, props.users, tasksById]);

  return (
    <div className="space-y-4">
      {summaries.length > 0 ? (
        summaries.map((summary) => {
          const isExpanded = props.expandedUserIds.includes(summary.userId);
          const total = summary.backlog.length + summary.inProgress.length + summary.done.length;

          return (
            <section key={summary.userId} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">{summary.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {summary.team}{summary.role ? ` • ${summary.role}` : ''} • {total} tarefa(s) no recorte atual
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    Backlog: {summary.backlog.length}
                  </span>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                    Em andamento: {summary.inProgress.length}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    Concluído: {summary.done.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => props.onToggleUser(summary.userId)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    {isExpanded ? 'Recolher tarefas' : 'Carregar tarefas'}
                  </button>
                </div>
              </div>

              {isExpanded ? (
                <div className="mt-4 grid gap-4 xl:grid-cols-3">
                  {[
                    { key: 'backlog', title: 'Backlog', items: summary.backlog, tone: 'bg-slate-50' },
                    { key: 'in-progress', title: 'Em andamento', items: summary.inProgress, tone: 'bg-amber-50/70' },
                    { key: 'done', title: 'Concluído', items: summary.done, tone: 'bg-emerald-50/70' },
                  ].map((lane) => (
                    <div key={lane.key} className={`rounded-2xl border border-slate-200 p-4 ${lane.tone}`}>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="text-sm font-semibold text-slate-900">{lane.title}</h4>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                          {lane.items.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {lane.items.length > 0 ? (
                          lane.items.map((item) => (
                            <button
                              key={item.task_id}
                              type="button"
                              onClick={() => props.onTaskOpen(item.task_id)}
                              className={`w-full rounded-2xl border px-3 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${
                                item.is_week_focus
                                  ? 'border-sky-200 bg-sky-50/80'
                                  : 'border-white bg-white'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">{item.task}</p>
                                  <p className="mt-1 truncate text-xs text-slate-500">{item.project || 'Sem projeto'}</p>
                                </div>
                                {item.is_week_focus ? (
                                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                                    Foco
                                  </span>
                                ) : null}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-3 py-6 text-center text-xs text-slate-500">
                            Nenhuma tarefa nesta coluna.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          );
        })
      ) : (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
          Nenhuma tarefa encontrada para o recorte atual.
        </div>
      )}
    </div>
  );
}

function MetricCard(props: { title: string; value: string; icon: React.ReactNode; tone?: 'default' | 'danger' | 'success' | 'warning' }) {
  const toneClasses =
    props.tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : props.tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : props.tone === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-700'
          : 'border-slate-200 bg-white text-slate-700';
  return (
    <div className={`rounded-[28px] border p-5 shadow-sm ${toneClasses}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{props.title}</span>
        {props.icon}
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight">{props.value}</div>
    </div>
  );
}

function HighlightCard(props: { title: string; subtitle: string; detail: string; tone: 'success' | 'danger' | 'warning' }) {
  const toneClasses =
    props.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50'
      : props.tone === 'danger'
        ? 'border-rose-200 bg-rose-50'
        : 'border-amber-200 bg-amber-50';
  return (
    <div className={`rounded-[28px] border p-5 shadow-sm ${toneClasses}`}>
      <p className="text-sm font-semibold text-slate-700">{props.title}</p>
      <p className="mt-3 text-base font-semibold text-slate-950">{props.subtitle}</p>
      {props.detail ? <p className="mt-1 text-sm text-slate-600">{props.detail}</p> : null}
    </div>
  );
}

function FocusProjectCard(props: {
  row: {
    project_id: string;
    project: string;
    responsible: string;
    status: string;
    progress: number;
    deadline?: string;
    smart_status: string;
    weekly_update?: string;
  };
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onOpen}
      className="w-full rounded-[24px] border border-emerald-200 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            Foco da Semana
          </div>
          <h4 className="mt-3 text-base font-semibold text-slate-950">{props.row.project}</h4>
          <p className="mt-1 text-sm text-slate-600">{props.row.smart_status}</p>
        </div>
        <ArrowRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <InfoPill label="Responsável" value={props.row.responsible} />
        <InfoPill label="Status" value={props.row.status} />
        <InfoPill label="Progresso" value={`${props.row.progress}%`} />
        <InfoPill label="Prazo" value={props.row.deadline || 'Sem prazo'} />
      </div>
      {props.row.weekly_update ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2 text-slate-700">
            <MessageSquareQuote className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.14em]">Atualização da Semana</p>
          </div>
          <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{props.row.weekly_update}</p>
        </div>
      ) : null}
    </button>
  );
}

function FocusTaskCard(props: {
  row: {
    task_id: string;
    task: string;
    project?: string;
    responsible?: string;
    status: string;
    priority?: string;
    due_date?: string;
    is_blocked: boolean;
  };
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onOpen}
      className="w-full rounded-[22px] border border-amber-200 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">{props.row.task}</p>
          <p className="mt-1 text-sm text-slate-600">{props.row.project || 'Sem projeto vinculado'}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${props.row.is_blocked ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
          {props.row.is_blocked ? 'Bloqueada' : props.row.priority || 'Em foco'}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <InfoPill label="Responsável" value={props.row.responsible || 'Sem responsável'} />
        <InfoPill label="Status" value={props.row.status} />
        <InfoPill label="Prioridade" value={props.row.priority || '—'} />
        <InfoPill label="Prazo" value={props.row.due_date || 'Sem prazo'} />
      </div>
    </button>
  );
}

function InfoPill(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{props.label}</p>
      <p className="mt-1 truncate text-sm font-medium text-slate-900">{props.value}</p>
    </div>
  );
}

function EmptyInlineState(props: { title: string; description: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/80 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-slate-900">{props.title}</p>
      <p className="mt-2 text-sm text-slate-500">{props.description}</p>
    </div>
  );
}

function FilterField(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{props.label}</span>
      {props.children}
    </label>
  );
}

function SummarySection(props: { title: string; description: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="section-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">{props.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{props.description}</p>
        </div>
        {props.actions}
      </div>
      {props.children}
    </section>
  );
}

function ChartCard(props: { title: string; content: React.ReactNode }) {
  return (
    <section className="section-card">
      <h3 className="text-lg font-semibold text-slate-950">{props.title}</h3>
      <div className="mt-4">{props.content}</div>
    </section>
  );
}

function ChartGrid(props: {
  leftTitle: string;
  leftData: Array<{ label: string; value: number }>;
  leftColor: string;
  rightTitle: string;
  rightData: Array<{ label: string; value: number }>;
  rightColor: string;
}) {
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard
        title={props.leftTitle}
        content={
          <ChartContainer config={{ value: { label: 'Valor', color: props.leftColor } }} className="h-[300px] w-full">
            <BarChart data={props.leftData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={56} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => numberFormatter.format(Number(value))} />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ChartContainer>
        }
      />
      <ChartCard
        title={props.rightTitle}
        content={
          <ChartContainer config={{ value: { label: 'Valor', color: props.rightColor } }} className="h-[300px] w-full">
            <BarChart data={props.rightData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={56} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => numberFormatter.format(Number(value))} />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ChartContainer>
        }
      />
    </section>
  );
}

function DataTable(props: {
  columns: string[];
  rows: Array<{ key: string; cells: Array<string | number>; onClick?: () => void }>;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className={`grid gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500`} style={{ gridTemplateColumns: `repeat(${props.columns.length}, minmax(140px, 1fr))` }}>
        {props.columns.map((column) => (
          <div key={column}>{column}</div>
        ))}
      </div>
      <div className="overflow-x-auto">
        {props.rows.map((row) => (
          <button
            key={row.key}
            type="button"
            onClick={row.onClick}
            className={`grid w-full gap-3 border-b border-slate-100 px-5 py-4 text-left transition-colors ${row.onClick ? 'hover:bg-slate-50' : ''}`}
            style={{ gridTemplateColumns: `repeat(${props.columns.length}, minmax(140px, 1fr))` }}
          >
            {row.cells.map((cell, index) => (
              <div key={`${row.key}-${index}`} className="truncate text-sm text-slate-700">
                {cell}
              </div>
            ))}
          </button>
        ))}
      </div>
    </section>
  );
}

function ExportButtons(props: { onCsv: () => void; onExcel: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={props.onCsv} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
        <Download className="h-4 w-4" />
        Exportar CSV
      </button>
      <button type="button" onClick={props.onExcel} className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100">
        <Download className="h-4 w-4" />
        Exportar Excel
      </button>
    </div>
  );
}

function LinkButton(props: { to: string; label: string }) {
  return (
    <Link to={props.to} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
      {props.label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function ShortcutCard(props: { title: string; description: string; icon: React.ReactNode; to: string }) {
  return (
    <Link to={props.to} className="rounded-[24px] border border-white/80 bg-white/85 px-4 py-4 shadow-sm transition-colors hover:bg-white">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">{props.icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">{props.title}</p>
          <p className="text-xs text-slate-500">{props.description}</p>
        </div>
      </div>
    </Link>
  );
}

function EditableFieldCard(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-700">{props.label}</p>
      <input type="number" value={props.value} onChange={(event) => props.onChange(event.target.value)} className={`${INPUT_CLASS} mt-4`} />
    </div>
  );
}

function truncate(value?: string, size = 16) {
  if (!value) return '—';
  return value.length > size ? `${value.slice(0, size - 1)}…` : value;
}

function groupBy<T>(items: T[], labelGetter: (item: T) => string, valueGetter: (items: T[]) => number) {
  const grouped = items.reduce<Record<string, T[]>>((acc, item) => {
    const key = labelGetter(item);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
  return Object.entries(grouped)
    .map(([label, groupedItems]) => ({ label: truncate(label), value: valueGetter(groupedItems) }))
    .sort((a, b) => b.value - a.value);
}
