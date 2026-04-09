import { useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  ArrowDownUp,
  BarChart3,
  Download,
  HandCoins,
  Landmark,
  PieChart as PieChartIcon,
  Search,
  Timer,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { useAdmin } from '../context/AdminContext';
import { useProjects } from '../context/ProjectContext';
import { SearchableMultiSelect } from '../components/filters/SearchableMultiSelect';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/chart';
import { KanbanPageHeader } from '../components/kanban/KanbanLayout';
import { getCostsOverviewEndpointResponse } from '../services/costsApi';
import { canViewCosts } from '../utils/permissions';
import { CostsOverviewProjectItem, ProjectCostFilters } from '../types';
import { getProjectCurrentGovernancePhase, getProjectGovernancePhaseId } from '../utils/projectSelectors';

type ViewMode = 'dashboard' | 'list';
type SortKey =
  | 'name'
  | 'team'
  | 'responsible'
  | 'total_hours'
  | 'cost_real'
  | 'cost_internal'
  | 'cost_external'
  | 'economy'
  | 'progress'
  | 'status';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const hourFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const PIE_COLORS = ['#0f766e', '#f97316'];
const TABLE_ROW_HEIGHT = 60;
const TABLE_VIEWPORT_HEIGHT = 540;

const downloadBlob = (content: BlobPart, fileName: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

const toStatusLabel = (row: CostsOverviewProjectItem, projectStatusLabelMap: Map<string, string>) =>
  projectStatusLabelMap.get(row.project_id) || row.status;

const buildCsv = (rows: CostsOverviewProjectItem[], projectStatusLabelMap: Map<string, string>) => {
  const header = [
    'Projeto',
    'Equipe',
    'Responsável',
    'Horas',
    'Custo real',
    'Custo interno padrão',
    'Custo terceirizado',
    'Economia',
    'Progresso (%)',
    'Status',
  ];

  const data = rows.map((row) => [
    row.name,
    row.team,
    row.responsible,
    String(row.total_hours),
    String(row.cost_real),
    String(row.cost_internal),
    String(row.cost_external),
    String(row.economy),
    String(row.progress),
    toStatusLabel(row, projectStatusLabelMap),
  ]);

  return [header, ...data]
    .map((line) => line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';'))
    .join('\n');
};

const buildExcelHtml = (rows: CostsOverviewProjectItem[], projectStatusLabelMap: Map<string, string>) => `
<html>
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <table border="1">
      <thead>
        <tr>
          <th>Projeto</th>
          <th>Equipe</th>
          <th>Responsável</th>
          <th>Horas</th>
          <th>Custo real</th>
          <th>Custo interno padrão</th>
          <th>Custo terceirizado</th>
          <th>Economia</th>
          <th>Progresso (%)</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td>${row.name}</td>
                <td>${row.team}</td>
                <td>${row.responsible}</td>
                <td>${row.total_hours}</td>
                <td>${row.cost_real}</td>
                <td>${row.cost_internal}</td>
                <td>${row.cost_external}</td>
                <td>${row.economy}</td>
                <td>${row.progress}</td>
                <td>${toStatusLabel(row, projectStatusLabelMap)}</td>
              </tr>
            `
          )
          .join('')}
      </tbody>
    </table>
  </body>
