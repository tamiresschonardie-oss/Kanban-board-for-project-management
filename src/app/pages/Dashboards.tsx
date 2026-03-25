import { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectModal } from '../components/ProjectModal';
import { Project } from '../types';
import { TrendingUp, Clock, CheckCircle } from 'lucide-react';

export function Dashboards() {
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

  // Group by team
  const groups = ['Fábrica', 'AIO', 'Infra'];
  const projectsByGroup = groups.map(group => ({
    name: group,
    projects: filteredProjects.filter(p => p.group === group),
  }));

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleSave = (project: Project) => {
    updateProject(project.id, project);
  };

  const getGroupStats = (groupProjects: Project[]) => {
    const total = groupProjects.length;
    const avgProgress = total > 0 
      ? Math.round(groupProjects.reduce((sum, p) => sum + p.progress, 0) / total)
      : 0;
    const totalHours = groupProjects.reduce((sum, p) => sum + p.hoursRemaining, 0);
    const completed = groupProjects.filter(p => p.progress === 100).length;

    return { total, avgProgress, totalHours, completed };
  };

  return (
    <div className="px-8 py-6 space-y-8">
      {projectsByGroup.map(({ name, projects: groupProjects }) => {
        const stats = getGroupStats(groupProjects);
        
        return (
          <div key={name} className="space-y-4">
            {/* Group Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{name}</h2>
                <p className="text-gray-500 text-sm mt-1">{stats.total} projetos ativos</p>
              </div>
              
              {/* Stats Cards */}
              <div className="flex gap-4">
                <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Progresso Médio</p>
                    <p className="text-lg font-semibold text-gray-900">{stats.avgProgress}%</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Horas Totais</p>
                    <p className="text-lg font-semibold text-gray-900">{stats.totalHours}h</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Concluídos</p>
                    <p className="text-lg font-semibold text-gray-900">{stats.completed}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Projects Grid */}
            {groupProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => handleEdit(project)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                <p className="text-gray-500">Nenhum projeto nesta equipe</p>
              </div>
            )}
          </div>
        );
      })}

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
