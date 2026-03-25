import { useState } from 'react';
import { Edit2, Trash2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Project } from '../types';
import { useProjects } from '../context/ProjectContext';
import { useNavigate } from 'react-router';

interface ProjectListTableProps {
  projects: Project[];
  onEdit: (project: Project) => void;
}

type SortField = 'name' | 'group' | 'status' | 'progress' | 'responsible';
type SortDirection = 'asc' | 'desc';

const statusLabels: Record<string, string> = {
  backlog: 'Backlog',
  'pre-analysis': 'Em análise',
  documentation: 'Documentação',
  'waiting-approval': 'Aguardando aprovação',
  construction: 'Em execução',
};

const statusColors: Record<string, string> = {
  backlog: 'bg-gray-100 text-gray-700',
  'pre-analysis': 'bg-blue-100 text-blue-700',
  documentation: 'bg-purple-100 text-purple-700',
  'waiting-approval': 'bg-yellow-100 text-yellow-700',
  construction: 'bg-green-100 text-green-700',
};

export function ProjectListTable({ projects, onEdit }: ProjectListTableProps) {
  const { deleteProject } = useProjects();
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedProjects = [...projects].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';

    switch (sortField) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'group':
        aVal = a.group.toLowerCase();
        bVal = b.group.toLowerCase();
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      case 'progress':
        aVal = a.progress;
        bVal = b.progress;
        break;
      case 'responsible':
        aVal = a.responsible.toLowerCase();
        bVal = b.responsible.toLowerCase();
        break;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-blue-600" />
    );
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir este projeto?')) {
      deleteProject(id);
    }
  };

  const handleRowClick = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-2 font-medium text-gray-700 hover:text-gray-900"
                >
                  Nome do Projeto
                  <SortIcon field="name" />
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('group')}
                  className="flex items-center gap-2 font-medium text-gray-700 hover:text-gray-900"
                >
                  Equipe
                  <SortIcon field="group" />
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-2 font-medium text-gray-700 hover:text-gray-900"
                >
                  Fase Atual
                  <SortIcon field="status" />
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('progress')}
                  className="flex items-center gap-2 font-medium text-gray-700 hover:text-gray-900"
                >
                  Progresso
                  <SortIcon field="progress" />
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="font-medium text-gray-700">Status</span>
              </th>
              <th className="px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('responsible')}
                  className="flex items-center gap-2 font-medium text-gray-700 hover:text-gray-900"
                >
                  Responsável
                  <SortIcon field="responsible" />
                </button>
              </th>
              <th className="px-6 py-4 text-left">
                <span className="font-medium text-gray-700">Datas</span>
              </th>
              <th className="px-6 py-4 text-right">
                <span className="font-medium text-gray-700">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedProjects.map((project) => (
              <tr
                key={project.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleRowClick(project.id)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                      style={{ backgroundColor: project.logoColor }}
                    >
                      {project.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{project.name}</p>
                      <p className="text-sm text-gray-500">ID: {project.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                    {project.group}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[project.status]}`}>
                    {statusLabels[project.status]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-[120px]">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {project.progress}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600">
                    {project.tasksCompleted}/{project.tasksTotal} marcos
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {project.responsible.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <span className="text-sm text-gray-900">{project.responsible}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-600">
                    {project.deadline ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-500">Término:</span>
                        <span className="font-medium">{project.deadline}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Não definido</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(project.id);
                      }}
                      className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver detalhes"
                    >
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(project);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, project.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedProjects.length === 0 && (
        <div className="p-12 text-center text-gray-500">
          Nenhum projeto encontrado
        </div>
      )}
    </div>
  );
}