</html>
`;

export function GovernanceCosts() {
  const navigate = useNavigate();
  const { currentUser, users, teams, products, costSettings } = useAdmin();
  const { projects } = useProjects();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [filters, setFilters] = useState<ProjectCostFilters>({
    startDate: '',
    endDate: '',
    projectTeamNames: [],
    responsibleNames: [],
    productNames: [],
    projectIds: [],
    query: '',
  });
  const [sortKey, setSortKey] = useState<SortKey>('cost_real');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const deferredFilters = useDeferredValue(filters);

  const hasAccess = canViewCosts(currentUser);

  const teamOptions = useMemo(
    () =>
      teams
        .map((team) => ({ value: team.name, label: team.name }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [teams]
  );
  const productOptions = useMemo(
    () =>
      products
        .map((product) => ({ value: product.name, label: product.name }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [products]
  );
  const responsibleOptions = useMemo(
    () =>
      Array.from(new Set(users.map((user) => user.name)))
        .map((name) => ({ value: name, label: name }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [users]
  );
  const projectOptions = useMemo(
    () =>
      projects
        .map((project) => ({ value: project.id, label: project.name }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    [projects]
  );

  const projectStatusLabelMap = useMemo(
    () =>
      new Map(
        projects.map((project) => [
          project.id,
          getProjectCurrentGovernancePhase(project)?.name || getProjectGovernancePhaseId(project),
        ])
      ),
    [projects]
  );

  const overviewResponse = useMemo(
    () =>
      getCostsOverviewEndpointResponse({
        currentUser,
        projects,
        users,
        settings: costSettings,
        filters: deferredFilters,
      }),
    [currentUser, projects, users, costSettings, deferredFilters]
  );

  const sortedRows = useMemo(() => {
    if (overviewResponse.status !== 200) return [];

    const rows = [...overviewResponse.data.projects];
    rows.sort((left, right) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return (leftValue - rightValue) * direction;
      }

      return String(leftValue).localeCompare(String(rightValue), 'pt-BR') * direction;
    });

    return rows;
  }, [overviewResponse, sortKey, sortDirection]);

  const topExpensive = useMemo(() => sortedByMetric(sortedRows, 'cost_real').slice(0, 5), [sortedRows]);
  const topEconomy = useMemo(() => sortedByMetric(sortedRows, 'economy').slice(0, 5), [sortedRows]);
  const lowEfficiency = useMemo(
    () => sortedByMetric(sortedRows, 'efficiency_score').slice(0, 5),
    [sortedRows]
  );

  const chartCostByProject = useMemo(
    () =>
      sortedByMetric(sortedRows, 'cost_real')
        .slice(0, 8)
        .map((item) => ({
          name: truncate(item.name, 18),
          total: item.cost_real,
        })),
    [sortedRows]
  );
  const chartEconomyByProject = useMemo(
    () =>
      sortedByMetric(sortedRows, 'economy')
        .slice(0, 8)
        .map((item) => ({
          name: truncate(item.name, 18),
          total: item.economy,
        })),
    [sortedRows]
  );

  if (!hasAccess || overviewResponse.status === 403) {
    return (
      <div className="page-shell flex h-full items-center justify-center">
        <div className="section-card max-w-xl border-red-200 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Acesso restrito</h1>
          <p className="mt-2 text-slate-600">
            Apenas perfis `admin`, `pmo` e `gestor` podem acessar a central de custos.
          </p>
        </div>
      </div>
    );
  }

  const overview = overviewResponse.data;
  const mostExpensiveProject = topExpensive[0];
  const mostEconomicProject = topEconomy[0];
  const highestRiskProject = lowEfficiency[0];

  return (
    <div className="page-shell space-y-6">
      <KanbanPageHeader
        eyebrow="Governança"
        title="Custos da Operação"
        description="Leitura executiva para custo total e visão operacional detalhada, com o mesmo recorte global em dashboard e lista."
      />

      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.16),_transparent_30%),linear-gradient(135deg,#ffffff_0%,#f8fafc_48%,#eefbf7_100%)] p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
              Custos dinâmicos sem snapshot
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Enxergue custo, terceirização e economia em segundos
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              O recorte abaixo afeta igualmente o dashboard executivo e o relatório operacional.
            </p>
          </div>

          <div className="inline-flex rounded-2xl border border-white/80 bg-white/85 p-1 shadow-sm">
            <ViewToggleButton
              active={viewMode === 'dashboard'}
              icon={<BarChart3 className="h-4 w-4" />}
              label="Dashboard"
              onClick={() => setViewMode('dashboard')}
            />
            <ViewToggleButton
              active={viewMode === 'list'}
              icon={<ArrowDownUp className="h-4 w-4" />}
              label="Lista"
              onClick={() => setViewMode('list')}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <FilterField label="Início">
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </FilterField>
          <FilterField label="Fim">
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </FilterField>
          <FilterField label="Equipe">
            <SearchableMultiSelect
              value={filters.projectTeamNames || []}
              onChange={(value) => setFilters((current) => ({ ...current, projectTeamNames: value }))}
              options={teamOptions}
              placeholder="Todas as equipes"
            />
          </FilterField>
          <FilterField label="Produto">
            <SearchableMultiSelect
              value={filters.productNames || []}
              onChange={(value) => setFilters((current) => ({ ...current, productNames: value }))}
              options={productOptions}
              placeholder="Todos os produtos"
            />
          </FilterField>
          <FilterField label="Responsável">
            <SearchableMultiSelect
              value={filters.responsibleNames || []}
              onChange={(value) => setFilters((current) => ({ ...current, responsibleNames: value }))}
              options={responsibleOptions}
              placeholder="Todos os responsáveis"
            />
          </FilterField>
          <FilterField label="Projetos">
            <SearchableMultiSelect
              value={filters.projectIds || []}
              onChange={(value) => setFilters((current) => ({ ...current, projectIds: value }))}
              options={projectOptions}
              placeholder="Todos os projetos"
            />
          </FilterField>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filters.query || ''}
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder="Buscar projeto por nome"
              className="w-full rounded-2xl border border-slate-200/80 bg-white py-3 pl-11 pr-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </label>

          <button
            type="button"
            onClick={() =>
              downloadBlob(
                `\uFEFF${buildCsv(sortedRows, projectStatusLabelMap)}`,
                'custos-operacao.csv',
                'text/csv;charset=utf-8;'
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>

          <button
            type="button"
            onClick={() =>
              downloadBlob(
                buildExcelHtml(sortedRows, projectStatusLabelMap),
                'custos-operacao.xls',
                'application/vnd.ms-excel;charset=utf-8;'
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            <Download className="h-4 w-4" />
            Exportar Excel
          </button>
        </div>
      </section>

      {viewMode === 'dashboard' ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard title="Horas totais" value={`${hourFormatter.format(overview.total_hours)}h`} icon={<Timer className="h-5 w-5" />} />
            <MetricCard title="Custo real total" value={currencyFormatter.format(overview.total_cost_real)} icon={<Landmark className="h-5 w-5" />} tone="danger" />
            <MetricCard title="Custo interno padrão" value={currencyFormatter.format(overview.total_cost_internal)} icon={<BarChart3 className="h-5 w-5" />} />
            <MetricCard title="Custo terceirizado" value={currencyFormatter.format(overview.total_cost_external)} icon={<PieChartIcon className="h-5 w-5" />} />
            <MetricCard title="Economia total" value={currencyFormatter.format(overview.total_economy)} icon={<HandCoins className="h-5 w-5" />} tone="success" />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <HighlightCard
              title="Projeto mais caro"
              subtitle={mostExpensiveProject?.name || 'Sem dados'}
              detail={mostExpensiveProject ? currencyFormatter.format(mostExpensiveProject.cost_real) : '—'}
              tone="danger"
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <HighlightCard
              title="Maior economia"
              subtitle={mostEconomicProject?.name || 'Sem dados'}
              detail={mostEconomicProject ? currencyFormatter.format(mostEconomicProject.economy) : '—'}
              tone="success"
              icon={<TrendingDown className="h-5 w-5" />}
            />
            <HighlightCard
              title="Maior risco financeiro"
              subtitle={highestRiskProject?.name || 'Sem dados'}
              detail={
                highestRiskProject
                  ? `${currencyFormatter.format(highestRiskProject.cost_real)} com ${highestRiskProject.progress}%`
                  : '—'
              }
              tone="warning"
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ChartCard
              title="Custo por projeto"
              description="Top projetos por custo real."
              content={
                <ChartContainer config={{ total: { label: 'Custo real', color: '#0f766e' } }} className="h-[320px] w-full">
                  <BarChart data={chartCostByProject}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={56} />
                    <YAxis tickFormatter={(value) => compactCurrency(value)} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => currencyFormatter.format(Number(value))} />} />
                    <Bar dataKey="total" radius={[10, 10, 0, 0]} fill="var(--color-total)" />
                  </BarChart>
                </ChartContainer>
              }
            />

            <ChartCard
              title="Economia por projeto"
              description="Quem mais gera economia no recorte atual."
              content={
                <ChartContainer config={{ total: { label: 'Economia', color: '#16a34a' } }} className="h-[320px] w-full">
                  <BarChart data={chartEconomyByProject} layout="vertical">
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" tickFormatter={(value) => compactCurrency(value)} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={120} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => currencyFormatter.format(Number(value))} />} />
                    <Bar dataKey="total" radius={[0, 10, 10, 0]} fill="var(--color-total)" />
                  </BarChart>
                </ChartContainer>
              }
            />

            <ChartCard
              title="Distribuição"
              description="Comparativo agregado entre custo interno padrão e terceirizado."
              content={
                <ChartContainer
                  config={{
                    internal: { label: 'Interno', color: PIE_COLORS[0] },
                    external: { label: 'Terceirizado', color: PIE_COLORS[1] },
                  }}
                  className="h-[320px] w-full"
                >
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Interno', value: overview.total_cost_internal },
                        { name: 'Terceirizado', value: overview.total_cost_external },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={72}
                      outerRadius={108}
                      paddingAngle={3}
                    >
                      {PIE_COLORS.map((color) => (
                        <Cell key={color} fill={color} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={(value) => currencyFormatter.format(Number(value))} />}
                    />
                  </PieChart>
                </ChartContainer>
              }
            />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <RankingCard
              title="Projetos mais caros"
              items={topExpensive}
              valueFormatter={(item) => currencyFormatter.format(item.cost_real)}
              tone="danger"
            />
            <RankingCard
              title="Projetos com maior economia"
              items={topEconomy}
              valueFormatter={(item) => currencyFormatter.format(item.economy)}
              tone="success"
            />
            <RankingCard
              title="Projetos com menor eficiência"
              items={lowEfficiency}
              valueFormatter={(item) => `${currencyFormatter.format(item.cost_real)} • ${item.progress}%`}
              tone="warning"
            />
          </section>
        </>
      ) : (
        <OperationalListView
          rows={sortedRows}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={(nextKey) => {
            if (sortKey === nextKey) {
              setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
              return;
            }
            setSortKey(nextKey);
            setSortDirection('desc');
          }}
          onRowClick={(projectId) => navigate(`/project/${projectId}`)}
          totals={overview}
          projectStatusLabelMap={projectStatusLabelMap}
        />
      )}
    </div>
  );
}

function OperationalListView(props: {
  rows: CostsOverviewProjectItem[];
  sortKey: SortKey;
  sortDirection: 'asc' | 'desc';
  onSortChange: (key: SortKey) => void;
  onRowClick: (projectId: string) => void;
  totals: {
    total_hours: number;
    total_cost_real: number;
    total_economy: number;
  };
  projectStatusLabelMap: Map<string, string>;
}) {
  const { rows, sortKey, sortDirection, onSortChange, onRowClick, totals, projectStatusLabelMap } = props;
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / TABLE_ROW_HEIGHT) - 5);
    const visibleCount = Math.ceil(TABLE_VIEWPORT_HEIGHT / TABLE_ROW_HEIGHT) + 10;
    const endIndex = Math.min(rows.length, startIndex + visibleCount);
    return {
      startIndex,
      endIndex,
      topSpacerHeight: startIndex * TABLE_ROW_HEIGHT,
      bottomSpacerHeight: Math.max(0, (rows.length - endIndex) * TABLE_ROW_HEIGHT),
    };
  }, [rows.length, scrollTop]);

  const visibleRows = rows.slice(visibleRange.startIndex, visibleRange.endIndex);

  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h3 className="text-lg font-semibold text-slate-950">Relatório detalhado</h3>
        <p className="mt-1 text-sm text-slate-600">
          Visão operacional exportável com ordenação por qualquer coluna e abertura direta do projeto.
        </p>
      </div>

      <div className="grid grid-cols-[2.2fr_1.1fr_1.2fr_0.8fr_1fr_1fr_1fr_1fr_0.8fr_1fr] gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        <HeaderCell label="Projeto" active={sortKey === 'name'} direction={sortDirection} onClick={() => onSortChange('name')} />
        <HeaderCell label="Equipe" active={sortKey === 'team'} direction={sortDirection} onClick={() => onSortChange('team')} />
        <HeaderCell label="Responsável" active={sortKey === 'responsible'} direction={sortDirection} onClick={() => onSortChange('responsible')} />
        <HeaderCell label="Horas" active={sortKey === 'total_hours'} direction={sortDirection} onClick={() => onSortChange('total_hours')} />
        <HeaderCell label="Custo real" active={sortKey === 'cost_real'} direction={sortDirection} onClick={() => onSortChange('cost_real')} />
        <HeaderCell label="Custo interno" active={sortKey === 'cost_internal'} direction={sortDirection} onClick={() => onSortChange('cost_internal')} />
        <HeaderCell label="Custo terceirizado" active={sortKey === 'cost_external'} direction={sortDirection} onClick={() => onSortChange('cost_external')} />
        <HeaderCell label="Economia" active={sortKey === 'economy'} direction={sortDirection} onClick={() => onSortChange('economy')} />
        <HeaderCell label="Progresso" active={sortKey === 'progress'} direction={sortDirection} onClick={() => onSortChange('progress')} />
        <HeaderCell label="Status" active={sortKey === 'status'} direction={sortDirection} onClick={() => onSortChange('status')} />
      </div>

      <div
        className="overflow-y-auto"
        style={{ height: TABLE_VIEWPORT_HEIGHT }}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <div style={{ height: visibleRange.topSpacerHeight }} />
        {visibleRows.map((row) => (
          <button
            key={row.project_id}
            type="button"
            onClick={() => onRowClick(row.project_id)}
            className="grid w-full grid-cols-[2.2fr_1.1fr_1.2fr_0.8fr_1fr_1fr_1fr_1fr_0.8fr_1fr] gap-3 border-b border-slate-100 px-6 py-4 text-left transition-colors hover:bg-slate-50"
            style={{ minHeight: TABLE_ROW_HEIGHT }}
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-950">{row.name}</p>
              <p className="truncate text-xs text-slate-500">{row.product || 'Sem produto'}</p>
            </div>
            <CellText>{row.team}</CellText>
            <CellText>{row.responsible}</CellText>
            <CellText>{hourFormatter.format(row.total_hours)}h</CellText>
            <CellText tone={row.cost_real >= row.cost_internal ? 'danger' : 'default'}>
              {currencyFormatter.format(row.cost_real)}
            </CellText>
            <CellText>{currencyFormatter.format(row.cost_internal)}</CellText>
            <CellText>{currencyFormatter.format(row.cost_external)}</CellText>
            <CellText tone={row.economy >= 0 ? 'success' : 'danger'}>
              {currencyFormatter.format(row.economy)}
            </CellText>
            <CellText>{row.progress}%</CellText>
            <CellText>{toStatusLabel(row, projectStatusLabelMap)}</CellText>
          </button>
        ))}
        <div style={{ height: visibleRange.bottomSpacerHeight }} />
      </div>

      <div className="grid grid-cols-3 gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4">
        <FooterTotal label="Total horas" value={`${hourFormatter.format(totals.total_hours)}h`} />
        <FooterTotal label="Total custo real" value={currencyFormatter.format(totals.total_cost_real)} tone="danger" />
        <FooterTotal label="Total economia" value={currencyFormatter.format(totals.total_economy)} tone="success" />
      </div>
    </section>
  );
}

function MetricCard(props: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone?: 'default' | 'success' | 'danger';
}) {
  const toneClasses =
    props.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : props.tone === 'danger'
        ? 'border-rose-200 bg-rose-50 text-rose-700'
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

function HighlightCard(props: {
  title: string;
  subtitle: string;
  detail: string;
  icon: React.ReactNode;
  tone: 'success' | 'danger' | 'warning';
}) {
  const toneClasses =
    props.tone === 'success'
      ? 'border-emerald-200 bg-emerald-50'
      : props.tone === 'danger'
        ? 'border-rose-200 bg-rose-50'
        : 'border-amber-200 bg-amber-50';

  return (
    <div className={`rounded-[28px] border p-5 shadow-sm ${toneClasses}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700">{props.title}</span>
        {props.icon}
      </div>
      <p className="mt-4 text-xl font-semibold text-slate-950">{props.subtitle}</p>
      <p className="mt-1 text-sm text-slate-600">{props.detail}</p>
    </div>
  );
}

