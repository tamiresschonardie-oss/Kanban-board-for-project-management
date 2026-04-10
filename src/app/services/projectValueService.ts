import type {
  ActivityLog,
  Project,
  ProjectBenefit,
  ProjectImpactLevel,
  ProjectKpi,
  ProjectResultEvaluation,
  ProjectResultEvaluationStatus,
  ProjectResultMaturityType,
  ProjectResultStatus,
} from '../types';
import {
  CreateProjectKpiInput,
  RegisterProjectResultEvaluationInput,
  UpdateProjectKpiInput,
  UpdateProjectResultCycleInput,
  validateCreateProjectKpiInput,
  validateRegisterProjectResultEvaluationInput,
  validateUpdateProjectKpiInput,
  validateUpdateProjectResultCycleInput,
} from './projectValueSchemas';
import {
  canCloseProjectResultCycle,
  deriveProjectResultStatus,
  getProjectResultCheckpointLabels,
  getProjectResultCheckpointOffsets,
  resolveProjectResultOwnerId,
} from './projectValueMetadata';

interface MutationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
}

export interface PendingProjectResultEvaluation {
  projectId: string;
  projectName: string;
  evaluation: ProjectResultEvaluation;
  daysUntilDue: number;
  overdue: boolean;
}

export interface ProjectValueSummary {
  projectId: string;
  resultStatus: ProjectResultStatus;
  resultMaturityType: ProjectResultMaturityType;
  impactLevel: ProjectImpactLevel;
  nextResultEvaluationAt?: string;
  pendingEvaluations: number;
  completedEvaluations: number;
  averageValueScore?: number;
  kpiCount: number;
  kpisMeasured: number;
  benefitsExpected: number;
  benefitsRealized: number;
}

export const RESULT_MATURITY_DEFAULT_OFFSETS_DAYS: Record<ProjectResultMaturityType, number> = {
  imediato: 0,
  curto_prazo: 15,
  medio_prazo: 30,
  longo_prazo: 30,
};

export const PROJECT_RESULT_STATUS_TRANSITIONS: Record<
  ProjectResultStatus,
  ProjectResultStatus[]
> = {
  nao_iniciado: ['aguardando_avaliacao'],
  aguardando_avaliacao: ['em_avaliacao'],
  em_avaliacao: ['avaliado'],
  avaliado: ['encerrado'],
  encerrado: [],
};

const nowIso = () => new Date().toISOString();
const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
};

const addDays = (value: string, days: number) => {
  const base = toDate(value) || new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next.toISOString();
};

const normalizeBenefitTextList = (values: string[] = []) =>
  values.map((value) => value.trim()).filter(Boolean);

const createProjectActivity = (
  project: Project,
  action: string,
  details: string,
  metadata?: ActivityLog['metadata'],
  user = 'Sistema'
): ActivityLog => ({
  id: createId('project-activity'),
  timestamp: nowIso(),
  user,
  action,
  details,
  entityType: 'project',
  entityId: project.id,
  metadata,
});

const appendProjectActivities = (project: Project, activities: ActivityLog[]) => ({
  ...project,
  activities: [...(project.activities || []), ...activities],
});

const getOpenResultEvaluations = (project: Project) =>
  (project.resultEvaluations || []).filter(
    (evaluation) => evaluation.status === 'pendente' || evaluation.status === 'em_avaliacao'
  );

export function canTransitionProjectResultStatus(
  from: ProjectResultStatus,
  to: ProjectResultStatus,
  options?: { allowManualOverride?: boolean }
): boolean {
  if (from === to) return true;
  if (options?.allowManualOverride) return true;
  return PROJECT_RESULT_STATUS_TRANSITIONS[from].includes(to);
}

export function calculateNextResultEvaluation(params: {
  deliveredAt?: string;
  maturityType?: ProjectResultMaturityType;
  manualDate?: string;
  customOffsetsDays?: number[];
}): string | undefined {
  if (params.manualDate) return params.manualDate;
  const deliveredAt = params.deliveredAt;
  if (!deliveredAt) return undefined;

  const maturityType = params.maturityType || 'medio_prazo';
  const days =
    params.customOffsetsDays?.filter((value) => Number.isFinite(value) && value >= 0).sort((left, right) => left - right)[0] ??
    RESULT_MATURITY_DEFAULT_OFFSETS_DAYS[maturityType];
  return addDays(deliveredAt, days);
}

