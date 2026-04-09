import { ReactNode, useState } from 'react';
import {
  ProjectFilterOptions,
  ProjectFilterState,
} from '../utils/projectSelectors';
import { SearchableMultiSelect } from './filters/SearchableMultiSelect';
import { UnifiedFilterPanel } from './filters/UnifiedFilterPanel';

interface GovernanceFiltersProps {
  filters: ProjectFilterState;
  options: ProjectFilterOptions;
  onChange: (updates: Partial<ProjectFilterState>) => void;
  showTeamFilter?: boolean;
  title?: string;
  subtitle?: string;
  actionsSlot?: ReactNode;
  savedViewsSlot?: ReactNode;
  footerSlot?: ReactNode;
}

export function GovernanceFilters({
  filters,
  options,
  onChange,
  showTeamFilter = true,
  title = 'Filtros',
  subtitle = 'Refine o recorte sem perder a leitura da tela.',
  actionsSlot,
  savedViewsSlot,
  footerSlot,
}: GovernanceFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const activeFilterChips = [
    ...filters.team.map((value) => ({ key: `team-${value}`, label: `Equipe: ${value}` })),
    ...filters.projectId.map((value) => ({
      key: `project-${value}`,
      label: `Projeto: ${options.projects.find((project) => project.id === value)?.name || value}`,
    })),
    ...filters.governancePhaseId.map((value) => ({
      key: `phase-${value}`,
      label: `Fase: ${options.governancePhases.find((phase) => phase.id === value)?.label || value}`,
    })),
    ...filters.situation.map((value) => ({
      key: `situation-${value}`,
      label: `Situação: ${options.situations.find((item) => item.id === value)?.label || value}`,
    })),
    ...filters.responsible.map((value) => ({ key: `responsible-${value}`, label: `Responsável: ${value}` })),
    ...filters.requester.map((value) => ({ key: `requester-${value}`, label: `Solicitante: ${value}` })),
    ...filters.client.map((value) => ({ key: `client-${value}`, label: `Cliente: ${value}` })),
    ...filters.product.map((value) => ({ key: `product-${value}`, label: `Produto: ${value}` })),
    ...filters.year.map((value) => ({ key: `year-${value}`, label: `Ano: ${value}` })),
    ...(filters.onlyWeeklyFocus ? [{ key: 'weekly-focus', label: 'Apenas foco da semana' }] : []),
  ];

  return (
    <UnifiedFilterPanel
      title={title}
      subtitle={subtitle}
      expanded={showFilters}
      onToggleExpanded={() => setShowFilters(!showFilters)}
      activeFiltersCount={activeFilterChips.length}
      activeFiltersSlot={
        activeFilterChips.length > 0 ? (
          <>
            {activeFilterChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {chip.label}
              </span>
            ))}
          </>
        ) : null
      }
      compactHelperText="Abra o painel para refinar o portfólio sem ocupar toda a área da tela."
      compactByDefault
      actionsSlot={
        <>
          {actionsSlot}
        </>
      }
      filtersSlot={
        showFilters ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {showTeamFilter && (
            <FilterField label="Equipe">
              <SearchableMultiSelect
                value={filters.team}
                onChange={(value) => onChange({ team: value })}
                placeholder="Todas as equipes"
                allLabel="Todas"
                searchPlaceholder="Buscar equipe..."
                options={options.teams.map((team) => ({
                  value: team,
                  label: team,
                }))}
              />
            </FilterField>
          )}

          <FilterField label="Projeto">
            <SearchableMultiSelect
              value={filters.projectId}
              onChange={(value) => onChange({ projectId: value, searchTerm: '' })}
              placeholder="Todos os projetos"
              allLabel="Todos"
              searchPlaceholder="Buscar projeto..."
              options={options.projects.map((project) => ({
                value: project.id,
                label: project.name,
              }))}
            />
          </FilterField>

          <FilterField label="Fase Macro">
            <SearchableMultiSelect
              value={filters.governancePhaseId}
              onChange={(value) => onChange({ governancePhaseId: value })}
              placeholder="Todas as fases"
              allLabel="Todas"
              searchPlaceholder="Buscar fase macro..."
              options={options.governancePhases.map((phase) => ({
                value: phase.id,
                label: phase.label,
              }))}
            />
          </FilterField>

          <FilterField label="Situação">
            <SearchableMultiSelect
              value={filters.situation}
              onChange={(value) => onChange({ situation: value })}
              placeholder="Todas as situações"
              allLabel="Todas"
              searchPlaceholder="Buscar situação..."
              options={options.situations.map((situation) => ({
                value: situation.id,
                label: situation.label,
              }))}
            />
          </FilterField>

          <FilterField label="Responsável">
            <SearchableMultiSelect
              value={filters.responsible}
              onChange={(value) => onChange({ responsible: value })}
              placeholder="Todos os responsáveis"
              allLabel="Todos"
              searchPlaceholder="Buscar responsável..."
              options={options.responsibles.map((responsible) => ({
                value: responsible,
                label: responsible,
              }))}
            />
          </FilterField>

          <FilterField label="Solicitante">
            <SearchableMultiSelect
              value={filters.requester}
              onChange={(value) => onChange({ requester: value })}
              placeholder="Todos os solicitantes"
              allLabel="Todos"
              searchPlaceholder="Buscar solicitante..."
              options={options.requesters.map((requester) => ({
                value: requester,
                label: requester,
              }))}
            />
          </FilterField>

          <FilterField label="Cliente">
            <SearchableMultiSelect
              value={filters.client}
              onChange={(value) => onChange({ client: value })}
              placeholder="Todos os clientes"
              allLabel="Todos"
              searchPlaceholder="Buscar cliente..."
              options={options.clients.map((client) => ({
                value: client,
                label: client,
              }))}
            />
          </FilterField>

          <FilterField label="Produto">
            <SearchableMultiSelect
              value={filters.product}
              onChange={(value) => onChange({ product: value })}
              placeholder="Todos os produtos"
              allLabel="Todos"
              searchPlaceholder="Buscar produto..."
              options={options.products.map((product) => ({
                value: product,
                label: product,
              }))}
            />
          </FilterField>

          <FilterField label="Ano">
            <SearchableMultiSelect
              value={filters.year}
              onChange={(value) => onChange({ year: value })}
              placeholder="Todos os anos"
              allLabel="Todos"
              searchPlaceholder="Buscar ano..."
              options={options.years.map((year) => ({
                value: year,
                label: year,
                }))}
            />
          </FilterField>

          <FilterField label="Foco da Semana">
            <button
              type="button"
              onClick={() => onChange({ onlyWeeklyFocus: !filters.onlyWeeklyFocus })}
              className={`flex min-h-[52px] items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                filters.onlyWeeklyFocus
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="font-medium">
                {filters.onlyWeeklyFocus ? 'Mostrar somente projetos em foco' : 'Incluir todos os projetos'}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                  filters.onlyWeeklyFocus
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {filters.onlyWeeklyFocus ? 'Ativo' : 'Todos'}
              </span>
            </button>
          </FilterField>
        </div>
        ) : null
      }
      savedViewsSlot={savedViewsSlot}
      footerSlot={footerSlot}
    />
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid content-start gap-2">
      <label className="field-label min-h-[2.25rem]">{label}</label>
      {children}
    </div>
  );
}
