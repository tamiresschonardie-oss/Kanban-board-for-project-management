import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { LayoutList, LayoutGrid } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import { KPIHeader } from '../components/KPIHeader';
import { GovernanceFilters } from '../components/GovernanceFilters';
import { ProjectListTable } from '../components/ProjectListTable';
import { ProjectModal } from '../components/ProjectModal';
import { Project } from '../types';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ProjectStatus } from '../types';

const KANBAN_COLUMNS: { id: ProjectStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: '#E5E7EB' },
  { id: 'pre-analysis', label: 'Em análise', color: '#DBEAFE' },
  { id: 'construction', label: 'Em execução', color: '#D1FAE5' },
  { id: 'waiting-approval', label: 'Pausado', color: '#FEF3C7' },
  { id: 'documentation', label: 'Concluído', color: '#DCFCE7' },
];

interface KanbanCardProps {
  project: Project;
  onEdit: (project: Project) => void;
}

function KanbanCard({ project, onEdit }: KanbanCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'PROJECT',
    item: { id: project.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  // Determine risk level
  const getRiskIndicator = () => {
    if (project.progress < 30 && project.hoursRemaining > 120) {
      return { color: 'bg-red-500', label: 'Alto risco' };
    } else if (project.progress < 60 && project.hoursRemaining > 80) {
      return { color: 'bg-yellow-500', label: 'Médio risco' };
    }
    return { color: 'bg-green-500', label: 'No prazo' };
  };

  const risk = getRiskIndicator();

  const statusLabels: Record<string, string> = {
    backlog: 'Backlog',
    'pre-analysis': 'Em análise',
    documentation: 'Concluído',
    'waiting-approval': 'Pausado',
    construction: 'Em execução',
  };

  return (
    <div
      ref={drag}
      onClick={() => onEdit(project)}
      className={`bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-sm">{project.name}</h3>
        <div className={`w-2 h-2 rounded-full ${risk.color}`} title={risk.label} />
      </div>

      {/* Current Phase */}
      <div className="mb-3">
        <span className="text-xs text-gray-500">Fase atual:</span>
        <p className="text-sm font-medium text-gray-700 mt-0.5">
          {statusLabels[project.status]}
        </p>
      </div>

      {/* Milestone Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Progresso</span>
          <span className="text-xs font-medium text-gray-900">
            {project.tasksCompleted}/{project.tasksTotal} marcos
          </span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      {/* Team Badge */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
          {project.group}
        </span>
        <span className="text-xs text-gray-500">{project.progress}%</span>
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  column: { id: ProjectStatus; label: string; color: string };
  projects: Project[];
  onDrop: (projectId: string, newStatus: ProjectStatus) => void;
  onEdit: (project: Project) => void;
}

function KanbanColumn({ column, projects, onDrop, onEdit }: KanbanColumnProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'PROJECT',
    drop: (item: { id: string }) => {
      onDrop(item.id, column.id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div className="flex-shrink-0 w-72">
      <div
        className="rounded-lg px-3 py-2 mb-3 text-sm font-medium"
        style={{ backgroundColor: column.color }}
      >
        <div className="flex items-center justify-between">
          <span>{column.label}</span>
          <span className="bg-white/50 px-2 py-0.5 rounded text-xs">
            {projects.length}
          </span>
        </div>
      </div>
      <div
        ref={drop}
        className={`space-y-3 min-h-[500px] ${isOver ? 'bg-blue-50 rounded-lg p-2' : ''}`}
      >
        {projects.map((project) => (
          <KanbanCard key={project.id} project={project} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}

function KanbanView({ projects, onEdit }: { projects: Project[]; onEdit: (p: Project) => void }) {
  const { updateProject } = useProjects();

  const handleDrop = (projectId: string, newStatus: ProjectStatus) => {
    updateProject(projectId, { status: newStatus });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex gap-4 overflow-x-auto pb-6">
        {KANBAN_COLUMNS.map((column) => {
          const columnProjects = projects.filter((p) => p.status === column.id);
          return (
            <KanbanColumn
              key={column.id}
              column={column}
              projects={columnProjects}
              onDrop={handleDrop}
              onEdit={onEdit}
            />
          );
        })}
      </div>
    </DndProvider>
  );
}

export function Governance() {
  const { projects, updateProject } = useProjects();
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [phaseFilter, setPhaseFilter] = useState('Todos');
  const [responsibleFilter, setResponsibleFilter] = useState('Todos');
  const [productFilter, setProductFilter] = useState('Todos');
  const [yearFilter, setYearFilter] = useState('Todos');

  // Apply filters
  const filteredProjects = projects.filter((project) => {
    if (searchTerm && !project.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (teamFilter !== 'Todos' && project.group !== teamFilter) return false;
    if (statusFilter !== 'Todos' && project.status !== statusFilter) return false;
    if (phaseFilter !== 'Todos' && project.status !== phaseFilter) return false;
    if (responsibleFilter !== 'Todos' && project.responsible !== responsibleFilter) return false;
    // Product and year filters would need additional fields in the project model
    return true;
  });

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleSave = (project: Project) => {
    updateProject(project.id, project);
  };

  return (
    <div>
      {/* KPI Header */}
      <KPIHeader />

      {/* Filters */}
      <GovernanceFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        teamFilter={teamFilter}
        onTeamFilterChange={setTeamFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        phaseFilter={phaseFilter}
        onPhaseFilterChange={setPhaseFilter}
        responsibleFilter={responsibleFilter}
        onResponsibleFilterChange={setResponsibleFilter}
        productFilter={productFilter}
        onProductFilterChange={setProductFilter}
        yearFilter={yearFilter}
        onYearFilterChange={setYearFilter}
      />

      {/* Tabs */}
      <Tabs defaultValue="list" className="px-8 py-6">
        <TabsList className="inline-flex items-center gap-1 bg-gray-100 p-1 rounded-lg mb-6">
          <TabsTrigger
            value="list"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
          >
            <LayoutList className="w-4 h-4" />
            Lista
          </TabsTrigger>
          <TabsTrigger
            value="kanban"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
          >
            <LayoutGrid className="w-4 h-4" />
            Kanban
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <ProjectListTable projects={filteredProjects} onEdit={handleEdit} />
        </TabsContent>

        <TabsContent value="kanban">
          <KanbanView projects={filteredProjects} onEdit={handleEdit} />
        </TabsContent>
      </Tabs>

      <ProjectModal
        project={selectedProject}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProject(undefined);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
