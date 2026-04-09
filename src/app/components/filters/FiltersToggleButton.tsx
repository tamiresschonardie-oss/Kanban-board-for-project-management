import { SlidersHorizontal } from 'lucide-react';

interface FiltersToggleButtonProps {
  expanded: boolean;
  onToggle: () => void;
  label?: string;
  count?: number;
}

export function FiltersToggleButton({
  expanded,
  onToggle,
  label = 'Filtros',
  count = 0,
}: FiltersToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm transition-all ${
        expanded
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-50'
      }`}
    >
      <SlidersHorizontal className="h-4 w-4" />
      <span className="font-medium">{label}</span>
      {count > 0 ? (
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            expanded ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
