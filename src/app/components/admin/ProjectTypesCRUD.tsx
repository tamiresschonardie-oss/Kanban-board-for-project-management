import { useState } from 'react';
import { Plus, Edit2, Trash2, FolderKanban, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { ProjectType, Phase } from '../../types';

interface PhaseFormData {
  name: string;
  description: string;
}

export function ProjectTypesCRUD() {
  const { projectTypes, addProjectType, updateProjectType, deleteProjectType } = useAdmin();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectType | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    name: '',
    description: '',
    phases: [] as PhaseFormData[],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create WBS template from phases with descriptions
    const wbsTemplate: Phase[] = form.phases.map((phase, index) => ({
      id: `phase-${Date.now()}-${index}`,
      name: phase.name,
      description: phase.description || undefined,
      order: index,
      milestones: [],
    }));

    if (editing) {
      updateProjectType(editing.id, {
        name: form.name,
        description: form.description,
        defaultWBSTemplate: wbsTemplate,
      });
    } else {
      addProjectType({
        id: Date.now().toString(),
        name: form.name,
        description: form.description,
        defaultWBSTemplate: wbsTemplate,
        createdAt: new Date().toISOString(),
      });
    }
    closeModal();
  };

  const openModal = (projectType?: ProjectType) => {
    if (projectType) {
      setEditing(projectType);
      setForm({
        name: projectType.name,
        description: projectType.description || '',
        phases: projectType.defaultWBSTemplate?.map((p) => ({
          name: p.name,
          description: p.description || '',
        })) || [],
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditing(null);
    setForm({ name: '', description: '', phases: [] });
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTypes(newExpanded);
  };

  const addPhase = () => {
    setForm({ ...form, phases: [...form.phases, { name: '', description: '' }] });
  };

  const removePhase = (index: number) => {
    setForm({ ...form, phases: form.phases.filter((_, i) => i !== index) });
  };

  const updatePhase = (index: number, field: keyof PhaseFormData, value: string) => {
    const newPhases = [...form.phases];
    newPhases[index][field] = value;
    setForm({ ...form, phases: newPhases });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Tipos de Projeto</h2>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Novo Tipo
        </button>
      </div>

      <div className="space-y-4">
        {projectTypes.map((projectType) => (
          <div
            key={projectType.id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <button
                  onClick={() => toggleExpand(projectType.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {expandedTypes.has(projectType.id) ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  )}
                </button>

                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <FolderKanban className="w-6 h-6 text-purple-600" />
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{projectType.name}</h3>
                  {projectType.description && (
                    <p className="text-sm text-gray-600 mt-1">{projectType.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {projectType.defaultWBSTemplate?.length || 0} fase(s) no template
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openModal(projectType)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={() => {
                    if (confirm('Excluir este tipo de projeto?')) deleteProjectType(projectType.id);
                  }}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedTypes.has(projectType.id) && projectType.defaultWBSTemplate && (
              <div className="px-6 pb-6 border-t border-gray-200">
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Template de Fases (EAP):
                  </h4>
                  <div className="space-y-2">
                    {projectType.defaultWBSTemplate.map((phase, index) => (
                      <div
                        key={phase.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{phase.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {projectTypes.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum tipo de projeto cadastrado
            </h3>
            <p className="text-gray-500">
              Crie tipos de projeto com templates de EAP para padronizar a criação
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <h2 className="text-xl font-bold">
                {editing ? 'Editar Tipo de Projeto' : 'Novo Tipo de Projeto'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Sistema Web, Integração, App Mobile"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Template de Fases (EAP)
                  </label>
                  <button
                    type="button"
                    onClick={addPhase}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Fase
                  </button>
                </div>

                <div className="space-y-2 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  {form.phases.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Nenhuma fase adicionada. Clique em "Adicionar Fase" para começar.
                    </p>
                  ) : (
                    form.phases.map((phase, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          required
                          value={phase.name}
                          onChange={(e) => updatePhase(index, 'name', e.target.value)}
                          placeholder={`Ex: ${
                            index === 0
                              ? 'Análise'
                              : index === 1
                              ? 'Documentação'
                              : index === 2
                              ? 'Desenvolvimento'
                              : index === 3
                              ? 'Testes'
                              : 'Homologação'
                          }`}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                        <textarea
                          value={phase.description}
                          onChange={(e) => updatePhase(index, 'description', e.target.value)}
                          rows={2}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          placeholder="Descrição da fase"
                        />
                        <button
                          type="button"
                          onClick={() => removePhase(index)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  💡 Essas fases serão criadas automaticamente ao criar um projeto deste tipo
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editing ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}