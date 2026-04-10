import { useMemo, useState } from 'react';
import { Building2, Edit2, Plus, Trash2, Users as UsersIcon } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useProjects } from '../../context/ProjectContext';
import { Team, WorkspaceEntity } from '../../types';

type TeamFormState = {
  name: string;
  description: string;
  members: string[];
  color: string;
  usesProjectWorkspace: boolean;
  workspaceIds: string[];
};

type WorkspaceShortcutFormState = {
  name: string;
  description: string;
  status: WorkspaceEntity['status'];
};

const EMPTY_TEAM_FORM: TeamFormState = {
  name: '',
  description: '',
  members: [],
  color: '#3B82F6',
  usesProjectWorkspace: false,
  workspaceIds: [],
};

const EMPTY_WORKSPACE_SHORTCUT: WorkspaceShortcutFormState = {
  name: '',
  description: '',
  status: 'active',
};

export function TeamsCRUD() {
  const {
    teams,
    users,
    workspaces,
    addTeam,
    updateTeam,
    deleteTeam,
    addWorkspace,
    linkTeamToWorkspace,
    unlinkTeamFromWorkspace,
  } = useAdmin();
  const { ensureWorkspaceDefinitions } = useProjects();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamForm, setTeamForm] = useState<TeamFormState>(EMPTY_TEAM_FORM);
  const [workspaceShortcutOpen, setWorkspaceShortcutOpen] = useState(false);
  const [workspaceShortcutError, setWorkspaceShortcutError] = useState('');
  const [workspaceShortcutForm, setWorkspaceShortcutForm] = useState<WorkspaceShortcutFormState>(
    EMPTY_WORKSPACE_SHORTCUT
  );

  const activeWorkspaces = useMemo(
    () =>
      workspaces
        .filter((workspace) => workspace.status === 'active' && !workspace.deletedAt)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [workspaces]
  );

  const getMemberNames = (memberIds: string[]) =>
    memberIds
      .map((id) => {
        const user = users.find((candidate) => candidate.id === id);
        if (!user) return null;
        return user.cargo ? `${user.name} • ${user.cargo}` : user.name;
      })
      .filter(Boolean)
      .join(', ');

  const getTeamWorkspaces = (team: Team) =>
    activeWorkspaces.filter((workspace) => (team.workspaceIds || []).includes(workspace.id));

  const openModal = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setTeamForm({
        name: team.name,
        description: team.description || '',
        members: team.members,
        color: team.color,
        usesProjectWorkspace: Boolean(team.usesProjectWorkspace && (team.workspaceIds || []).length > 0),
        workspaceIds: team.workspaceIds || [],
      });
    } else {
      setEditingTeam(null);
      setTeamForm(EMPTY_TEAM_FORM);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingTeam(null);
    setTeamForm(EMPTY_TEAM_FORM);
    setWorkspaceShortcutOpen(false);
    setWorkspaceShortcutError('');
    setWorkspaceShortcutForm(EMPTY_WORKSPACE_SHORTCUT);
    setIsModalOpen(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const nextWorkspaceIds = teamForm.usesProjectWorkspace ? teamForm.workspaceIds : [];

    if (editingTeam) {
      const previousWorkspaceIds = new Set(editingTeam.workspaceIds || []);
      const nextWorkspaceIdSet = new Set(nextWorkspaceIds);

      updateTeam(editingTeam.id, {
        name: teamForm.name.trim(),
        description: teamForm.description.trim() || undefined,
        members: teamForm.members,
        color: teamForm.color,
        usesProjectWorkspace: teamForm.usesProjectWorkspace,
        workspaceIds: nextWorkspaceIds,
      });

      workspaces.forEach((workspace) => {
        const wasLinked = previousWorkspaceIds.has(workspace.id);
        const shouldBeLinked = nextWorkspaceIdSet.has(workspace.id);
        if (!wasLinked && shouldBeLinked) {
          linkTeamToWorkspace(editingTeam.id, workspace.id);
        }
        if (wasLinked && !shouldBeLinked) {
          unlinkTeamFromWorkspace(editingTeam.id, workspace.id);
        }
      });
    } else {
      const newTeamId = Date.now().toString();
      const newTeam: Team = {
        id: newTeamId,
        name: teamForm.name.trim(),
        description: teamForm.description.trim() || undefined,
        members: teamForm.members,
        color: teamForm.color,
        usesProjectWorkspace: teamForm.usesProjectWorkspace,
        workspaceIds: nextWorkspaceIds,
        createdAt: new Date().toISOString(),
      };
      addTeam(newTeam);
      nextWorkspaceIds.forEach((workspaceId) => linkTeamToWorkspace(newTeamId, workspaceId));
    }

    closeModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta equipe?')) {
      deleteTeam(id);
    }
  };

  const handleWorkspaceShortcut = () => {
    if (!editingTeam) return;

    const normalizedName = workspaceShortcutForm.name.trim();
    if (!normalizedName) {
      setWorkspaceShortcutError('Informe o nome do workspace.');
      return;
    }

    const duplicated = activeWorkspaces.find(
      (workspace) => workspace.name.trim().toLocaleLowerCase('pt-BR') === normalizedName.toLocaleLowerCase('pt-BR')
    );
    if (duplicated) {
      setWorkspaceShortcutError('Já existe um workspace ativo com esse nome.');
      return;
    }

    const workspaceId = addWorkspace({
      name: normalizedName,
      description: workspaceShortcutForm.description.trim() || undefined,
      status: workspaceShortcutForm.status,
      teamIds: [editingTeam.id],
    });
    ensureWorkspaceDefinitions(workspaceId);
    setTeamForm((current) => ({
      ...current,
      usesProjectWorkspace: true,
      workspaceIds: Array.from(new Set([...current.workspaceIds, workspaceId])),
    }));
    setWorkspaceShortcutOpen(false);
    setWorkspaceShortcutError('');
    setWorkspaceShortcutForm(EMPTY_WORKSPACE_SHORTCUT);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Equipes</h2>
          <p className="mt-1 text-sm text-gray-500">
            A equipe continua simples de manter: aqui você define membros e apenas vincula workspaces quando precisar.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Nova equipe
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teams.map((team) => {
          const linkedWorkspaces = getTeamWorkspaces(team);
          return (
            <div key={team.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: team.color }}
                  >
                    <UsersIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{team.name}</h3>
                    <p className="text-sm text-gray-500">{team.members.length} membros</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openModal(team)} className="rounded-lg p-1.5 hover:bg-gray-100">
                    <Edit2 className="h-4 w-4 text-gray-600" />
                  </button>
                  <button onClick={() => handleDelete(team.id)} className="rounded-lg p-1.5 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>

              {team.description ? <p className="mb-4 text-sm text-gray-600">{team.description}</p> : null}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Workspace de projetos</p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {team.usesProjectWorkspace && linkedWorkspaces.length > 0 ? 'Sim' : 'Não'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {linkedWorkspaces.length > 0 ? (
                    linkedWorkspaces.map((workspace) => (
                      <span
                        key={workspace.id}
                        className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
                      >
                        <Building2 className="h-3.5 w-3.5" />
                        {workspace.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">Equipe operando sem workspace de projetos.</span>
                  )}
                </div>
              </div>

              {team.members.length > 0 ? (
                <div className="pt-4">
                  <p className="mb-2 text-xs font-medium text-gray-500">MEMBROS</p>
                  <p className="text-sm text-gray-700">{getMemberNames(team.members)}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTeam ? 'Editar equipe' : 'Nova equipe'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="block text-sm font-medium text-gray-700">Nome</span>
                  <input
                    type="text"
                    required
                    value={teamForm.name}
                    onChange={(event) => setTeamForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </label>

                <label className="space-y-1">
                  <span className="block text-sm font-medium text-gray-700">Cor</span>
                  <input
                    type="color"
                    value={teamForm.color}
                    onChange={(event) => setTeamForm((current) => ({ ...current, color: event.target.value }))}
                    className="h-10 w-full rounded-lg border border-gray-300"
                  />
                </label>

                <label className="space-y-1 md:col-span-2">
                  <span className="block text-sm font-medium text-gray-700">Descrição</span>
                  <textarea
                    value={teamForm.description}
                    onChange={(event) => setTeamForm((current) => ({ ...current, description: event.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </label>

                <div className="space-y-2 md:col-span-2">
                  <span className="block text-sm font-medium text-gray-700">Membros</span>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-300 p-3">
                    {users.map((user) => (
                      <label key={user.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={teamForm.members.includes(user.id)}
                          onChange={(event) =>
                            setTeamForm((current) => ({
                              ...current,
                              members: event.target.checked
                                ? [...current.members, user.id]
                                : current.members.filter((id) => id !== user.id),
                            }))
                          }
                        />
                        <span>
                          {user.name}
                          {user.cargo ? ` • ${user.cargo}` : ''}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Utiliza workspace de projetos?</p>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setTeamForm((current) => ({ ...current, usesProjectWorkspace: true }))}
                    className={`rounded-lg px-4 py-2 text-sm font-medium ${
                      teamForm.usesProjectWorkspace
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTeamForm((current) => ({
                        ...current,
                        usesProjectWorkspace: false,
                        workspaceIds: [],
                      }))
                    }
                    className={`rounded-lg px-4 py-2 text-sm font-medium ${
                      !teamForm.usesProjectWorkspace
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    Não
                  </button>
                </div>

                {teamForm.usesProjectWorkspace ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Workspaces vinculados</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {teamForm.workspaceIds.length > 0 ? (
                          teamForm.workspaceIds.map((workspaceId) => {
                            const workspace = activeWorkspaces.find((candidate) => candidate.id === workspaceId);
                            if (!workspace) return null;
                            return (
                              <span
                                key={workspaceId}
                                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
                              >
                                {workspace.name}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setTeamForm((current) => ({
                                      ...current,
                                      workspaceIds: current.workspaceIds.filter((id) => id !== workspaceId),
                                    }))
                                  }
                                  className="text-slate-400 hover:text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-sm text-slate-500">Nenhum workspace vinculado ainda.</span>
                        )}
                      </div>
                    </div>

                    <label className="space-y-1">
                      <span className="block text-sm font-medium text-slate-700">Vincular workspace existente</span>
                      <select
                        value=""
                        onChange={(event) => {
                          const nextWorkspaceId = event.target.value;
                          if (!nextWorkspaceId) return;
                          setTeamForm((current) => ({
                            ...current,
                            workspaceIds: Array.from(new Set([...current.workspaceIds, nextWorkspaceId])),
                          }));
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
                      >
                        <option value="">Selecione um workspace</option>
                        {activeWorkspaces
                          .filter((workspace) => !teamForm.workspaceIds.includes(workspace.id))
                          .map((workspace) => (
                            <option key={workspace.id} value={workspace.id}>
                              {workspace.name}
                            </option>
                          ))}
                      </select>
                    </label>

                    {editingTeam ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-800">Criar novo workspace</p>
                            <p className="mt-1 text-sm text-slate-500">
                              Atalho para o fluxo central de workspace, já vinculando automaticamente esta equipe.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setWorkspaceShortcutOpen((current) => !current)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {workspaceShortcutOpen ? 'Fechar' : 'Criar workspace'}
                          </button>
                        </div>

                        {workspaceShortcutOpen ? (
                          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <label className="space-y-1 md:col-span-2">
                              <span className="block text-sm font-medium text-slate-700">Nome do workspace</span>
                              <input
                                type="text"
                                value={workspaceShortcutForm.name}
                                onChange={(event) =>
                                  setWorkspaceShortcutForm((current) => ({ ...current, name: event.target.value }))
                                }
                                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                              />
                            </label>

                            <label className="space-y-1 md:col-span-2">
                              <span className="block text-sm font-medium text-slate-700">Descrição</span>
                              <textarea
                                value={workspaceShortcutForm.description}
                                onChange={(event) =>
                                  setWorkspaceShortcutForm((current) => ({ ...current, description: event.target.value }))
                                }
                                rows={3}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                              />
                            </label>

                            <label className="space-y-1">
                              <span className="block text-sm font-medium text-slate-700">Status</span>
                              <select
                                value={workspaceShortcutForm.status}
                                onChange={(event) =>
                                  setWorkspaceShortcutForm((current) => ({
                                    ...current,
                                    status: event.target.value as WorkspaceEntity['status'],
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                              >
                                <option value="active">Ativo</option>
                                <option value="inactive">Inativo</option>
                              </select>
                            </label>

                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={handleWorkspaceShortcut}
                                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                              >
                                Criar e vincular
                              </button>
                            </div>

                            {workspaceShortcutError ? (
                              <p className="text-sm text-red-600 md:col-span-2">{workspaceShortcutError}</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
                        Salve a equipe primeiro para habilitar o atalho de criação e vínculo de um novo workspace.
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    Esta equipe continua operando normalmente sem Kanban de projetos.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  {editingTeam ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
