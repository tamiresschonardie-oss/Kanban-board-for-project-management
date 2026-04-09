import { Pin, PinOff, Plus, Save, Trash2, X } from 'lucide-react';
import { useMemo } from 'react';
import { FilterCondition, SavedView } from '../../types';
import {
  createEmptyCondition,
  DATE_PRESET_OPTIONS,
  DynamicFilterFieldDefinition,
  getOperatorsForValueType,
} from '../../utils/dynamicFilters';
import { SearchableMultiSelect } from './SearchableMultiSelect';
import { SearchableSelect } from './SearchableSelect';

interface DynamicFiltersPanelProps<T> {
  title?: string;
  subtitle?: string;
  fields: DynamicFilterFieldDefinition<T>[];
  conditions: FilterCondition[];
  onConditionsChange: (conditions: FilterCondition[]) => void;
  savedViews: SavedView[];
  activeViewId?: string | null;
  pinnedViewId?: string | null;
  activeViewLabel?: string;
  onApplyView: (view: SavedView) => void;
  onSaveView: (viewId?: string) => void;
  onDeleteView: (viewId: string) => void;
  onPinView: (viewId: string) => void;
  onClearPinned: () => void;
  onClearFilters: () => void;
  embedded?: boolean;
  showHeader?: boolean;
  showActions?: boolean;
}

