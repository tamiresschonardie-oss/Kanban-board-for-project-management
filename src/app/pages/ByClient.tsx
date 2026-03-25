import { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectModal } from '../components/ProjectModal';
import { Project } from '../types';
import { Building2, Briefcase } from 'lucide-react';

export function ByClient() {
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

  // Group by client
  const clients = Array.from(new Set(filteredProjects.map(p => p.client)));
  const projectsByClient = clients.map(client => ({
    name: client,
    projects: filteredProjects.filter(p => p.client === client),
  }));

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleSave = (project: Project) => {
    updateProject(project.id, project);
  };

  const getClientStats = (clientProjects: Project[]) => {
    const total = clientProjects.length;
    const avgProgress = total > 0 
      ? Math.round(clientProjects.reduce((sum, p) => sum + p.progress, 0) / total)
      : 0;
    const inProgress = clientProjects.filter(p => p.progress > 0 && p.progress < 100).length;
    const completed = clientProjects.filter(p => p.progress === 100).length;

    return { total, avgProgress, inProgress, completed };
  };

  return (
    <div className="px-8 py-6 space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-50 rounded-xl">
          <Building2 className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Projetos por Cliente</h1>
          <p className="text-gray-500 text-sm">Visualização organizada por cliente</p>
        </div>
      </div>

      {projectsByClient.map(({ name, projects: clientProjects }) => {
        const stats = getClientStats(clientProjects);
        
        return (
          <div key={name} className="space-y-4">
            {/* Client Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{name}</h2>
                    <p className="text-gray-500 text-sm mt-0.5">{stats.total} projetos</p>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                    <p className="text-xs text-gray-500 mt-1">Em andamento</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                    <p className="text-xs text-gray-500 mt-1">Concluídos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{stats.avgProgress}%</p>
                    <p className="text-xs text-gray-500 mt-1">Progresso médio</p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all"
                    style={{ width: `${stats.avgProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {clientProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => handleEdit(project)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {projectsByClient.length === 0 && (
        <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum projeto encontrado</p>
        </div>
      )}

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
