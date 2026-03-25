import { useState, useEffect } from 'react';
import { X, Calendar, Users, Building2, Package, Upload, Paperclip, User, Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useProjects } from '../context/ProjectContext';
import { useTasks } from '../context/TaskContext';
import { WBSTask, DemandType, Subtask } from '../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string; // Optional: se informado, tarefa vinculada ao projeto
  milestoneId?: string; // Optional: marco específico do projeto
  editingTask?: any; // Optional: se informado, edita task existente
}

export function TaskModal({ isOpen, onClose, projectId, milestoneId, editingTask }: TaskModalProps) {
  const { clients, products, users, stakeholders } = useAdmin();
  const { projects, updateProject } = useProjects();
  const { addIndependentTask } = useTasks();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    attachments: [] as string[],
    client: '',
    product: '',
    assignee: '',
    requester: '', // Solicitante (obrigatório)
    selectedStakeholders: [] as string[],
    demandType: '' as DemandType | '', // Tipo (obrigatório)
    dueDate: '',
    startDate: '',
    priority: '' as 'low' | 'medium' | 'high' | '', // Prioridade (obrigatório)
    selectedProjectId: projectId || '',
    selectedPhaseId: '',
    selectedMilestoneId: milestoneId || '',
    link: '', // Link opcional
    systems: [] as string[], // Sistemas envolvidos
  });

  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());

  // Pre-fill form when editing task
  useEffect(() => {
    if (editingTask) {
      setFormData({
        title: editingTask.title || '',
        description: editingTask.description || '',
        attachments: [],
        client: '',
        product: '',
        assignee: editingTask.assignee || '',
        requester: '',
        selectedStakeholders: [],
        demandType: '' as DemandType | '',
        dueDate: editingTask.dueDate ? editingTask.dueDate.split('T')[0] : '',
        startDate: editingTask.startDate ? editingTask.startDate.split('T')[0] : '',
        priority: editingTask.priority || '',
        selectedProjectId: editingTask.projectId || projectId || '',
        selectedPhaseId: editingTask.phaseId || '',
        selectedMilestoneId: editingTask.milestoneId || '',
        link: '',
        systems: [],
      });
      setSubtasks(editingTask.subtasks || []);
    }
  }, [editingTask, projectId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const taskId = editingTask?.id || `task-${Date.now()}`;
    const currentStatus = editingTask?.status || 'todo';

    const updatedTask: WBSTask = {
      id: taskId,
      title: formData.title,
      description: formData.description,
      status: currentStatus,
      assignee: formData.assignee,
      dueDate: formData.dueDate || undefined,
      priority: formData.priority as 'low' | 'medium' | 'high' | undefined,
      subtasks: subtasks,
      order: editingTask?.order || 0,
      projectId: formData.selectedProjectId || undefined,
      phaseId: formData.selectedPhaseId || undefined,
      milestoneId: formData.selectedMilestoneId || undefined,
      estimatedHours: editingTask?.estimatedHours || 0,
      actualHours: editingTask?.actualHours || 0,
    };

    if (editingTask && formData.selectedProjectId) {
      // EDIT MODE: Update task in project, possibly move between phases/milestones
      const project = projects.find(p => p.id === formData.selectedProjectId);
      if (project && project.phases) {
        // Remove task from all milestones
        let updatedPhases = project.phases.map(phase => ({
          ...phase,
          milestones: phase.milestones.map(milestone => ({
            ...milestone,
            tasks: milestone.tasks.filter(t => t.id !== taskId)
          }))
        }));

        // Add/update task to the selected milestone
        if (formData.selectedMilestoneId) {
          updatedPhases = updatedPhases.map(phase => ({
            ...phase,
            milestones: phase.milestones.map(milestone => {
              if (milestone.id === formData.selectedMilestoneId) {
                return {
                  ...milestone,
                  tasks: [...milestone.tasks, updatedTask]
                };
              }
              return milestone;
            })
          }));
        } else if (formData.selectedPhaseId) {
          // No specific milestone, add to first milestone of the phase
          updatedPhases = updatedPhases.map(phase => {
            if (phase.id === formData.selectedPhaseId && phase.milestones.length > 0) {
              return {
                ...phase,
                milestones: phase.milestones.map((milestone, idx) => {
                  if (idx === 0) {
                    return {
                      ...milestone,
                      tasks: [...milestone.tasks, updatedTask]
                    };
                  }
                  return milestone;
                })
              };
            }
            return phase;
          });
        }

        updateProject(formData.selectedProjectId, { phases: updatedPhases });
      }
    } else if (formData.selectedProjectId && !editingTask) {
      // CREATE MODE: Add new task to project
      const project = projects.find(p => p.id === formData.selectedProjectId);
      if (project && project.phases) {
        const updatedPhases = project.phases.map(phase => ({
          ...phase,
          milestones: phase.milestones.map(milestone => {
            // Add to specified milestone or first milestone
            if (formData.selectedMilestoneId && milestone.id === formData.selectedMilestoneId) {
              return {
                ...milestone,
                tasks: [...milestone.tasks, updatedTask]
              };
            } else if (!formData.selectedMilestoneId && phase.milestones[0]?.id === milestone.id && phase.id === formData.selectedPhaseId) {
              return {
                ...milestone,
                tasks: [...milestone.tasks, updatedTask]
              };
            }
            return milestone;
          })
        }));

        updateProject(formData.selectedProjectId, { phases: updatedPhases });
      }
    } else if (!editingTask) {
      // Add independent task
      addIndependentTask(updatedTask);
    }

    onClose();
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      attachments: [],
      client: '',
      product: '',
      assignee: '',
      requester: '', // Solicitante (obrigatório)
      selectedStakeholders: [],
      demandType: '',
      dueDate: '',
      startDate: '',
      priority: '',
      selectedProjectId: projectId || '',
      selectedPhaseId: '',
      selectedMilestoneId: milestoneId || '',
      link: '', // Link opcional
      systems: [] as string[], // Sistemas envolvidos
    });
    setSubtasks([]);
    setNewSubtaskTitle('');
  };

  const addSubtask = (parentId?: string) => {
    if (!newSubtaskTitle.trim()) return;

    const newSubtask: Subtask = {
      id: `subtask-${Date.now()}`,
      title: newSubtaskTitle,
      completed: false,
      priority: 'medium',
      subtasks: []
    };

    if (!parentId) {
      // Add as root subtask
      setSubtasks([...subtasks, newSubtask]);
    } else {
      // Add as nested subtask
      setSubtasks(addNestedSubtask(subtasks, parentId, newSubtask));
    }

    setNewSubtaskTitle('');
  };

  const addNestedSubtask = (items: Subtask[], parentId: string, newSubtask: Subtask): Subtask[] => {
    return items.map(item => {
      if (item.id === parentId) {
        return {
          ...item,
          subtasks: [...(item.subtasks || []), newSubtask]
        };
      } else if (item.subtasks && item.subtasks.length > 0) {
        return {
          ...item,
          subtasks: addNestedSubtask(item.subtasks, parentId, newSubtask)
        };
      }
      return item;
    });
  };

  const removeSubtask = (subtaskId: string) => {
    setSubtasks(removeNestedSubtask(subtasks, subtaskId));
  };

  const removeNestedSubtask = (items: Subtask[], subtaskId: string): Subtask[] => {
    return items
      .filter(item => item.id !== subtaskId)
      .map(item => ({
        ...item,
        subtasks: item.subtasks ? removeNestedSubtask(item.subtasks, subtaskId) : []
      }));
  };

  const toggleExpanded = (subtaskId: string) => {
    const newExpanded = new Set(expandedSubtasks);
    if (newExpanded.has(subtaskId)) {
      newExpanded.delete(subtaskId);
    } else {
      newExpanded.add(subtaskId);
    }
    setExpandedSubtasks(newExpanded);
  };

  const addAttachment = () => {
    const url = prompt('Digite a URL do anexo (imagem ou documento):');
    if (url) {
      setFormData({
        ...formData,
        attachments: [...formData.attachments, url],
      });
    }
  };

  const removeAttachment = (index: number) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {editingTask
                ? 'Atualize os detalhes da tarefa'
                : projectId
                ? 'Adicione uma nova tarefa ao projeto'
                : 'Crie uma tarefa independente'}
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
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome da Tarefa *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Implementar módulo de autenticação"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Descreva os detalhes da tarefa..."
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {!projectId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Vincular ao Projeto (Opcional)
                  </label>
                  <select
                    value={formData.selectedProjectId}
                    onChange={(e) => {
                      setFormData({ ...formData, selectedProjectId: e.target.value, selectedPhaseId: '', selectedMilestoneId: '' });
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Tarefa independente</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name} - {project.group}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.selectedProjectId && (
                <>
                  {(() => {
                    const selectedProject = projects.find(p => p.id === formData.selectedProjectId);
                    return selectedProject && selectedProject.phases && selectedProject.phases.length > 0 ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Fase da EAP (Opcional)
                        </label>
                        <select
                          value={formData.selectedPhaseId}
                          onChange={(e) => setFormData({ ...formData, selectedPhaseId: e.target.value, selectedMilestoneId: '' })}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Sem fase específica</option>
                          {selectedProject.phases.map((phase) => (
                            <option key={phase.id} value={phase.id}>
                              {phase.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null;
                  })()}

                  {formData.selectedPhaseId && (
                    (() => {
                      const selectedProject = projects.find(p => p.id === formData.selectedProjectId);
                      const selectedPhase = selectedProject?.phases?.find(p => p.id === formData.selectedPhaseId);
                      return selectedPhase && selectedPhase.milestones.length > 0 ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Marco da Fase (Opcional)
                          </label>
                          <select
                            value={formData.selectedMilestoneId}
                            onChange={(e) => setFormData({ ...formData, selectedMilestoneId: e.target.value })}
                            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Sem marco específico</option>
                            {selectedPhase.milestones.map((milestone) => (
                              <option key={milestone.id} value={milestone.id}>
                                {milestone.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null;
                    })()
                  )}
                </>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Anexos</h3>
            <div className="space-y-3">
              <button
                type="button"
                onClick={addAttachment}
                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors w-full justify-center"
              >
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">Adicionar anexo (imagem ou documento)</span>
              </button>

              {formData.attachments.length > 0 && (
                <div className="space-y-2">
                  {formData.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <Paperclip className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700 flex-1 truncate">{attachment}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Assignment & Context */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Atribuição e Contexto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Cliente
                </label>
                <select
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
                  <User className="w-4 h-4" />
                  Responsável *
                </label>
                <select
                  required
                  value={formData.assignee}
                  onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione um responsável</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.name}>
                      {user.name} - {user.team}
                    </option>
                  ))}
                </select>
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data de Entrega
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Prioridade
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stakeholders */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Envolvidos (Stakeholders)</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
              {stakeholders.map((stakeholder) => (
                <label
                  key={stakeholder.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
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
                    <p className="font-medium text-gray-900 text-sm">{stakeholder.name}</p>
                    <p className="text-xs text-gray-500">{stakeholder.role}</p>
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

          {/* Subtasks */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subtarefas</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Adicionar subtarefa"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addSubtask}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {subtasks.length > 0 && (
                <div className="space-y-2">
                  {subtasks.map((subtask) => (
                    <div key={subtask.id} className="space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <button
                          type="button"
                          onClick={() => toggleExpanded(subtask.id)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          {expandedSubtasks.has(subtask.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <span className="text-sm text-gray-700 flex-1 truncate">{subtask.title}</span>
                        <button
                          type="button"
                          onClick={() => removeSubtask(subtask.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {expandedSubtasks.has(subtask.id) && subtask.subtasks.length > 0 && (
                        <div className="ml-4">
                          {subtask.subtasks.map((nestedSubtask) => (
                            <div key={nestedSubtask.id} className="space-y-2">
                              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(nestedSubtask.id)}
                                  className="text-gray-500 hover:text-gray-700"
                                >
                                  {expandedSubtasks.has(nestedSubtask.id) ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                                <span className="text-sm text-gray-700 flex-1 truncate">{nestedSubtask.title}</span>
                                <button
                                  type="button"
                                  onClick={() => removeSubtask(nestedSubtask.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {expandedSubtasks.has(nestedSubtask.id) && nestedSubtask.subtasks.length > 0 && (
                                <div className="ml-4">
                                  {nestedSubtask.subtasks.map((deepNestedSubtask) => (
                                    <div key={deepNestedSubtask.id} className="space-y-2">
                                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <button
                                          type="button"
                                          onClick={() => toggleExpanded(deepNestedSubtask.id)}
                                          className="text-gray-500 hover:text-gray-700"
                                        >
                                          {expandedSubtasks.has(deepNestedSubtask.id) ? (
                                            <ChevronDown className="w-4 h-4" />
                                          ) : (
                                            <ChevronRight className="w-4 h-4" />
                                          )}
                                        </button>
                                        <span className="text-sm text-gray-700 flex-1 truncate">{deepNestedSubtask.title}</span>
                                        <button
                                          type="button"
                                          onClick={() => removeSubtask(deepNestedSubtask.id)}
                                          className="text-red-600 hover:text-red-800"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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
              Criar Tarefa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}