import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Eye,
  FolderKanban,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import { useAdmin } from '../context/AdminContext';
import { useProjectDetailNavigation } from '../hooks/useProjectDetailNavigation';
import { useFeedback } from '../context/FeedbackContext';
import { canAccessGovernance, canUserPerform } from '../utils/permissions';
import type { Project, ProjectResultStatus } from '../types';
import {
  getProjectRequester,
  isProjectInCompletedPhase,
  getProjectResultStatus,
  getProjectResultEvaluations,
} from '../utils/projectSelectors';
import {
  updateProjectResultEvaluation,
  updateProjectResultStatus,
} from '../services/projectValueService';
import {
  getProjectValueSnapshot,
  PROJECT_VALUE_IMPACT_LABELS,
  PROJECT_VALUE_IMPACT_STYLES,
  PROJECT_VALUE_MATURITY_LABELS,
  PROJECT_VALUE_STATUS_LABELS,
  PROJECT_VALUE_STATUS_STYLES,
} from '../services/projectValueMetadata';

type ResultsViewMode = 'list' | 'kanban';

type ResultsFilters = {
  team: string;
  responsible: string;
  analyst: string;
  product: string;
  client: string;
  impact: string;
  maturity: string;
  resultStatus: string;
  startDate: string;
  endDate: string;
  overdueOnly: boolean;
  noKpiOnly: boolean;
  noEvaluationOnly: boolean;
};

const DEFAULT_FILTERS: ResultsFilters = {
  team: '',
  responsible: '',
  analyst: '',
  product: '',
  client: '',
  impact: '',
  maturity: '',
  resultStatus: '',
  startDate: '',
  endDate: '',
  overdueOnly: false,
  noKpiOnly: false,
  noEvaluationOnly: false,
};

type ResultRow = {
  project: Project;
  resultStatus: ProjectResultStatus;
  impactLevel: Project['impactLevel'];
  maturityType: Project['resultMaturityType'];
  nextEvaluationAt?: string;
  latestEvaluationAt?: string;
  latestScore?: number;
  evaluationCount: number;
  analystName: string;
  hasKpi: boolean;
  hasEvaluation: boolean;
  overdue: boolean;
  valuePending: boolean;
};

type QuickPanelMode = 'summary' | 'evaluation' | 'schedule' | 'kpis';

function formatDate(value?: string) {
  if (!value) return 'Nao agendada';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('pt-BR');
}

