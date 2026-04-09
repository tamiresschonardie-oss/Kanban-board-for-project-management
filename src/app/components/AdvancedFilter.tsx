import { SearchableMultiSelect } from './filters/SearchableMultiSelect';

export interface FilterOption {
  value: string;
  label: string;
}

interface AdvancedFilterProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function AdvancedFilter({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Todos',
}: AdvancedFilterProps) {
  return (
    <div className="grid content-start gap-2">
      <label className="field-label min-h-[2.25rem]">{label}</label>
      <SearchableMultiSelect
        value={selected}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        allLabel="Todos"
        searchPlaceholder={`Buscar ${label.toLowerCase()}...`}
      />
    </div>
  );
}
