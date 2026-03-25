import { useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectDetailModal } from '../components/ProjectDetailModal';
import { useProjects } from '../context/ProjectContext';
import { Project, ProjectStatus } from '../types';

const COLUMNS: { id: ProjectStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: '#FED7AA' },
  { id: 'pre-analysis', label: 'Pré análise', color: '#BFDBFE' },
  { id: 'documentation', label: 'Documentação', color: '#FECACA' },
  { id: 'waiting-approval', label: 'Aguardando aprovação', color: '#F5D0FE' },
  { id: 'construction', label: 'Construção da solução', color: '#FEF08A' },
];

interface DraggableCardProps {
  project: Project;
  onEdit: (project: Project) => void;
}

function DraggableCard({ project, onEdit }: DraggableCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'PROJECT',
    item: { id: project.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div ref={drag}>
      <ProjectCard project={project} onClick={() => onEdit(project)} isDragging={isDragging} />
    </div>
  );
}

interface ColumnProps {
  column: { id: ProjectStatus; label: string; color: string };
  projects: Project[];
  onDrop: (projectId: string, newStatus: ProjectStatus) => void;
  onEdit: (project: Project) => void;
}

function Column({ column, projects, onDrop, onEdit }: ColumnProps) {
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
    <div className="flex-shrink-0 w-80">
      <div
        className="rounded-2xl px-4 py-2 mb-4 text-center font-medium"
        style={{ backgroundColor: column.color }}
      >
        {column.label}
      </div>
      <div
        ref={drop}
        className={`space-y-4 min-h-[400px] ${isOver ? 'bg-blue-50 rounded-xl' : ''}`}
      >
        {projects.map((project) => (
          <DraggableCard key={project.id} project={project} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}

function KanbanContent() {
  const { projects, filters, updateProject } = useProjects();
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter projects
  const filteredProjects = projects.filter((project) => {
    if (filters.quadro !== 'Todos' && project.quadro !== filters.quadro) return false;
    if (filters.group !== 'Todos' && project.group !== filters.group) return false;
    if (filters.client !== 'Todos' && project.client !== filters.client) return false;
    if (filters.responsible !== 'Todos' && project.responsible !== filters.responsible) return false;
    if (filters.project !== 'Todos' && project.name !== filters.project) return false;
    return true;
  });

  const handleDrop = (projectId: string, newStatus: ProjectStatus) => {
    updateProject(projectId, { status: newStatus });
  };

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="flex gap-6 overflow-x-auto pb-8 px-8">
        {COLUMNS.map((column) => {
          const columnProjects = filteredProjects.filter((p) => p.status === column.id);
          return (
            <Column
              key={column.id}
              column={column}
              projects={columnProjects}
              onDrop={handleDrop}
              onEdit={handleEdit}
            />
          );
        })}
      </div>

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedProject(undefined);
          }}
        />
      )}
    </>
  );
}

export function KanbanView() {
  return (
    <DndProvider backend={HTML5Backend}>
      <KanbanContent />
    </DndProvider>
  );
}