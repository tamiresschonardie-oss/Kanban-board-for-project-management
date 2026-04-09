import { ReactNode, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FolderKanban,
  Gauge,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { useAdmin } from '../context/AdminContext';
import { useProjects } from '../context/ProjectContext';
import { useTasks } from '../context/TaskContext';
import { canAccessGovernance } from '../utils/permissions';
import { SearchableMultiSelect } from '../components/filters/SearchableMultiSelect';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  AnalyticsPeriod,
  AnalyticsFilters,
} from '../types';
import {
  getAnalyticsFlow,
  getAnalyticsOverview,
  getCompletedProjectsByYearChartData,
  getAnalyticsPerformanceUsers,
  getAnalyticsProjects,
  getCompletedTasksTrend,
  getProjectStatusChartData,
  getScopedAnalyticsData,
  getTaskStatusChartData,
  getTrackedHoursTrend,
} from '../utils/analytics';
import { KanbanPageHeader } from '../components/kanban/KanbanLayout';
import { getProjectFilterYear } from '../utils/projectSelectors';
import { getDynamicYearOptions } from '../utils/yearOptions';

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#2563eb', '#7c3aed'];
const BAR_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444'];

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

type PerformanceSortKey =
  | 'productivity_score'
  | 'total_hours'
  | 'tasks_completed'
  | 'avg_task_time';

const DASHBOARD_STORAGE_KEY = 'governance-analytics-dashboard:v2';

const createDefaultFilters = (): AnalyticsFilters => ({
  period: 'month',
  years: [String(new Date().getFullYear())],
  teamNames: [],
  projectIds: [],
  clientNames: [],
  productNames: [],
  responsibleNames: [],
});

const readPersistedFilters = (): AnalyticsFilters => {
  if (typeof window === 'undefined') return createDefaultFilters();

  try {
    const raw = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
    if (!raw) return createDefaultFilters();
    const parsed = JSON.parse(raw) as Partial<AnalyticsFilters>;

    return {
      ...createDefaultFilters(),
      ...parsed,
      period:
        parsed.period === 'week' || parsed.period === 'month' || parsed.period === 'year'
          ? parsed.period
          : 'month',
      years: Array.isArray(parsed.years) && parsed.years.length > 0
        ? parsed.years.map(String)
        : [String(new Date().getFullYear())],
    };
  } catch {
    return createDefaultFilters();
  }
};

