import { type ReactNode, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  DollarSign,
  FolderKanban,
  Gauge,
  Target,
  TimerReset,
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
import { useProjectDetailNavigation } from '../hooks/useProjectDetailNavigation';
import { canAccessGovernance } from '../utils/permissions';
import { isProjectInCompletedPhase } from '../utils/projectSelectors';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import type { Project, ProjectResultEvaluation, ProjectResultStatus } from '../types';
import {
  getProjectValueSnapshot,
  PROJECT_VALUE_IMPACT_LABELS,
  PROJECT_VALUE_MATURITY_LABELS,
  PROJECT_VALUE_STATUS_LABELS,
} from '../services/projectValueMetadata';

type PeriodFilter = 'all' | '30d' | '90d' | '365d';

type DashboardFilters = {
  period: PeriodFilter;
  team: string;
  product: string;
  client: string;
  responsible: string;
  analyst: string;
  impact: string;
  maturity: string;
};

type DashboardRow = {
  project: Project;
  resultStatus: ProjectResultStatus;
  impactLevel: NonNullable<Project['impactLevel']>;
  maturityType: NonNullable<Project['resultMaturityType']>;
  nextEvaluation?: ProjectResultEvaluation;
  latestEvaluation?: ProjectResultEvaluation;
  analystName: string;
  averageScore?: number;
  hasKpi: boolean;
  hasRealizedBenefits: boolean;
  overdue: boolean;
  referenceDate?: string;
};

type AggregateMetric = {
  key: string;
  title: string;
  value: string;
  helper: string;
  icon: ReactNode;
};

const PIE_COLORS = ['#10b981', '#2563eb', '#f59e0b', '#7c3aed', '#ef4444'];
const BAR_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#7c3aed', '#ef4444'];

const createDefaultFilters = (): DashboardFilters => ({
  period: '365d',
  team: '',
  product: '',
  client: '',
  responsible: '',
  analyst: '',
  impact: '',
  maturity: '',
});

function formatDate(value?: string) {
  if (!value) return 'Nao informado';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('pt-BR');
}

function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getPeriodStart(period: PeriodFilter) {
  if (period === 'all') return null;
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() - (period === '30d' ? 30 : period === '90d' ? 90 : 365));
  return next;
}

function isWithinSelectedPeriod(value: string | undefined, period: PeriodFilter) {
  if (period === 'all') return true;
  if (!value) return false;
  const start = getPeriodStart(period);
  const timestamp = new Date(value).getTime();
  if (!start || Number.isNaN(timestamp)) return false;
  return timestamp >= start.getTime();
}

