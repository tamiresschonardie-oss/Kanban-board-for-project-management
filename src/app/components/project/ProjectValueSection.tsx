import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Plus,
  Sparkles,
  Target,
} from 'lucide-react';
import type {
  Project,
  ProjectKpiType,
  ProjectKpiMeasurementSource,
  ProjectResultEvaluationStatus,
  ProjectResultMaturityType,
  ProjectResultStatus,
} from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useAdmin } from '../../context/AdminContext';
import {
  calculateNextResultEvaluation,
  createProjectKpi,
  registerProjectResultEvaluation,
  syncProjectBenefits,
  updateProjectKpi,
  updateProjectResultEvaluation,
  updateProjectResultStatus,
} from '../../services/projectValueService';
import {
  isProjectInCompletedPhase,
} from '../../utils/projectSelectors';
import {
  getProjectValueSnapshot,
  PROJECT_VALUE_IMPACT_LABELS,
  PROJECT_VALUE_IMPACT_STYLES,
  PROJECT_VALUE_MATURITY_LABELS,
  PROJECT_VALUE_SCHEDULE_MODE_LABELS,
  PROJECT_VALUE_STATUS_LABELS,
  PROJECT_VALUE_STATUS_STYLES,
} from '../../services/projectValueMetadata';

interface ProjectValueSectionProps {
  project: Project;
  canEdit: boolean;
}

type KpiFormState = {
  name: string;
  type: ProjectKpiType;
  description: string;
  unit: string;
  baselineValue: string;
  expectedValue: string;
  actualValue: string;
  measurementSource: ProjectKpiMeasurementSource;
  measuredAt: string;
  observations: string;
};

type EvaluationFormState = {
  scheduledAt: string;
  completedAt: string;
  status: ProjectResultEvaluationStatus;
  responsibleId: string;
  valueScore: string;
  summary: string;
  notes: string;
};

const KPI_TYPE_LABELS: Record<ProjectKpiType, string> = {
  tempo: 'Tempo',
  financeiro: 'Financeiro',
  produtividade: 'Produtividade',
  qualidade: 'Qualidade',
  uso: 'Uso',
  satisfacao: 'Satisfacao',
  outro: 'Outro',
};

const MEASUREMENT_SOURCE_LABELS: Record<ProjectKpiMeasurementSource, string> = {
  manual: 'Manual',
  automatica: 'Automatica',
  integracao: 'Integracao',
};

const EVALUATION_STATUS_LABELS: Record<ProjectResultEvaluationStatus, string> = {
  pendente: 'Pendente',
  em_avaliacao: 'Em avaliacao',
  concluida: 'Concluida',
  cancelada: 'Cancelada',
};

const createEmptyKpiForm = (): KpiFormState => ({
  name: '',
  type: 'outro',
  description: '',
  unit: '',
  baselineValue: '',
  expectedValue: '',
  actualValue: '',
  measurementSource: 'manual',
  measuredAt: '',
  observations: '',
});

const createEmptyEvaluationForm = (project: Project): EvaluationFormState => ({
  scheduledAt: isoToDateInput(
    getProjectValueSnapshot(project).nextEvaluation?.scheduledAt ||
      project.nextResultEvaluationAt ||
      calculateNextResultEvaluation({
        deliveredAt: project.deliveredAt || project.completionDate,
        maturityType: project.resultMaturityType,
        customOffsetsDays: project.resultCustomEvaluationOffsetsDays,
      })
  ),
  completedAt: '',
  status: 'pendente',
  responsibleId: project.resultOwnerId || '',
  valueScore: '',
  summary: '',
  notes: '',
});

const parseOptionalNumber = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const formatMetricValue = (value?: number, unit?: string) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'Nao informado';
  return unit ? `${value} ${unit}` : String(value);
};

const formatDate = (value?: string) => {
  if (!value) return 'Nao agendada';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('pt-BR');
};

