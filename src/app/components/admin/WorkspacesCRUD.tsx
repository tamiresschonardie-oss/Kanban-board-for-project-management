import { useEffect, useMemo, useState } from 'react';
import { Building2, Edit2, GripVertical, Plus, Trash2, Users } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useProjects } from '../../context/ProjectContext';
import { WorkspaceEntity, WorkspaceProjectStageDefinition } from '../../types';

type WorkspaceFormState = {
  name: string;
  description: string;
  status: WorkspaceEntity['status'];
  teamIds: string[];
};

const EMPTY_FORM: WorkspaceFormState = {
  name: '',
  description: '',
  status: 'active',
  teamIds: [],
};

export function WorkspacesCRUD() {
  const { workspaces, teams, addWorkspace, updateWorkspace, deleteWorkspace } = useAdmin();
  const {
    projects,
    ensureWorkspaceDefinitions,
    getWorkspaceProjectStages,
    createWorkspaceProjectStage,
    updateWorkspaceProjectStage,
    reorderWorkspaceProjectStages,
    deleteWorkspaceProjectStage,
  } = useProjects();
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceEntity | null>(null);
  const [workspaceForm, setWorkspaceForm] = useState<WorkspaceFormState>(EMPTY_FORM);
  const [workspaceError, setWorkspaceError] = useState('');
  const [managingWorkspaceId, setManagingWorkspaceId] = useState<string | null>(null);
  const [draggedStageId, setDraggedStageId] = useState<string | null>(null);

  const activeWorkspaces = useMemo(
    () =>
      workspaces
        .filter((workspace) => !workspace.deletedAt)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [workspaces]
  );

  const workspaceProjectCounts = useMemo(
    () =>
      projects.reduce<Record<string, number>>((accumulator, project) => {
        const workspaceIds = Array.from(
          new Set(
            [project.group, ...(project.workspaceBoardStates || []).map((state) => state.workspaceId)].filter(Boolean)
          )
        ) as string[];

        workspaceIds.forEach((workspaceId) => {
          accumulator[workspaceId] = (accumulator[workspaceId] || 0) + 1;
        });

        return accumulator;
      }, {}),
    [projects]
  );

  const openCreateWorkspace = () => {
    setEditingWorkspace(null);
    setWorkspaceError('');
    setWorkspaceForm(EMPTY_FORM);
    setIsWorkspaceModalOpen(true);
  };

  const openEditWorkspace = (workspace: WorkspaceEntity) => {
    setEditingWorkspace(workspace);
    setWorkspaceError('');
    setWorkspaceForm({
      name: workspace.name,
      description: workspace.description || '',
      status: workspace.status,
      teamIds: workspace.teamIds || [],
    });
    setIsWorkspaceModalOpen(true);
  };

  const closeWorkspaceModal = () => {
    setEditingWorkspace(null);
    setWorkspaceError('');
    setWorkspaceForm(EMPTY_FORM);
    setIsWorkspaceModalOpen(false);
  };

  const handleSubmitWorkspace = (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedName = workspaceForm.name.trim();
    if (!normalizedName) {
      setWorkspaceError('Informe o nome do workspace.');
      return;
    }

    const duplicated = activeWorkspaces.find(
      (workspace) =>
        workspace.name.trim().toLocaleLowerCase('pt-BR') === normalizedName.toLocaleLowerCase('pt-BR') &&
        workspace.id !== editingWorkspace?.id
    );

    if (duplicated) {
      setWorkspaceError('Já existe um workspace ativo com esse nome.');
      return;
    }

    if (editingWorkspace) {
      updateWorkspace(editingWorkspace.id, {
        name: normalizedName,
        description: workspaceForm.description.trim() || undefined,
        status: workspaceForm.status,
        teamIds: workspaceForm.teamIds,
      });
      ensureWorkspaceDefinitions(editingWorkspace.id);
    } else {
      const workspaceId = addWorkspace({
        name: normalizedName,
        description: workspaceForm.description.trim() || undefined,
        status: workspaceForm.status,
        teamIds: workspaceForm.teamIds,
      });
      ensureWorkspaceDefinitions(workspaceId);
    }

    closeWorkspaceModal();
  };

  const handleDeleteWorkspace = (workspace: WorkspaceEntity) => {
    const linkedProjectsCount = workspaceProjectCounts[workspace.id] || 0;
    const confirmationMessage =
      linkedProjectsCount > 0
        ? `Este workspace possui ${linkedProjectsCount} projeto(s) vinculado(s). Deseja desativá-lo mesmo assim?`
        : 'Deseja desativar este workspace?';

    if (!window.confirm(confirmationMessage)) return;
    deleteWorkspace(workspace.id);
    if (managingWorkspaceId === workspace.id) {
      setManagingWorkspaceId(null);
    }
  };

  const selectedWorkspace = activeWorkspaces.find((workspace) => workspace.id === managingWorkspaceId) || null;
  useEffect(() => {
    if (!selectedWorkspace) return;
    ensureWorkspaceDefinitions(selectedWorkspace.id);
  }, [ensureWorkspaceDefinitions, selectedWorkspace]);

  const selectedStages = useMemo(() => {
    if (!selectedWorkspace) return [];
    return getWorkspaceProjectStages(selectedWorkspace.id)
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [getWorkspaceProjectStages, selectedWorkspace]);

  const handleStageDrop = (targetStageId: string) => {
    if (!selectedWorkspace || !draggedStageId || draggedStageId === targetStageId) return;
    const orderedIds = selectedStages.map((stage) => stage.id);
    const sourceIndex = orderedIds.indexOf(draggedStageId);
    const targetIndex = orderedIds.indexOf(targetStageId);
    if (sourceIndex === -1 || targetIndex === -1) return;
    const nextOrderedIds = orderedIds.slice();
    const [moved] = nextOrderedIds.splice(sourceIndex, 1);
    nextOrderedIds.splice(targetIndex, 0, moved);
    reorderWorkspaceProjectStages(selectedWorkspace.id, nextOrderedIds);
    setDraggedStageId(null);
  };

  const handleDeleteStage = (stage: WorkspaceProjectStageDefinition) => {
    if (!selectedWorkspace) return;
    const fallbackStages = selectedStages.filter((candidate) => candidate.id !== stage.id);
    const destinationStageId = fallbackStages[0]?.id;
    const message = destinationStageId
      ? 'Excluir esta fase local e mover os projetos para a próxima fase disponível?'
      : 'Excluir esta fase local?';
    if (!window.confirm(message)) return;
    deleteWorkspaceProjectStage(selectedWorkspace.id, stage.id, destinationStageId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Workspaces</h2>
          <p className="mt-1 text-sm text-gray-500">
            Gestão central de workspaces, vínculos com equipes e fases locais do Kanban.
          </p>
        </div>
        <button
          onClick={openCreateWorkspace}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Novo workspace
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)]">
        <div className="space-y-4">
          {activeWorkspaces.map((workspace) => {
            const linkedTeams = teams.filter((team) => workspace.teamIds.includes(team.id));
            const linkedProjectsCount = workspaceProjectCounts[workspace.id] || 0;
            const isManaging = managingWorkspaceId === workspace.id;

            return (
              <div
                key={workspace.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition-colors ${
                  isManaging ? 'border-blue-200 ring-2 ring-blue-100' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {workspace.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {linkedProjectsCount} projeto(s)
                      </span>
                    </div>
                    <p className="mt-3 text-base font-semibold text-gray-900">{workspace.name}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {workspace.description || 'Sem descrição cadastrada.'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setManagingWorkspaceId((current) => (current === workspace.id ? null : workspace.id))}
                      className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-gray-100"
                    >
                      Fases
                    </button>
                    <button onClick={() => openEditWorkspace(workspace)} className="rounded-lg p-1.5 hover:bg-gray-100">
                      <Edit2 className="h-4 w-4 text-gray-600" />
                    </button>
                    <button onClick={() => handleDeleteWorkspace(workspace)} className="rounded-lg p-1.5 hover:bg-red-50">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {linkedTeams.length > 0 ? (
                    linkedTeams.map((team) => (
                      <span
                        key={team.id}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: team.color }} />
                        {team.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">Nenhuma equipe vinculada.</span>
                  )}
                </div>
              </div>
            );
          })}

          {activeWorkspaces.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
              Nenhum workspace ativo cadastrado.
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          {selectedWorkspace ? (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Fases do workspace</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedWorkspace.name} usa estas fases locais no Kanban de execução.
                  </p>
                </div>
                <button
                  onClick={() => {
                    ensureWorkspaceDefinitions(selectedWorkspace.id);
                    createWorkspaceProjectStage(selectedWorkspace.id);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  Nova fase
                </button>
              </div>

              <div className="space-y-3">
                {selectedStages.map((stage) => (
                  <div
                    key={stage.id}
                    draggable
                    onDragStart={() => setDraggedStageId(stage.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleStageDrop(stage.id)}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <button type="button" className="cursor-grab text-slate-400">
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <input
                      type="color"
                      value={stage.color || '#E5E7EB'}
                      onChange={(event) =>
                        updateWorkspaceProjectStage(selectedWorkspace.id, stage.id, { color: event.target.value })
                      }
                      className="h-10 w-12 rounded-lg border border-slate-200"
                    />
                    <input
                      type="text"
                      value={stage.name}
                      onChange={(event) =>
                        updateWorkspaceProjectStage(selectedWorkspace.id, stage.id, { name: event.target.value })
                      }
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                    />
                    <button onClick={() => handleDeleteStage(stage)} className="rounded-lg p-2 hover:bg-red-100">
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>

              {selectedStages.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                  Nenhuma fase local encontrada para este workspace.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
              <div className="rounded-2xl bg-white p-3 shadow-sm">
                <Building2 className="h-6 w-6 text-slate-500" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-slate-900">Selecione um workspace</h3>
              <p className="mt-2 text-sm text-slate-500">
                Aqui a PMO gerencia as fases locais do Kanban e mantém a estrutura reutilizável entre equipes.
              </p>
            </div>
          )}
        </div>
      </div>

      {isWorkspaceModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingWorkspace ? 'Editar workspace' : 'Novo workspace'}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    A criação é centralizada aqui e as equipes apenas consomem o vínculo.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitWorkspace} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1 md:col-span-2">
                  <span className="block text-sm font-medium text-gray-700">Nome</span>
                  <input
                    type="text"
                    required
                    value={workspaceForm.name}
                    onChange={(event) => setWorkspaceForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </label>

                <label className="space-y-1 md:col-span-2">
                  <span className="block text-sm font-medium text-gray-700">Descrição</span>
                  <textarea
                    value={workspaceForm.description}
                    onChange={(event) =>
                      setWorkspaceForm((current) => ({ ...current, description: event.target.value }))
                    }
                    rows={3}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </label>

                <label className="space-y-1">
                  <span className="block text-sm font-medium text-gray-700">Status</span>
                  <select
                    value={workspaceForm.status}
                    onChange={(event) =>
                      setWorkspaceForm((current) => ({
                        ...current,
                        status: event.target.value as WorkspaceEntity['status'],
                      }))
                    }
                    className="w-full rounded-lg border px-3 py-2"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </label>

                <div className="space-y-2">
                  <span className="block text-sm font-medium text-gray-700">Equipes vinculadas</span>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-300 p-3">
                    {teams.map((team) => (
                      <label key={team.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={workspaceForm.teamIds.includes(team.id)}
                          onChange={(event) =>
                            setWorkspaceForm((current) => ({
                              ...current,
                              teamIds: event.target.checked
                                ? Array.from(new Set([...current.teamIds, team.id]))
                                : current.teamIds.filter((id) => id !== team.id),
                            }))
                          }
                        />
                        <span>{team.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {workspaceError ? <p className="text-sm text-red-600">{workspaceError}</p> : null}

              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeWorkspaceModal} className="rounded-lg border px-4 py-2 text-gray-700">
                  Cancelar
                </button>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                  {editingWorkspace ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
