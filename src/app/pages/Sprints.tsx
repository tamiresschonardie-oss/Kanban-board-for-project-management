import { useMemo, useState } from 'react';
import { CalendarRange, Flag, Layers3, ListOrdered, Plus, Target, TimerReset, Trash2 } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { EnrichedTask, useTasks } from '../context/TaskContext';
import { canManageSprints } from '../utils/permissions';
import { KanbanPageHeader } from '../components/kanban/KanbanLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Sprint, SprintKanbanStatus, SprintStatus, User } from '../types';
import { useProjects } from '../context/ProjectContext';
import { getTaskNodeOwnTrackedMinutes } from '../selectors/taskSelectors';
import { getSprintDateLabel, getSprintProgressByTasks, isTaskDelayedInSprint, isTaskOutsideSprint } from '../utils/sprintUtils';

const SPRINT_COLUMNS: Array<{ id: SprintKanbanStatus; label: string }> = [
  { id: 'backlog', label: 'Backlog da sprint' },
  { id: 'in-progress', label: 'Em andamento' },
  { id: 'review', label: 'Homologação' },
  { id: 'done', label: 'Concluído' },
];

interface SprintTaskCandidate extends EnrichedTask {
  sprintStatusResolved: SprintKanbanStatus;
  teamLabel: string;
  typeLabel: 'Tarefa' | 'Subtarefa';
  parentLabel?: string;
  ownHours: number;
  ownCost: number;
  outsideSprint: boolean;
  delayedInSprint: boolean;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const hourFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function getSprintStatusLabel(status: SprintStatus) {
  return status === 'planned' ? 'Planejada' : status === 'active' ? 'Ativa' : 'Concluída';
}

function businessDaysBetween(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return 0;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function resolveUserCostPerHour(user: User | undefined, monthlyHoursStandard: number) {
  if (!user) return 0;
  if (typeof user.costPerHour === 'number') return user.costPerHour;
  if (typeof user.salaryMonthly === 'number') return user.salaryMonthly / Math.max(monthlyHoursStandard, 1);
  return 0;
}

export function Sprints() {
  const { currentUser, users, teams, sprints, addSprint, updateSprint, costSettings } = useAdmin();
  const { allTasks, updateTask, addIndependentTask } = useTasks();
  const { projects } = useProjects();
  const canManage = canManageSprints(currentUser);
  const [selectedSprintId, setSelectedSprintId] = useState<string>(sprints[0]?.id || '');
  const [projectFilter, setProjectFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'outside' | 'delayed'>('all');
  const [viewMode, setViewMode] = useState<'planning' | 'kanban' | 'list'>('planning');
  const [newSprint, setNewSprint] = useState({
    name: `Sprint ${sprints.length + 1}`,
    startDate: '',
    endDate: '',
    status: 'planned' as SprintStatus,
    teamId: '',
    projectId: '',
    goal: '',
  });
  const [newSprintTaskTitle, setNewSprintTaskTitle] = useState('');
  const [newSprintTaskAssigneeId, setNewSprintTaskAssigneeId] = useState('');

  const selectedSprint = sprints.find((sprint) => sprint.id === selectedSprintId) || sprints[0];
  const selectedSprintProject = projects.find((project) => project.id === selectedSprint?.projectId);

  const sprintCandidates = useMemo(() => {
    return allTasks.map((task) => {
      const assignee = users.find((user) => user.id === task.assigneeId || user.name === task.assignee);
      const sprint = sprints.find((item) => item.id === task.sprintId);
      const sprintStatusResolved =
        task.sprintStatus ||
        (task.status === 'done' ? 'done' : task.status === 'in_progress' ? 'in-progress' : 'backlog');
      const ownHours = Number((getTaskNodeOwnTrackedMinutes(task) / 60).toFixed(2));
      const ownCost = Number((ownHours * resolveUserCostPerHour(assignee, costSettings.monthlyHoursStandard)).toFixed(2));

      return {
        ...task,
        sprintStatusResolved,
        teamLabel: assignee?.team || task.projectGroup || 'Sem equipe',
        typeLabel: task.isSubtaskNode ? 'Subtarefa' : 'Tarefa',
        parentLabel: task.isSubtaskNode ? task.hierarchyPath?.[task.hierarchyPath.length - 2] : undefined,
        ownHours,
        ownCost,
        outsideSprint: isTaskOutsideSprint(task, sprint),
        delayedInSprint: isTaskDelayedInSprint(task, sprint),
      } as SprintTaskCandidate;
    });
  }, [allTasks, users, sprints, costSettings.monthlyHoursStandard]);

  const scopedCandidates = useMemo(() => {
    return sprintCandidates.filter((task) => {
      if (selectedSprint?.projectId && task.projectId !== selectedSprint.projectId) return false;
      if (projectFilter !== 'all' && task.projectId !== projectFilter) return false;
      if (assigneeFilter !== 'all' && task.assigneeId !== assigneeFilter) return false;
      if (periodFilter === 'outside' && !task.outsideSprint) return false;
      if (periodFilter === 'delayed' && !task.delayedInSprint) return false;
      return true;
    });
  }, [assigneeFilter, periodFilter, projectFilter, selectedSprint?.projectId, sprintCandidates]);

  const sprintTasks = useMemo(
    () =>
      scopedCandidates
        .filter((task) => task.sprintId === selectedSprint?.id)
        .sort((a, b) => (a.sprintOrder ?? 0) - (b.sprintOrder ?? 0) || a.title.localeCompare(b.title, 'pt-BR')),
    [scopedCandidates, selectedSprint?.id]
  );
  const backlogTasks = useMemo(
    () =>
      scopedCandidates
        .filter((task) => !task.sprintId)
        .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
    [scopedCandidates]
  );

  const progress = getSprintProgressByTasks(sprintTasks);
  const plannedHours = sprintTasks.reduce((sum, task) => sum + task.ownHours, 0);
  const realizedHours = sprintTasks
    .filter((task) => task.status === 'done' || task.completed)
    .reduce((sum, task) => sum + task.ownHours, 0);
  const sprintMembers = Array.from(new Set(sprintTasks.map((task) => task.assigneeId).filter(Boolean))) as string[];
  const capacityHours =
    (selectedSprint?.teamId
      ? businessDaysBetween(selectedSprint.startDate, selectedSprint.endDate) *
        8 *
        Math.max(
          teams.find((team) => team.id === selectedSprint.teamId)?.members.length || sprintMembers.length || 1,
          1
        )
      : businessDaysBetween(selectedSprint?.startDate, selectedSprint?.endDate) * 8 * Math.max(sprintMembers.length || 1, 1));
  const delayedCount = sprintTasks.filter((task) => task.delayedInSprint).length;
  const outsideCount = sprintTasks.filter((task) => task.outsideSprint).length;

  const groupedKanban = SPRINT_COLUMNS.map((column) => ({
    ...column,
    tasks: sprintTasks.filter((task) => task.sprintStatusResolved === column.id),
  }));

  const addTaskToSprint = (task: SprintTaskCandidate, includeChildren = true) => {
    if (!selectedSprint || !canManage) return;
    updateTask(task.id, {
      sprintId: selectedSprint.id,
      sprintStatus: task.sprintStatusResolved || 'backlog',
      sprintOrder: sprintTasks.length,
      taskType: task.taskType || (task.projectId ? 'project' : 'personal'),
    });

    if (!includeChildren || task.isSubtaskNode) return;
    sprintCandidates
      .filter((candidate) => candidate.rootTaskId === task.id && candidate.id !== task.id)
      .forEach((subtask, index) => {
        updateTask(subtask.id, {
          sprintId: selectedSprint.id,
          sprintStatus: subtask.sprintStatusResolved || 'backlog',
          sprintOrder: sprintTasks.length + index + 1,
          taskType: subtask.taskType || 'project',
        });
      });
  };

  const removeTaskFromSprint = (taskId: string) => {
    if (!canManage) return;
    updateTask(taskId, {
      sprintId: undefined,
      sprintStatus: 'backlog',
      sprintOrder: 0,
    });
  };

  const handleCreateSprint = () => {
    if (!canManage || !newSprint.name.trim() || !newSprint.startDate || !newSprint.endDate) return;
    const sprintId = addSprint({
      name: newSprint.name.trim(),
      startDate: newSprint.startDate,
      endDate: newSprint.endDate,
      status: newSprint.status,
      teamId: newSprint.teamId || undefined,
      projectId: newSprint.projectId || undefined,
      goal: newSprint.goal.trim() || undefined,
    });
    setSelectedSprintId(sprintId);
    setNewSprint({
      name: `Sprint ${sprints.length + 2}`,
      startDate: '',
      endDate: '',
      status: 'planned',
      teamId: '',
      projectId: '',
      goal: '',
    });
  };

  const handleCreateSprintOnlyTask = () => {
    if (!canManage || !selectedSprint || !newSprintTaskTitle.trim()) return;
    const assignee = users.find((user) => user.id === newSprintTaskAssigneeId);
    addIndependentTask({
      id: `sprint-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: newSprintTaskTitle.trim(),
      status: 'not_started',
      taskType: 'sprint',
      assignee: assignee?.name,
      assigneeId: assignee?.id,
      subtasks: [],
      order: 0,
      comments: [],
      checklistItems: [],
      timeLogs: [],
      attachments: [],
      activities: [],
      tags: [],
      tagIds: [],
      sprintId: selectedSprint.id,
      sprintStatus: 'backlog',
      sprintOrder: sprintTasks.length,
      priority: 'medium',
    });
    setNewSprintTaskTitle('');
    setNewSprintTaskAssigneeId('');
  };

  const updateSprintTaskStatus = (taskId: string, sprintStatus: SprintKanbanStatus) => {
    if (!canManage) return;
    updateTask(taskId, { sprintStatus });
  };

  const reorderSprintTasks = (orderedIds: string[]) => {
    orderedIds.forEach((taskId, index) => {
      const currentTask = sprintTasks.find((task) => task.id === taskId);
      if (!currentTask || currentTask.sprintOrder === index) return;
      updateTask(taskId, { sprintOrder: index });
    });
  };

  const handleSprintTaskDrop = (draggedTaskId: string, targetTaskId: string) => {
    if (!canManage || !draggedTaskId || draggedTaskId === targetTaskId) return;
    const orderedIds = sprintTasks.map((task) => task.id).filter((id) => id !== draggedTaskId);
    const targetIndex = orderedIds.indexOf(targetTaskId);
    if (targetIndex === -1) return;
    orderedIds.splice(targetIndex, 0, draggedTaskId);
    reorderSprintTasks(orderedIds);
  };

  return (
    <div className="page-shell space-y-6">
      <KanbanPageHeader
        eyebrow="Execução em ciclos"
        title="Sprints"
        description="Planeje a execução em janelas de tempo reais, conectando projetos, fases, tarefas e subtarefas sem alterar a estrutura da EAP."
      />

      <section className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="section-card space-y-4">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-950">Nova sprint</h2>
          </div>
          <input value={newSprint.name} onChange={(event) => setNewSprint((current) => ({ ...current, name: event.target.value }))} placeholder="Nome da sprint" className={INPUT_CLASS} />
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={newSprint.startDate} onChange={(event) => setNewSprint((current) => ({ ...current, startDate: event.target.value }))} className={INPUT_CLASS} />
            <input type="date" value={newSprint.endDate} onChange={(event) => setNewSprint((current) => ({ ...current, endDate: event.target.value }))} className={INPUT_CLASS} />
          </div>
          <select value={newSprint.status} onChange={(event) => setNewSprint((current) => ({ ...current, status: event.target.value as SprintStatus }))} className={INPUT_CLASS}>
            <option value="planned">Planejada</option>
            <option value="active">Ativa</option>
            <option value="finished">Concluída</option>
          </select>
          <select value={newSprint.teamId} onChange={(event) => setNewSprint((current) => ({ ...current, teamId: event.target.value }))} className={INPUT_CLASS}>
            <option value="">Equipe opcional</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          <select value={newSprint.projectId} onChange={(event) => setNewSprint((current) => ({ ...current, projectId: event.target.value }))} className={INPUT_CLASS}>
            <option value="">Projeto opcional</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
          <textarea value={newSprint.goal} onChange={(event) => setNewSprint((current) => ({ ...current, goal: event.target.value }))} rows={3} placeholder="Objetivo da sprint" className={INPUT_CLASS} />
          <button type="button" onClick={handleCreateSprint} disabled={!canManage} className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">
            Criar sprint
          </button>
        </div>

        <div className="section-card space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Sprint selecionada</h2>
              <p className="mt-1 text-sm text-slate-600">Escolha a sprint para planejar, executar e acompanhar tarefas e subtarefas.</p>
            </div>
            <select value={selectedSprint?.id || ''} onChange={(event) => setSelectedSprintId(event.target.value)} className={`${INPUT_CLASS} max-w-sm`}>
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name} • {getSprintStatusLabel(sprint.status)}
                </option>
              ))}
            </select>
          </div>

          {selectedSprint ? (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
                <SprintOverviewCard title="Status" value={getSprintStatusLabel(selectedSprint.status)} subtitle={getSprintDateLabel(selectedSprint)} icon={<Flag className="h-5 w-5" />} />
                <SprintOverviewCard title="Progresso" value={`${progress}%`} subtitle={`${sprintTasks.length} item(ns)`} icon={<Target className="h-5 w-5" />} />
                <SprintOverviewCard title="Horas planejadas" value={`${hourFormatter.format(plannedHours)}h`} subtitle="Soma de horas próprias dos itens" icon={<TimerReset className="h-5 w-5" />} />
                <SprintOverviewCard title="Horas realizadas" value={`${hourFormatter.format(realizedHours)}h`} subtitle="Itens concluídos na sprint" icon={<Layers3 className="h-5 w-5" />} />
                <SprintOverviewCard title="Capacidade estimada" value={`${hourFormatter.format(capacityHours)}h`} subtitle="Dias úteis x 8h x equipe" icon={<CalendarRange className="h-5 w-5" />} />
                <SprintOverviewCard title="Alertas" value={`${delayedCount + outsideCount}`} subtitle={`${delayedCount} atrasada(s) • ${outsideCount} fora da sprint`} icon={<ListOrdered className="h-5 w-5" />} tone={delayedCount + outsideCount > 0 ? 'danger' : 'success'} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className={INPUT_CLASS}>
                  <option value="all">Todos os projetos</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
                <select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} className={INPUT_CLASS}>
                  <option value="all">Todos os responsáveis</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
                <select value={periodFilter} onChange={(event) => setPeriodFilter(event.target.value as 'all' | 'outside' | 'delayed')} className={INPUT_CLASS}>
                  <option value="all">Todos os itens</option>
                  <option value="outside">Fora da sprint</option>
                  <option value="delayed">Atrasada na sprint</option>
                </select>
              </div>

              {selectedSprintProject ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  Sprint vinculada ao projeto <strong>{selectedSprintProject.name}</strong>. Apenas itens desse projeto entram no planejamento por padrão.
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Nenhuma sprint cadastrada.
            </div>
          )}
        </div>
      </section>

      {selectedSprint ? (
        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'planning' | 'kanban' | 'list')} className="space-y-6">
          <TabsList className="inline-flex h-auto flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
            <TabsTrigger value="planning">Planejamento</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="list">Lista</TabsTrigger>
          </TabsList>

          <TabsContent value="planning" className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-2">
              <SprintTaskPool
                title="Backlog elegível"
                subtitle="Tarefas e subtarefas disponíveis para entrar na sprint. Ao adicionar uma tarefa raiz, as subtarefas podem ser incluídas automaticamente."
                tasks={backlogTasks}
                actionLabel="Adicionar"
                onAction={(task) => addTaskToSprint(task, true)}
              />
              <SprintTaskPool
                title="Escopo da sprint"
                subtitle="Itens atualmente planejados para execução neste ciclo."
                tasks={sprintTasks}
                actionLabel="Remover"
                onAction={(task) => removeTaskFromSprint(task.id)}
                dangerAction
              />
            </section>

            <section className="section-card">
              <div className="flex items-center gap-2 mb-4">
                <Plus className="h-4 w-4 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-950">Criar item exclusivo da sprint</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px_auto]">
                <input value={newSprintTaskTitle} onChange={(event) => setNewSprintTaskTitle(event.target.value)} placeholder="Ex: Alinhamento de sprint / cerimônia / item operacional" className={INPUT_CLASS} />
                <select value={newSprintTaskAssigneeId} onChange={(event) => setNewSprintTaskAssigneeId(event.target.value)} className={INPUT_CLASS}>
                  <option value="">Sem responsável</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
                <button type="button" onClick={handleCreateSprintOnlyTask} disabled={!canManage} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                  Criar
                </button>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="kanban" className="space-y-6">
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              {groupedKanban.map((column) => (
                <div key={column.id} className="rounded-2xl border border-slate-200 bg-white">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-900">{column.label}</h3>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{column.tasks.length}</span>
                    </div>
                  </div>
                  <div className="space-y-3 p-4">
                    {column.tasks.length > 0 ? (
                      column.tasks.map((task) => (
                        <SprintKanbanCard key={task.id} task={task} onStatusChange={updateSprintTaskStatus} />
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        Nenhum item nesta coluna.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </section>
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-[2fr_1.4fr_1.1fr_1fr_0.9fr_0.9fr_1fr_1fr_1fr_0.9fr] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                <div>Tarefa / Subtarefa</div>
                <div>Projeto / Fase</div>
                <div>Responsável</div>
                <div>Horas</div>
                <div>Custo</div>
                <div>Status</div>
                <div>Prazo</div>
                <div>Tipo</div>
                <div>Sinais</div>
                <div>Ação</div>
              </div>
              <div className="divide-y divide-slate-100">
                {sprintTasks.length > 0 ? (
                  sprintTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable={canManage}
                      onDragStart={(event) => event.dataTransfer.setData('text/plain', task.id)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => handleSprintTaskDrop(event.dataTransfer.getData('text/plain'), task.id)}
                      className="grid grid-cols-[2fr_1.4fr_1.1fr_1fr_0.9fr_0.9fr_1fr_1fr_1fr_0.9fr] gap-3 px-5 py-4 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">#{(task.sprintOrder ?? 0) + 1} {task.title}</p>
                        {task.parentLabel ? <p className="truncate text-xs text-slate-500">Pai: {task.parentLabel}</p> : null}
                      </div>
                      <div className="min-w-0 text-slate-600">
                        <p className="truncate">{task.projectName || 'Operacional'}</p>
                        <p className="truncate text-xs text-slate-500">{task.phaseName || 'Sem fase'}</p>
                      </div>
                      <div className="truncate text-slate-600">
                        <p>{task.technicalOwnerName || task.assignee || 'Sem técnico'}</p>
                        <p className="text-xs text-slate-500">{task.analystOwnerName || task.requestedBy || 'Sem analista'}</p>
                      </div>
                      <div className="text-slate-600">{hourFormatter.format(task.ownHours)}h</div>
                      <div className="text-slate-600">{currencyFormatter.format(task.ownCost)}</div>
                      <div className="text-slate-600">{task.sprintStatusResolved}</div>
                      <div className="text-slate-600">{task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : '—'}</div>
                      <div className="text-slate-600">{task.typeLabel}</div>
                      <div className="text-xs">
                        {task.outsideSprint ? <p className="text-amber-700">Fora da sprint</p> : null}
                        {task.delayedInSprint ? <p className="text-rose-700">Atrasada</p> : null}
                        {!task.outsideSprint && !task.delayedInSprint ? <p className="text-emerald-700">Dentro do ciclo</p> : null}
                      </div>
                      <div>
                        <button type="button" onClick={() => removeTaskFromSprint(task.id)} className="rounded-xl border border-red-200 p-2 text-red-600 transition-colors hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-10 text-center text-sm text-slate-500">
                    Nenhum item planejado nesta sprint.
                  </div>
                )}
              </div>
            </section>
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}

function SprintOverviewCard(props: { title: string; value: string | number; subtitle: string; icon: React.ReactNode; tone?: 'default' | 'danger' | 'success' }) {
  const toneClasses =
    props.tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : props.tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-slate-200 bg-white text-slate-700';
  return (
    <div className={`rounded-2xl border p-5 ${toneClasses}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{props.title}</p>
        {props.icon}
      </div>
      <p className="mt-3 text-3xl font-bold">{props.value}</p>
      <p className="mt-1 text-sm opacity-90">{props.subtitle}</p>
    </div>
  );
}

function SprintTaskPool(props: {
  title: string;
  subtitle: string;
  tasks: SprintTaskCandidate[];
  actionLabel: string;
  onAction: (task: SprintTaskCandidate) => void;
  dangerAction?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-950">{props.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{props.subtitle}</p>
      </div>
      <div className="space-y-3 p-4">
        {props.tasks.length > 0 ? (
          props.tasks.map((task) => (
            <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700">{task.typeLabel}</span>
                    {task.projectName ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700">{task.projectName}</span> : null}
                    {task.parentLabel ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700">Pai: {task.parentLabel}</span> : null}
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold text-slate-950">{task.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {task.phaseName || 'Sem fase'} • Técnico {task.technicalOwnerName || task.assignee || 'Sem responsável'} • Analista {task.analystOwnerName || task.requestedBy || 'Sem analista'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Prioridade #{(task.sprintOrder ?? 0) + 1} • {hourFormatter.format(task.ownHours)}h • {currencyFormatter.format(task.ownCost)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    {task.outsideSprint ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">Fora da sprint</span> : null}
                    {task.delayedInSprint ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">Atrasada</span> : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => props.onAction(task)}
                  className={`rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                    props.dangerAction
                      ? 'border border-red-200 text-red-600 hover:bg-red-50'
                      : 'border border-slate-200 text-slate-700 hover:bg-white'
                  }`}
                >
                  {props.actionLabel}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Nenhum item nesta visão.
          </div>
        )}
      </div>
    </section>
  );
}

function SprintKanbanCard(props: { task: SprintTaskCandidate; onStatusChange: (taskId: string, status: SprintKanbanStatus) => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700">{props.task.typeLabel}</span>
        {props.task.parentLabel ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700">Pai: {props.task.parentLabel}</span> : null}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-950">{props.task.title}</p>
      <p className="mt-1 text-xs text-slate-500">
        {props.task.projectName || 'Operacional'} • Técnico {props.task.technicalOwnerName || props.task.assignee || 'Sem responsável'}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Analista {props.task.analystOwnerName || props.task.requestedBy || 'Sem analista'} • Prioridade #{(props.task.sprintOrder ?? 0) + 1}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {SPRINT_COLUMNS.map((column) => (
          <button
            key={column.id}
            type="button"
            onClick={() => props.onStatusChange(props.task.id, column.id)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              props.task.sprintStatusResolved === column.id
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 hover:text-slate-900'
            }`}
          >
            {column.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const INPUT_CLASS =
  'w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30';
