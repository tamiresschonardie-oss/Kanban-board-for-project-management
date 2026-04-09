import { DynamicFilterOperator, DynamicFilterValueType, FilterCondition } from '../types';

export interface DynamicFilterOption {
  value: string;
  label: string;
}

export interface DynamicFilterFieldDefinition<T> {
  key: string;
  label: string;
  valueType: DynamicFilterValueType;
  getValue: (item: T) => unknown;
  options?: DynamicFilterOption[];
}

const datePresets = {
  today: () => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  },
  yesterday: () => {
    const value = datePresets.today();
    value.setDate(value.getDate() - 1);
    return value;
  },
  tomorrow: () => {
    const value = datePresets.today();
    value.setDate(value.getDate() + 1);
    return value;
  },
  next_7_days: () => {
    const start = datePresets.today();
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  },
};

const normalizeString = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR');

const toDate = (value: unknown) => {
  if (!value) return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const isEmptyValue = (value: unknown) => {
  if (Array.isArray(value)) return value.length === 0;
  return value === undefined || value === null || String(value).trim() === '';
};

const matchDateCondition = (
  candidateDate: Date | null,
  operator: DynamicFilterOperator,
  rawValue: unknown
) => {
  if (operator === 'is_blank') return !candidateDate;
  if (operator === 'not_blank') return !!candidateDate;
  if (!candidateDate) return false;

  const value = rawValue as { mode?: string; date?: string } | string | undefined;
  let reference: Date | null = null;
  let rangeEnd: Date | null = null;

  if (typeof value === 'string') {
    reference = toDate(value);
  } else if (value?.mode === 'exact') {
    reference = toDate(value.date);
  } else if (value?.mode && value.mode in datePresets) {
    const preset = datePresets[value.mode as keyof typeof datePresets]();
    if (preset instanceof Date) {
      reference = preset;
    } else {
      reference = preset.start;
      rangeEnd = preset.end;
    }
  }

  if (!reference) return false;
  const candidateTime = candidateDate.getTime();
  const referenceTime = reference.getTime();

  switch (operator) {
    case 'equals':
      if (rangeEnd) {
        return candidateTime >= referenceTime && candidateTime <= rangeEnd.getTime();
      }
      return candidateTime === referenceTime;
    case 'before':
      return candidateTime < referenceTime;
    case 'after':
      return candidateTime > referenceTime;
    case 'on_or_after':
      return candidateTime >= referenceTime;
    case 'on_or_before':
      return candidateTime <= referenceTime;
    case 'not_equals':
      if (rangeEnd) {
        return candidateTime < referenceTime || candidateTime > rangeEnd.getTime();
      }
      return candidateTime !== referenceTime;
    default:
      return false;
  }
};

const matchScalarCondition = (
  candidateValue: unknown,
  operator: DynamicFilterOperator,
  rawValue: unknown
) => {
  const normalizedCandidate = normalizeString(candidateValue);

  switch (operator) {
    case 'is_blank':
      return isEmptyValue(candidateValue);
    case 'not_blank':
      return !isEmptyValue(candidateValue);
    case 'equals':
      return normalizedCandidate === normalizeString(rawValue);
    case 'not_equals':
      return normalizedCandidate !== normalizeString(rawValue);
    case 'contains':
      return normalizedCandidate.includes(normalizeString(rawValue));
    case 'not_contains':
      return !normalizedCandidate.includes(normalizeString(rawValue));
    case 'one_of': {
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];
      return values.map(normalizeString).includes(normalizedCandidate);
    }
    case 'not_one_of': {
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];
      return !values.map(normalizeString).includes(normalizedCandidate);
    }
    default:
      return false;
  }
};

const matchArrayCondition = (
  candidateValue: unknown[],
  operator: DynamicFilterOperator,
  rawValue: unknown
) => {
  const normalizedCandidate = candidateValue.map(normalizeString);
  const values = (Array.isArray(rawValue) ? rawValue : [rawValue]).map(normalizeString);

  switch (operator) {
    case 'is_blank':
      return normalizedCandidate.length === 0;
    case 'not_blank':
      return normalizedCandidate.length > 0;
    case 'contains':
    case 'equals':
    case 'one_of':
      return values.some((value) => normalizedCandidate.includes(value));
    case 'not_contains':
    case 'not_equals':
    case 'not_one_of':
      return values.every((value) => !normalizedCandidate.includes(value));
    default:
      return false;
  }
};

export function applyDynamicFilters<T>(
  items: T[],
  conditions: FilterCondition[],
  fields: DynamicFilterFieldDefinition<T>[]
) {
  if (!conditions.length) return items;

  const fieldMap = new Map(fields.map((field) => [field.key, field]));

  return items.filter((item) =>
    conditions.every((condition) => {
      const field = fieldMap.get(condition.field);
      if (!field) return true;

      const candidateValue = field.getValue(item);

      if (field.valueType === 'date') {
        return matchDateCondition(toDate(candidateValue), condition.operator, condition.value);
      }

      if (Array.isArray(candidateValue)) {
        return matchArrayCondition(candidateValue, condition.operator, condition.value);
      }

      return matchScalarCondition(candidateValue, condition.operator, condition.value);
    })
  );
}

export function getOperatorsForValueType(valueType: DynamicFilterValueType) {
  if (valueType === 'date') {
    return [
      { value: 'equals', label: 'Igual a' },
      { value: 'not_equals', label: 'Não é igual a' },
      { value: 'before', label: 'Antes de' },
      { value: 'after', label: 'Depois de' },
      { value: 'on_or_after', label: 'Igual ou depois' },
      { value: 'on_or_before', label: 'Igual ou antes' },
      { value: 'is_blank', label: 'Está em branco' },
      { value: 'not_blank', label: 'Não está em branco' },
    ] satisfies DynamicFilterOption[];
  }

  return [
    { value: 'equals', label: 'Igual a' },
    { value: 'not_equals', label: 'Não é igual a' },
    { value: 'contains', label: 'Contém' },
    { value: 'not_contains', label: 'Não contém' },
    { value: 'one_of', label: 'É um de' },
    { value: 'not_one_of', label: 'Não é um de' },
    { value: 'is_blank', label: 'Está em branco' },
    { value: 'not_blank', label: 'Não está em branco' },
  ] satisfies DynamicFilterOption[];
}

export function createEmptyCondition(
  field?: Pick<DynamicFilterFieldDefinition<unknown>, 'key' | 'valueType'>
): FilterCondition {
  return {
    id: `condition-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    field: field?.key || '',
    operator: 'equals',
    value: field?.valueType === 'multi_select' ? [] : '',
    valueType: field?.valueType || 'text',
  };
}

export const DATE_PRESET_OPTIONS: DynamicFilterOption[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'tomorrow', label: 'Amanhã' },
  { value: 'next_7_days', label: 'Próximos 7 dias' },
  { value: 'exact', label: 'Data exata' },
];