export function normalizeProjectValueState(project: Project): Project {
  const deliveredAt = project.deliveredAt || project.completionDate;
  const resultMaturityType = project.resultMaturityType || 'medio_prazo';
  const resultStatus = deriveProjectResultStatus(project);
  const impactLevel = project.impactLevel || 'medio';
  const projectKpis = (project.projectKpis || []).map((kpi) => ({
    ...kpi,
    measurementSource: kpi.measurementSource || 'manual',
    updatedAt: kpi.updatedAt || kpi.createdAt || nowIso(),
    createdAt: kpi.createdAt || nowIso(),
  }));
  const resultEvaluations = (project.resultEvaluations || []).map((evaluation) => ({
    ...evaluation,
    label: evaluation.label || `Checkpoint ${evaluation.sequence || 1}`,
    sequence: evaluation.sequence || 1,
    isAutoScheduled: typeof evaluation.isAutoScheduled === 'boolean' ? evaluation.isAutoScheduled : true,
    responsibleId: evaluation.responsibleId || resolveProjectResultOwnerId(project),
    updatedAt: evaluation.updatedAt || evaluation.createdAt || nowIso(),
    createdAt: evaluation.createdAt || nowIso(),
  }));
  const benefits = (project.benefits || []).map((benefit) => ({
    ...benefit,
    updatedAt: benefit.updatedAt || benefit.createdAt || nowIso(),
    createdAt: benefit.createdAt || nowIso(),
  }));

  return {
    ...project,
    resultMaturityType,
    resultStatus,
    resultScheduleMode:
      project.resultScheduleMode ||
      ((project.resultCustomEvaluationOffsetsDays || []).length > 0 ? 'custom' : 'default'),
    resultOwnerId: project.resultOwnerId || resolveProjectResultOwnerId(project),
    resultCustomEvaluationOffsetsDays: (project.resultCustomEvaluationOffsetsDays || [])
      .filter((value) => Number.isFinite(value) && value >= 0)
      .map((value) => Math.round(value)),
    impactLevel,
    projectKpis,
    resultEvaluations,
    benefits,
    expectedBenefits: normalizeBenefitTextList(project.expectedBenefits),
    realizedBenefits: normalizeBenefitTextList(project.realizedBenefits),
    nextResultEvaluationAt:
      project.nextResultEvaluationAt ||
      resultEvaluations
        .filter((evaluation) => evaluation.status === 'pendente' || evaluation.status === 'em_avaliacao')
        .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt))[0]?.scheduledAt ||
      calculateNextResultEvaluation({
        deliveredAt,
        maturityType: resultStatus !== 'nao_iniciado' ? resultMaturityType : undefined,
        customOffsetsDays: project.resultCustomEvaluationOffsetsDays,
      }),
  };
}

function buildScheduledResultEvaluations(project: Project, deliveredAt: string) {
  const offsets = getProjectResultCheckpointOffsets(project);
  const labels = getProjectResultCheckpointLabels(project);
  const ownerId = project.resultOwnerId || resolveProjectResultOwnerId(project);
  const existingKeys = new Set(
    (project.resultEvaluations || []).map((evaluation) => `${evaluation.sequence || 1}:${evaluation.scheduledAt}`)
  );

  return offsets
    .map((offsetDays, index) => ({
      id: createId('result-eval'),
      projectId: project.id,
      label: labels[index] || `Checkpoint ${index + 1}`,
      sequence: index + 1,
      scheduledAt: addDays(deliveredAt, offsetDays),
      status: 'pendente' as const,
      responsibleId: ownerId,
      summary:
        index === 0
          ? 'Avaliação inicial planejada automaticamente após a entrega do projeto.'
          : 'Checkpoint adicional planejado automaticamente conforme a estratégia de maturação do projeto.',
      isAutoScheduled: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }))
    .filter((evaluation) => !existingKeys.has(`${evaluation.sequence}:${evaluation.scheduledAt}`));
}

