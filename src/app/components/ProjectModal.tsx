import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Project, ProjectStatus } from '../types';

interface ProjectModalProps {
  project?: Project;
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
}

export function ProjectModal({ project, isOpen, onClose, onSave }: ProjectModalProps) {
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    responsible: '',
    client: '',
    group: 'Fábrica',
    status: 'backlog',
    logoColor: '#2563EB',
    logoText: '',
    progress: 0,
    tasksCompleted: 0,
    tasksTotal: 5,
    hoursRemaining: 80,
    tags: ['Tarefas'],
    quadro: '',
    deadline: '',
  });

  useEffect(() => {
    if (project) {
      setFormData(project);
    } else {
      setFormData({
        name: '',
        responsible: '',
        client: '',
        group: 'Fábrica',
        status: 'backlog',
        logoColor: '#2563EB',
        logoText: '',
        progress: 0,
        tasksCompleted: 0,
        tasksTotal: 5,
        hoursRemaining: 80,
        tags: ['Tarefas'],
        quadro: '',
        deadline: '',
      });
    }
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const projectData: Project = {
      id: project?.id || Math.random().toString(36).substr(2, 9),
      name: formData.name || '',
      responsible: formData.responsible || '',
      client: formData.client || '',
      group: formData.group || 'Fábrica',
      status: formData.status as ProjectStatus || 'backlog',
      logoColor: formData.logoColor || '#2563EB',
      logoText: formData.logoText || formData.name || '',
      progress: formData.progress || 0,
      tasksCompleted: formData.tasksCompleted || 0,
      tasksTotal: formData.tasksTotal || 5,
      hoursRemaining: formData.hoursRemaining || 80,
      tags: formData.tags || ['Tarefas'],
      quadro: formData.quadro || '',
      deadline: formData.deadline,
    };

    onSave(projectData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">
            {project ? 'Editar Projeto' : 'Criar Novo Projeto'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Nome */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Projeto *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite o nome do projeto"
              />
            </div>

            {/* Responsável */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsável *
              </label>
              <input
                type="text"
                required
                value={formData.responsible}
                onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome do responsável"
              />
            </div>

            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cliente *
              </label>
              <input
                type="text"
                required
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome do cliente"
              />
            </div>

            {/* Grupo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grupo *
              </label>
              <select
                value={formData.group}
                onChange={(e) => setFormData({ ...formData, group: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Fábrica">Fábrica</option>
                <option value="AIO">AIO</option>
                <option value="Infra">Infra</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="backlog">Backlog</option>
                <option value="pre-analysis">Pré análise</option>
                <option value="documentation">Documentação</option>
                <option value="waiting-approval">Aguardando aprovação</option>
                <option value="construction">Construção da solução</option>
              </select>
            </div>

            {/* Quadro */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quadro
              </label>
              <input
                type="text"
                value={formData.quadro}
                onChange={(e) => setFormData({ ...formData, quadro: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Crisdu labs H1/H2"
              />
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prazo de Entrega
              </label>
              <input
                type="text"
                value={formData.deadline || ''}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="DD/MM/AAAA"
              />
            </div>

            {/* Logo Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor do Logo
              </label>
              <input
                type="color"
                value={formData.logoColor}
                onChange={(e) => setFormData({ ...formData, logoColor: e.target.value })}
                className="w-full h-10 px-1 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Logo Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Texto do Logo
              </label>
              <input
                type="text"
                value={formData.logoText}
                onChange={(e) => setFormData({ ...formData, logoText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Texto exibido no card"
              />
            </div>

            {/* Progresso */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Progresso (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Horas Restantes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horas Restantes
              </label>
              <input
                type="number"
                min="0"
                value={formData.hoursRemaining}
                onChange={(e) => setFormData({ ...formData, hoursRemaining: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tarefas Concluídas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tarefas Concluídas
              </label>
              <input
                type="number"
                min="0"
                value={formData.tasksCompleted}
                onChange={(e) => setFormData({ ...formData, tasksCompleted: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Total de Tarefas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total de Tarefas
              </label>
              <input
                type="number"
                min="1"
                value={formData.tasksTotal}
                onChange={(e) => setFormData({ ...formData, tasksTotal: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {project ? 'Salvar Alterações' : 'Criar Projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
