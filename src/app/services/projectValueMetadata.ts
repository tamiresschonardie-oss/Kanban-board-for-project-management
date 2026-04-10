import type {
  Project,
  ProjectImpactLevel,
  ProjectResultEvaluation,
  ProjectResultMaturityType,
  ProjectResultScheduleMode,
  ProjectResultStatus,
  User,
} from '../types';

export const PROJECT_VALUE_STATUS_LABELS: Record<ProjectResultStatus, string> = {
  nao_iniciado: 'Nao iniciado',
  aguardando_avaliacao: 'Aguardando avaliacao',
  em_avaliacao: 'Em avaliacao',
  avaliado: 'Avaliado',
  encerrado: 'Encerrado',
};

export const PROJECT_VALUE_STATUS_STYLES: Record<ProjectResultStatus, string> = {
  nao_iniciado: 'bg-slate-100 text-slate-700',
  aguardando_avaliacao: 'bg-amber-100 text-amber-700',
  em_avaliacao: 'bg-sky-100 text-sky-700',
  avaliado: 'bg-emerald-100 text-emerald-700',
  encerrado: 'bg-violet-100 text-violet-700',
};

export const PROJECT_VALUE_MATURITY_LABELS: Record<ProjectResultMaturityType, string> = {
  imediato: 'Imediato',
  curto_prazo: 'Curto prazo',
  medio_prazo: 'Medio prazo',
  longo_prazo: 'Longo prazo',
};

export const PROJECT_VALUE_IMPACT_LABELS: Record<ProjectImpactLevel, string> = {
  baixo: 'Baixo',
  medio: 'Medio',
  alto: 'Alto',
};

export const PROJECT_VALUE_IMPACT_STYLES: Record<ProjectImpactLevel, string> = {
  baixo: 'bg-slate-100 text-slate-700',
  medio: 'bg-orange-100 text-orange-700',
  alto: 'bg-rose-100 text-rose-700',
};

export const PROJECT_VALUE_SCHEDULE_MODE_LABELS: Record<ProjectResultScheduleMode, string> = {
  default: 'Padrao pela maturacao',
  custom: 'Personalizado por projeto',
};

export interface ProjectValueMaturityStrategy {
  label: string;
  description: string;
  dueSoonDays: number;
  checkpoints: Array<{
    label: string;
    offsetDays: number;
  }>;
}

export const PROJECT_VALUE_MATURITY_STRATEGIES: Record<
  ProjectResultMaturityType,
  ProjectValueMaturityStrategy
> = {
  imediato: {
    label: 'Imediato',
    description: 'A validacao de valor tende a acontecer logo apos a entrega.',
    dueSoonDays: 2,
    checkpoints: [{ label: 'Validacao inicial', offsetDays: 0 }],
  },
  curto_prazo: {
    label: 'Curto prazo',
    description: 'O resultado costuma aparecer nas primeiras semanas apos a entrega.',
    dueSoonDays: 5,
    checkpoints: [{ label: 'Checkpoint de curto prazo', offsetDays: 15 }],
  },
  medio_prazo: {
    label: 'Medio prazo',
    description: 'O valor amadurece ao longo de mais de um checkpoint.',
    dueSoonDays: 7,
    checkpoints: [
      { label: 'Checkpoint inicial', offsetDays: 30 },
      { label: 'Checkpoint de consolidacao', offsetDays: 90 },
    ],
  },
  longo_prazo: {
    label: 'Longo prazo',
    description: 'Projetos de maturacao longa precisam de mais de um ponto de acompanhamento.',
    dueSoonDays: 10,
    checkpoints: [
      { label: 'Checkpoint inicial', offsetDays: 30 },
      { label: 'Checkpoint intermediario', offsetDays: 90 },
      { label: 'Checkpoint de maturacao', offsetDays: 180 },
    ],
  },
};

export interface ProjectValueAlert {
  kind:
    | 'due_soon'
    | 'overdue'
    | 'no_tracking'
    | 'no_kpi'
    | 'no_evaluation'
    | 'no_realized_benefits'
    | 'value_not_closed';
  label: string;
  tone: 'default' | 'warning' | 'danger';
  description: string;
}

