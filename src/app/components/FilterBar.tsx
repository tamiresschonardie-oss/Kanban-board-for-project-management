import { ChevronDown } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';

export function FilterBar() {
  const { filters, setFilters, projects } = useProjects();

  // Get unique values for each filter
  const quadros = Array.from(new Set(projects.map(p => p.quadro)));
  const groups = Array.from(new Set(projects.map(p => p.group)));
  const clients = Array.from(new Set(projects.map(p => p.client)));
  const responsibles = Array.from(new Set(projects.map(p => p.responsible)));
  const projectNames = projects.map(p => p.name);

  return (
    <div className="bg-white border-b border-gray-200 px-8 py-4">
      <div className="flex gap-6 items-center">
        {/* Quadro */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Quadro</label>
          <div className="relative">
            <select
              value={filters.quadro}
              onChange={(e) => setFilters({ ...filters, quadro: e.target.value })}
              className="appearance-none bg-white border-0 text-gray-900 pr-8 py-1 cursor-pointer focus:outline-none"
            >
              <option value="Todos">Todos</option>
              {quadros.map(quadro => (
                <option key={quadro} value={quadro}>{quadro}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Grupo */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Grupo</label>
          <div className="relative">
            <select
              value={filters.group}
              onChange={(e) => setFilters({ ...filters, group: e.target.value })}
              className="appearance-none bg-white border-0 text-gray-900 pr-8 py-1 cursor-pointer focus:outline-none"
            >
              <option value="Todos">Todos</option>
              {groups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Cliente */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Cliente</label>
          <div className="relative">
            <select
              value={filters.client}
              onChange={(e) => setFilters({ ...filters, client: e.target.value })}
              className="appearance-none bg-white border-0 text-gray-900 pr-8 py-1 cursor-pointer focus:outline-none"
            >
              <option value="Todos">Todos</option>
              {clients.map(client => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Responsável */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Responsavel</label>
          <div className="relative">
            <select
              value={filters.responsible}
              onChange={(e) => setFilters({ ...filters, responsible: e.target.value })}
              className="appearance-none bg-white border-0 text-gray-900 pr-8 py-1 cursor-pointer focus:outline-none"
            >
              <option value="Todos">Todos</option>
              {responsibles.map(responsible => (
                <option key={responsible} value={responsible}>{responsible}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Projetos */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Projetos</label>
          <div className="relative">
            <select
              value={filters.project}
              onChange={(e) => setFilters({ ...filters, project: e.target.value })}
              className="appearance-none bg-white border-0 text-gray-900 pr-8 py-1 cursor-pointer focus:outline-none"
            >
              <option value="Todos">Todos</option>
              {projectNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
