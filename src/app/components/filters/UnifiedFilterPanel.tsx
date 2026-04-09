import { ReactNode } from 'react';
import { FiltersToggleButton } from './FiltersToggleButton';

interface UnifiedFilterPanelProps {
  title?: string;
  subtitle?: string;
  searchSlot?: ReactNode;
  actionsSlot?: ReactNode;
  filtersSlot?: ReactNode;
  savedViewsSlot?: ReactNode;
  footerSlot?: ReactNode;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  activeFiltersCount?: number;
  activeFiltersSlot?: ReactNode;
  compactHelperText?: string;
  compactByDefault?: boolean;
}

export function UnifiedFilterPanel({
  title,
  subtitle,
  searchSlot,
  actionsSlot,
  filtersSlot,
  savedViewsSlot,
  footerSlot,
  expanded = true,
  onToggleExpanded,
  activeFiltersCount = 0,
  activeFiltersSlot,
  compactHelperText,
  compactByDefault = false,
}: UnifiedFilterPanelProps) {
  const isCompact = compactByDefault;
  const shouldShowExpanded = !isCompact || expanded;

  return (
    <section className="section-card overflow-visible">
      {isCompact ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              {title ? <h2 className="text-base font-semibold text-slate-900">{title}</h2> : null}
              <p className="mt-1 text-sm text-slate-500">
                {activeFiltersCount > 0
                  ? `${activeFiltersCount} filtro${activeFiltersCount > 1 ? 's' : ''} ativo${activeFiltersCount > 1 ? 's' : ''}`
                  : compactHelperText || 'Abra os filtros apenas quando precisar refinar o recorte.'}
              </p>
            </div>

            {onToggleExpanded ? (
              <div className="flex items-center justify-end">
                <FiltersToggleButton
                  expanded={expanded}
                  onToggle={onToggleExpanded}
                  count={activeFiltersCount}
                />
              </div>
            ) : null}
          </div>

          {activeFiltersSlot ? (
            <div className="flex flex-wrap items-center gap-2">{activeFiltersSlot}</div>
          ) : null}
        </div>
      ) : (title || subtitle || searchSlot || actionsSlot) ? (
        <div className="flex flex-col gap-4">
          {(title || subtitle) && (
            <div>
              {title ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : null}
              {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
            </div>
          )}
        </div>
      ) : null}

      {shouldShowExpanded ? (
        <>
          {(subtitle || searchSlot || actionsSlot) && isCompact ? (
            <div className="mt-5 flex flex-col gap-4">
              {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
              {(searchSlot || actionsSlot) && (
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">{searchSlot}</div>
                  {actionsSlot ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">{actionsSlot}</div>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}

          {!isCompact && (searchSlot || actionsSlot) ? (
            <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 flex-1">{searchSlot}</div>
              {actionsSlot ? (
                <div className="flex flex-wrap items-center justify-end gap-2">{actionsSlot}</div>
              ) : null}
            </div>
          ) : null}

          {filtersSlot ? <div className={`${title || subtitle || searchSlot || actionsSlot ? 'mt-5' : ''} overflow-visible`}>{filtersSlot}</div> : null}
          {savedViewsSlot ? <div className={`${filtersSlot || title || subtitle || searchSlot || actionsSlot ? 'mt-5' : ''}`}>{savedViewsSlot}</div> : null}
          {footerSlot ? <div className={`${savedViewsSlot || filtersSlot || title || subtitle || searchSlot || actionsSlot ? 'mt-5' : ''}`}>{footerSlot}</div> : null}
        </>
      ) : null}
    </section>
  );
}