export interface ProjectValueSnapshot {
  resultStatus: ProjectResultStatus;
  impactLevel: ProjectImpactLevel;
  maturityType: ProjectResultMaturityType;
  scheduleMode: ProjectResultScheduleMode;
  nextEvaluation?: ProjectResultEvaluation;
  latestCompletedEvaluation?: ProjectResultEvaluation;
  evaluations: ProjectResultEvaluation[];
  openEvaluations: ProjectResultEvaluation[];
  completedEvaluations: ProjectResultEvaluation[];
  latestScore?: number;
  averageScore?: number;
  evaluationCount: number;
  ownerId?: string;
  ownerName: string;
  alerts: ProjectValueAlert[];
  canCloseCycle: boolean;
  hasKpi: boolean;
  hasRealizedBenefits: boolean;
  explanatoryState: string;
}

export function resolveProjectResultOwnerId(project: Project): string | undefined {
  if (project.resultOwnerId) return project.resultOwnerId;

  const analystAssignment = (project.projectRoleAssignments || []).find((assignment) =>
    assignment.roleLabel.toLocaleLowerCase('pt-BR').includes('anal')
  );
  if (analystAssignment?.userId) return analystAssignment.userId;

  const fallbackAssignment = (project.projectRoleAssignments || []).find((assignment) =>
    assignment.roleLabel.toLocaleLowerCase('pt-BR').includes('pmo')
  );
  return fallbackAssignment?.userId;
}

export function resolveProjectResultOwnerName(project: Project, users: User[] = []): string {
  const ownerId = resolveProjectResultOwnerId(project);
  if (!ownerId) return project.responsible || 'Nao definido';
  return users.find((user) => user.id === ownerId)?.name || project.responsible || 'Nao definido';
}

export function getProjectResultCheckpointOffsets(project: Project): number[] {
  const customOffsets = (project.resultCustomEvaluationOffsetsDays || [])
    .filter((value) => Number.isFinite(value) && value >= 0)
    .map((value) => Math.round(value));

  if (customOffsets.length > 0) {
    return Array.from(new Set(customOffsets)).sort((left, right) => left - right);
  }

  return PROJECT_VALUE_MATURITY_STRATEGIES[project.resultMaturityType || 'medio_prazo'].checkpoints.map(
    (checkpoint) => checkpoint.offsetDays
  );
}

export function getProjectResultCheckpointLabels(project: Project): string[] {
  const offsets = getProjectResultCheckpointOffsets(project);
  const strategy = PROJECT_VALUE_MATURITY_STRATEGIES[project.resultMaturityType || 'medio_prazo'];

  if (project.resultCustomEvaluationOffsetsDays && project.resultCustomEvaluationOffsetsDays.length > 0) {
    return offsets.map((offset, index) => `Checkpoint ${index + 1} (${offset} dia(s))`);
  }

  return offsets.map((offset, index) => strategy.checkpoints[index]?.label || `Checkpoint ${index + 1}`);
}

export function getProjectOpenResultEvaluations(project: Project) {
  return (project.resultEvaluations || []).filter(
    (evaluation) => evaluation.status === 'pendente' || evaluation.status === 'em_avaliacao'
  );
}

export function getProjectCompletedResultEvaluations(project: Project) {
  return (project.resultEvaluations || []).filter((evaluation) => evaluation.status === 'concluida');
}

export function canCloseProjectResultCycle(project: Project): boolean {
  const completed = getProjectCompletedResultEvaluations(project);
  const open = getProjectOpenResultEvaluations(project);
  return completed.length > 0 && open.length === 0;
}

export function deriveProjectResultStatus(project: Project): ProjectResultStatus {
  const currentStatus = project.resultStatus || 'nao_iniciado';
  const openEvaluations = getProjectOpenResultEvaluations(project);
  const completedEvaluations = getProjectCompletedResultEvaluations(project);
  const hasDelivery = Boolean(project.deliveredAt || project.completionDate);

  if (currentStatus === 'encerrado' && canCloseProjectResultCycle(project)) return 'encerrado';
  if (openEvaluations.some((evaluation) => evaluation.status === 'em_avaliacao')) return 'em_avaliacao';
  if (openEvaluations.length > 0) return 'aguardando_avaliacao';
  if (completedEvaluations.length > 0) return 'avaliado';
  if (hasDelivery) return 'aguardando_avaliacao';
  return 'nao_iniciado';
}