export function DynamicFiltersPanel<T>({
  title,
  subtitle,
  fields,
  conditions,
  onConditionsChange,
  savedViews,
  activeViewId,
  pinnedViewId,
  activeViewLabel,
  onApplyView,
  onSaveView,
  onDeleteView,
  onPinView,
  onClearPinned,
  onClearFilters,
  embedded = false,
  showHeader = true,
  showActions = true,
}: DynamicFiltersPanelProps<T>) {
  const fieldMap = useMemo(() => new Map(fields.map((field) => [field.key, field])), [fields]);
  const firstField = fields[0];

  const updateCondition = (conditionId: string, updates: Partial<FilterCondition>) => {
    onConditionsChange(
      conditions.map((condition) =>
        condition.id === conditionId ? { ...condition, ...updates } : condition
      )
    );
  };

  const addCondition = () => {
    if (!firstField) return;
    onConditionsChange([...conditions, createEmptyCondition(firstField)]);
  };

  const removeCondition = (conditionId: string) => {
    onConditionsChange(conditions.filter((condition) => condition.id !== conditionId));
  };

  if (!firstField) {
    return (
      <section className={embedded ? 'space-y-3' : 'rounded-2xl border border-gray-200 bg-white p-6'}>
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500">
          Os filtros dinamicos ainda nao estao disponiveis para esta tela.
        </div>
      </section>
    );
  }

  const content = (
    <>
      {showHeader && (title || subtitle || activeViewLabel || showActions) ? (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            {title ? <h2 className="text-lg font-semibold text-gray-900">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-gray-600">{subtitle}</p> : null}
            <p className="mt-2 text-xs text-gray-500">
              Visualização ativa:{' '}
              <span className="font-medium text-gray-800">
                {activeViewLabel || 'Temporária / sem salvar'}
              </span>
            </p>
          </div>

          {showActions ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onSaveView(activeViewId || undefined)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Save className="h-4 w-4" />
                {activeViewId ? 'Atualizar visualização' : 'Salvar visualização'}
              </button>
              {pinnedViewId ? (
                <button
                  type="button"
                  onClick={onClearPinned}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-200 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50"
                >
                  <PinOff className="h-4 w-4" />
                  Remover fixa
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClearFilters}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <X className="h-4 w-4" />
                Limpar filtros
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {savedViews.length > 0 && (
        <div className={`${showHeader ? 'mt-4' : ''} flex flex-wrap gap-2`}>
          {savedViews.map((view) => (
            <div
              key={view.id}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                activeViewId === view.id
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-700'
              }`}
            >
              <button type="button" onClick={() => onApplyView(view)} className="font-medium">
                {view.name}
              </button>
              <button type="button" onClick={() => onPinView(view.id)} title="Fixar como padrão">
                <Pin className={`h-3.5 w-3.5 ${view.isPinnedDefault ? 'text-amber-600' : 'text-gray-400'}`} />
              </button>
              <button type="button" onClick={() => onDeleteView(view.id)} title="Excluir visualização">
                <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-600" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={`${savedViews.length > 0 || showHeader ? 'mt-5' : ''} space-y-3`}>
        {conditions.map((condition) => {
          const field = fieldMap.get(condition.field) || firstField;
          const operators = getOperatorsForValueType(field?.valueType || 'text');

          return (
            <div key={condition.id} className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 lg:grid-cols-[220px_220px_minmax(0,1fr)_auto]">
              <SearchableSelect
                value={condition.field || firstField.key}
                onChange={(value) => {
                  const selectedField = fieldMap.get(value) || firstField;
                  updateCondition(condition.id, {
                    field: value,
                    valueType: selectedField?.valueType || 'text',
                    value: selectedField?.valueType === 'multi_select' ? [] : '',
                    operator: 'equals',
                  });
                }}
                options={fields.map((item) => ({ value: item.key, label: item.label }))}
                placeholder="Campo"
                allLabel="Campo"
              />

              <SearchableSelect
                value={condition.operator}
                onChange={(value) => updateCondition(condition.id, { operator: value as FilterCondition['operator'] })}
                options={operators}
                placeholder="Operador"
                allLabel="Operador"
              />

              <DynamicValueInput
                condition={condition}
                field={field}
                onChange={(value) => updateCondition(condition.id, { value })}
              />

              <button
                type="button"
                onClick={() => removeCondition(condition.id)}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={addCondition}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Plus className="h-4 w-4" />
          Adicionar condição
        </button>
      </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-3">{content}</div>;
  }

  return <section className="rounded-2xl border border-gray-200 bg-white p-6">{content}</section>;
}

function DynamicValueInput<T>({
  condition,
  field,
  onChange,
}: {
  condition: FilterCondition;
  field?: DynamicFilterFieldDefinition<T>;
  onChange: (value: unknown) => void;
}) {
  if (!field) {
    return <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400">Selecione um campo</div>;
  }

  if (condition.operator === 'is_blank' || condition.operator === 'not_blank') {
    return <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400">Sem valor</div>;
  }

  if (field.valueType === 'date') {
    const value = (condition.value as { mode?: string; date?: string }) || { mode: 'today' };
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
        <SearchableSelect
          value={value.mode || 'today'}
          onChange={(nextMode) => onChange({ mode: nextMode, date: value.date || '' })}
          options={DATE_PRESET_OPTIONS}
          placeholder="Data"
          allLabel="Data"
        />
        {(value.mode || 'today') === 'exact' ? (
          <input
            type="date"
            value={value.date || ''}
            onChange={(event) => onChange({ mode: 'exact', date: event.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">
            {DATE_PRESET_OPTIONS.find((option) => option.value === (value.mode || 'today'))?.label}
          </div>
        )}
      </div>
    );
  }

  if ((field.valueType === 'multi_select' || condition.operator === 'one_of' || condition.operator === 'not_one_of') && field.options) {
    return (
      <SearchableMultiSelect
        value={Array.isArray(condition.value) ? (condition.value as string[]) : []}
        onChange={onChange as (value: string[]) => void}
        options={field.options}
        placeholder="Selecionar valores"
        allLabel="Todos"
        searchPlaceholder="Buscar..."
      />
    );
  }

  if ((field.valueType === 'select' || field.options) && field.options) {
    return (
      <SearchableSelect
        value={String(condition.value || '')}
        onChange={onChange as (value: string) => void}
        options={field.options}
        placeholder="Selecionar valor"
        allLabel="Valor"
      />
    );
  }

  return (
    <input
      type="text"
      value={String(condition.value || '')}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="Informar valor"
    />
  );
}
