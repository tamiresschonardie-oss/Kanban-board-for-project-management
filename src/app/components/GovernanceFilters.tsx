import { Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useProjects } from '../context/ProjectContext';

interface GovernanceFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  teamFilter: string;
  onTeamFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  phaseFilter: string;
  onPhaseFilterChange: (value: string) => void;
  responsibleFilter: string;
  onResponsibleFilterChange: (value: string) => void;
  productFilter: string;
  onProductFilterChange: (value: string) => void;
  yearFilter: string;
  onYearFilterChange: (value: string) => void;
}

export function GovernanceFilters({
  searchTerm,
  onSearchChange,
  teamFilter,
  onTeamFilterChange,
  statusFilter,
  onStatusFilterChange,
  phaseFilter,
  onPhaseFilterChange,
  responsibleFilter,
  onResponsibleFilterChange,
  productFilter,
  onProductFilterChange,
  yearFilter,
  onYearFilterChange,
}: GovernanceFiltersProps) {
  const { projects } = useProjects();
  const [showFilters, setShowFilters] = useState(true);

  // Extract unique values
  const teams = Array.from(new Set(projects.map(p => p.group)));
  const statuses = ['backlog', 'pre-analysis', 'documentation', 'waiting-approval', 'construction'];
  const statusLabels: Record<string, string> = {
    backlog: 'Backlog',
    'pre-analysis': 'Em análise',
    documentation: 'Documentação',
    'waiting-approval': 'Aguardando aprovação',
    construction: 'Em execução',
  };
  const responsibles = Array.from(new Set(projects.map(p => p.responsible)));
  const years = ['2024', '2025', '2026', '2027'];

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Search and Filter Toggle */}
      <div className="px-8 py-4 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar projetos..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
            showFilters
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="w-5 h-5" />
          <span className="font-medium">Filtros</span>
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="px-8 pb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Team */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Equipe
            </label>
            <select
              value={teamFilter}
              onChange={(e) => onTeamFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="Todos">Todas</option>
              {teams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="Todos">Todos</option>
              {statuses.map(status => (
                <option key={status} value={status}>{statusLabels[status]}</option>
              ))}
            </select>
          </div>

          {/* Phase */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Fase
            </label>
            <select
              value={phaseFilter}
              onChange={(e) => onPhaseFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="Todos">Todas</option>
              {statuses.map(status => (
                <option key={status} value={status}>{statusLabels[status]}</option>
              ))}
            </select>
          </div>

          {/* Responsible */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Responsável
            </label>
            <select
              value={responsibleFilter}
              onChange={(e) => onResponsibleFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="Todos">Todos</option>
              {responsibles.map(responsible => (
                <option key={responsible} value={responsible}>{responsible}</option>
              ))}
            </select>
          </div>

          {/* Product */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Produto
            </label>
            <select
              value={productFilter}
              onChange={(e) => onProductFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="Todos">Todos</option>
              <option value="Sistema Web">Sistema Web</option>
              <option value="App Mobile">App Mobile</option>
              <option value="Dashboard">Dashboard</option>
              <option value="Portal">Portal</option>
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Ano
            </label>
            <select
              value={yearFilter}
              onChange={(e) => onYearFilterChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="Todos">Todos</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
