import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

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
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options based on search
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((opt) => opt.value));
    }
  };

  const getDisplayText = () => {
    if (selected.length === 0) {
      return placeholder;
    } else if (selected.length === 1) {
      const option = options.find((opt) => opt.value === selected[0]);
      return option?.label || placeholder;
    } else if (selected.length === options.length) {
      return 'Todos';
    } else {
      return `${selected.length} selecionados`;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`min-w-[180px] px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center justify-between ${
          isOpen ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
        }`}
      >
        <div className="flex-1">
          <span className="text-xs text-gray-500 block mb-0.5">{label}</span>
          <span className="text-gray-900 font-medium">{getDisplayText()}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Select All */}
          <div className="px-3 py-2 border-b border-gray-100">
            <label className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={selected.length === options.length}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900">Todos</span>
            </label>
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Nenhum resultado encontrado
              </div>
            ) : (
              <div className="py-2">
                {filteredOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(option.value)}
                      onChange={() => handleToggle(option.value)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {selected.length > 0 && (
            <div className="p-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <span className="text-xs text-gray-600">
                {selected.length} selecionado{selected.length > 1 ? 's' : ''}
              </span>
              <button
                onClick={() => onChange([])}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Limpar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