function RankingCard(props: {
  title: string;
  items: CostsOverviewProjectItem[];
  valueFormatter: (item: CostsOverviewProjectItem) => string;
  tone: 'success' | 'danger' | 'warning';
}) {
  const bulletColor =
    props.tone === 'success' ? 'bg-emerald-500' : props.tone === 'danger' ? 'bg-rose-500' : 'bg-amber-500';

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-950">{props.title}</h3>
      <div className="mt-4 space-y-3">
        {props.items.length > 0 ? (
          props.items.map((item, index) => (
            <div key={`${props.title}-${item.project_id}`} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`h-2.5 w-2.5 rounded-full ${bulletColor}`} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {index + 1}. {item.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {item.team} • {item.responsible}
                  </p>
                </div>
              </div>
              <p className="shrink-0 text-sm font-semibold text-slate-950">{props.valueFormatter(item)}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
            Nenhum projeto no recorte atual.
          </div>
        )}
      </div>
    </div>
  );
}

function ChartCard(props: { title: string; description: string; content: React.ReactNode }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-950">{props.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{props.description}</p>
      <div className="mt-4">{props.content}</div>
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

function ViewToggleButton(props: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
        props.active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {props.icon}
      {props.label}
    </button>
  );
}

function HeaderCell(props: {
  label: string;
  active: boolean;
  direction: 'asc' | 'desc';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`flex items-center gap-1 text-left ${props.active ? 'text-slate-900' : 'text-slate-500'}`}
    >
      <span>{props.label}</span>
      <ArrowDownUp className={`h-3.5 w-3.5 ${props.active && props.direction === 'desc' ? 'text-slate-900' : ''}`} />
    </button>
  );
}

function CellText(props: {
  children: React.ReactNode;
  tone?: 'default' | 'success' | 'danger';
}) {
  const toneClass =
    props.tone === 'success'
      ? 'text-emerald-700'
      : props.tone === 'danger'
        ? 'text-rose-700'
        : 'text-slate-700';

  return <div className={`truncate text-sm ${toneClass}`}>{props.children}</div>;
}

function FooterTotal(props: { label: string; value: string; tone?: 'default' | 'success' | 'danger' }) {
  const toneClass =
    props.tone === 'success'
      ? 'text-emerald-700'
      : props.tone === 'danger'
        ? 'text-rose-700'
        : 'text-slate-950';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{props.label}</p>
      <p className={`mt-2 text-lg font-semibold ${toneClass}`}>{props.value}</p>
    </div>
  );
}

function sortedByMetric<T extends keyof CostsOverviewProjectItem>(
  rows: CostsOverviewProjectItem[],
  key: T
) {
  return [...rows].sort(
    (left, right) => Number(right[key]) - Number(left[key])
  );
}

function truncate(value: string, limit: number) {
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function compactCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
