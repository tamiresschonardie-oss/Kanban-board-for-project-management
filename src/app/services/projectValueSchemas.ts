import type {
  ProjectImpactLevel,
  ProjectKpiMeasurementSource,
  ProjectKpiType,
  ProjectResultEvaluationStatus,
  ProjectResultMaturityType,
  ProjectResultStatus,
} from '../types';

export const PROJECT_RESULT_MATURITY_TYPES: ProjectResultMaturityType[] = [
  'imediato',
  'curto_prazo',
  'medio_prazo',
  'longo_prazo',
];

export const PROJECT_RESULT_STATUSES: ProjectResultStatus[] = [
  'nao_iniciado',
  'aguardando_avaliacao',
  'em_avaliacao',
  'avaliado',
  'encerrado',
];

export const PROJECT_IMPACT_LEVELS: ProjectImpactLevel[] = ['baixo', 'medio', 'alto'];

export const PROJECT_KPI_TYPES: ProjectKpiType[] = [
  'tempo',
  'financeiro',
  'produtividade',
  'qualidade',
  'uso',
  'satisfacao',
  'outro',
];

export const PROJECT_KPI_MEASUREMENT_SOURCES: ProjectKpiMeasurementSource[] = [
  'manual',
  'automatica',
  'integracao',
];

export const PROJECT_RESULT_EVALUATION_STATUSES: ProjectResultEvaluationStatus[] = [
  'pendente',
  'em_avaliacao',
  'concluida',
  'cancelada',
];

export interface CreateProjectKpiInput {
  name: string;
  type: ProjectKpiType;
  description?: string;
  unit?: string;
  baselineValue?: number;
  expectedValue?: number;
  actualValue?: number;
  measurementSource: ProjectKpiMeasurementSource;
  measuredAt?: string;
  observations?: string;
}

export interface UpdateProjectKpiInput extends Partial<CreateProjectKpiInput> {}

export interface RegisterProjectResultEvaluationInput {
  scheduledAt: string;
  completedAt?: string;
  status: ProjectResultEvaluationStatus;
  responsibleId?: string;
  valueScore?: number;
  summary?: string;
  notes?: string;
}

export interface UpdateProjectResultCycleInput {
  resultStatus: ProjectResultStatus;
  resultMaturityType?: ProjectResultMaturityType;
  resultScheduleMode?: 'default' | 'custom';
  resultOwnerId?: string;
  resultCustomEvaluationOffsetsDays?: number[];
  impactLevel?: ProjectImpactLevel;
  nextResultEvaluationAt?: string;
  valueRealizationSummary?: string;
  allowManualOverride?: boolean;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isIsoDateLike = (value?: string) => {
  if (!value) return true;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime());
};

const validateEnum = <T extends string>(value: unknown, allowed: T[], label: string) => {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    return `${label} inválido.`;
  }
  return null;
};

export function validateCreateProjectKpiInput(
  input: CreateProjectKpiInput
): ValidationResult<CreateProjectKpiInput> {
  const errors: string[] = [];

  if (!input.name?.trim()) errors.push('O nome do KPI é obrigatório.');
  const typeError = validateEnum(input.type, PROJECT_KPI_TYPES, 'Tipo do KPI');
  if (typeError) errors.push(typeError);
  const sourceError = validateEnum(
    input.measurementSource,
    PROJECT_KPI_MEASUREMENT_SOURCES,
    'Fonte de medição'
  );
  if (sourceError) errors.push(sourceError);
  if (!isIsoDateLike(input.measuredAt)) errors.push('A data de medição do KPI é inválida.');

  [
    ['baseline', input.baselineValue],
    ['esperado', input.expectedValue],
    ['real', input.actualValue],
  ].forEach(([label, value]) => {
    if (typeof value !== 'undefined' && !isFiniteNumber(value)) {
      errors.push(`O valor ${label} do KPI deve ser numérico.`);
    }
  });

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? input : undefined,
    errors,
  };
}

