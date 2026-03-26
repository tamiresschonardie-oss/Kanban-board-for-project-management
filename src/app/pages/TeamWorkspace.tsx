import { useState } from "react";
import { useParams } from "react-router";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@radix-ui/react-tabs";
import {
  LayoutList,
  LayoutGrid,
  Users,
  Filter,
  X,
} from "lucide-react";
import { useProjects } from "../context/ProjectContext";
import { useAdmin } from "../context/AdminContext";
import { useTasks } from "../context/TaskContext";
import { ProjectListTable } from "../components/ProjectListTable";
import { ProjectDetailModal } from "../components/ProjectDetailModal";
import { Project, ProjectStatus } from "../types";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { getProjectExecutionStatus, getProjectExecutionStatusBadge } from "../utils/phaseStatusCalculator";

const KANBAN_COLUMNS: {
  id: ProjectStatus;
  label: string;
  color: string;
}[] = [
  { id: "backlog", label: "Backlog", color: "#E5E7EB" },
  { id: "pre-analysis", label: "Em análise", color: "#DBEAFE" },
  {
    id: "construction",
    label: "Em execução",
    color: "#D1FAE5",
  },
  {
    id: "waiting-approval",
    label: "Pausado",
    color: "#FEF3C7",
  },
  { id: "documentation", label: "Concluído", color: "#DCFCE7" },
];

interface KanbanCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  allTasks?: any[];
}