export function startProjectValueCycle(project: Project): Project {
  const normalized = normalizeProjectValueState(project);
  const deliveredAt = normalized.deliveredAt || normalized.completionDate;
  if (!deliveredAt) return normalized;
  if (normalized.resultStatus !== 'nao_iniciado') return normalized;

  const autoEvaluations = buildScheduledResultEvaluations(normalized, deliveredAt);
  const nextResultEvaluationAt =
    autoEvaluations[0]?.scheduledAt ||
    calculateNextResultEvaluation({
      deliveredAt,
      maturityType: normalized.resultMaturityType,
      manualDate: normalized.nextResultEvaluationAt,
      customOffsetsDays: normalized.resultCustomEvaluationOffsetsDays,
    });

  const withValueCycle = appendProjectActivities(
    {
      ...normalized,
      resultOwnerId: normalized.resultOwnerId || resolveProjectResultOwnerId(normalized),
      resultStatus: 'aguardando_avaliacao',
      nextResultEvaluationAt,
      resultEvaluations: [...(normalized.resultEvaluations || []), ...autoEvaluations],
    },
    [
      createProjectActivity(
        normalized,
        'concluiu a execução',
        'Execução encerrada no fluxo principal; acompanhamento de valor preparado em trilha separada.',
        {
          recordType: 'execution_completed',
          executionStatus: 'concluido',
          resultStatus: 'aguardando_avaliacao',
          deliveredAt,
        }
      ),
      createProjectActivity(
        normalized,
        'iniciou o acompanhamento de resultado',
        'O projeto saiu do radar operacional do Kanban e entrou no ciclo de valor.',
        {
          recordType: 'result_cycle_started',
          resultStatus: 'aguardando_avaliacao',
          resultMaturityType: normalized.resultMaturityType,
          resultOwnerId: normalized.resultOwnerId || resolveProjectResultOwnerId(normalized) || null,
          nextResultEvaluationAt: nextResultEvaluationAt || null,
        }
      ),
      ...autoEvaluations.map((evaluation) =>
        createProjectActivity(
          normalized,
          'criou uma avaliação de resultado',
          evaluation.label || 'Checkpoint planejado automaticamente',
          {
            recordType: 'result_evaluation_created',
            evaluationId: evaluation.id,
            scheduledAt: evaluation.scheduledAt,
            source: 'automatic',
            sequence: evaluation.sequence || null,
          }
        )
      ),
    ]
  );

  return normalizeProjectValueState(withValueCycle);
}

export function createProjectKpi(
  project: Project,
  input: CreateProjectKpiInput
): MutationResult<Project> {
  const validation = validateCreateProjectKpiInput(input);
  if (!validation.success || !validation.data) return { success: false, errors: validation.errors };

  const timestamp = nowIso();
  const nextKpi: ProjectKpi = {
    id: createId('project-kpi'),
    projectId: project.id,
    name: validation.data.name.trim(),
    type: validation.data.type,
    description: validation.data.description?.trim() || undefined,
    unit: validation.data.unit?.trim() || undefined,
    baselineValue: validation.data.baselineValue,
    expectedValue: validation.data.expectedValue,
    actualValue: validation.data.actualValue,
    measurementSource: validation.data.measurementSource,
    measuredAt: validation.data.measuredAt,
    observations: validation.data.observations?.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    success: true,
    data: normalizeProjectValueState(
      appendProjectActivities(
        {
          ...project,
          projectKpis: [...(project.projectKpis || []), nextKpi],
        },
        [
          createProjectActivity(project, 'criou um KPI de resultado', nextKpi.name, {
            recordType: 'project_kpi_created',
            kpiId: nextKpi.id,
            kpiType: nextKpi.type,
          }),
        ]
      )
    ),
    errors: [],
  };
}

export function updateProjectKpi(
  project: Project,
  kpiId: string,
  input: UpdateProjectKpiInput
): MutationResult<Project> {
  const validation = validateUpdateProjectKpiInput(input);
  if (!validation.success || !validation.data) return { success: false, errors: validation.errors };

  const projectKpis = project.projectKpis || [];
  const target = projectKpis.find((kpi) => kpi.id === kpiId);
  if (!target) return { success: false, errors: ['KPI do projeto não encontrado.'] };

  return {
    success: true,
    data: normalizeProjectValueState(
      appendProjectActivities(
        {
          ...project,
          projectKpis: projectKpis.map((kpi) =>
            kpi.id === kpiId
              ? {
                  ...kpi,
                  ...validation.data,
                  name: validation.data.name?.trim() || kpi.name,
                  description:
                    typeof validation.data.description === 'undefined'
                      ? kpi.description
                      : validation.data.description?.trim() || undefined,
                  unit:
                    typeof validation.data.unit === 'undefined'
                      ? kpi.unit
                      : validation.data.unit?.trim() || undefined,
                  observations:
                    typeof validation.data.observations === 'undefined'
                      ? kpi.observations
                      : validation.data.observations?.trim() || undefined,
                  updatedAt: nowIso(),
                }
              : kpi
          ),
        },
        [
          createProjectActivity(project, 'atualizou um KPI de resultado', target.name, {
            recordType: 'project_kpi_updated',
            kpiId: target.id,
            kpiType: target.type,
          }),
        ]
      )
    ),
    errors: [],
  };
}