export function getProjectValueAlerts(project: Project, referenceDate = new Date()): ProjectValueAlert[] {
  const alerts: ProjectValueAlert[] = [];
  const maturityType = project.resultMaturityType || 'medio_prazo';
  const dueSoonDays = PROJECT_VALUE_MATURITY_STRATEGIES[maturityType].dueSoonDays;
  const nextEvaluation = getProjectOpenResultEvaluations(project).sort((left, right) =>
    left.scheduledAt.localeCompare(right.scheduledAt)
  )[0];
  const nextEvaluationDate = nextEvaluation?.scheduledAt || project.nextResultEvaluationAt;
  const nextEvaluationTime = nextEvaluationDate ? new Date(nextEvaluationDate).getTime() : null;
  const referenceTime = referenceDate.getTime();

  if (project.resultStatus === 'nao_iniciado' && (project.deliveredAt || project.completionDate)) {
    alerts.push({
      kind: 'no_tracking',
      label: 'Sem acompanhamento iniciado',
      tone: 'danger',
      description: 'A execucao foi concluida, mas o ciclo de valor ainda nao foi preparado.',
    });
  }

  if (nextEvaluationTime !== null) {
    const diffDays = Math.ceil((nextEvaluationTime - referenceTime) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      alerts.push({
        kind: 'overdue',
        label: 'Avaliacao vencida',
        tone: 'danger',
        description: 'Existe um checkpoint de valor com prazo ultrapassado.',
      });
    } else if (diffDays <= dueSoonDays) {
      alerts.push({
        kind: 'due_soon',
        label: 'Avaliacao proxima do vencimento',
        tone: 'warning',
        description: 'O proximo checkpoint de valor exige follow-up nos proximos dias.',
      });
    }
  }

  if ((project.projectKpis || []).length === 0) {
    alerts.push({
      kind: 'no_kpi',
      label: 'Sem KPI',
      tone: 'warning',
      description: 'O projeto nao possui indicador estruturado para sustentar o valor entregue.',
    });
  }

  if ((project.resultEvaluations || []).length === 0) {
    alerts.push({
      kind: 'no_evaluation',
      label: 'Sem avaliacao registrada',
      tone: 'warning',
      description: 'Ainda nao ha nenhum checkpoint formal de resultado neste projeto.',
    });
  }

  if (!project.realizedBenefits || project.realizedBenefits.length === 0) {
    alerts.push({
      kind: 'no_realized_benefits',
      label: 'Sem beneficios realizados',
      tone: 'default',
      description: 'Os beneficios percebidos ainda nao foram registrados.',
    });
  }

  if (project.resultStatus !== 'encerrado' && (project.resultEvaluations || []).length > 0) {
    alerts.push({
      kind: 'value_not_closed',
      label: 'Ciclo de valor em aberto',
      tone: 'default',
      description: 'Projeto concluido na execucao continua ativo no acompanhamento de valor.',
    });
  }

  return alerts;
}

export function getProjectValueSnapshot(project: Project, users: User[] = []): ProjectValueSnapshot {
  const evaluations = [...(project.resultEvaluations || [])].sort((left, right) =>
    left.scheduledAt.localeCompare(right.scheduledAt)
  );
  const openEvaluations = getProjectOpenResultEvaluations(project).sort((left, right) =>
    left.scheduledAt.localeCompare(right.scheduledAt)
  );
  const completedEvaluations = getProjectCompletedResultEvaluations(project).sort((left, right) =>
    (right.completedAt || '').localeCompare(left.completedAt || '')
  );
  const latestCompletedEvaluation = completedEvaluations[0];
  const scores = completedEvaluations
    .map((evaluation) => evaluation.valueScore)
    .filter((value): value is number => typeof value === 'number');

  const averageScore =
    scores.length > 0 ? Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(2)) : undefined;

  return {
    resultStatus: deriveProjectResultStatus(project),
    impactLevel: project.impactLevel || 'medio',
    maturityType: project.resultMaturityType || 'medio_prazo',
    scheduleMode:
      project.resultScheduleMode ||
      ((project.resultCustomEvaluationOffsetsDays || []).length > 0 ? 'custom' : 'default'),
    nextEvaluation: openEvaluations[0],
    latestCompletedEvaluation,
    evaluations,
    openEvaluations,
    completedEvaluations,
    latestScore: latestCompletedEvaluation?.valueScore,
    averageScore,
    evaluationCount: evaluations.length,
    ownerId: resolveProjectResultOwnerId(project),
    ownerName: resolveProjectResultOwnerName(project, users),
    alerts: getProjectValueAlerts(project),
    canCloseCycle: canCloseProjectResultCycle(project),
    hasKpi: (project.projectKpis || []).length > 0,
    hasRealizedBenefits: Boolean(project.realizedBenefits && project.realizedBenefits.length > 0),
    explanatoryState:
      'Concluido encerra o fluxo Labs. O ciclo de valor continua ativo ate que os resultados sejam medidos e, quando fizer sentido, encerrados.',
  };
}
