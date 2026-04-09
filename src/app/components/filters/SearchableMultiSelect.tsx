import { Check, ChevronDown, Search, X } from 'lucide-react';
import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface SearchableMultiSelectOption {
  value: string;
  label: string;
}

interface SearchableMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: SearchableMultiSelectOption[];
  placeholder?: string;
  allLabel?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

export function SearchableMultiSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecionar opcoes',
  allLabel,
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Nenhuma opcao encontrada.',
  disabled = false,
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      return;
    }

    const timeoutId = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        containerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportWidth = window.innerWidth;
      const horizontalPadding = 16;
      const maxWidth = Math.min(420, viewportWidth - horizontalPadding * 2);
      const width = Math.min(Math.max(rect.width, 280), maxWidth);
      const left = Math.min(
        Math.max(rect.left, horizontalPadding),
        viewportWidth - width - horizontalPadding
      );

      setPanelStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left,
        width,
        zIndex: 9999,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const selectedOptions = useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return options;

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedSearch)
    );
  }, [options, searchTerm]);

  const toggleValue = (nextValue: string) => {
    if (disabled) return;

    onChange(
      value.includes(nextValue)
        ? value.filter((item) => item !== nextValue)
        : [...value, nextValue]
    );
  };

  const clearSelection = () => {
    if (disabled) return;
    onChange([]);
  };

  const selectAll = () => {
    if (disabled) return;
    onChange(options.map((option) => option.value));
  };

  const allSelected = options.length > 0 && value.length === options.length;

  const triggerLabel = (() => {
    if (selectedOptions.length === 0) return placeholder;
    if (selectedOptions.length === 1) return selectedOptions[0].label;
    if (selectedOptions.length <= 2) {
      return selectedOptions.map((option) => option.label).join(', ');
    }
    return `${selectedOptions.length} selecionados`;
  })();

  return (
    <div ref={containerRef} className="relative space-y-3">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-all ${
          disabled
            ? 'cursor-not-allowed bg-slate-100 text-slate-400'
            : 'hover:border-slate-300 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30'
        }`}
      >
        <span className={`truncate text-left ${selectedOptions.length > 0 ? 'text-slate-900' : 'text-slate-500'}`}>
          {triggerLabel}
        </span>
        <ChevronDown
          className={`ml-3 h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen &&
        !disabled &&
        createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            className="overflow-hidden rounded-[24px] border border-white/70 bg-white/95 shadow-[0_24px_60px_rgba(15,23,42,0.14)] backdrop-blur-xl"
          >
            <div className="border-b border-slate-100 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs font-semibold text-slate-900 hover:text-blue-700"
                >
                  Selecionar todos
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  Limpar
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto p-2">
              {allLabel && (
                <button
                  type="button"
                  onClick={allSelected ? clearSelection : selectAll}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded border border-slate-300 bg-white">
                    {allSelected && <Check className="h-3 w-3 text-blue-600" />}
                  </span>
                  <span>{allLabel}</span>
                </button>
              )}

              {filteredOptions.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-slate-500">{emptyMessage}</div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = value.includes(option.value);

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleValue(option.value)}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-600'
                            : 'border-slate-300 bg-white text-transparent'
                        }`}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="truncate">{option.label}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700"
            >
              <span className="max-w-[220px] truncate">{option.label}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => toggleValue(option.value)}
                  className="rounded-full p-0.5 hover:bg-slate-200"
                  aria-label={`Remover ${option.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