function getAverageScore(evaluations: ProjectResultEvaluation[]) {
  const scores = evaluations
    .map((evaluation) => evaluation.valueScore)
    .filter((value): value is number => typeof value === 'number');
  if (scores.length === 0) return undefined;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function toMonthKey(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeCurrencyUnit(unit?: string) {
  if (!unit) return false;
  const normalized = unit.toLocaleLowerCase('pt-BR');
  return normalized.includes('r$') || normalized.includes('brl') || normalized.includes('real');
}

function normalizeTimeUnit(unit?: string): 'hours' | 'minutes' | null {
  if (!unit) return null;
  const normalized = unit.toLocaleLowerCase('pt-BR');
  if (normalized.includes('hora') || normalized === 'h' || normalized === 'hs') return 'hours';
  if (normalized.includes('min')) return 'minutes';
  return null;
}

function convertTimeDeltaToHours(delta: number, unit: 'hours' | 'minutes') {
  return unit === 'hours' ? delta : delta / 60;
}

function buildAggregateMetrics(rows: DashboardRow[]) {
  let timeSavedHours = 0;
  let timeReductionSamples = 0;
  let timeReductionPctTotal = 0;
  let financialGain = 0;
  let productivitySamples = 0;
  let productivityPctTotal = 0;

  rows.forEach((row) => {
    (row.project.projectKpis || []).forEach((kpi) => {
      if (typeof kpi.baselineValue !== 'number' || typeof kpi.actualValue !== 'number') return;

      if (kpi.type === 'tempo') {
        const unit = normalizeTimeUnit(kpi.unit);
        if (!unit) return;
        const delta = kpi.baselineValue - kpi.actualValue;
        if (delta > 0) {
          timeSavedHours += convertTimeDeltaToHours(delta, unit);
          timeReductionSamples += 1;
          if (kpi.baselineValue > 0) {
            timeReductionPctTotal += (delta / kpi.baselineValue) * 100;
          }
        }
      }

      if (kpi.type === 'financeiro' && normalizeCurrencyUnit(kpi.unit)) {
        const delta = kpi.actualValue - kpi.baselineValue;
        if (delta > 0) financialGain += delta;
      }

      if (kpi.type === 'produtividade' && kpi.baselineValue > 0) {
        const deltaPct = ((kpi.actualValue - kpi.baselineValue) / kpi.baselineValue) * 100;
        if (Number.isFinite(deltaPct) && deltaPct > 0) {
          productivityPctTotal += deltaPct;
          productivitySamples += 1;
        }
      }
    });
  });

  const metrics: AggregateMetric[] = [];

  if (timeSavedHours > 0) {
    metrics.push({
      key: 'time-saved',
      title: 'Horas economizadas',
      value: `${formatNumber(timeSavedHours)}h`,
      helper: 'Soma apenas de KPIs de tempo com baseline e real consistentes.',
      icon: <TimerReset className="h-5 w-5 text-blue-600" />,
    });
  }

  if (timeReductionSamples > 0) {
    metrics.push({
      key: 'time-reduction',
      title: 'Reducao media de tempo',
      value: `${formatNumber(timeReductionPctTotal / timeReductionSamples)}%`,
      helper: 'Media calculada somente para KPIs de tempo com leitura comparavel.',
      icon: <TrendingUp className="h-5 w-5 text-cyan-600" />,
    });
  }

  if (financialGain > 0) {
    metrics.push({
      key: 'financial-gain',
      title: 'Ganhos financeiros',
      value: formatCurrency(financialGain),
      helper: 'Agregado apenas quando o KPI financeiro possui unidade monetaria consistente.',
      icon: <DollarSign className="h-5 w-5 text-emerald-600" />,
    });
  }

  if (productivitySamples > 0) {
    metrics.push({
      key: 'productivity',
      title: 'Melhoria de produtividade',
      value: `${formatNumber(productivityPctTotal / productivitySamples)}%`,
      helper: 'Media de ganho percentual apenas em KPIs de produtividade comparaveis.',
      icon: <Gauge className="h-5 w-5 text-violet-600" />,
    });
  }

  return metrics;
}

export function ValueDashboard() {
  const { currentUser, users } = useAdmin();
  const { projects } = useProjects();
  const { openProjectDetail } = useProjectDetailNavigation();
  const [filters, setFilters] = useState<DashboardFilters>(() => createDefaultFilters());

  const hasAccess = canAccessGovernance(currentUser);

  const sourceRows = useMemo<DashboardRow[]>(() => {
    const now = Date.now();

    return projects
      .filter((project) => isProjectInCompletedPhase(project))
      .filter((project) => {
        if (currentUser?.role !== 'user') return true;
        const teams = new Set([currentUser.team, ...(currentUser.teams || [])].filter(Boolean));
        return teams.has(project.group) || (project.teams || []).some((team) => teams.has(team));
      })
      .map((project) => {
        const snapshot = getProjectValueSnapshot(project, users);
        const referenceDate =
          snapshot.latestCompletedEvaluation?.completedAt ||
          snapshot.nextEvaluation?.scheduledAt ||
          project.nextResultEvaluationAt ||
          project.deliveredAt ||
          project.completionDate;

        return {
          project,
          resultStatus: snapshot.resultStatus,
          impactLevel: snapshot.impactLevel,
          maturityType: snapshot.maturityType,
          nextEvaluation: snapshot.nextEvaluation,
          latestEvaluation: snapshot.latestCompletedEvaluation,
          analystName: snapshot.ownerName,
          averageScore: snapshot.averageScore,
          hasKpi: snapshot.hasKpi,
          hasRealizedBenefits: snapshot.hasRealizedBenefits,
          overdue: snapshot.alerts.some((alert) => alert.kind === 'overdue'),
          referenceDate,
        };
      });
  }, [currentUser, projects, users]);

  const filteredRows = useMemo(
    () =>
      sourceRows.filter((row) => {
        if (filters.team && row.project.group !== filters.team) return false;
        if (filters.product && row.project.product !== filters.product) return false;
        if (filters.client && row.project.client !== filters.client) return false;
        if (filters.responsible && row.project.responsible !== filters.responsible) return false;
        if (filters.analyst && row.analystName !== filters.analyst) return false;
        if (filters.impact && row.impactLevel !== filters.impact) return false;
        if (filters.maturity && row.maturityType !== filters.maturity) return false;
        if (!isWithinSelectedPeriod(row.referenceDate, filters.period)) return false;
        return true;
      }),
    [filters, sourceRows]
  );

  const filterOptions = useMemo(
    () => ({
      teams: Array.from(new Set(sourceRows.map((row) => row.project.group).filter(Boolean))).sort(),
      products: Array.from(new Set(sourceRows.map((row) => row.project.product).filter(Boolean))).sort(),
      clients: Array.from(new Set(sourceRows.map((row) => row.project.client).filter(Boolean))).sort(),
      responsibles: Array.from(new Set(sourceRows.map((row) => row.project.responsible).filter(Boolean))).sort(),
      analysts: Array.from(new Set(sourceRows.map((row) => row.analystName).filter(Boolean))).sort(),
    }),
    [sourceRows]
  );

  const kpis = useMemo(() => filteredRows.flatMap((row) => row.project.projectKpis || []), [filteredRows]);
  const completedProjects = filteredRows.length;
  const pendingEvaluationProjects = filteredRows.filter(
    (row) => row.resultStatus === 'aguardando_avaliacao' || row.resultStatus === 'em_avaliacao'
  ).length;
  const evaluatedProjects = filteredRows.filter(
    (row) => row.resultStatus === 'avaliado' || row.resultStatus === 'encerrado'
  ).length;
  const highImpactProjects = filteredRows.filter((row) => row.impactLevel === 'alto').length;
  const avgValueScore = (() => {
    const scores = filteredRows
      .map((row) => row.averageScore)
      .filter((value): value is number => typeof value === 'number');
    if (scores.length === 0) return null;
    return scores.reduce((sum, value) => sum + value, 0) / scores.length;
  })();
  const filledKpis = kpis.filter((kpi) => typeof kpi.actualValue === 'number').length;
  const projectsWithoutKpi = filteredRows.filter((row) => !row.hasKpi).length;

  const aggregateMetrics = useMemo(() => buildAggregateMetrics(filteredRows), [filteredRows]);

  const statusChart = useMemo(
    () =>
      (Object.keys(PROJECT_VALUE_STATUS_LABELS) as ProjectResultStatus[]).map((status) => ({
        key: status,
        label: PROJECT_VALUE_STATUS_LABELS[status],
        value: filteredRows.filter((row) => row.resultStatus === status).length,
      })),
    [filteredRows]
  );

  const impactChart = useMemo(
    () =>
      (Object.keys(PROJECT_VALUE_IMPACT_LABELS) as Array<keyof typeof PROJECT_VALUE_IMPACT_LABELS>).map((impact) => ({
        key: impact,
        label: PROJECT_VALUE_IMPACT_LABELS[impact],
        value: filteredRows.filter((row) => row.impactLevel === impact).length,
      })),
    [filteredRows]
  );

  const evaluationsTrend = useMemo(() => {
    const map = new Map<string, number>();
    filteredRows.forEach((row) => {
      const key = toMonthKey(row.latestEvaluation?.completedAt || row.nextEvaluation?.scheduledAt);
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([key, value]) => ({ key, label: key.slice(5) + '/' + key.slice(0, 4), value }));
  }, [filteredRows]);

  const valueByProduct = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    filteredRows.forEach((row) => {
      if (typeof row.averageScore !== 'number' || !row.project.product) return;
      const current = map.get(row.project.product) || { total: 0, count: 0 };
      map.set(row.project.product, {
        total: current.total + row.averageScore,
        count: current.count + 1,
      });
    });

    return Array.from(map.entries())
      .map(([key, value]) => ({
        key,
        label: key,
        value: Number((value.total / value.count).toFixed(2)),
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);
  }, [filteredRows]);

  const topImpactProjects = useMemo(
    () =>
      [...filteredRows]
        .sort((left, right) => {
          const impactWeight = (value: DashboardRow['impactLevel']) =>
            value === 'alto' ? 3 : value === 'medio' ? 2 : 1;
          return (
            impactWeight(right.impactLevel) - impactWeight(left.impactLevel) ||
            (right.averageScore || 0) - (left.averageScore || 0)
          );
        })
        .slice(0, 5),
    [filteredRows]
  );

  const topAnalysts = useMemo(() => {
    const map = new Map<string, { evaluatedProjects: number; averageScore: number; scoreCount: number }>();
    filteredRows.forEach((row) => {
      const current = map.get(row.analystName) || { evaluatedProjects: 0, averageScore: 0, scoreCount: 0 };
      const hasCompletedEvaluation = Boolean(row.latestEvaluation);
      map.set(row.analystName, {
        evaluatedProjects: current.evaluatedProjects + (hasCompletedEvaluation ? 1 : 0),
        averageScore: current.averageScore + (row.averageScore || 0),
        scoreCount: current.scoreCount + (typeof row.averageScore === 'number' ? 1 : 0),
      });
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({
        name,
        evaluatedProjects: value.evaluatedProjects,
        averageScore:
          value.scoreCount > 0 ? Number((value.averageScore / value.scoreCount).toFixed(2)) : null,
      }))
      .sort((left, right) => right.evaluatedProjects - left.evaluatedProjects)
      .slice(0, 5);
  }, [filteredRows]);

  const topProducts = useMemo(
    () =>
      [...valueByProduct].sort((left, right) => right.value - left.value).slice(0, 5),
    [valueByProduct]
  );

  const topScoredProjects = useMemo(
    () =>
      filteredRows
        .filter((row) => typeof row.averageScore === 'number')
        .sort((left, right) => (right.averageScore || 0) - (left.averageScore || 0))
        .slice(0, 5),
    [filteredRows]
  );

  const alerts = useMemo(
    () => ({
      withoutEvaluation: filteredRows.filter((row) => !row.latestEvaluation),
      overdue: filteredRows.filter((row) => row.overdue),
      withoutKpi: filteredRows.filter((row) => !row.hasKpi),
      withoutRealizedBenefits: filteredRows.filter((row) => !row.hasRealizedBenefits),
    }),
    [filteredRows]
  );

  const hasActiveFilters =
    filters.period !== '365d' ||
    Boolean(filters.team) ||
    Boolean(filters.product) ||
    Boolean(filters.client) ||
    Boolean(filters.responsible) ||
    Boolean(filters.analyst) ||
    Boolean(filters.impact) ||
    Boolean(filters.maturity);

  if (!hasAccess) {
    return (
      <div className="page-shell flex h-full items-center justify-center">
        <div className="section-card max-w-xl border-red-200 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Acesso restrito</h1>
          <p className="mt-2 text-slate-600">
            Seu perfil atual nao possui permissao para acessar o dashboard de valor gerado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_32%),linear-gradient(135deg,#ffffff_0%,#f8fafc_48%,#ecfeff_100%)] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Valor gerado pelo Labs
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Visao executiva do impacto apos a entrega
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Este dashboard traduz KPIs, avaliacoes e beneficios em leitura executiva, sem misturar
              execucao com acompanhamento de valor.
            </p>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/80 px-5 py-4 shadow-sm backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Recorte ativo
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">
              {completedProjects}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              projeto(s) concluidos analisados
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Filtros executivos</h2>
            <p className="mt-1 text-sm text-slate-500">
              Recorte por ownership, impacto, maturacao e periodo de validacao de valor.
            </p>
          </div>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => setFilters(createDefaultFilters())}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Limpar filtros
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FilterSelect
            label="Periodo"
            value={filters.period}
            onChange={(value) => setFilters((current) => ({ ...current, period: value as PeriodFilter }))}
            options={[
              { value: 'all', label: 'Todo o historico' },
              { value: '30d', label: 'Ultimos 30 dias' },
              { value: '90d', label: 'Ultimos 90 dias' },
              { value: '365d', label: 'Ultimos 12 meses' },
            ]}
          />
          <FilterSelect
            label="Equipe"
            value={filters.team}
            onChange={(value) => setFilters((current) => ({ ...current, team: value }))}
            options={filterOptions.teams.map((item) => ({ value: item, label: item }))}
          />
          <FilterSelect
            label="Produto"
            value={filters.product}
            onChange={(value) => setFilters((current) => ({ ...current, product: value }))}
            options={filterOptions.products.map((item) => ({ value: item, label: item }))}
          />
          <FilterSelect
            label="Cliente"
            value={filters.client}
            onChange={(value) => setFilters((current) => ({ ...current, client: value }))}
            options={filterOptions.clients.map((item) => ({ value: item, label: item }))}
          />
          <FilterSelect
            label="Responsavel"
            value={filters.responsible}
            onChange={(value) => setFilters((current) => ({ ...current, responsible: value }))}
            options={filterOptions.responsibles.map((item) => ({ value: item, label: item }))}
          />
          <FilterSelect
            label="Analista"
            value={filters.analyst}
            onChange={(value) => setFilters((current) => ({ ...current, analyst: value }))}
            options={filterOptions.analysts.map((item) => ({ value: item, label: item }))}
          />
          <FilterSelect
            label="Impacto"
            value={filters.impact}
            onChange={(value) => setFilters((current) => ({ ...current, impact: value }))}
            options={Object.entries(PROJECT_VALUE_IMPACT_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <FilterSelect
            label="Maturacao"
            value={filters.maturity}
            onChange={(value) => setFilters((current) => ({ ...current, maturity: value }))}
            options={Object.entries(PROJECT_VALUE_MATURITY_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-7">
        <MetricCard title="Projetos concluidos" value={String(completedProjects)} helper="Base elegivel para acompanhamento de valor." icon={<FolderKanban className="h-5 w-5 text-blue-600" />} />
        <MetricCard title="Avaliacao pendente" value={String(pendingEvaluationProjects)} helper="Projetos com follow-up ainda em aberto." icon={<CircleAlert className="h-5 w-5 text-amber-600" />} />
        <MetricCard title="Projetos avaliados" value={String(evaluatedProjects)} helper="Ja tiveram valor registrado formalmente." icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} />
        <MetricCard title="Alto impacto" value={String(highImpactProjects)} helper="Prioridade executiva para leitura de valor." icon={<Target className="h-5 w-5 text-rose-600" />} />
        <MetricCard title="Nota media" value={avgValueScore === null ? 'NA' : formatNumber(avgValueScore, 2)} helper="Percepcao media de valor dos avaliadores." icon={<Gauge className="h-5 w-5 text-violet-600" />} />
        <MetricCard title="KPIs preenchidos" value={String(filledKpis)} helper="Indicadores com valor real medido." icon={<ClipboardList className="h-5 w-5 text-cyan-600" />} />
        <MetricCard title="Projetos sem KPI" value={String(projectsWithoutKpi)} helper="Risco de baixa rastreabilidade de valor." icon={<AlertTriangle className="h-5 w-5 text-orange-600" />} />
      </section>

      {aggregateMetrics.length > 0 ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {aggregateMetrics.map((metric) => (
            <MetricCard
              key={metric.key}
              title={metric.title}
              value={metric.value}
              helper={metric.helper}
              icon={metric.icon}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-5 text-sm text-slate-500 shadow-sm">
          As agregacoes de valor avancado so aparecem quando os KPIs possuem baseline, valor real e unidade
          suficientemente consistentes para evitar numeros enganosos.
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-3">
        <ChartCard
          title="Status do ciclo de resultado"
          description="Distribuicao do portfolio entre aguardando avaliacao, em acompanhamento e ciclos encerrados."
        >
          <PieValueChart items={statusChart} />
        </ChartCard>

        <ChartCard
          title="Distribuicao de impacto"
          description="Mostra quanto do portfolio concluido esta concentrado em impacto baixo, medio ou alto."
        >
          <BarValueChart items={impactChart} color="#2563eb" />
        </ChartCard>

        <ChartCard
          title="Avaliacoes ao longo do tempo"
          description="Quantidade de checkpoints de valor registrados no periodo filtrado."
        >
          <TrendLineChart items={evaluationsTrend} color="#10b981" />
        </ChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <ChartCard
          title="Valor percebido por produto/area"
          description="Media da nota de valor apenas onde existe avaliacao concluida suficiente para leitura."
        >
          <HorizontalBarValueChart items={valueByProduct} color="#7c3aed" />
        </ChartCard>

        <RankingCard
          title="Projetos com maior impacto"
          description="Impacto declarado cruzado com nota media para destacar entregas mais relevantes."
        >
          {topImpactProjects.length > 0 ? (
            topImpactProjects.map((row) => (
              <RankingRow
                key={row.project.id}
                title={row.project.name}
                subtitle={`${row.project.client || 'Sem cliente'} • ${PROJECT_VALUE_IMPACT_LABELS[row.impactLevel]}`}
                value={typeof row.averageScore === 'number' ? `${formatNumber(row.averageScore, 2)}/5` : 'Sem nota'}
                onClick={() => openProjectDetail(row.project.id)}
              />
            ))
          ) : (
            <EmptyState message="Nenhum projeto com impacto suficiente para ranking no recorte atual." />
          )}
        </RankingCard>

        <RankingCard
          title="Areas com maior valor percebido"
          description="Produtos com melhor media de nota de valor entre os projetos avaliados."
        >
          {topProducts.length > 0 ? (
            topProducts.map((item) => (
              <RankingRow
                key={item.key}
                title={item.label}
                subtitle="Media de valor percebido"
                value={`${formatNumber(item.value, 2)}/5`}
              />
            ))
          ) : (
            <EmptyState message="Sem nota suficiente por produto no recorte atual." />
          )}
        </RankingCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <RankingCard
          title="Analistas com maior volume avaliado"
          description="Quantidade de projetos que ja receberam avaliacao concluida por analista."
        >
          {topAnalysts.length > 0 ? (
            topAnalysts.map((item) => (
              <RankingRow
                key={item.name}
                title={item.name}
                subtitle={`${item.evaluatedProjects} projeto(s) avaliados`}
                value={item.averageScore === null ? 'Sem nota' : `${formatNumber(item.averageScore, 2)}/5`}
              />
            ))
          ) : (
            <EmptyState message="Nenhuma avaliacao concluida suficiente para formar ranking de analistas." />
          )}
        </RankingCard>

        <RankingCard
          title="Projetos com melhor nota"
          description="Projetos com maior media de valor percebido entre avaliacoes concluidas."
        >
          {topScoredProjects.length > 0 ? (
            topScoredProjects.map((row) => (
              <RankingRow
                key={row.project.id}
                title={row.project.name}
                subtitle={row.project.product || 'Sem produto'}
                value={`${formatNumber(row.averageScore || 0, 2)}/5`}
                onClick={() => openProjectDetail(row.project.id)}
              />
            ))
          ) : (
            <EmptyState message="Nenhuma nota registrada no recorte atual." />
          )}
        </RankingCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AlertCard
          title="Projetos concluidos sem avaliacao"
          description="Entregas que ja sairam da execucao, mas ainda nao tiveram validacao formal de valor."
          items={alerts.withoutEvaluation.slice(0, 6)}
          emptyMessage="Nenhum projeto concluido sem avaliacao no recorte atual."
          onOpen={openProjectDetail}
          renderSubtitle={(row) => `${row.project.client || 'Sem cliente'} • ${formatDate(row.project.deliveredAt || row.project.completionDate)}`}
        />
        <AlertCard
          title="Avaliacoes vencidas"
          description="Pendencias cujo checkpoint ja deveria ter acontecido e merecem follow-up imediato."
          items={alerts.overdue.slice(0, 6)}
          emptyMessage="Nenhuma avaliacao vencida no recorte atual."
          onOpen={openProjectDetail}
          renderSubtitle={(row) => `Prevista para ${formatDate(row.nextEvaluation?.scheduledAt || row.project.nextResultEvaluationAt)}`}
        />
        <AlertCard
          title="Projetos sem KPI"
          description="Itens sem indicador estruturado para sustentar a narrativa de valor entregue."
          items={alerts.withoutKpi.slice(0, 6)}
          emptyMessage="Todos os projetos do recorte possuem pelo menos um KPI."
          onOpen={openProjectDetail}
          renderSubtitle={(row) => `${row.project.product || 'Sem produto'} • ${PROJECT_VALUE_IMPACT_LABELS[row.impactLevel]}`}
        />
        <AlertCard
          title="Sem beneficios realizados"
          description="Projetos com acompanhamento aberto, mas ainda sem beneficios realizados preenchidos."
          items={alerts.withoutRealizedBenefits.slice(0, 6)}
          emptyMessage="Todos os projetos do recorte possuem beneficios realizados registrados."
          onOpen={openProjectDetail}
          renderSubtitle={(row) => `${PROJECT_VALUE_MATURITY_LABELS[row.maturityType]} • ${PROJECT_VALUE_STATUS_LABELS[row.resultStatus]}`}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-950">Resumo executivo do portfolio de valor</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tabela condensada para leitura de lideranca, com foco em valor percebido e maturidade de medicao.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projeto</TableHead>
              <TableHead>Equipe</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Responsavel</TableHead>
              <TableHead>Analista</TableHead>
              <TableHead>Impacto</TableHead>
              <TableHead>Maturacao</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Nota media</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRows.slice(0, 12).map((row) => (
              <TableRow key={row.project.id}>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => openProjectDetail(row.project.id)}
                    className="text-left"
                  >
                    <p className="font-medium text-slate-900">{row.project.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.project.client || 'Sem cliente'}</p>
                  </button>
                </TableCell>
                <TableCell>{row.project.group || 'Nao informada'}</TableCell>
                <TableCell>{row.project.product || 'Nao informado'}</TableCell>
                <TableCell>{row.project.responsible || 'Nao informado'}</TableCell>
                <TableCell>{row.analystName}</TableCell>
                <TableCell>{PROJECT_VALUE_IMPACT_LABELS[row.impactLevel]}</TableCell>
                <TableCell>{PROJECT_VALUE_MATURITY_LABELS[row.maturityType]}</TableCell>
                <TableCell>{PROJECT_VALUE_STATUS_LABELS[row.resultStatus]}</TableCell>
                <TableCell>
                  {typeof row.averageScore === 'number' ? `${formatNumber(row.averageScore, 2)}/5` : 'Sem nota'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-5 text-sm leading-6 text-slate-600 shadow-sm">
        Preparado para evolucao futura com integracoes automaticas: a leitura agregada ja respeita a separacao entre
        execucao e valor, e pode receber novas fontes de medicao sem remodelar a tela principal.
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 px-3 py-2.5"
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricCard({
  title,
  value,
  helper,
  icon,
}: {
  title: string;
  value: string;
  helper: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-2xl bg-slate-50 p-2">{icon}</div>
      </div>
      <p className="mt-4 text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function PieValueChart({ items }: { items: Array<{ key: string; label: string; value: number }> }) {
  if (items.every((item) => item.value === 0)) {
    return <EmptyState message="Sem projetos suficientes para distribuir por status." minHeight="h-[300px]" />;
  }

  return (
    <ChartContainer
      config={Object.fromEntries(
        items.map((item, index) => [item.key, { label: item.label, color: PIE_COLORS[index % PIE_COLORS.length] }])
      )}
      className="h-[300px] w-full"
    >
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent />} />
        <Pie data={items} dataKey="value" nameKey="label" innerRadius={64} outerRadius={98}>
          {items.map((item, index) => (
            <Cell key={item.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

function BarValueChart({
  items,
  color,
}: {
  items: Array<{ key: string; label: string; value: number }>;
  color: string;
}) {
  if (items.every((item) => item.value === 0)) {
    return <EmptyState message="Sem dados suficientes para o grafico de distribuicao." minHeight="h-[300px]" />;
  }

  return (
    <ChartContainer config={{ value: { label: 'Projetos', color } }} className="h-[300px] w-full">
      <BarChart data={items} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
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

function TrendLineChart({
  items,
  color,
}: {
  items: Array<{ key: string; label: string; value: number }>;
  color: string;
}) {
  if (items.length === 0) {
    return <EmptyState message="Sem historico suficiente para tendencia no recorte atual." minHeight="h-[300px]" />;
  }

  return (
    <ChartContainer config={{ value: { label: 'Avaliacoes', color } }} className="h-[300px] w-full">
      <LineChart data={items} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={3} dot={{ r: 3 }} />
      </LineChart>
    </ChartContainer>
  );
}

function HorizontalBarValueChart({
  items,
  color,
}: {
  items: Array<{ key: string; label: string; value: number }>;
  color: string;
}) {
  if (items.length === 0) {
    return <EmptyState message="Sem massa critica para comparar produtos no recorte atual." minHeight="h-[300px]" />;
  }

  return (
    <ChartContainer config={{ value: { label: 'Nota media', color } }} className="h-[300px] w-full">
      <AreaChart data={items.map((item) => ({ ...item, fill: color }))} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="valueAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} />
        <YAxis tickLine={false} axisLine={false} domain={[0, 5]} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area type="monotone" dataKey="value" stroke={color} fill="url(#valueAreaFill)" strokeWidth={2.5} />
      </AreaChart>
    </ChartContainer>
  );
}

function RankingCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function RankingRow({
  title,
  subtitle,
  value,
  onClick,
}: {
  title: string;
  subtitle: string;
  value: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-950">{title}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{subtitle}</p>
      </div>
      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
        {value}
      </span>
    </div>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className="w-full text-left">
      {content}
    </button>
  ) : (
    content
  );
}

function AlertCard({
  title,
  description,
  items,
  emptyMessage,
  onOpen,
  renderSubtitle,
}: {
  title: string;
  description: string;
  items: DashboardRow[];
  emptyMessage: string;
  onOpen: (projectId: string) => void;
  renderSubtitle: (row: DashboardRow) => string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((row) => (
            <button
              key={row.project.id}
              type="button"
              onClick={() => onOpen(row.project.id)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left hover:bg-white"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-950">{row.project.name}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{renderSubtitle(row)}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
                Abrir
              </span>
            </button>
          ))
        ) : (
          <EmptyState message={emptyMessage} />
        )}
      </div>
    </div>
  );
}

function EmptyState({
  message,
  minHeight = 'min-h-[120px]',
}: {
  message: string;
  minHeight?: string;
}) {
  return (
    <div className={`flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500 ${minHeight}`}>
      {message}
    </div>
  );
}