function dateInputToIso(value: string) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function isoToDateInput(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isWithinPeriod(value: string | undefined, startDate: string, endDate: string) {
  if (!startDate && !endDate) return true;
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return false;
  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`).getTime();
    if (timestamp < start) return false;
  }
  if (endDate) {
    const end = new Date(`${endDate}T23:59:59`).getTime();
    if (timestamp > end) return false;
  }
  return true;
}

export function ProjectResults() {
  const { projects, updateProject } = useProjects();
  const { currentUser, users } = useAdmin();
  const { openProjectDetail } = useProjectDetailNavigation();
  const { showFeedback } = useFeedback();
  const [filters, setFilters] = useState<ResultsFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<ResultsViewMode>('list');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [quickPanelMode, setQuickPanelMode] = useState<QuickPanelMode>('summary');
  const [resultStatusDraft, setResultStatusDraft] = useState<ProjectResultStatus>('aguardando_avaliacao');
  const [nextEvaluationDraft, setNextEvaluationDraft] = useState('');
  const [evaluationDraft, setEvaluationDraft] = useState({
    scheduledAt: '',
    completedAt: '',
    status: 'pendente' as const,
    valueScore: '',
    summary: '',
    notes: '',
  });

  const canViewModule = canAccessGovernance(currentUser);
  const canEditResults = canUserPerform(currentUser, 'project:edit');

  const sourceProjects = useMemo(
    () =>
      projects.filter((project) => {
        if (!isProjectInCompletedPhase(project)) return false;
        if (currentUser?.role === 'user') {
          const teams = new Set([currentUser.team, ...(currentUser.teams || [])].filter(Boolean));
          return teams.has(project.group) || (project.teams || []).some((team) => teams.has(team));
        }
        return true;
      }),
    [currentUser, projects]
  );

  const rows = useMemo<ResultRow[]>(() => {
    return sourceProjects.map((project) => {
      const snapshot = getProjectValueSnapshot(project, users);
      const nextEvaluationAt = snapshot.nextEvaluation?.scheduledAt || project.nextResultEvaluationAt;
      const overdue = snapshot.alerts.some((alert) => alert.kind === 'overdue');

      return {
        project,
        resultStatus: snapshot.resultStatus,
        impactLevel: snapshot.impactLevel,
        maturityType: snapshot.maturityType,
        nextEvaluationAt,
        latestEvaluationAt: snapshot.latestCompletedEvaluation?.completedAt,
        latestScore: snapshot.latestScore,
        evaluationCount: snapshot.evaluationCount,
        analystName: snapshot.ownerName,
        hasKpi: snapshot.hasKpi,
        hasEvaluation: snapshot.evaluationCount > 0,
        overdue,
        valuePending:
          snapshot.resultStatus === 'nao_iniciado' ||
          snapshot.resultStatus === 'aguardando_avaliacao' ||
          snapshot.resultStatus === 'em_avaliacao',
      };
    });
  }, [sourceProjects, users]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (filters.team && row.project.group !== filters.team) return false;
        if (filters.responsible && row.project.responsible !== filters.responsible) return false;
        if (filters.analyst && row.analystName !== filters.analyst) return false;
        if (filters.product && row.project.product !== filters.product) return false;
        if (filters.client && row.project.client !== filters.client) return false;
        if (filters.impact && row.impactLevel !== filters.impact) return false;
        if (filters.maturity && row.maturityType !== filters.maturity) return false;
        if (filters.resultStatus && row.resultStatus !== filters.resultStatus) return false;
        if (
          !isWithinPeriod(
            row.nextEvaluationAt || row.latestEvaluationAt,
            filters.startDate,
            filters.endDate
          )
        ) {
          return false;
        }
        if (filters.overdueOnly && !row.overdue) return false;
        if (filters.noKpiOnly && row.hasKpi) return false;
        if (filters.noEvaluationOnly && row.hasEvaluation) return false;
        return true;
      }),
    [filters, rows]
  );

  const selectedProject = useMemo(
    () => sourceProjects.find((project) => project.id === selectedProjectId) || null,
    [selectedProjectId, sourceProjects]
  );

  useEffect(() => {
    if (!selectedProject && filteredRows.length > 0) {
      setSelectedProjectId(filteredRows[0].project.id);
    }
  }, [filteredRows, selectedProject]);

  useEffect(() => {
    if (!selectedProject) return;
    setResultStatusDraft(getProjectResultStatus(selectedProject));
    setNextEvaluationDraft(isoToDateInput(selectedProject.nextResultEvaluationAt));
    const nextPending = getProjectResultEvaluations(selectedProject).find(
      (evaluation) => evaluation.status === 'pendente' || evaluation.status === 'em_avaliacao'
    );
    setEvaluationDraft({
      scheduledAt: isoToDateInput(nextPending?.scheduledAt || selectedProject.nextResultEvaluationAt),
      completedAt: isoToDateInput(nextPending?.completedAt),
      status: (nextPending?.status || 'pendente') as 'pendente' | 'em_avaliacao' | 'concluida' | 'cancelada',
      valueScore:
        typeof nextPending?.valueScore === 'number' ? String(nextPending.valueScore) : '',
      summary: nextPending?.summary || '',
      notes: nextPending?.notes || '',
    });
  }, [selectedProject]);

  const filterOptions = useMemo(
    () => ({
      teams: Array.from(new Set(rows.map((row) => row.project.group).filter(Boolean))).sort(),
      responsibles: Array.from(new Set(rows.map((row) => row.project.responsible).filter(Boolean))).sort(),
      analysts: Array.from(new Set(rows.map((row) => row.analystName).filter(Boolean))).sort(),
      products: Array.from(new Set(rows.map((row) => row.project.product).filter(Boolean))).sort(),
      clients: Array.from(new Set(rows.map((row) => row.project.client).filter(Boolean))).sort(),
    }),
    [rows]
  );

  const highlightedCounts = useMemo(
    () => ({
      overdue: filteredRows.filter((row) => row.overdue).length,
      highImpact: filteredRows.filter((row) => row.impactLevel === 'alto').length,
      noEvaluation: filteredRows.filter((row) => !row.hasEvaluation).length,
      pendingValue: filteredRows.filter((row) => row.valuePending).length,
    }),
    [filteredRows]
  );

  const groupedKanban = useMemo(
    () =>
      (['aguardando_avaliacao', 'em_avaliacao', 'avaliado', 'encerrado'] as ProjectResultStatus[]).map(
        (status) => ({
          status,
          items: filteredRows.filter((row) => row.resultStatus === status),
        })
      ),
    [filteredRows]
  );

  const hasActiveFilters = Object.entries(filters).some(([key, value]) =>
    typeof value === 'boolean' ? value : key ? Boolean(value) : false
  );

  const handleSaveResultStatus = () => {
    if (!selectedProject || !canEditResults) return;
    const response = updateProjectResultStatus(selectedProject, {
      resultStatus: resultStatusDraft,
      nextResultEvaluationAt: dateInputToIso(nextEvaluationDraft),
      allowManualOverride: true,
    });

    if (!response.success || !response.data) {
      showFeedback({
        tone: 'danger',
        title: 'Nao foi possivel atualizar o status',
        message: response.errors[0] || 'Revise os dados e tente novamente.',
      });
      return;
    }

    updateProject(selectedProject.id, response.data);
    showFeedback({
      tone: 'success',
      title: 'Status atualizado',
      message: 'Ciclo de resultado atualizado com sucesso.',
    });
  };

  const handleSavePendingEvaluation = () => {
    if (!selectedProject || !canEditResults) return;
    const pendingEvaluation = getProjectResultEvaluations(selectedProject).find(
      (evaluation) => evaluation.status === 'pendente' || evaluation.status === 'em_avaliacao'
    );
    if (!pendingEvaluation) {
      showFeedback({
        tone: 'danger',
        title: 'Nenhuma avaliacao pendente',
        message: 'Selecione um projeto com avaliacao pendente ou registre uma nova pelo card do projeto.',
      });
      return;
    }

    const response = updateProjectResultEvaluation(selectedProject, pendingEvaluation.id, {
      scheduledAt: dateInputToIso(evaluationDraft.scheduledAt) || pendingEvaluation.scheduledAt,
      completedAt: dateInputToIso(evaluationDraft.completedAt),
      status: evaluationDraft.status,
      valueScore: evaluationDraft.valueScore ? Number(evaluationDraft.valueScore) : undefined,
      summary: evaluationDraft.summary,
      notes: evaluationDraft.notes,
      responsibleId: pendingEvaluation.responsibleId,
    });

    if (!response.success || !response.data) {
      showFeedback({
        tone: 'danger',
        title: 'Nao foi possivel salvar a avaliacao',
        message: response.errors[0] || 'Revise os dados e tente novamente.',
      });
      return;
    }

    updateProject(selectedProject.id, response.data);
    showFeedback({
      tone: 'success',
      title: 'Avaliacao atualizada',
      message: 'Pendencia de resultado registrada com sucesso.',
    });
  };

  if (!canViewModule) {
    return (
      <div className="page-shell flex h-full items-center justify-center">
        <div className="section-card max-w-xl border-red-200 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Acesso restrito</h1>
          <p className="mt-2 text-slate-600">
            Seu perfil atual nao possui permissao para acessar o acompanhamento de resultados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-8 py-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-emerald-50 p-3">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Acompanhamento de resultados</h1>
            <p className="mt-1 text-sm text-slate-500">
              Fila inteligente de follow-up para valor gerado, separada do Kanban principal de execucao.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Projeto concluido no Labs pode continuar aqui em acompanhamento sem voltar para o fluxo operacional.
            </p>
          </div>
        </div>

        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Lista
          </button>
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`rounded-xl px-4 py-2 text-sm font-medium ${
              viewMode === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kanban
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SpotlightCard
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Avaliacoes vencidas"
          value={String(highlightedCounts.overdue)}
          helper="Pendencias com data ja ultrapassada"
          tone="danger"
          onClick={() => setFilters((current) => ({ ...current, overdueOnly: true }))}
        />
        <SpotlightCard
          icon={<Target className="h-4 w-4" />}
          title="Alto impacto"
          value={String(highlightedCounts.highImpact)}
          helper="Projetos que merecem follow-up prioritario"
          tone="warning"
        />
        <SpotlightCard
          icon={<ClipboardList className="h-4 w-4" />}
          title="Sem avaliacao"
          value={String(highlightedCounts.noEvaluation)}
          helper="Projetos concluidos sem checkpoint registrado"
          tone="default"
          onClick={() => setFilters((current) => ({ ...current, noEvaluationOnly: true }))}
        />
        <SpotlightCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          title="Valor nao validado"
          value={String(highlightedCounts.pendingValue)}
          helper="Status ainda aberto no ciclo de resultado"
          tone="success"
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Filtros de acompanhamento</h2>
            <p className="mt-1 text-sm text-slate-500">
              Recorte por ownership, maturacao, pendencias e consistencia de medicao.
            </p>
          </div>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Limpar filtros
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <FilterSelect label="Equipe" value={filters.team} onChange={(value) => setFilters((c) => ({ ...c, team: value }))} options={filterOptions.teams} />
          <FilterSelect label="Responsavel" value={filters.responsible} onChange={(value) => setFilters((c) => ({ ...c, responsible: value }))} options={filterOptions.responsibles} />
          <FilterSelect label="Analista" value={filters.analyst} onChange={(value) => setFilters((c) => ({ ...c, analyst: value }))} options={filterOptions.analysts} />
          <FilterSelect label="Produto" value={filters.product} onChange={(value) => setFilters((c) => ({ ...c, product: value }))} options={filterOptions.products} />
          <FilterSelect label="Cliente" value={filters.client} onChange={(value) => setFilters((c) => ({ ...c, client: value }))} options={filterOptions.clients} />
          <FilterSelect label="Impacto" value={filters.impact} onChange={(value) => setFilters((c) => ({ ...c, impact: value }))} options={Object.keys(PROJECT_VALUE_IMPACT_LABELS)} labels={PROJECT_VALUE_IMPACT_LABELS} />
          <FilterSelect label="Maturacao" value={filters.maturity} onChange={(value) => setFilters((c) => ({ ...c, maturity: value }))} options={Object.keys(PROJECT_VALUE_MATURITY_LABELS)} labels={PROJECT_VALUE_MATURITY_LABELS} />
          <FilterSelect label="Status de resultado" value={filters.resultStatus} onChange={(value) => setFilters((c) => ({ ...c, resultStatus: value }))} options={Object.keys(PROJECT_VALUE_STATUS_LABELS)} labels={PROJECT_VALUE_STATUS_LABELS} />
          <FilterInput label="Periodo de avaliacao de" type="date" value={filters.startDate} onChange={(value) => setFilters((c) => ({ ...c, startDate: value }))} />
          <FilterInput label="Ate" type="date" value={filters.endDate} onChange={(value) => setFilters((c) => ({ ...c, endDate: value }))} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <ToggleChip label="Avaliacao atrasada" active={filters.overdueOnly} onClick={() => setFilters((c) => ({ ...c, overdueOnly: !c.overdueOnly }))} />
          <ToggleChip label="Sem KPI" active={filters.noKpiOnly} onClick={() => setFilters((c) => ({ ...c, noKpiOnly: !c.noKpiOnly }))} />
          <ToggleChip label="Sem avaliacao registrada" active={filters.noEvaluationOnly} onClick={() => setFilters((c) => ({ ...c, noEvaluationOnly: !c.noEvaluationOnly }))} />
          <ToggleChip label="Filtrar pendencias" active={filters.overdueOnly || filters.noEvaluationOnly} onClick={() => setFilters((c) => ({ ...c, overdueOnly: true, noEvaluationOnly: true }))} />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0">
          {viewMode === 'list' ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-base font-semibold text-slate-950">Fila principal de acompanhamento</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {filteredRows.length} projeto(s) no recorte atual, com leitura rapida de follow-up.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                      <th className="px-4 py-3">Projeto</th>
                      <th className="px-4 py-3">Cliente / Produto</th>
                      <th className="px-4 py-3">Responsavel</th>
                      <th className="px-4 py-3">Impacto / Maturacao</th>
                      <th className="px-4 py-3">Resultado</th>
                      <th className="px-4 py-3">Proxima avaliacao</th>
                      <th className="px-4 py-3">Ultima avaliacao</th>
                      <th className="px-4 py-3">Nota</th>
                      <th className="px-4 py-3">Avaliacoes</th>
                      <th className="px-4 py-3">Acoes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredRows.map((row) => (
                      <tr
                        key={row.project.id}
                        className={`transition-colors hover:bg-slate-50 ${
                          selectedProjectId === row.project.id ? 'bg-slate-50' : ''
                        } ${row.overdue ? 'bg-rose-50/40' : ''}`}
                      >
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProjectId(row.project.id);
                              setQuickPanelMode('summary');
                            }}
                            className="text-left"
                          >
                            <p className="font-semibold text-slate-950">{row.project.name}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {row.overdue ? <FlagChip label="Vencido" tone="danger" /> : null}
                              {!row.hasEvaluation ? <FlagChip label="Sem avaliacao" tone="default" /> : null}
                              {row.valuePending ? <FlagChip label="Valor nao validado" tone="warning" /> : null}
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          <p>{row.project.client || 'Nao informado'}</p>
                          <p className="mt-1 text-xs text-slate-500">{row.project.product || 'Sem produto'}</p>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          <p>{row.project.responsible || 'Nao informado'}</p>
                          <p className="mt-1 text-xs text-slate-500">Analista: {row.analystName}</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2">
                            <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-medium ${PROJECT_VALUE_IMPACT_STYLES[row.impactLevel || 'medio']}`}>
                              {PROJECT_VALUE_IMPACT_LABELS[row.impactLevel || 'medio']}
                            </span>
                            <span className="text-xs text-slate-500">{PROJECT_VALUE_MATURITY_LABELS[row.maturityType || 'medio_prazo']}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${PROJECT_VALUE_STATUS_STYLES[row.resultStatus]}`}>
                            {PROJECT_VALUE_STATUS_LABELS[row.resultStatus]}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-600">{formatDate(row.nextEvaluationAt)}</td>
                        <td className="px-4 py-4 text-slate-600">{formatDate(row.latestEvaluationAt)}</td>
                        <td className="px-4 py-4 font-medium text-slate-900">
                          {typeof row.latestScore === 'number' ? `${row.latestScore}/5` : 'Sem nota'}
                        </td>
                        <td className="px-4 py-4 text-slate-600">{row.evaluationCount}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <ActionButton label="Abrir" onClick={() => openProjectDetail(row.project.id)} />
                            <ActionButton
                              label="Avaliacao"
                              onClick={() => {
                                setSelectedProjectId(row.project.id);
                                setQuickPanelMode('evaluation');
                              }}
                            />
                            <ActionButton
                              label="Status"
                              onClick={() => {
                                setSelectedProjectId(row.project.id);
                                setQuickPanelMode('schedule');
                              }}
                            />
                            <ActionButton
                              label="KPIs"
                              onClick={() => {
                                setSelectedProjectId(row.project.id);
                                setQuickPanelMode('kpis');
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-4">
              {groupedKanban.map((column) => (
                <section key={column.status} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">{PROJECT_VALUE_STATUS_LABELS[column.status]}</h3>
                      <p className="mt-1 text-xs text-slate-500">{column.items.length} projeto(s)</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${PROJECT_VALUE_STATUS_STYLES[column.status]}`}>
                      {column.items.length}
                    </span>
                  </div>
                  <div className="mt-4 space-y-3">
                    {column.items.length > 0 ? (
                      column.items.map((row) => (
                        <button
                          key={row.project.id}
                          type="button"
                          onClick={() => {
                            setSelectedProjectId(row.project.id);
                            setQuickPanelMode('summary');
                          }}
                          className={`w-full rounded-2xl border p-4 text-left transition-colors hover:bg-slate-50 ${
                            row.overdue ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <p className="truncate text-sm font-semibold text-slate-950">{row.project.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{row.project.client || 'Sem cliente'}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${PROJECT_VALUE_IMPACT_STYLES[row.impactLevel || 'medio']}`}>
                              {PROJECT_VALUE_IMPACT_LABELS[row.impactLevel || 'medio']}
                            </span>
                            {row.overdue ? <FlagChip label="Vencido" tone="danger" /> : null}
                          </div>
                          <p className="mt-3 text-xs text-slate-500">Proxima: {formatDate(row.nextEvaluationAt)}</p>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
                        Nenhum projeto neste status.
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {selectedProject ? (
            <div className="space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${PROJECT_VALUE_STATUS_STYLES[getProjectValueSnapshot(selectedProject, users).resultStatus]}`}>
                    {PROJECT_VALUE_STATUS_LABELS[getProjectValueSnapshot(selectedProject, users).resultStatus]}
                  </span>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${PROJECT_VALUE_IMPACT_STYLES[getProjectValueSnapshot(selectedProject, users).impactLevel]}`}>
                    {PROJECT_VALUE_IMPACT_LABELS[getProjectValueSnapshot(selectedProject, users).impactLevel]}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-slate-950">{selectedProject.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedProject.client || 'Sem cliente'} • {selectedProject.product || 'Sem produto'}
                </p>
              </div>

              <div className="grid gap-2">
                <QuickNavButton label="Resumo" active={quickPanelMode === 'summary'} onClick={() => setQuickPanelMode('summary')} />
                <QuickNavButton label="Registrar avaliacao" active={quickPanelMode === 'evaluation'} onClick={() => setQuickPanelMode('evaluation')} />
                <QuickNavButton label="Status e proxima avaliacao" active={quickPanelMode === 'schedule'} onClick={() => setQuickPanelMode('schedule')} />
                <QuickNavButton label="Visualizar KPIs" active={quickPanelMode === 'kpis'} onClick={() => setQuickPanelMode('kpis')} />
              </div>

              {quickPanelMode === 'summary' ? (
                <div className="space-y-4">
                  <QuickMetric label="Responsavel" value={selectedProject.responsible || 'Nao informado'} />
                  <QuickMetric label="Solicitante" value={getProjectRequester(selectedProject) || 'Nao informado'} />
                  <QuickMetric label="Maturacao" value={PROJECT_VALUE_MATURITY_LABELS[selectedProject.resultMaturityType || 'medio_prazo']} />
                  <QuickMetric label="Proxima avaliacao" value={formatDate(selectedProject.nextResultEvaluationAt)} />
                  <QuickMetric
                    label="Resumo do valor"
                    value={selectedProject.valueRealizationSummary || 'Sem sintese registrada'}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openProjectDetail(selectedProject.id)}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      <Eye className="h-4 w-4" />
                      Abrir projeto
                    </button>
                  </div>
                </div>
              ) : null}

              {quickPanelMode === 'evaluation' ? (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">
                    Atualize a pendencia atual diretamente daqui para manter o follow-up assincrono em dia.
                  </p>
                  <Field label="Data prevista">
                    <input type="date" value={evaluationDraft.scheduledAt} onChange={(event) => setEvaluationDraft((current) => ({ ...current, scheduledAt: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5" />
                  </Field>
                  <Field label="Data realizada">
                    <input type="date" value={evaluationDraft.completedAt} onChange={(event) => setEvaluationDraft((current) => ({ ...current, completedAt: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5" />
                  </Field>
                  <Field label="Status">
                    <select value={evaluationDraft.status} onChange={(event) => setEvaluationDraft((current) => ({ ...current, status: event.target.value as typeof current.status }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5">
                      <option value="pendente">Pendente</option>
                      <option value="em_avaliacao">Em avaliacao</option>
                      <option value="concluida">Concluida</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </Field>
                  <Field label="Nota mais recente">
                    <input type="number" min={1} max={5} value={evaluationDraft.valueScore} onChange={(event) => setEvaluationDraft((current) => ({ ...current, valueScore: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5" />
                  </Field>
                  <Field label="Resumo">
                    <textarea rows={4} value={evaluationDraft.summary} onChange={(event) => setEvaluationDraft((current) => ({ ...current, summary: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-3" />
                  </Field>
                  <Field label="Observacoes">
                    <textarea rows={3} value={evaluationDraft.notes} onChange={(event) => setEvaluationDraft((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-3 py-3" />
                  </Field>
                  <button
                    type="button"
                    onClick={handleSavePendingEvaluation}
                    disabled={!canEditResults}
                    className="w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Registrar avaliacao
                  </button>
                </div>
              ) : null}

              {quickPanelMode === 'schedule' ? (
                <div className="space-y-4">
                  <Field label="Status do resultado">
                    <select value={resultStatusDraft} onChange={(event) => setResultStatusDraft(event.target.value as ProjectResultStatus)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5">
                      {Object.entries(PROJECT_VALUE_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Proxima avaliacao">
                    <input type="date" value={nextEvaluationDraft} onChange={(event) => setNextEvaluationDraft(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-3 py-2.5" />
                  </Field>
                  <button
                    type="button"
                    onClick={handleSaveResultStatus}
                    disabled={!canEditResults}
                    className="w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Atualizar status
                  </button>
                </div>
              ) : null}

              {quickPanelMode === 'kpis' ? (
                <div className="space-y-3">
                  {(selectedProject.projectKpis || []).length > 0 ? (
                    (selectedProject.projectKpis || []).map((kpi) => (
                      <div key={kpi.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <p className="text-sm font-semibold text-slate-950">{kpi.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{kpi.unit || 'Sem unidade'} • {kpi.measurementSource}</p>
                        <p className="mt-3 text-sm text-slate-600">
                          Baseline: {typeof kpi.baselineValue === 'number' ? kpi.baselineValue : 'NA'} • Esperado: {typeof kpi.expectedValue === 'number' ? kpi.expectedValue : 'NA'} • Real: {typeof kpi.actualValue === 'number' ? kpi.actualValue : 'NA'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      Este projeto ainda nao possui KPI cadastrado.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => openProjectDetail(selectedProject.id)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Ver KPIs no detalhe do projeto
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              Nenhum projeto selecionado para acompanhamento rapido.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: Record<string, string>;
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
          <option key={option} value={option}>
            {labels?.[option] || option}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterInput({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 px-3 py-2.5"
      />
    </label>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

function SpotlightCard({
  icon,
  title,
  value,
  helper,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  helper: string;
  tone: 'default' | 'danger' | 'warning' | 'success';
  onClick?: () => void;
}) {
  const className =
    tone === 'danger'
      ? 'bg-rose-50 border-rose-200 text-rose-900'
      : tone === 'warning'
        ? 'bg-orange-50 border-orange-200 text-orange-900'
        : tone === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : 'bg-white border-slate-200 text-slate-900';

  const content = (
    <div className={`rounded-3xl border p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-2xl bg-white/80 p-2">{icon}</div>
        <ChevronRight className="h-4 w-4 opacity-60" />
      </div>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs opacity-75">{helper}</p>
    </div>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className="text-left">
      {content}
    </button>
  ) : (
    content
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
      {label}
    </button>
  );
}

function FlagChip({ label, tone }: { label: string; tone: 'danger' | 'warning' | 'default' }) {
  const className =
    tone === 'danger'
      ? 'bg-rose-100 text-rose-700'
      : tone === 'warning'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-slate-100 text-slate-700';

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${className}`}>{label}</span>;
}

function QuickNavButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-3 py-2 text-left text-sm font-medium ${
        active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

function QuickMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-900">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
