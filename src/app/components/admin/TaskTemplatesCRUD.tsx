import { ReactNode, useMemo, useState } from 'react';
import { CheckSquare, Edit2, Plus, Trash2 } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useEAP } from '../../context/EAPContext';
import { TaskTemplate, TaskTemplateItem } from '../../types';
import { useFeedback } from '../../context/FeedbackContext';
import { SearchableMultiSelect } from '../filters/SearchableMultiSelect';
import { AdminResponsiveModal } from './AdminResponsiveModal';

interface TemplateFormState {
  name: string;
  description: string;
  isActive: boolean;
  eapTemplateId: string;
  items: TaskTemplateItem[];
}

const createItem = (): TaskTemplateItem => ({
  id: `task-template-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: '',
  description: '',
  priority: 'medium',
  stakeholderIds: [],
  stakeholders: [],
  checklistTitles: [],
  subtasks: [],
  tagIds: [],
});

const EMPTY_FORM: TemplateFormState = {
  name: '',
  description: '',
  isActive: true,
  eapTemplateId: '',
  items: [createItem()],
};

export function TaskTemplatesCRUD() {
  const {
    taskTemplates,
    addTaskTemplate,
    updateTaskTemplate,
    deleteTaskTemplate,
    users,
    stakeholders,
    products,
    teams,
    tags,
    taskTypes,
  } = useAdmin();
  const { eapTemplates } = useEAP();
  const { showFeedback } = useFeedback();
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<TemplateFormState>(EMPTY_FORM);

  const sortedTemplates = useMemo(
    () => [...taskTemplates].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [taskTemplates]
  );

  const selectedEap = useMemo(
    () => eapTemplates.find((template) => template.id === form.eapTemplateId),
    [eapTemplates, form.eapTemplateId]
  );

  const phaseOptions = useMemo(
    () =>
      (selectedEap?.phases || []).map((phase) => ({
        value: phase.id,
        label: phase.name,
      })),
    [selectedEap]
  );

  const milestoneOptionsByPhase = useMemo(() => {
    const next = new Map<string, Array<{ value: string; label: string }>>();
    (selectedEap?.phases || []).forEach((phase) => {
      next.set(
        phase.id,
        (phase.milestones || []).map((milestone) => ({
          value: milestone.id,
          label: milestone.name,
        }))
      );
    });
    return next;
  }, [selectedEap]);

  const stakeholderMap = useMemo(
    () => new Map(stakeholders.map((item) => [item.id, item.name])),
    [stakeholders]
  );
  const userMap = useMemo(() => new Map(users.map((item) => [item.id, item.name])), [users]);

  const stakeholderOptions = useMemo(
    () =>
      stakeholders
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        .map((stakeholder) => ({
          value: stakeholder.id,
          label: stakeholder.name,
        })),
    [stakeholders]
  );

  const userOptions = useMemo(
    () =>
      users
        .filter((user) => user.status === 'active')
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        .map((user) => ({
          value: user.id,
          label: user.name,
        })),
    [users]
  );

  const teamOptions = useMemo(
    () => teams.map((team) => ({ value: team.id, label: team.name })),
    [teams]
  );
  const productOptions = useMemo(
    () => products.map((product) => ({ value: product.id, label: product.name })),
    [products]
  );
  const tagOptions = useMemo(
    () =>
      tags
        .filter((tag) => tag.scope === 'task' || tag.scope === 'both')
        .map((tag) => ({ value: tag.id, label: tag.name })),
    [tags]
  );
  const taskTypeOptions = useMemo(
    () => taskTypes.map((taskType) => ({ value: taskType.id, label: taskType.name })),
    [taskTypes]
  );

  const openCreate = () => {
    setEditingTemplate(null);
    setForm({
      ...EMPTY_FORM,
      eapTemplateId: eapTemplates[0]?.id || '',
    });
    setIsModalOpen(true);
  };

  const openEdit = (template: TaskTemplate) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      description: template.description || '',
      isActive: template.isActive,
      eapTemplateId: template.eapTemplateId || eapTemplates[0]?.id || '',
      items:
        template.items.length > 0
          ? template.items.map((item) => ({
              ...item,
              stakeholderIds: item.stakeholderIds || [],
              tagIds: item.tagIds || [],
              subtasks: item.subtasks || [],
            }))
          : [createItem()],
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingTemplate(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(false);
  };

  const updateItem = (itemId: string, updates: Partial<TaskTemplateItem>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
    }));
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, createItem()] }));
  };

  const removeItem = (itemId: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((item) => item.id !== itemId) : prev.items,
    }));
  };

  const addSubtask = (itemId: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              subtasks: [
                ...(item.subtasks || []),
                {
                  id: `task-template-subitem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                  title: '',
                  description: '',
                  priority: 'medium',
                },
              ],
            }
          : item
      ),
    }));
  };

  const updateSubtask = (itemId: string, subtaskId: string, updates: Partial<TaskTemplateItem>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              subtasks: (item.subtasks || []).map((subtask) =>
                subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
              ),
            }
          : item
      ),
    }));
  };

  const removeSubtask = (itemId: string, subtaskId: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId
          ? { ...item, subtasks: (item.subtasks || []).filter((subtask) => subtask.id !== subtaskId) }
          : item
      ),
    }));
  };

  const validateForm = () => {
    if (!form.name.trim()) return 'Informe um nome para o template.';
    if (!form.eapTemplateId) return 'Selecione um template de fases (EAP) para estruturar o destino.';
    if (!selectedEap) return 'O template de fases selecionado não foi encontrado.';

    if (form.items.length === 0) return 'Adicione ao menos uma tarefa ao template.';

    for (const item of form.items) {
      if (!item.title?.trim()) return 'Todas as tarefas precisam ter título.';
      if (!item.taskTypeId) return `Defina o tipo da tarefa "${item.title}".`;
      if (!item.targetPhaseId) return `Selecione a fase de destino da tarefa "${item.title}".`;
      if (!item.priority) return `Defina a prioridade da tarefa "${item.title}".`;
      for (const subtask of item.subtasks || []) {
        if (!subtask.title?.trim()) return `Todas as subtarefas da tarefa "${item.title}" precisam ter título.`;
        if (!subtask.taskTypeId) return `Defina o tipo de todas as subtarefas da tarefa "${item.title}".`;
      }
    }

    return null;
  };

  const sanitizeItem = (item: TaskTemplateItem): TaskTemplateItem => ({
    ...item,
    title: item.title.trim(),
    description: item.description?.trim() || undefined,
    assignee: item.assigneeId ? userMap.get(item.assigneeId) || undefined : undefined,
    requestedBy: item.requestedById ? userMap.get(item.requestedById) || undefined : undefined,
    stakeholders: (item.stakeholderIds || []).map((id) => stakeholderMap.get(id)).filter(Boolean) as string[],
    subtasks: (item.subtasks || [])
      .filter((subtask) => subtask.title?.trim())
      .map((subtask) => sanitizeItem(subtask)),
    checklistTitles: (item.checklistTitles || []).map((entry) => entry.trim()).filter(Boolean),
  });

  const saveTemplate = () => {
    const validationError = validateForm();
    if (validationError) {
      showFeedback({
        tone: 'error',
        title: 'Template inconsistente',
        message: validationError,
      });
      return;
    }

    const payload: TaskTemplate = {
      id: editingTemplate?.id || `task-template-${Date.now()}`,
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      isActive: form.isActive,
      eapTemplateId: form.eapTemplateId,
      items: form.items.map(sanitizeItem),
      createdAt: editingTemplate?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingTemplate) {
      updateTaskTemplate(editingTemplate.id, payload);
    } else {
      addTaskTemplate(payload);
    }

    showFeedback({
      tone: 'success',
      title: editingTemplate ? 'Template atualizado' : 'Template criado',
      message: 'O template foi salvo com campos estruturados e pronto para reaproveitamento.',
    });
    closeModal();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Templates de tarefas</h2>
          <p className="mt-1 max-w-3xl text-gray-600">
            Templates com dados estruturados para reduzir erro humano, aumentar reaproveitamento e facilitar automações.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Novo template
        </button>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        Apenas a descrição permanece livre. Responsáveis, tipo, produto, equipe, stakeholders, tags e destino operacional usam cadastro estruturado.
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Template</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Base EAP</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Itens</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedTemplates.map((template) => (
              <tr key={template.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-100 p-2">
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{template.name}</p>
                      <p className="text-sm text-gray-500">{template.description || 'Sem descrição'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {eapTemplates.find((item) => item.id === template.eapTemplateId)?.name || 'Não vinculado'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{template.items.length} tarefa(s)</td>
                <td className="px-6 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {template.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openEdit(template)} className="mr-4 text-blue-600 hover:text-blue-900">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      deleteTaskTemplate(template.id);
                      showFeedback({ tone: 'success', title: 'Template removido' });
                    }}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {sortedTemplates.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                  Nenhum template de tarefas cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <AdminResponsiveModal
          title={editingTemplate ? 'Editar template de tarefas' : 'Novo template de tarefas'}
          description="Monte um pacote reutilizável com campos consistentes e pronto para automação."
          onClose={closeModal}
          maxWidthClassName="max-w-6xl"
          bodyClassName="space-y-6"
          footer={
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveTemplate}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Salvar template
              </button>
            </div>
          }
        >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Nome">
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </Field>
              <Field label="Status">
                <select
                  value={form.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.value === 'active' }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </Field>
              <Field label="Template de fases (EAP)">
                <select
                  value={form.eapTemplateId}
                  onChange={(e) => setForm((prev) => ({ ...prev, eapTemplateId: e.target.value, items: prev.items.map((item) => ({ ...item, targetPhaseId: '', targetMilestoneId: '' })) }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">Selecione</option>
                  {eapTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Descrição" className="xl:col-span-4">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  rows={2}
                />
              </Field>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">Tarefas do template</h4>
                  <p className="text-sm text-gray-500">Cada tarefa já sai pronta para reaproveitamento, com destino operacional estruturado.</p>
                </div>
                <button
                  onClick={addItem}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar tarefa
                </button>
              </div>

              {form.items.map((item, index) => {
                const milestoneOptions = item.targetPhaseId ? milestoneOptionsByPhase.get(item.targetPhaseId) || [] : [];

                return (
                  <div key={item.id} className="rounded-2xl border border-gray-200 p-5">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Tarefa {index + 1}</p>
                        <p className="text-xs text-gray-500">Padronize o item para aplicação consistente em projetos.</p>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <Field label="Título">
                        <input
                          value={item.title}
                          onChange={(e) => updateItem(item.id, { title: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        />
                      </Field>
                      <Field label="Tipo da tarefa">
                        <select
                          value={item.taskTypeId || ''}
                          onChange={(e) => updateItem(item.id, { taskTypeId: e.target.value || undefined })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        >
                          <option value="">Selecione</option>
                          {taskTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Prioridade">
                        <select
                          value={item.priority || 'medium'}
                          onChange={(e) => updateItem(item.id, { priority: e.target.value as TaskTemplateItem['priority'] })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        >
                          <option value="low">Baixa</option>
                          <option value="medium">Média</option>
                          <option value="high">Alta</option>
                        </select>
                      </Field>
                      <Field label="Equipe">
                        <select
                          value={item.teamId || ''}
                          onChange={(e) => updateItem(item.id, { teamId: e.target.value || undefined })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        >
                          <option value="">Selecione</option>
                          {teamOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Produto">
                        <select
                          value={item.productId || ''}
                          onChange={(e) => updateItem(item.id, { productId: e.target.value || undefined })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        >
                          <option value="">Selecione</option>
                          {productOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Responsável">
                        <select
                          value={item.assigneeId || ''}
                          onChange={(e) => updateItem(item.id, { assigneeId: e.target.value || undefined })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        >
                          <option value="">Selecione</option>
                          {userOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Solicitante">
                        <select
                          value={item.requestedById || ''}
                          onChange={(e) => updateItem(item.id, { requestedById: e.target.value || undefined })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        >
                          <option value="">Selecione</option>
                          {userOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Fase de destino">
                        <select
                          value={item.targetPhaseId || ''}
                          onChange={(e) => updateItem(item.id, { targetPhaseId: e.target.value || undefined, targetMilestoneId: undefined })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        >
                          <option value="">Selecione</option>
                          {phaseOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Marco de destino">
                        <select
                          value={item.targetMilestoneId || ''}
                          onChange={(e) => updateItem(item.id, { targetMilestoneId: e.target.value || undefined })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        >
                          <option value="">Selecione</option>
                          {milestoneOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Descrição" className="md:col-span-2 xl:col-span-4">
                        <textarea
                          value={item.description || ''}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                          rows={2}
                        />
                      </Field>
                      <Field label="Stakeholders" className="md:col-span-2">
                        <SearchableMultiSelect
                          value={item.stakeholderIds || []}
                          onChange={(value) => updateItem(item.id, { stakeholderIds: value })}
                          options={stakeholderOptions}
                          placeholder="Selecionar stakeholders"
                          allLabel="Todos"
                          searchPlaceholder="Buscar stakeholder..."
                        />
                      </Field>
                      <Field label="Tags" className="md:col-span-2">
                        <SearchableMultiSelect
                          value={item.tagIds || []}
                          onChange={(value) => updateItem(item.id, { tagIds: value })}
                          options={tagOptions}
                          placeholder="Selecionar tags"
                          allLabel="Todas"
                          searchPlaceholder="Buscar tag..."
                        />
                      </Field>
                      <Field label="Checklist inicial" className="xl:col-span-4">
                        <textarea
                          value={(item.checklistTitles || []).join('\n')}
                          onChange={(e) => updateItem(item.id, { checklistTitles: e.target.value.split('\n').map((entry) => entry.trim()).filter(Boolean) })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                          rows={4}
                          placeholder="Um item por linha"
                        />
                      </Field>
                    </div>

                    <div className="mt-5 rounded-xl bg-gray-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Subtarefas</p>
                          <p className="text-xs text-gray-500">Também estruturadas para manter padrão operacional.</p>
                        </div>
                        <button
                          onClick={() => addSubtask(item.id)}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-white"
                        >
                          <Plus className="h-4 w-4" />
                          Adicionar subtarefa
                        </button>
                      </div>
                      <div className="space-y-3">
                        {(item.subtasks || []).map((subtask) => (
                          <div key={subtask.id} className="grid gap-3 rounded-xl border border-gray-200 bg-white p-3 md:grid-cols-[minmax(0,1.4fr)_220px_160px_44px]">
                            <input
                              value={subtask.title}
                              onChange={(e) => updateSubtask(item.id, subtask.id, { title: e.target.value })}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2"
                              placeholder="Título da subtarefa"
                            />
                            <select
                              value={subtask.taskTypeId || ''}
                              onChange={(e) => updateSubtask(item.id, subtask.id, { taskTypeId: e.target.value || undefined })}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            >
                              <option value="">Tipo</option>
                              {taskTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <select
                              value={subtask.priority || 'medium'}
                              onChange={(e) => updateSubtask(item.id, subtask.id, { priority: e.target.value as TaskTemplateItem['priority'] })}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            >
                              <option value="low">Baixa</option>
                              <option value="medium">Média</option>
                              <option value="high">Alta</option>
                            </select>
                            <button
                              onClick={() => removeSubtask(item.id, subtask.id)}
                              className="rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="mx-auto h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {(item.subtasks || []).length === 0 && (
                          <p className="text-sm text-gray-500">Nenhuma subtarefa configurada.</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

        </AdminResponsiveModal>
      )}
    </div>
  );
}

function Field({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