export function validateUpdateProjectKpiInput(
  input: UpdateProjectKpiInput
): ValidationResult<UpdateProjectKpiInput> {
  const errors: string[] = [];

  if (typeof input.name !== 'undefined' && !input.name.trim()) {
    errors.push('O nome do KPI não pode ser vazio.');
  }
  if (typeof input.type !== 'undefined') {
    const typeError = validateEnum(input.type, PROJECT_KPI_TYPES, 'Tipo do KPI');
    if (typeError) errors.push(typeError);
  }
  if (typeof input.measurementSource !== 'undefined') {
    const sourceError = validateEnum(
      input.measurementSource,
      PROJECT_KPI_MEASUREMENT_SOURCES,
      'Fonte de medição'
    );
    if (sourceError) errors.push(sourceError);
  }
  if (!isIsoDateLike(input.measuredAt)) errors.push('A data de medição do KPI é inválida.');

  [
    ['baseline', input.baselineValue],
    ['esperado', input.expectedValue],
    ['real', input.actualValue],
  ].forEach(([label, value]) => {
    if (typeof value !== 'undefined' && !isFiniteNumber(value)) {
      errors.push(`O valor ${label} do KPI deve ser numérico.`);
    }
  });

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? input : undefined,
    errors,
  };
}

export function validateRegisterProjectResultEvaluationInput(
  input: RegisterProjectResultEvaluationInput
): ValidationResult<RegisterProjectResultEvaluationInput> {
  const errors: string[] = [];

  if (!input.scheduledAt || !isIsoDateLike(input.scheduledAt)) {
    errors.push('A data prevista da avaliação é obrigatória e deve ser válida.');
  }
  if (!isIsoDateLike(input.completedAt)) {
    errors.push('A data realizada da avaliação é inválida.');
  }
  const statusError = validateEnum(
    input.status,
    PROJECT_RESULT_EVALUATION_STATUSES,
    'Status da avaliação'
  );
  if (statusError) errors.push(statusError);

  if (typeof input.valueScore !== 'undefined') {
    if (!Number.isInteger(input.valueScore) || input.valueScore < 1 || input.valueScore > 5) {
      errors.push('A nota de valor percebido deve estar entre 1 e 5.');
    }
  }

  if (input.status === 'concluida' && typeof input.valueScore === 'undefined') {
    errors.push('A nota de valor percebido é obrigatória para avaliações concluídas.');
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? input : undefined,
    errors,
  };
}

export function validateUpdateProjectResultCycleInput(
  input: UpdateProjectResultCycleInput
): ValidationResult<UpdateProjectResultCycleInput> {
  const errors: string[] = [];

  const statusError = validateEnum(
    input.resultStatus,
    PROJECT_RESULT_STATUSES,
    'Status do ciclo de resultado'
  );
  if (statusError) errors.push(statusError);

  if (typeof input.resultMaturityType !== 'undefined') {
    const maturityError = validateEnum(
      input.resultMaturityType,
      PROJECT_RESULT_MATURITY_TYPES,
      'Maturação do resultado'
    );
    if (maturityError) errors.push(maturityError);
  }

  if (typeof input.impactLevel !== 'undefined') {
    const impactError = validateEnum(input.impactLevel, PROJECT_IMPACT_LEVELS, 'Impacto do projeto');
    if (impactError) errors.push(impactError);
  }

  if (
    typeof input.resultCustomEvaluationOffsetsDays !== 'undefined' &&
    !Array.isArray(input.resultCustomEvaluationOffsetsDays)
  ) {
    errors.push('Os checkpoints personalizados devem ser informados em lista.');
  }

  if (Array.isArray(input.resultCustomEvaluationOffsetsDays)) {
    input.resultCustomEvaluationOffsetsDays.forEach((value) => {
      if (!Number.isInteger(value) || value < 0) {
        errors.push('Os checkpoints personalizados devem ser dias inteiros maiores ou iguais a zero.');
      }
    });
  }

  if (!isIsoDateLike(input.nextResultEvaluationAt)) {
    errors.push('A próxima avaliação deve possuir uma data válida.');
  }

  return {
    success: errors.length === 0,
    data: errors.length === 0 ? input : undefined,
    errors,
  };
}
