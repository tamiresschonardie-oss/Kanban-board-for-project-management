import { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { ProjectModal } from '../components/ProjectModal';
import { Project } from '../types';
import { Calendar, Edit2 } from 'lucide-react';

export function GanttView() {
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

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleSave = (project: Project) => {
    updateProject(project.id, project);
  };

  // Generate months for timeline (current month + 3 months)
  const months = ['Mar 2026', 'Abr 2026', 'Mai 2026', 'Jun 2026'];

  return (
    <div className="px-8 py-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Timeline de Projetos</h2>
        </div>

        {/* Timeline */}
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Timeline Header */}
            <div className="flex border-b border-gray-200">
              <div className="w-80 flex-shrink-0 bg-gray-50 p-4 font-medium text-gray-700 border-r border-gray-200">
                Projeto
              </div>
              <div className="flex-1 flex">
                {months.map((month) => (
                  <div
                    key={month}
                    className="flex-1 bg-gray-50 p-4 text-center font-medium text-gray-700 border-r border-gray-200 last:border-r-0"
                  >
                    {month}
                  </div>
                ))}
              </div>
            </div>

            {/* Projects */}
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project, index) => {
                // Calculate bar position and width based on progress
                const startMonth = index % 3; // Mock start position
                const duration = Math.ceil(project.hoursRemaining / 160); // ~1 month = 160h
                const monthWidth = 100 / months.length;

                return (
                  <div key={project.id} className="flex border-b border-gray-200 hover:bg-gray-50">
                    {/* Project Info */}
                    <div className="w-80 flex-shrink-0 p-4 border-r border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{project.name}</h3>
                          <p className="text-sm text-gray-500 mt-0.5">{project.responsible}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="text-xs text-gray-500">
                              {project.tasksCompleted}/{project.tasksTotal} tarefas
                            </div>
                            <div className="text-xs font-medium text-blue-600">
                              {project.progress}%
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleEdit(project)}
                          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="flex-1 p-4 relative">
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-8 rounded-lg flex items-center px-3 text-white text-xs font-medium"
                        style={{
                          backgroundColor: project.logoColor,
                          left: `${startMonth * monthWidth}%`,
                          width: `${Math.min(duration * monthWidth, 100 - startMonth * monthWidth)}%`,
                          opacity: 0.9,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 bg-white/30 rounded-full flex-1 overflow-hidden"
                            style={{ minWidth: '60px' }}
                          >
                            <div
                              className="h-full bg-white rounded-full"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span>{project.progress}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-gray-500">
                Nenhum projeto para exibir
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span>Em andamento</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span>Concluído</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-600 rounded"></div>
              <span>Atrasado</span>
            </div>
          </div>
        </div>
      </div>

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