const isoToDateInput = (value?: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const dateInputToIso = (value: string) => {
  if (!value) return undefined;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

export function ProjectValueSection({ project, canEdit }: ProjectValueSectionProps) {
  const { updateProject } = useProjects();
  const { users } = useAdmin();
  const { showFeedback } = useFeedback();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCycleEditorOpen, setIsCycleEditorOpen] = useState(false);
  const [isKpiFormOpen, setIsKpiFormOpen] = useState(false);
  const [editingKpiId, setEditingKpiId] = useState<string | null>(null);
  const [editingEvaluationId, setEditingEvaluationId] = useState<string | null>(null);
  const [benefitsDraft, setBenefitsDraft] = useState({
    expected: (project.expectedBenefits || []).join('\n'),
    realized: (project.realizedBenefits || []).join('\n'),
    summary: project.valueRealizationSummary || '',
  });
  const [cycleDraft, setCycleDraft] = useState({
    resultStatus: project.resultStatus || 'nao_iniciado',
    resultMaturityType: project.resultMaturityType || 'medio_prazo',
    resultScheduleMode:
      project.resultScheduleMode ||
      ((project.resultCustomEvaluationOffsetsDays || []).length > 0 ? 'custom' : 'default'),
    resultOwnerId: project.resultOwnerId || '',
    resultCustomEvaluationOffsetsDays: (project.resultCustomEvaluationOffsetsDays || []).join(', '),
    impactLevel: project.impactLevel || 'medio',
    nextResultEvaluationAt: isoToDateInput(project.nextResultEvaluationAt),
    valueRealizationSummary: project.valueRealizationSummary || '',
  });
  const [kpiForm, setKpiForm] = useState<KpiFormState>(createEmptyKpiForm());
  const [evaluationForm, setEvaluationForm] = useState<EvaluationFormState>(
    createEmptyEvaluationForm(project)
  );

  const snapshot = useMemo(() => getProjectValueSnapshot(project, users), [project, users]);
  const resultStatus = snapshot.resultStatus;
  const impactLevel = snapshot.impactLevel;
  const evaluations = snapshot.evaluations;
  const latestCompletedEvaluation = snapshot.latestCompletedEvaluation;
  const nextPendingEvaluation = snapshot.nextEvaluation;
  const isExecutionCompleted = isProjectInCompletedPhase(project);

  useEffect(() => {
    setBenefitsDraft({
      expected: (project.expectedBenefits || []).join('\n'),
      realized: (project.realizedBenefits || []).join('\n'),
      summary: project.valueRealizationSummary || '',
    });
    setCycleDraft({
      resultStatus: project.resultStatus || 'nao_iniciado',
      resultMaturityType: project.resultMaturityType || 'medio_prazo',
      resultScheduleMode:
        project.resultScheduleMode ||
        ((project.resultCustomEvaluationOffsetsDays || []).length > 0 ? 'custom' : 'default'),
      resultOwnerId: project.resultOwnerId || '',
      resultCustomEvaluationOffsetsDays: (project.resultCustomEvaluationOffsetsDays || []).join(', '),
      impactLevel: project.impactLevel || 'medio',
      nextResultEvaluationAt: isoToDateInput(project.nextResultEvaluationAt),
      valueRealizationSummary: project.valueRealizationSummary || '',
    });
    if (!editingEvaluationId) {
      setEvaluationForm(createEmptyEvaluationForm(project));
    }
  }, [editingEvaluationId, project]);

  const persistProject = (nextProject: Project, successTitle: string, successMessage: string) => {
    updateProject(project.id, nextProject);
    showFeedback({
      tone: 'success',
      title: successTitle,
      message: successMessage,
    });
  };

  const handleSaveCycle = () => {
    const customOffsets = cycleDraft.resultCustomEvaluationOffsetsDays
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value >= 0);
    const response = updateProjectResultStatus(project, {
      resultStatus: cycleDraft.resultStatus,
      resultMaturityType: cycleDraft.resultMaturityType,
      resultScheduleMode: cycleDraft.resultScheduleMode,
      resultOwnerId: cycleDraft.resultOwnerId || undefined,
      resultCustomEvaluationOffsetsDays:
        cycleDraft.resultScheduleMode === 'custom' ? customOffsets : [],
      impactLevel: cycleDraft.impactLevel,
      nextResultEvaluationAt: dateInputToIso(cycleDraft.nextResultEvaluationAt),
      valueRealizationSummary: cycleDraft.valueRealizationSummary,
      allowManualOverride: true,
    });

    if (!response.success || !response.data) {
      showFeedback({
        tone: 'danger',
        title: 'Nao foi possivel atualizar o ciclo',
        message: response.errors[0] || 'Revise os dados e tente novamente.',
      });
      return;
    }

    persistProject(response.data, 'Ciclo de resultado atualizado', 'Resumo e status de valor salvos.');
    setIsCycleEditorOpen(false);
  };

  const handleSaveBenefits = () => {
    const nextProject = syncProjectBenefits({
      project: {
        ...project,
        valueRealizationSummary: benefitsDraft.summary.trim() || undefined,
      },
      expectedBenefits: splitLines(benefitsDraft.expected),
      realizedBenefits: splitLines(benefitsDraft.realized),
    });

    persistProject(
      {
        ...nextProject,
        valueRealizationSummary: benefitsDraft.summary.trim() || undefined,
      },
      'Beneficios atualizados',
      'Comparativo entre beneficios esperados e realizados foi salvo.'
    );
  };

  const handleSubmitKpi = () => {
    const payload = {
      name: kpiForm.name,
      type: kpiForm.type,
      description: kpiForm.description,
      unit: kpiForm.unit,
      baselineValue: parseOptionalNumber(kpiForm.baselineValue),
      expectedValue: parseOptionalNumber(kpiForm.expectedValue),
      actualValue: parseOptionalNumber(kpiForm.actualValue),
      measurementSource: kpiForm.measurementSource,
      measuredAt: dateInputToIso(kpiForm.measuredAt),
      observations: kpiForm.observations,
    };

    if (
      [payload.baselineValue, payload.expectedValue, payload.actualValue].some(
        (value) => typeof value === 'number' && Number.isNaN(value)
      )
    ) {
      showFeedback({
        tone: 'danger',
        title: 'Valor numerico invalido',
        message: 'Revise baseline, esperado e real antes de salvar o KPI.',
      });
      return;
    }

    const response = editingKpiId
      ? updateProjectKpi(project, editingKpiId, payload)
      : createProjectKpi(project, payload);

    if (!response.success || !response.data) {
      showFeedback({
        tone: 'danger',
        title: 'Nao foi possivel salvar o KPI',
        message: response.errors[0] || 'Revise os dados e tente novamente.',
      });
      return;
    }

    persistProject(
      response.data,
      editingKpiId ? 'KPI atualizado' : 'KPI criado',
      editingKpiId ? 'Indicador ajustado com sucesso.' : 'Novo indicador cadastrado no projeto.'
    );
    setEditingKpiId(null);
    setKpiForm(createEmptyKpiForm());
    setIsKpiFormOpen(false);
  };

  const handleEditKpi = (kpiId: string) => {
    const kpi = (project.projectKpis || []).find((item) => item.id === kpiId);
    if (!kpi) return;

    setEditingKpiId(kpiId);
    setKpiForm({
      name: kpi.name,
      type: kpi.type,
      description: kpi.description || '',
      unit: kpi.unit || '',
      baselineValue: typeof kpi.baselineValue === 'number' ? String(kpi.baselineValue) : '',
      expectedValue: typeof kpi.expectedValue === 'number' ? String(kpi.expectedValue) : '',
      actualValue: typeof kpi.actualValue === 'number' ? String(kpi.actualValue) : '',
      measurementSource: kpi.measurementSource,
      measuredAt: isoToDateInput(kpi.measuredAt),
      observations: kpi.observations || '',
    });
    setIsKpiFormOpen(true);
  };

  const handleSubmitEvaluation = () => {
    const valueScore = evaluationForm.valueScore.trim()
      ? Number(evaluationForm.valueScore)
      : undefined;

    const payload = {
      scheduledAt:
        dateInputToIso(evaluationForm.scheduledAt) || dateInputToIso(cycleDraft.nextResultEvaluationAt) || '',
      completedAt: dateInputToIso(evaluationForm.completedAt),
      status: evaluationForm.status,
      responsibleId: evaluationForm.responsibleId || undefined,
      valueScore,
      summary: evaluationForm.summary,
      notes: evaluationForm.notes,
    };

    const response = editingEvaluationId
      ? updateProjectResultEvaluation(project, editingEvaluationId, payload)
      : registerProjectResultEvaluation(project, payload);

    if (!response.success || !response.data) {
      showFeedback({
        tone: 'danger',
        title: 'Nao foi possivel salvar a avaliacao',
        message: response.errors[0] || 'Revise os campos e tente novamente.',
      });
      return;
    }

    persistProject(
      response.data,
      editingEvaluationId ? 'Avaliacao atualizada' : 'Avaliacao registrada',
      editingEvaluationId
        ? 'Checkpoint de valor ajustado com sucesso.'
        : 'Nova avaliacao adicionada ao acompanhamento do projeto.'
    );
    setEditingEvaluationId(null);
    setEvaluationForm(createEmptyEvaluationForm(response.data));
  };

  const handleEditEvaluation = (evaluationId: string) => {
    const evaluation = (project.resultEvaluations || []).find((item) => item.id === evaluationId);
    if (!evaluation) return;

    setEditingEvaluationId(evaluationId);
    setEvaluationForm({
      scheduledAt: isoToDateInput(evaluation.scheduledAt),
      completedAt: isoToDateInput(evaluation.completedAt),
      status: evaluation.status,
      responsibleId: evaluation.responsibleId || '',
      valueScore: typeof evaluation.valueScore === 'number' ? String(evaluation.valueScore) : '',
      summary: evaluation.summary || '',
      notes: evaluation.notes || '',
    });
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsExpanded((previous) => !previous)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              Pos-entrega
            </span>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                PROJECT_VALUE_STATUS_STYLES[resultStatus]
              }`}
            >
              {PROJECT_VALUE_STATUS_LABELS[resultStatus]}
            </span>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                PROJECT_VALUE_IMPACT_STYLES[impactLevel]
              }`}
            >
              Impacto {PROJECT_VALUE_IMPACT_LABELS[impactLevel]}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-slate-950">Resultados e valor gerado</h3>
          <p className="mt-1 text-sm text-slate-500">
            Camada separada da execucao para acompanhar beneficios e percepcao de valor apos a entrega.
          </p>
        </div>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {isExpanded ? (
        <div className="space-y-6 border-t border-slate-200 px-6 py-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Resumo do ciclo de resultado
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {isExecutionCompleted
                      ? 'O projeto ja encerrou a execucao e segue em acompanhamento de valor.'
                      : 'A execucao ainda esta ativa. O ciclo de valor pode ser preparado sem poluir o Kanban.'}
                  </p>
                </div>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => setIsCycleEditorOpen((previous) => !previous)}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {isCycleEditorOpen ? 'Fechar edicao' : 'Editar ciclo'}
                  </button>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <ValueMetric label="Status do resultado" value={PROJECT_VALUE_STATUS_LABELS[resultStatus]} />
                <ValueMetric
                  label="Maturacao"
                  value={PROJECT_VALUE_MATURITY_LABELS[project.resultMaturityType || 'medio_prazo']}
                />
                <ValueMetric label="Impacto" value={PROJECT_VALUE_IMPACT_LABELS[impactLevel]} />
                <ValueMetric label="Responsavel pelo acompanhamento" value={snapshot.ownerName} />
                <ValueMetric label="Agenda de checkpoints" value={PROJECT_VALUE_SCHEDULE_MODE_LABELS[snapshot.scheduleMode]} />
                <ValueMetric
                  label="Proxima avaliacao"
                  value={nextPendingEvaluation ? formatDate(nextPendingEvaluation.scheduledAt) : formatDate(project.nextResultEvaluationAt)}
                />
                <ValueMetric
                  label="Ultima avaliacao"
                  value={latestCompletedEvaluation ? formatDate(latestCompletedEvaluation.completedAt) : 'Ainda nao registrada'}
                />
                <ValueMetric
                  label="Nota mais recente"
                  value={
                    typeof latestCompletedEvaluation?.valueScore === 'number'
                      ? `${latestCompletedEvaluation.valueScore}/5`
                      : 'Sem nota'
                  }
                />
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Resumo textual do valor
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {project.valueRealizationSummary ||
                    latestCompletedEvaluation?.summary ||
                    'Ainda nao ha uma sintese registrada sobre o valor realizado.'}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {snapshot.alerts.map((alert) => (
                  <span
                    key={alert.kind}
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                      alert.tone === 'danger'
                        ? 'bg-rose-100 text-rose-700'
                        : alert.tone === 'warning'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                    }`}
                    title={alert.description}
                  >
                    {alert.label}
                  </span>
                ))}
              </div>

              {isCycleEditorOpen ? (
                <div className="mt-4 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
                  <Field label="Status do resultado">
                    <select
                      value={cycleDraft.resultStatus}
                      onChange={(event) =>
                        setCycleDraft((current) => ({ ...current, resultStatus: event.target.value as ProjectResultStatus }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    >
                      {Object.entries(PROJECT_VALUE_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Maturacao">
                    <select
                      value={cycleDraft.resultMaturityType}
                      onChange={(event) =>
                        setCycleDraft((current) => ({
                          ...current,
                          resultMaturityType: event.target.value as ProjectResultMaturityType,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    >
                      {Object.entries(PROJECT_VALUE_MATURITY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Modo da agenda de checkpoints">
                    <select
                      value={cycleDraft.resultScheduleMode}
                      onChange={(event) =>
                        setCycleDraft((current) => ({
                          ...current,
                          resultScheduleMode: event.target.value as 'default' | 'custom',
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    >
                      {Object.entries(PROJECT_VALUE_SCHEDULE_MODE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Impacto">
                    <select
                      value={cycleDraft.impactLevel}
                      onChange={(event) =>
                        setCycleDraft((current) => ({
                          ...current,
                          impactLevel: event.target.value as Project['impactLevel'],
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    >
                      {Object.entries(PROJECT_VALUE_IMPACT_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Responsavel por avaliar">
                    <select
                      value={cycleDraft.resultOwnerId}
                      onChange={(event) =>
                        setCycleDraft((current) => ({ ...current, resultOwnerId: event.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    >
                      <option value="">Usar padrao do projeto</option>
                      {users
                        .filter((user) => user.status === 'active')
                        .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                  {cycleDraft.resultScheduleMode === 'custom' ? (
                    <Field label="Checkpoints personalizados (dias, separados por virgula)">
                      <input
                        value={cycleDraft.resultCustomEvaluationOffsetsDays}
                        onChange={(event) =>
                          setCycleDraft((current) => ({
                            ...current,
                            resultCustomEvaluationOffsetsDays: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                        placeholder="0, 30, 90"
                      />
                    </Field>
                  ) : null}
                  <Field label="Proxima avaliacao sugerida">
                    <input
                      type="date"
                      value={cycleDraft.nextResultEvaluationAt}
                      onChange={(event) =>
                        setCycleDraft((current) => ({ ...current, nextResultEvaluationAt: event.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    />
                  </Field>
                  <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {snapshot.explanatoryState}
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Resumo do valor realizado">
                      <textarea
                        rows={4}
                        value={cycleDraft.valueRealizationSummary}
                        onChange={(event) =>
                          setCycleDraft((current) => ({
                            ...current,
                            valueRealizationSummary: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-3 py-3"
                        placeholder="Sintese do beneficio percebido pelo negocio."
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveCycle}
                      className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Salvar ciclo
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Leitura rapida
              </p>
              <div className="mt-4 space-y-3">
                <MiniStatusCard
                  icon={<CalendarClock className="h-4 w-4" />}
                  title="Pendencias"
                  description={
                    nextPendingEvaluation
                      ? `Avaliacao prevista para ${formatDate(nextPendingEvaluation.scheduledAt)}.`
                      : 'Nenhuma avaliacao pendente no momento.'
                  }
                />
                <MiniStatusCard
                  icon={<BarChart3 className="h-4 w-4" />}
                  title="KPIs"
                  description={`${project.projectKpis?.length || 0} indicador(es) estruturado(s) para leitura de resultado.`}
                />
                <MiniStatusCard
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  title="Beneficios realizados"
                  description={`${project.realizedBenefits?.length || 0} beneficio(s) registrado(s) como efetivamente percebidos.`}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <PanelCard
              icon={<Target className="h-4 w-4 text-slate-400" />}
              title="KPIs do projeto"
              action={
                canEdit ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingKpiId(null);
                      setKpiForm(createEmptyKpiForm());
                      setIsKpiFormOpen((previous) => !previous);
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <Plus className="h-4 w-4" />
                    {isKpiFormOpen ? 'Fechar' : 'Novo KPI'}
                  </button>
                ) : null
              }
            >
              <div className="space-y-3">
                {(project.projectKpis || []).length > 0 ? (
                  (project.projectKpis || []).map((kpi) => (
                    <div key={kpi.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-950">{kpi.name}</p>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                              {KPI_TYPE_LABELS[kpi.type]}
                            </span>
                          </div>
                          {kpi.description ? (
                            <p className="mt-1 text-sm text-slate-500">{kpi.description}</p>
                          ) : null}
                        </div>
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => handleEditKpi(kpi.id)}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Editar
                          </button>
                        ) : null}
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <ValueMetric label="Baseline" value={formatMetricValue(kpi.baselineValue, kpi.unit)} />
                        <ValueMetric label="Esperado" value={formatMetricValue(kpi.expectedValue, kpi.unit)} />
                        <ValueMetric label="Real" value={formatMetricValue(kpi.actualValue, kpi.unit)} />
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <ValueMetric
                          label="Fonte de medicao"
                          value={MEASUREMENT_SOURCE_LABELS[kpi.measurementSource]}
                        />
                        <ValueMetric label="Data da medicao" value={formatDate(kpi.measuredAt)} />
                      </div>
                      {kpi.observations ? (
                        <p className="mt-3 text-sm text-slate-600">{kpi.observations}</p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <EmptyState message="Nenhum KPI cadastrado ainda. A estrutura ja esta pronta para acompanhar baseline, esperado e real." />
                )}
              </div>

              {canEdit && isKpiFormOpen ? (
                <div className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                  <Field label="Nome do KPI">
                    <input
                      value={kpiForm.name}
                      onChange={(event) => setKpiForm((current) => ({ ...current, name: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    />
                  </Field>
                  <Field label="Tipo">
                    <select
                      value={kpiForm.type}
                      onChange={(event) =>
                        setKpiForm((current) => ({ ...current, type: event.target.value as ProjectKpiType }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    >
                      {Object.entries(KPI_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Unidade">
                    <input
                      value={kpiForm.unit}
                      onChange={(event) => setKpiForm((current) => ({ ...current, unit: event.target.value }))}
                      placeholder="%, R$, horas, quantidade"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    />
                  </Field>
                  <Field label="Fonte">
                    <select
                      value={kpiForm.measurementSource}
                      onChange={(event) =>
                        setKpiForm((current) => ({
                          ...current,
                          measurementSource: event.target.value as ProjectKpiMeasurementSource,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    >
                      {Object.entries(MEASUREMENT_SOURCE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Baseline">
                    <input
                      value={kpiForm.baselineValue}
                      onChange={(event) =>
                        setKpiForm((current) => ({ ...current, baselineValue: event.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    />
                  </Field>
                  <Field label="Esperado">
                    <input
                      value={kpiForm.expectedValue}
                      onChange={(event) =>
                        setKpiForm((current) => ({ ...current, expectedValue: event.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    />
                  </Field>
                  <Field label="Real">
                    <input
                      value={kpiForm.actualValue}
                      onChange={(event) =>
                        setKpiForm((current) => ({ ...current, actualValue: event.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    />
                  </Field>
                  <Field label="Data da medicao">
                    <input
                      type="date"
                      value={kpiForm.measuredAt}
                      onChange={(event) => setKpiForm((current) => ({ ...current, measuredAt: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <Field label="Descricao">
                      <textarea
                        rows={3}
                        value={kpiForm.description}
                        onChange={(event) =>
                          setKpiForm((current) => ({ ...current, description: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-3 py-3"
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Observacoes">
                      <textarea
                        rows={3}
                        value={kpiForm.observations}
                        onChange={(event) =>
                          setKpiForm((current) => ({ ...current, observations: event.target.value }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-3 py-3"
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingKpiId(null);
                        setKpiForm(createEmptyKpiForm());
                        setIsKpiFormOpen(false);
                      }}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitKpi}
                      className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      {editingKpiId ? 'Salvar KPI' : 'Criar KPI'}
                    </button>
                  </div>
                </div>
              ) : null}
            </PanelCard>

            <PanelCard
              icon={<ClipboardList className="h-4 w-4 text-slate-400" />}
              title="Beneficios esperados x realizados"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <BenefitList
                  title="Esperados"
                  items={project.expectedBenefits || []}
                  emptyMessage="Nenhum beneficio esperado informado."
                />
                <BenefitList
                  title="Realizados"
                  items={project.realizedBenefits || []}
                  emptyMessage="Nenhum beneficio realizado registrado."
                />
              </div>

              {canEdit ? (
                <div className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <Field label="Beneficios esperados">
                    <textarea
                      rows={4}
                      value={benefitsDraft.expected}
                      onChange={(event) =>
                        setBenefitsDraft((current) => ({ ...current, expected: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-3 py-3"
                      placeholder="Um beneficio por linha"
                    />
                  </Field>
                  <Field label="Beneficios realizados">
                    <textarea
                      rows={4}
                      value={benefitsDraft.realized}
                      onChange={(event) =>
                        setBenefitsDraft((current) => ({ ...current, realized: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-3 py-3"
                      placeholder="Um beneficio por linha"
                    />
                  </Field>
                  <Field label="Observacoes da analista">
                    <textarea
                      rows={4}
                      value={benefitsDraft.summary}
                      onChange={(event) =>
                        setBenefitsDraft((current) => ({ ...current, summary: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-3 py-3"
                      placeholder="Leitura qualitativa sobre o valor percebido."
                    />
                  </Field>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveBenefits}
                      className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Salvar beneficios
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Voce tem acesso de leitura. A edicao de beneficios e observacoes fica restrita a quem gerencia projetos.
                </p>
              )}
            </PanelCard>
          </div>

          <PanelCard
            icon={<CalendarClock className="h-4 w-4 text-slate-400" />}
            title="Avaliacoes de resultado"
          >
            <div className="space-y-3">
              {evaluations.length > 0 ? (
                evaluations.map((evaluation) => (
                  <div key={evaluation.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                            {EVALUATION_STATUS_LABELS[evaluation.status]}
                          </span>
                          {typeof evaluation.valueScore === 'number' ? (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                              Nota {evaluation.valueScore}/5
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {(evaluation.label || `Checkpoint ${evaluation.sequence || 1}`)} • prevista para {formatDate(evaluation.scheduledAt)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Realizada em {formatDate(evaluation.completedAt)} • Responsavel {users.find((user) => user.id === evaluation.responsibleId)?.name || snapshot.ownerName}
                        </p>
                      </div>
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => handleEditEvaluation(evaluation.id)}
                          className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {evaluation.status === 'pendente' ? 'Registrar' : 'Editar'}
                        </button>
                      ) : null}
                    </div>
                    {evaluation.summary ? (
                      <p className="mt-3 text-sm leading-6 text-slate-700">{evaluation.summary}</p>
                    ) : null}
                    {evaluation.notes ? (
                      <p className="mt-2 text-sm text-slate-500">{evaluation.notes}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <EmptyState message="Nenhuma avaliacao registrada ainda. O projeto pode seguir com checkpoints assincronos ao longo do tempo." />
              )}
            </div>

            {canEdit ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {editingEvaluationId ? 'Atualizar avaliacao' : 'Registrar avaliacao'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Nao depende de reuniao: a analista pode registrar progresso e percepcao de valor de forma assincrona.
                    </p>
                  </div>
                  {editingEvaluationId ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEvaluationId(null);
                        setEvaluationForm(createEmptyEvaluationForm(project));
                      }}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Nova avaliacao
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <Field label="Data prevista">
                    <input
                      type="date"
                      value={evaluationForm.scheduledAt}
                      onChange={(event) =>
                        setEvaluationForm((current) => ({ ...current, scheduledAt: event.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    />
                  </Field>
                  <Field label="Data realizada">
                    <input
                      type="date"
                      value={evaluationForm.completedAt}
                      onChange={(event) =>
                        setEvaluationForm((current) => ({ ...current, completedAt: event.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    />
                  </Field>
                  <Field label="Status">
                    <select
                      value={evaluationForm.status}
                      onChange={(event) =>
                        setEvaluationForm((current) => ({
                          ...current,
                          status: event.target.value as ProjectResultEvaluationStatus,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    >
                      {Object.entries(EVALUATION_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Nota de valor (1 a 5)">
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={evaluationForm.valueScore}
                      onChange={(event) =>
                        setEvaluationForm((current) => ({ ...current, valueScore: event.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    />
                  </Field>
                  <Field label="Responsavel pela avaliacao">
                    <select
                      value={evaluationForm.responsibleId}
                      onChange={(event) =>
                        setEvaluationForm((current) => ({ ...current, responsibleId: event.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5"
                    >
                      <option value="">Usar responsavel do acompanhamento</option>
                      {users
                        .filter((user) => user.status === 'active')
                        .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                </div>

                <div className="mt-4 grid gap-4">
                  <Field label="Resumo do resultado">
                    <textarea
                      rows={4}
                      value={evaluationForm.summary}
                      onChange={(event) =>
                        setEvaluationForm((current) => ({ ...current, summary: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-3 py-3"
                    />
                  </Field>
                  <Field label="Observacoes">
                    <textarea
                      rows={3}
                      value={evaluationForm.notes}
                      onChange={(event) =>
                        setEvaluationForm((current) => ({ ...current, notes: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-3 py-3"
                    />
                  </Field>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSubmitEvaluation}
                    className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    {editingEvaluationId ? 'Salvar avaliacao' : 'Registrar avaliacao'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Acompanhamento visivel para consulta. A criacao e edicao de avaliacoes fica restrita a quem gerencia projetos.
              </p>
            )}
          </PanelCard>
        </div>
      ) : null}
    </section>
  );
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function PanelCard({
  icon,
  title,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="text-base font-semibold text-slate-950">{title}</h4>
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ValueMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function BenefitList({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: string[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {items.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="inline-flex rounded-full bg-white px-3 py-1.5 text-sm text-slate-700"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">{emptyMessage}</p>
      )}
    </div>
  );
}

function MiniStatusCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <div className="flex items-center gap-2 text-slate-700">
        {icon}
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
      {message}
    </div>
  );
}
