import { useState } from 'react';
import { X, Calendar, Users, Building2, Package, Server, FolderKanban, Image as ImageIcon, Upload } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import { useEAP } from '../context/EAPContext';
import { useAdmin } from '../context/AdminContext';
import { Project, DemandType, Phase } from '../types';

interface EnhancedProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EnhancedProjectModal({ isOpen, onClose }: EnhancedProjectModalProps) {
  const { addProject } = useProjects();
  const { eapTemplates } = useEAP();
  const { teams, clients, users, products, systems, projectTypes, stakeholders } = useAdmin();
  
  const [formData, setFormData] = useState({
    name: '',
    team: '',
    responsible: '',
    client: '',
    product: '',
    system: '',
    projectType: '',
    demandType: '' as DemandType | '',
    requester: '',
    year: new Date().getFullYear().toString(),
    startDate: '',
    endDate: '',
    description: '',
    budget: '',
    coverImage: '',
    selectedStakeholders: [] as string[],
    eapStructureId: '',
  });

  /**
   * Clona template EAP para projeto, preservando ordem de fases e marcos
   * Gera IDs únicos para cada fase e marco (não reutiliza IDs do template)
   */
  const cloneEAPTemplate = (templateId: string): Phase[] => {
    const template = eapTemplates.find(t => t.id === templateId);
    if (!template) return [];

    const timestamp = Date.now();
    return template.phases
      .sort((a, b) => a.order - b.order)
      .map((phase, phaseIdx) => ({
        ...phase,
        id: `phase-${timestamp}-${phaseIdx}`,
        milestones: phase.milestones
          .sort((a, b) => a.order - b.order)
          .map((milestone, milestoneIdx) => ({
            ...milestone,
            id: `milestone-${timestamp}-${milestoneIdx}`,
          })),
      }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedProjectType = projectTypes.find(pt => pt.id === formData.projectType);
    
    // Determina as phases: EAP selecionada OU do tipo de projeto OU vazio
    let phases: Phase[] = [];
    let eapId: string | undefined = undefined;
    
    if (formData.eapStructureId) {
      // Se selecionou EAP, clona o template
      phases = cloneEAPTemplate(formData.eapStructureId);
      eapId = formData.eapStructureId;
    } else if (selectedProjectType?.defaultWBSTemplate) {
      // Se não selecionou EAP, usa default do tipo de projeto (compatibilidade)
      const timestamp = Date.now();
      phases = selectedProjectType.defaultWBSTemplate.map((phase, idx) => ({
        ...phase,
        id: `${timestamp}-phase-${idx}`,
        milestones: [],
      }));
    }
    // Se nenhuma EAP e nenhum tipo com template, phases fica vazio []
    
    const newProject: Project = {
      id: Date.now().toString(),
      name: formData.name,
      responsible: formData.responsible,
      client: formData.client,
      group: formData.team,
      status: 'backlog',
      logoColor: teams.find(t => t.name === formData.team)?.color || '#3B82F6',
      logoText: formData.name.substring(0, 2),
      progress: 0,
      tasksCompleted: 0,
      tasksTotal: 0,
      hoursRemaining: 0,
      tags: [],
      quadro: 'Backlog',
      startDate: formData.startDate,
      deadline: formData.endDate,
      description: formData.description,
      budget: formData.budget ? parseFloat(formData.budget) : undefined,
      coverImage: formData.coverImage || undefined,
      demandType: formData.demandType || undefined,
      requester: formData.requester || undefined,
      year: parseInt(formData.year),
      product: formData.product || undefined,
      stakeholders: formData.selectedStakeholders,
      eapId,
      phases,
      activities: [
        {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          user: formData.responsible,
          action: 'Projeto criado',
          details: `Projeto criado com estrutura "${
            formData.eapStructureId 
              ? eapTemplates.find(t => t.id === formData.eapStructureId)?.name || 'Padrão'
              : selectedProjectType?.name || 'Vazio'
          }"`,
        },
      ],
    };

    addProject(newProject);
    onClose();
    
    // Reset form
    setFormData({
      name: '',
      team: '',
      responsible: '',
      client: '',
      product: '',
      system: '',
      projectType: '',
      demandType: '',
      requester: '',
      year: new Date().getFullYear().toString(),
      startDate: '',
      endDate: '',
      description: '',
      budget: '',
      coverImage: '',
      selectedStakeholders: [],
      eapStructureId: '',
    });
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(u => u.team === formData.team);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Criar Novo Projeto</h2>
            <p className="text-sm text-gray-600 mt-1">
              Preencha as informações para criar um novo projeto
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome do Projeto *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Sistema de Vendas"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Equipe *
                </label>
                <select
                  required
                  value={formData.team}
                  onChange={(e) => setFormData({ ...formData, team: e.target.value, responsible: '' })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione uma equipe</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.name}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Responsável *
                </label>
                <select
                  required
                  value={formData.responsible}
                  onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                  disabled={!formData.team}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">Selecione um responsável</option>
                  {filteredUsers.map((user) => (
                    <option key={user.id} value={user.name}>
                      {user.name}
                    </option>
                  ))}
                </select>
                {!formData.team && (
                  <p className="text-xs text-gray-500 mt-1">Selecione uma equipe primeiro</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Cliente *
                </label>
                <select
                  required
                  value={formData.client}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.name}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  <FolderKanban className="w-4 h-4" />
                  Tipo de Projeto
                </label>
                <select
                  value={formData.projectType}
                  onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um tipo</option>
                  {projectTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  <FolderKanban className="w-4 h-4" />
                  Estrutura do Projeto
                </label>
                <select
                  value={formData.eapStructureId}
                  onChange={(e) => setFormData({ ...formData, eapStructureId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nenhuma (projeto vazio)</option>
                  {eapTemplates.filter(t => t.isActive).map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} • {template.phases.length} fase(s)
                      {template.description ? ` • ${template.description.substring(0, 30)}...` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Selecione uma estrutura para copiar fases e marcos. Deixe em branco para criar projeto sem estrutura.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tipo de Demanda
                </label>
                <select
                  value={formData.demandType}
                  onChange={(e) => setFormData({ ...formData, demandType: e.target.value as DemandType })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o tipo</option>
                  <option value="projeto">Projeto</option>
                  <option value="melhoria">Melhoria</option>
                  <option value="suporte">Suporte</option>
                  <option value="evolucao">Evolução</option>
                  <option value="experimentacao">Experimentação</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Solicitante
                </label>
                <input
                  type="text"
                  value={formData.requester}
                  onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
                  placeholder="Nome do solicitante"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Ano
                </label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  placeholder="2024"
                  min="2020"
                  max="2030"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Cover Image */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Imagem de Capa</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  URL da Imagem (1298x195px recomendado)
                </label>
                <input
                  type="url"
                  value={formData.coverImage}
                  onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 A capa será exibida no topo do card do projeto no Kanban
                </p>
              </div>

              {formData.coverImage && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <p className="text-xs font-medium text-gray-700 px-3 py-2 bg-gray-50 border-b">
                    Pré-visualização
                  </p>
                  <div className="h-24 relative">
                    <img
                      src={formData.coverImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '';
                        e.currentTarget.className = 'hidden';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stakeholders */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stakeholders Envolvidos</h3>
            <div className="space-y-2">
              {stakeholders.map((stakeholder) => (
                <label
                  key={stakeholder.id}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.selectedStakeholders.includes(stakeholder.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          selectedStakeholders: [...formData.selectedStakeholders, stakeholder.id],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          selectedStakeholders: formData.selectedStakeholders.filter(
                            (id) => id !== stakeholder.id
                          ),
                        });
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{stakeholder.name}</p>
                    <p className="text-sm text-gray-500">{stakeholder.role}</p>
                  </div>
                </label>
              ))}

              {stakeholders.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  Nenhum stakeholder cadastrado. Adicione na área de Administração.
                </p>
              )}
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Complementares</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Produto
                </label>
                <select
                  value={formData.product}
                  onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um produto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.name}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  Sistema
                </label>
                <select
                  value={formData.system}
                  onChange={(e) => setFormData({ ...formData, system: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um sistema</option>
                  {systems.map((system) => (
                    <option key={system.id} value={system.name}>
                      {system.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data de Início
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data de Término
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Orçamento (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="Ex: 50000.00"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Descreva o objetivo e escopo do projeto..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Template Info */}
          {formData.projectType && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <FolderKanban className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Template WBS será aplicado</p>
                  <p className="text-sm text-blue-700 mt-1">
                    O projeto será criado com a estrutura WBS padrão do tipo selecionado.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Criar Projeto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}