function KanbanCard({ project, onEdit, allTasks = [] }: KanbanCardProps) {
  // Calculate execution status if tasks available
  const executionStatus = project.phases && allTasks.length > 0 
    ? getProjectExecutionStatus(project, allTasks)
    : 'não-iniciado';
  const executionStatusBadge = getProjectExecutionStatusBadge(executionStatus);
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "PROJECT",
    item: { id: project.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const getRiskIndicator = () => {
    if (project.progress < 30 && project.hoursRemaining > 120) {
      return { color: "bg-red-500", label: "Alto risco" };
    } else if (
      project.progress < 60 &&
      project.hoursRemaining > 80
    ) {
      return { color: "bg-yellow-500", label: "Médio risco" };
    }
    return { color: "bg-green-500", label: "No prazo" };
  };

  const risk = getRiskIndicator();

  const statusLabels: Record<string, string> = {
    backlog: "Backlog",
    "pre-analysis": "Em análise",
    documentation: "Concluído",
    "waiting-approval": "Pausado",
    construction: "Em execução",
  };

  // Estilo diferenciado para projetos pausados
  const isPaused = project.isPaused;
  const cardClasses = isPaused
    ? "bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden cursor-pointer hover:shadow-md transition-all"
    : "bg-white rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md transition-all";

  return (
    <div
      ref={drag}
      onClick={() => onEdit(project)}
      className={`${cardClasses} ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {/* Cover Image */}
      {project.coverImage ? (
        <div className={`h-24 relative overflow-hidden ${isPaused ? 'opacity-40' : ''}`}>
          <img
            src={project.coverImage}
            alt={project.name}
            className="w-full h-full object-cover grayscale-[50%]"
          />
          {isPaused && (
            <div className="absolute inset-0 bg-gray-500/30 flex items-center justify-center">
              <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded">
                PAUSADO
              </span>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`h-24 relative ${isPaused ? 'opacity-40' : ''}`}
          style={{
            background: isPaused 
              ? 'linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)'
              : `linear-gradient(135deg, ${project.logoColor} 0%, ${project.logoColor}dd 100%)`,
          }}
        >
          {isPaused && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded">
                PAUSADO
              </span>
            </div>
          )}
        </div>
      )}

      <div className={`p-4 ${isPaused ? 'opacity-70' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <h3 className={`font-semibold text-sm ${isPaused ? 'text-gray-500' : 'text-gray-900'}`}>
            {project.name}
          </h3>
          <div
            className={`w-2 h-2 rounded-full ${risk.color}`}
            title={risk.label}
          />
        </div>

        <div className="mb-3">
          <span className="text-xs text-gray-500">
            Fase atual:
          </span>
          <p className={`text-sm font-medium mt-0.5 ${isPaused ? 'text-gray-500' : 'text-gray-700'}`}>
            {statusLabels[project.status]}
          </p>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">
              Progresso
            </span>
            <span className={`text-xs font-medium ${isPaused ? 'text-gray-500' : 'text-gray-900'}`}>
              {project.tasksCompleted}/{project.tasksTotal}{" "}
              marcos
            </span>
          </div>
          <div className={`h-1.5 rounded-full overflow-hidden ${isPaused ? 'bg-gray-200' : 'bg-gray-100'}`}>
            <div
              className={`h-full rounded-full transition-all ${isPaused ? 'bg-gray-400' : 'bg-blue-600'}`}
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className={`text-xs ${isPaused ? 'text-gray-500' : 'text-gray-600'}`}>{project.responsible}</span>
          <span className={`text-xs ${isPaused ? 'text-gray-400' : 'text-gray-500'}`}>{project.progress}%</span>
        </div>

        {/* Execution Status Badge */}
        {project.phases && (
          <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
            <span className="text-sm">{executionStatusBadge.emoji}</span>
            <span className={`text-xs font-medium ${isPaused ? 'text-gray-500' : 'text-gray-700'}`}>
              {executionStatusBadge.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  column: { id: ProjectStatus; label: string; color: string };
  projects: Project[];
  onDrop: (projectId: string, newStatus: ProjectStatus) => void;
  onEdit: (project: Project) => void;
  allTasks?: any[];
}

function KanbanColumn({
  column,
  projects,
  onDrop,
  onEdit,
  allTasks = [],
}: KanbanColumnProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "PROJECT",
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
        className={`space-y-3 min-h-[500px] ${isOver ? "bg-blue-50 rounded-lg p-2" : ""}`}
      >
        {projects.map((project) => (
          <KanbanCard
            key={project.id}
            project={project}
            onEdit={onEdit}
            allTasks={allTasks}
          />
        ))}
      </div>
    </div>
  );
}

function KanbanView({
  projects,
  onEdit,
  allTasks = [],
}: {
  projects: Project[];
  onEdit: (p: Project) => void;
  allTasks?: any[];
}) {
  const { updateProject } = useProjects();

  const handleDrop = (
    projectId: string,
    newStatus: ProjectStatus,
  ) => {
    updateProject(projectId, { status: newStatus });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex gap-4 overflow-x-auto pb-6">
        {KANBAN_COLUMNS.map((column) => {
          const columnProjects = projects.filter(
            (p) => p.status === column.id,
          );
          return (
            <KanbanColumn
              key={column.id}
              column={column}
              projects={columnProjects}
              onDrop={handleDrop}
              onEdit={onEdit}
              allTasks={allTasks}
            />
          );
        })}
      </div>
    </DndProvider>
  );
}

export function TeamWorkspace() {
  const { team } = useParams<{ team: string }>();
  const { projects, updateProject } = useProjects();
  const { clients, products, users } = useAdmin();
  const { allTasks } = useTasks();
  const [selectedProject, setSelectedProject] = useState<
    Project | undefined
  >();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    project: "",
    requester: "",
    year: "",
    client: "",
    product: "",
    responsible: "",
  });

  // Filter projects by team
  let teamProjects = projects.filter((p) => p.group === team);

  // Apply filters
  teamProjects = teamProjects.filter((p) => {
    if (
      filters.project &&
      !p.name
        .toLowerCase()
        .includes(filters.project.toLowerCase())
    )
      return false;
    if (filters.requester && p.requester !== filters.requester)
      return false;
    if (filters.year && p.year?.toString() !== filters.year)
      return false;
    if (filters.client && p.client !== filters.client)
      return false;
    if (filters.product && p.product !== filters.product)
      return false;
    if (
      filters.responsible &&
      p.responsible !== filters.responsible
    )
      return false;
    return true;
  });

  // Calculate team stats
  const stats = {
    total: teamProjects.length,
    inProgress: teamProjects.filter(
      (p) => p.progress > 0 && p.progress < 100,
    ).length,
    completed: teamProjects.filter((p) => p.progress === 100)
      .length,
    avgProgress:
      teamProjects.length > 0
        ? Math.round(
            teamProjects.reduce(
              (sum, p) => sum + p.progress,
              0,
            ) / teamProjects.length,
          )
        : 0,
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleSave = (project: Project) => {
    updateProject(project.id, project);
  };

  const clearFilters = () => {
    setFilters({
      project: "",
      requester: "",
      year: "",
      client: "",
      product: "",
      responsible: "",
    });
  };

  const hasActiveFilters = Object.values(filters).some(
    (v) => v !== "",
  );

  // Team colors
  const teamColors: Record<string, string> = {
    Fábrica: "from-blue-500 to-blue-600",
    AIO: "from-purple-500 to-purple-600",
    Infra: "from-green-500 to-green-600",
  };

  const teamColor =
    teamColors[team || ""] || "from-gray-500 to-gray-600";

  // Get unique values for filters
  const uniqueRequesters = Array.from(
    new Set(
      projects
        .filter((p) => p.requester)
        .map((p) => p.requester!),
    ),
  );
  const uniqueYears = Array.from(
    new Set(
      projects
        .filter((p) => p.year)
        .map((p) => p.year!.toString()),
    ),
  );
  const uniqueResponsibles = Array.from(
    new Set(projects.map((p) => p.responsible)),
  );

  return (
    <div>
      {/* Team Header */}
      <div
        className={`bg-gradient-to-r ${teamColor} text-white px-8 py-8`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/20 backdrop-blur-sm rounded-xl">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">
                Workspace - {team}
              </h1>
              <p className="text-white/90">
                Gerencie todos os projetos da equipe {team}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4">
              <p className="text-white/80 text-sm mb-1">
                Total de Projetos
              </p>
              <p className="text-3xl font-bold">
                {stats.total}
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4">
              <p className="text-white/80 text-sm mb-1">
                Em Andamento
              </p>
              <p className="text-3xl font-bold">
                {stats.inProgress}
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4">
              <p className="text-white/80 text-sm mb-1">
                Concluídos
              </p>
              <p className="text-3xl font-bold">
                {stats.completed}
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4">
              <p className="text-white/80 text-sm mb-1">
                Progresso Médio
              </p>
              <p className="text-3xl font-bold">
                {stats.avgProgress}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-4 bg-white border-b">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-5 h-5 text-gray-500" />

          <input
            type="text"
            placeholder="Buscar projeto..."
            value={filters.project}
            onChange={(e) =>
              setFilters({
                ...filters,
                project: e.target.value,
              })
            }
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={filters.requester}
            onChange={(e) =>
              setFilters({
                ...filters,
                requester: e.target.value,
              })
            }
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Solicitante</option>
            {uniqueRequesters.map((req) => (
              <option key={req} value={req}>
                {req}
              </option>
            ))}
          </select>

          <select
            value={filters.year}
            onChange={(e) =>
              setFilters({ ...filters, year: e.target.value })
            }
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Ano</option>
            {uniqueYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select
            value={filters.client}
            onChange={(e) =>
              setFilters({ ...filters, client: e.target.value })
            }
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.name}>
                {client.name}
              </option>
            ))}
          </select>

          <select
            value={filters.product}
            onChange={(e) =>
              setFilters({
                ...filters,
                product: e.target.value,
              })
            }
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Produto</option>
            {products.map((prod) => (
              <option key={prod.id} value={prod.name}>
                {prod.name}
              </option>
            ))}
          </select>

          <select
            value={filters.responsible}
            onChange={(e) =>
              setFilters({
                ...filters,
                responsible: e.target.value,
              })
            }
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Responsável</option>
            {uniqueResponsibles.map((resp) => (
              <option key={resp} value={resp}>
                {resp}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="kanban" className="px-8 py-6">
        <TabsList className="inline-flex items-center gap-1 bg-gray-100 p-1 rounded-lg mb-6">
          <TabsTrigger
            value="kanban"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
          >
            <LayoutGrid className="w-4 h-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger
            value="list"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
          >
            <LayoutList className="w-4 h-4" />
            Lista de Projetos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          {teamProjects.length > 0 ? (
            <KanbanView
              projects={teamProjects}
              onEdit={handleEdit}
              allTasks={allTasks}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum projeto encontrado
              </h3>
              <p className="text-gray-500">
                {hasActiveFilters
                  ? "Tente ajustar os filtros para ver mais projetos."
                  : "Esta equipe ainda não possui projetos cadastrados."}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="list">
          {teamProjects.length > 0 ? (
            <ProjectListTable
              projects={teamProjects}
              onEdit={handleEdit}
            />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum projeto encontrado
              </h3>
              <p className="text-gray-500">
                {hasActiveFilters
                  ? "Tente ajustar os filtros para ver mais projetos."
                  : "Esta equipe ainda não possui projetos cadastrados."}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ProjectDetailModal
        project={selectedProject!}
        isOpen={isModalOpen && !!selectedProject}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProject(undefined);
        }}
      />
    </div>
  );
}