export function registerProjectResultEvaluation(
  project: Project,
  input: RegisterProjectResultEvaluationInput
): MutationResult<Project> {
  const validation = validateRegisterProjectResultEvaluationInput(input);
  if (!validation.success || !validation.data) return { success: false, errors: validation.errors };

  const timestamp = nowIso();
  const nextEvaluation: ProjectResultEvaluation = {
    id: createId('result-eval'),
    projectId: project.id,
    scheduledAt: validation.data.scheduledAt,
    completedAt: validation.data.completedAt,
    status: validation.data.status,
    responsibleId: validation.data.responsibleId,
    valueScore: validation.data.valueScore as 1 | 2 | 3 | 4 | 5 | undefined,
    summary: validation.data.summary?.trim() || undefined,
    notes: validation.data.notes?.trim() || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const nextProject = {
    ...project,
    resultStatus: project.resultStatus,
    nextResultEvaluationAt: nextEvaluation.scheduledAt,
    valueRealizationSummary:
      nextEvaluation.status === 'concluida'
        ? nextEvaluation.summary || project.valueRealizationSummary
        : project.valueRealizationSummary,
    resultEvaluations: [...(project.resultEvaluations || []), nextEvaluation],
  };
  const normalizedNextProject = normalizeProjectValueState(nextProject);

  return {
    success: true,
    data: normalizeProjectValueState(
      appendProjectActivities(nextProject, [
        createProjectActivity(project, 'criou uma avaliação de resultado', project.name, {
          recordType: 'result_evaluation_created',
          evaluationId: nextEvaluation.id,
          scheduledAt: nextEvaluation.scheduledAt,
          evaluationStatus: nextEvaluation.status,
          resultStatus: normalizedNextProject.resultStatus,
        }),
        ...(nextEvaluation.status === 'concluida'
          ? [
              createProjectActivity(project, 'concluiu uma avaliação de resultado', project.name, {
                recordType: 'result_evaluation_completed',
                evaluationId: nextEvaluation.id,
                completedAt: nextEvaluation.completedAt || timestamp,
                valueScore: nextEvaluation.valueScore || null,
                resultStatus: normalizedNextProject.resultStatus,
              }),
            ]
          : []),
      ])
    ),
    errors: [],
  };
}

export function updateProjectResultEvaluation(
  project: Project,
  evaluationId: string,
  input: RegisterProjectResultEvaluationInput
): MutationResult<Project> {
  const validation = validateRegisterProjectResultEvaluationInput(input);
  if (!validation.success || !validation.data) return { success: false, errors: validation.errors };

  const evaluations = project.resultEvaluations || [];
  const target = evaluations.find((evaluation) => evaluation.id === evaluationId);
  if (!target) return { success: false, errors: ['Avaliação de resultado não encontrada.'] };

  const nextEvaluation: ProjectResultEvaluation = {
    ...target,
    scheduledAt: validation.data.scheduledAt,
    completedAt: validation.data.completedAt,
    status: validation.data.status,
    responsibleId: validation.data.responsibleId,
    valueScore: validation.data.valueScore as 1 | 2 | 3 | 4 | 5 | undefined,
    summary: validation.data.summary?.trim() || undefined,
    notes: validation.data.notes?.trim() || undefined,
    updatedAt: nowIso(),
  };
  const remainingOpenEvaluations = evaluations.filter(
    (evaluation) =>
      evaluation.id !== evaluationId &&
      (evaluation.status === 'pendente' || evaluation.status === 'em_avaliacao')
  );
  const nextResultEvaluationAt =
    nextEvaluation.status === 'pendente' || nextEvaluation.status === 'em_avaliacao'
      ? nextEvaluation.scheduledAt
      : remainingOpenEvaluations.sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt))[0]
          ?.scheduledAt;

  const nextProjectBase = {
    ...project,
    nextResultEvaluationAt,
    valueRealizationSummary:
      nextEvaluation.status === 'concluida'
        ? nextEvaluation.summary || project.valueRealizationSummary
        : project.valueRealizationSummary,
    resultEvaluations: evaluations.map((evaluation) =>
      evaluation.id === evaluationId ? nextEvaluation : evaluation
    ),
  };
  const normalizedNextProject = normalizeProjectValueState(nextProjectBase);

  return {
    success: true,
    data: normalizeProjectValueState(
      appendProjectActivities(
        normalizedNextProject,
        [
          createProjectActivity(project, 'atualizou uma avaliação de resultado', project.name, {
            recordType: 'result_evaluation_updated',
            evaluationId: nextEvaluation.id,
            evaluationStatus: nextEvaluation.status,
            resultStatus: normalizedNextProject.resultStatus,
          }),
          ...(nextEvaluation.status === 'concluida'
            ? [
                createProjectActivity(project, 'concluiu uma avaliação de resultado', project.name, {
                  recordType: 'result_evaluation_completed',
                  evaluationId: nextEvaluation.id,
                  completedAt: nextEvaluation.completedAt || nowIso(),
                  valueScore: nextEvaluation.valueScore || null,
                  resultStatus: normalizedNextProject.resultStatus,
                }),
              ]
            : []),
        ]
      )
    ),
    errors: [],
  };
}