export function GovernanceAnalyticsDashboard() {
  const { currentUser, users, teams, products, clients, costSettings } = useAdmin();
  const { projects } = useProjects();
  const { allTasks } = useTasks();
  const [filters, setFilters] = useState<AnalyticsFilters>(() => readPersistedFilters());
  const [performanceSortKey, setPerformanceSortKey] = useState<PerformanceSortKey>('productivity_score');
  const deferredFilters = useDeferredValue(filters);

  const hasAccess = canAccessGovernance(currentUser);

  useEffect(() => {
    window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  const teamOptions = useMemo(
    () => teams.map((team) => ({ value: team.name, label: team.name })).sort((a, b) => a.label.localeCompare(b.label)),
    [teams]
  );
  const projectOptions = useMemo(
    () => projects.map((project) => ({ value: project.id, label: project.name })).sort((a, b) => a.label.localeCompare(b.label)),
    [projects]
  );
  const clientOptions = useMemo(
    () => clients.map((client) => ({ value: client.name, label: client.name })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [clients]
  );
  const productOptions = useMemo(
    () => products.map((product) => ({ value: product.name, label: product.name })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [products]
  );
  const responsibleOptions = useMemo(
    () =>
      Array.from(new Set(projects.map((project) => project.responsible).filter(Boolean)))
        .map((name) => ({ value: name, label: name }))
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

  const scopedData = useMemo(
    () => getScopedAnalyticsData(projects, allTasks, users, deferredFilters),
    [projects, allTasks, users, deferredFilters]
  );
  const overview = useMemo(
    () => getAnalyticsOverview(projects, allTasks, users, deferredFilters),
    [projects, allTasks, users, deferredFilters]
  );
  const userPerformance = useMemo(
    () => getAnalyticsPerformanceUsers(projects, allTasks, users, deferredFilters),
    [projects, allTasks, users, deferredFilters]
  );
  const flow = useMemo(
    () => getAnalyticsFlow(projects, allTasks, users, deferredFilters),
    [projects, allTasks, users, deferredFilters]
  );
  const projectAnalytics = useMemo(
    () => getAnalyticsProjects(projects, allTasks, users, costSettings, deferredFilters),
    [projects, allTasks, users, costSettings, deferredFilters]
  );
  const projectStatusChart = useMemo(
    () => getProjectStatusChartData(scopedData.scopedProjects),
    [scopedData.scopedProjects]
  );
  const taskStatusChart = useMemo(
    () => getTaskStatusChartData(scopedData.scopedTasks),
    [scopedData.scopedTasks]
  );
  const completedTrend = useMemo(
    () => getCompletedTasksTrend(scopedData.scopedTasks, deferredFilters),
    [scopedData.scopedTasks, deferredFilters]
  );
  const hoursTrend = useMemo(
    () => getTrackedHoursTrend(scopedData.scopedTasks, deferredFilters),
    [scopedData.scopedTasks, deferredFilters]
  );
  const completedProjectsByYear = useMemo(
    () => getCompletedProjectsByYearChartData(scopedData.scopedProjects, deferredFilters.years),
    [scopedData.scopedProjects, deferredFilters.years]
  );
  const rankedUsers = useMemo(
    () =>
      [...userPerformance.users].sort((a, b) => {
        return Number(b[performanceSortKey]) - Number(a[performanceSortKey]);
      }),
    [userPerformance.users, performanceSortKey]
  );
  const scopeLabel = useMemo(() => {
    if (deferredFilters.period === 'week') return 'Semana atual';
    if (deferredFilters.period === 'month') return 'Mês atual';
    if (deferredFilters.years.length === 0) return 'Visão anual completa';
    if (deferredFilters.years.length === 1) return `Ano ${deferredFilters.years[0]}`;
    return `${deferredFilters.years.length} anos selecionados`;
  }, [deferredFilters.period, deferredFilters.years]);

  if (!hasAccess) {
    return (
      <div className="page-shell flex h-full items-center justify-center">
        <div className="section-card max-w-xl border-red-200 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Acesso restrito</h1>
          <p className="mt-2 text-slate-600">
            Seu perfil atual não possui permissão para acessar analytics de governança.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6">
      <KanbanPageHeader
        eyebrow="Governança"
        title="Dashboard executivo"
        description="Leitura analítica de portfólio, entregas, fluxo e custos com recortes claros para PMO e liderança."
      />

      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_32%),linear-gradient(135deg,#ffffff_0%,#f8fafc_48%,#eff6ff_100%)] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Visão executiva em menos de 30 segundos
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Onde estão gargalos, entregas e custo agora
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Todos os blocos abaixo respondem ao mesmo recorte global de período, ano, equipe, projeto, cliente, produto e responsável.
            </p>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/80 px-5 py-4 shadow-sm backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Recorte aplicado
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {scopeLabel}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {scopedData.scopedProjects.length} projetos • {scopedData.scopedTasks.length} tarefas
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterField label="Período">
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              {[
                ['week', 'Semana'],
                ['month', 'Mês'],
                ['year', 'Ano'],
              ].map(([period, label]) => (
                <button
                  key={period}
                  type="button"
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      period: period as AnalyticsPeriod,
                      years:
                        period === 'year' && current.years.length === 0
                          ? [String(new Date().getFullYear())]
                          : current.years,
                    }))
                  }
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    filters.period === period
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </FilterField>

          <FilterField label="Ano">
            <SearchableMultiSelect
              value={filters.years}
              onChange={(value) => setFilters((current) => ({ ...current, years: value }))}
              options={yearOptions}
              placeholder={filters.period === 'year' ? 'Selecione um ou mais anos' : 'Ano de referência'}
              allLabel="Todos os anos"
              searchPlaceholder="Buscar ano..."
            />
          </FilterField>

          <FilterField label="Equipe">
            <SearchableMultiSelect
              value={filters.teamNames}
              onChange={(value) => setFilters((current) => ({ ...current, teamNames: value }))}
              options={teamOptions}
              placeholder="Todas as equipes"
            />
          </FilterField>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

          <FilterField label="Cliente">
            <SearchableMultiSelect
              value={filters.clientNames}
              onChange={(value) => setFilters((current) => ({ ...current, clientNames: value }))}
              options={clientOptions}
              placeholder="Todos os clientes"
            />
          </FilterField>

          <FilterField label="Produto">
            <SearchableMultiSelect
              value={filters.productNames}
              onChange={(value) => setFilters((current) => ({ ...current, productNames: value }))}
              options={productOptions}
              placeholder="Todos os produtos"
            />
          </FilterField>

          <FilterField label="Responsável">
            <SearchableMultiSelect
              value={filters.responsibleNames}
              onChange={(value) => setFilters((current) => ({ ...current, responsibleNames: value }))}
              options={responsibleOptions}
              placeholder="Todos os responsáveis"
            />
          </FilterField>

          <FilterField label="Projeto">
            <SearchableMultiSelect
              value={filters.projectIds}
              onChange={(value) => setFilters((current) => ({ ...current, projectIds: value }))}
              options={projectOptions}
              placeholder="Todos os projetos"
            />
          </FilterField>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Projetos em andamento" value={overview.projects_in_progress} icon={<FolderKanban className="h-5 w-5 text-blue-600" />} tone="blue" />
        <StatCard label="Projetos atrasados" value={overview.projects_delayed} icon={<CircleAlert className="h-5 w-5 text-red-600" />} tone="red" />
        <StatCard label="Projetos concluídos" value={overview.projects_completed} icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} tone="green" />
        <StatCard label="Tarefas em andamento" value={overview.tasks_in_progress} icon={<Activity className="h-5 w-5 text-amber-600" />} tone="amber" />
        <StatCard label="Tarefas concluídas" value={overview.tasks_completed} icon={<Gauge className="h-5 w-5 text-violet-600" />} tone="violet" />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AnalyticsChartCard
          title="Projetos por status"
          description="Distribuição executiva entre andamento, concluídos e atrasados."
        >
          <ProjectsStatusPieChart items={projectStatusChart} />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Tarefas por status"
          description="Volume operacional por etapa atual do fluxo."
        >
          <TasksStatusBarChart items={taskStatusChart} />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={filters.period === 'year' ? 'Concluídas por ano' : 'Evolução de tarefas concluídas'}
          description={
            filters.period === 'year'
              ? 'Volume anual de tarefas concluídas dentro dos anos selecionados.'
              : 'Leitura do throughput no período filtrado.'
          }
        >
          <CompletedTrendChart items={completedTrend} />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title={filters.period === 'year' ? 'Horas trabalhadas por ano' : 'Horas trabalhadas por período'}
          description={
            filters.period === 'year'
              ? 'Soma anual dos apontamentos de horas no recorte aplicado.'
              : 'Soma dos apontamentos de horas no recorte aplicado.'
          }
        >
          <HoursTrendChart items={hoursTrend} />
        </AnalyticsChartCard>

        <AnalyticsChartCard
          title="Projetos concluídos por ano"
          description="Comparativo anual do volume de projetos finalizados, com destaque para o ano atual."
        >
          <CompletedProjectsByYearChart items={completedProjectsByYear} />
        </AnalyticsChartCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Performance da equipe</h3>
              <p className="mt-1 text-sm text-gray-500">
                Ranking ordenável por produtividade, horas, entrega e tempo médio.
              </p>
            </div>
            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
              {[
                ['productivity_score', 'Score'],
                ['tasks_completed', 'Concluídas'],
                ['total_hours', 'Horas'],
                ['avg_task_time', 'Tempo médio'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPerformanceSortKey(key as PerformanceSortKey)}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    performanceSortKey === key ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Concluídas</TableHead>
                  <TableHead>Em andamento</TableHead>
                  <TableHead>Tempo médio</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 font-semibold text-slate-700">
                          {user.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500">ID {user.user_id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{numberFormatter.format(user.total_hours)}h</TableCell>
                    <TableCell>{user.tasks_completed}</TableCell>
                    <TableCell>{user.tasks_in_progress}</TableCell>
                    <TableCell>{numberFormatter.format(user.avg_task_time)}h</TableCell>
                    <TableCell className="text-right font-semibold text-emerald-700">
                      {numberFormatter.format(user.productivity_score)}
                    </TableCell>
                  </TableRow>
                ))}
                {rankedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                      Nenhum usuário possui dados para o recorte atual.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="space-y-4">
          <FlowCard label="Lead Time médio" value={`${numberFormatter.format(flow.lead_time_avg)}h`} helper="Criação até conclusão" icon={<Clock3 className="h-4 w-4" />} tone="blue" />
          <FlowCard label="Cycle Time médio" value={`${numberFormatter.format(flow.cycle_time_avg)}h`} helper="Início até conclusão" icon={<TrendingUp className="h-4 w-4" />} tone="emerald" />
          <FlowCard label="Throughput" value={flow.throughput} helper="Tarefas concluídas no período" icon={<BarChart3 className="h-4 w-4" />} tone="amber" />
          <FlowCard label="WIP atual" value={flow.wip} helper="Tarefas em andamento agora" icon={<Users className="h-4 w-4" />} tone="rose" />
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Projetos em visão gerencial</h3>
            <p className="mt-1 text-sm text-gray-500">
              Progresso, risco, horas, custo real e prazo sob o mesmo recorte analítico.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Custo operacional visível em tempo real com base no módulo financeiro.
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projeto</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Horas</TableHead>
              <TableHead>Custo</TableHead>
              <TableHead>Prazo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectAnalytics.projects.map((project) => (
              <TableRow key={project.project_id}>
                <TableCell className="font-medium text-slate-900">{project.name}</TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          project.progress >= 80 ? 'bg-emerald-500' : project.progress >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-600">{project.progress}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={project.delay_status} />
                </TableCell>
                <TableCell>{numberFormatter.format(project.total_hours)}h</TableCell>
                <TableCell>{currencyFormatter.format(project.cost_real)}</TableCell>
                <TableCell>{project.deadline ? new Date(project.deadline).toLocaleDateString('pt-BR') : '—'}</TableCell>
              </TableRow>
            ))}
            {projectAnalytics.projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-slate-500">
                  Nenhum projeto encontrado para os filtros atuais.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid content-start gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone: 'blue' | 'red' | 'green' | 'amber' | 'violet';
}) {
  const tones = {
    blue: 'bg-blue-50 border-blue-100',
    red: 'bg-red-50 border-red-100',
    green: 'bg-emerald-50 border-emerald-100',
    amber: 'bg-amber-50 border-amber-100',
    violet: 'bg-violet-50 border-violet-100',
  };

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className="rounded-2xl bg-white/80 p-3 text-slate-700 shadow-sm">{icon}</div>
      </div>
    </div>
  );
}

function FlowCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: ReactNode;
  tone: 'blue' | 'emerald' | 'amber' | 'rose';
}) {
  const toneClass = {
    blue: 'border-blue-100 bg-blue-50',
    emerald: 'border-emerald-100 bg-emerald-50',
    amber: 'border-amber-100 bg-amber-50',
    rose: 'border-rose-100 bg-rose-50',
  };

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClass[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="rounded-2xl bg-white/80 p-2 text-slate-700 shadow-sm">{icon}</span>
      </div>
      <div className="mt-4 text-3xl font-semibold text-slate-950">{value}</div>
      <div className="mt-2 text-sm text-slate-600">{helper}</div>
    </div>
  );
}

function AnalyticsChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function ProjectsStatusPieChart({ items }: { items: Array<{ key: string; label: string; value: number }> }) {
  if (items.length === 0) return <EmptyChartState message="Nenhum projeto encontrado." />;

  return (
    <ChartContainer
      config={Object.fromEntries(items.map((item, index) => [item.key, { label: item.label, color: PIE_COLORS[index % PIE_COLORS.length] }]))}
      className="h-[300px] w-full"
    >
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent />} />
        <Pie data={items} dataKey="value" nameKey="label" innerRadius={62} outerRadius={96} paddingAngle={2}>
          {items.map((item, index) => (
            <Cell key={item.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

function TasksStatusBarChart({ items }: { items: Array<{ key: string; label: string; value: number }> }) {
  if (items.length === 0) return <EmptyChartState message="Nenhuma tarefa encontrada." />;

  return (
    <ChartContainer config={{ total: { label: 'Tarefas', color: '#2563eb' } }} className="h-[300px] w-full">
      <BarChart data={items} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" radius={[10, 10, 0, 0]}>
          {items.map((item, index) => (
            <Cell key={item.key} fill={BAR_COLORS[index % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function CompletedTrendChart({ items }: { items: Array<{ key: string; label: string; value: number }> }) {
  return (
    <ChartContainer config={{ value: { label: 'Concluídas', color: '#10b981' } }} className="h-[300px] w-full">
      <LineChart data={items} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />
      </LineChart>
    </ChartContainer>
  );
}

function HoursTrendChart({ items }: { items: Array<{ key: string; label: string; value: number }> }) {
  return (
    <ChartContainer config={{ value: { label: 'Horas', color: '#2563eb' } }} className="h-[300px] w-full">
      <AreaChart data={items} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="hoursFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area type="monotone" dataKey="value" stroke="#2563eb" fill="url(#hoursFill)" strokeWidth={2.5} />
      </AreaChart>
    </ChartContainer>
  );
}

function CompletedProjectsByYearChart({
  items,
}: {
  items: Array<{ year: string; total: number; variationPct: number | null; isCurrentYear: boolean }>;
}) {
  if (items.length === 0) {
    return <EmptyChartState message="Nenhum projeto concluído encontrado para os anos selecionados." />;
  }

  return (
    <ChartContainer config={{ total: { label: 'Projetos concluídos', color: '#2563eb' } }} className="h-[300px] w-full">
      <BarChart data={items} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="year" tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, _name, payload) => {
                const variationPct =
                  typeof payload?.payload?.variationPct === 'number'
                    ? payload.payload.variationPct
                    : null;
                const variationText =
                  variationPct === null
                    ? ''
                    : ` • ${variationPct > 0 ? '+' : ''}${numberFormatter.format(variationPct)}% vs. ano anterior`;
                return `${value} projetos${variationText}`;
              }}
            />
          }
        />
        <Bar dataKey="total" radius={[10, 10, 0, 0]}>
          {items.map((item) => (
            <Cell key={item.year} fill={item.isCurrentYear ? '#0f766e' : '#2563eb'} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function StatusBadge({ status }: { status: 'ok' | 'risco' | 'atrasado' }) {
  const config = {
    ok: 'bg-emerald-100 text-emerald-700',
    risco: 'bg-amber-100 text-amber-700',
    atrasado: 'bg-rose-100 text-rose-700',
  };
  const labels = {
    ok: 'Saudável',
    risco: 'Risco',
    atrasado: 'Atrasado',
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${config[status]}`}>
      {labels[status]}
    </span>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
      {message}
    </div>
  );
}