export function updateProjectResultStatus(
  project: Project,
  input: UpdateProjectResultCycleInput
): MutationResult<Project> {
  const validation = validateUpdateProjectResultCycleInput(input);
  if (!validation.success || !validation.data) return { success: false, errors: validation.errors };

  const currentStatus = project.resultStatus || 'nao_iniciado';
  const nextBaseProject = {
    ...project,
    resultStatus: validation.data.resultStatus,
    resultMaturityType: validation.data.resultMaturityType || project.resultMaturityType,
    resultScheduleMode: validation.data.resultScheduleMode || project.resultScheduleMode,
    resultOwnerId: validation.data.resultOwnerId || project.resultOwnerId,
    resultCustomEvaluationOffsetsDays:
      validation.data.resultScheduleMode === 'custom'
        ? validation.data.resultCustomEvaluationOffsetsDays || project.resultCustomEvaluationOffsetsDays
        : validation.data.resultScheduleMode === 'default'
          ? []
          : project.resultCustomEvaluationOffsetsDays,
    impactLevel: validation.data.impactLevel || project.impactLevel,
    nextResultEvaluationAt:
      validation.data.nextResultEvaluationAt || project.nextResultEvaluationAt,
    valueRealizationSummary:
      typeof validation.data.valueRealizationSummary === 'string'
        ? validation.data.valueRealizationSummary.trim() || undefined
        : project.valueRealizationSummary,
  };

  if (validation.data.resultStatus === 'encerrado' && !canCloseProjectResultCycle(nextBaseProject)) {
    return {
      success: false,
      errors: [
        'O ciclo de valor so pode ser encerrado quando houver ao menos uma avaliacao concluida e nenhum checkpoint aberto.',
      ],
    };
  }

  if (
    !canTransitionProjectResultStatus(currentStatus, validation.data.resultStatus, {
      allowManualOverride: validation.data.allowManualOverride,
    })
  ) {
    return {
      success: false,
      errors: [
        `Transição inválida do ciclo de resultado: ${currentStatus} -> ${validation.data.resultStatus}.`,
      ],
    };
  }

  const nextProject = normalizeProjectValueState(nextBaseProject);

  const activities: ActivityLog[] = [
    createProjectActivity(
      project,
      'alterou o status do ciclo de resultado',
      `${currentStatus} -> ${validation.data.resultStatus}`,
      {
        recordType: 'result_status_updated',
        fromResultStatus: currentStatus,
        toResultStatus: nextProject.resultStatus,
        manualOverride: Boolean(validation.data.allowManualOverride),
      }
    ),
  ];

  if (
    typeof validation.data.impactLevel !== 'undefined' &&
    validation.data.impactLevel !== project.impactLevel
  ) {
    activities.push(
      createProjectActivity(project, 'atualizou o impacto do projeto', project.name, {
        recordType: 'project_impact_updated',
        fromImpactLevel: project.impactLevel || null,
        toImpactLevel: validation.data.impactLevel,
      })
    );
  }

  if (
    typeof validation.data.resultOwnerId !== 'undefined' &&
    validation.data.resultOwnerId !== project.resultOwnerId
  ) {
    activities.push(
      createProjectActivity(project, 'atualizou o responsável pelo acompanhamento', project.name, {
        recordType: 'result_owner_updated',
        fromResultOwnerId: project.resultOwnerId || null,
        toResultOwnerId: validation.data.resultOwnerId,
      })
    );
  }

  return {
    success: true,
    data: normalizeProjectValueState(appendProjectActivities(nextProject, activities)),
    errors: [],
  };
}

export function listPendingResultEvaluations(
  projects: Project[],
  referenceDate = new Date()
): PendingProjectResultEvaluation[] {
  const referenceTime = referenceDate.getTime();

  return projects.flatMap((project) =>
    (project.resultEvaluations || [])
      .filter((evaluation) => evaluation.status === 'pendente' || evaluation.status === 'em_avaliacao')
      .map((evaluation) => {
        const scheduled = toDate(evaluation.scheduledAt);
        const diffMs = scheduled ? scheduled.getTime() - referenceTime : 0;
        const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return {
          projectId: project.id,
          projectName: project.name,
          evaluation,
          daysUntilDue,
          overdue: daysUntilDue < 0,
        };
      })
  );
}

export function getProjectsInResultFollowUp(projects: Project[]) {
  return projects.filter((project) => (project.resultStatus || 'nao_iniciado') !== 'nao_iniciado');
}

export function summarizeProjectValue(project: Project): ProjectValueSummary {
  const normalized = normalizeProjectValueState(project);
  const completedEvaluations = (normalized.resultEvaluations || []).filter(
    (evaluation) => evaluation.status === 'concluida'
  );
  const pendingEvaluations = (normalized.resultEvaluations || []).filter(
    (evaluation) => evaluation.status === 'pendente' || evaluation.status === 'em_avaliacao'
  );
  const scores = completedEvaluations
    .map((evaluation) => evaluation.valueScore)
    .filter((score): score is number => typeof score === 'number');

  return {
    projectId: normalized.id,
    resultStatus: normalized.resultStatus || 'nao_iniciado',
    resultMaturityType: normalized.resultMaturityType || 'medio_prazo',
    impactLevel: normalized.impactLevel || 'medio',
    nextResultEvaluationAt: normalized.nextResultEvaluationAt,
    pendingEvaluations: pendingEvaluations.length,
    completedEvaluations: completedEvaluations.length,
    averageValueScore:
      scores.length > 0 ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2)) : undefined,
    kpiCount: (normalized.projectKpis || []).length,
    kpisMeasured: (normalized.projectKpis || []).filter((kpi) => typeof kpi.actualValue === 'number').length,
    benefitsExpected: normalized.expectedBenefits?.length || 0,
    benefitsRealized: normalized.realizedBenefits?.length || 0,
  };
}

export function syncProjectBenefits(params: {
  project: Project;
  expectedBenefits?: string[];
  realizedBenefits?: string[];
}): Project {
  const expectedBenefits = normalizeBenefitTextList(
    typeof params.expectedBenefits === 'undefined' ? params.project.expectedBenefits : params.expectedBenefits
  );
  const realizedBenefits = normalizeBenefitTextList(
    typeof params.realizedBenefits === 'undefined' ? params.project.realizedBenefits : params.realizedBenefits
  );
  const timestamp = nowIso();

  const benefitMap = new Map<string, ProjectBenefit>();
  (params.project.benefits || []).forEach((benefit) => {
    benefitMap.set(`${benefit.kind}:${benefit.description.trim().toLocaleLowerCase('pt-BR')}`, benefit);
  });

  const buildBenefits = (items: string[], kind: ProjectBenefit['kind']) =>
    items.map((description) => {
      const key = `${kind}:${description.trim().toLocaleLowerCase('pt-BR')}`;
      const existing = benefitMap.get(key);
      return existing || {
        id: createId('project-benefit'),
        projectId: params.project.id,
        kind,
        description,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    });

  return normalizeProjectValueState({
    ...params.project,
    expectedBenefits,
    realizedBenefits,
    benefits: [
      ...buildBenefits(expectedBenefits, 'expected'),
      ...buildBenefits(realizedBenefits, 'realized'),
    ],
  });
}
