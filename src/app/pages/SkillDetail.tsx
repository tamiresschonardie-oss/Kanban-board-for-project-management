import { useMemo } from 'react';
import { ArrowLeft, BrainCircuit, CheckCircle2, Clock3, FolderKanban, ListTodo, PauseCircle, UserCircle2 } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useAdmin } from '../context/AdminContext';
import { useProjects } from '../context/ProjectContext';
import { useTasks } from '../context/TaskContext';
import { Skill } from '../types';
import { getProjectsBySkill, getSkillActivity, getSkillMetrics, getTasksBySkill } from '../utils/skillSelectors';
import { getProjectGovernancePhaseId, getProjectMetrics } from '../utils/projectSelectors';

const STATUS_LABELS: Record<Skill['status'], string> = {
  active: 'Ativa',
  draft: 'Rascunho',
  paused: 'Pausada',
  archived: 'Arquivada',
};

function formatPercent(value?: number) {
  const safe = Number.isFinite(value) ? Number(value) : 0;
  return `${Math.round(safe)}%`;
}

export function SkillDetail() {
  const { skillId } = useParams<{ skillId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { skills, users } = useAdmin();
  const { projects } = useProjects();
  const { allTasks } = useTasks();
  const isGovernanceView = location.pathname.startsWith('/governance/skills');

  const skill = skills.find((item) => item.id === skillId);

  const ownerName = useMemo(
    () => users.find((user) => user.id === skill?.ownerId)?.name || 'Sem owner definido',
    [users, skill?.ownerId]
  );

  const relatedProjects = useMemo(
    () => getProjectsBySkill(projects, skillId).slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [projects, skillId]
  );

  const relatedTasks = useMemo(
    () =>
      getTasksBySkill(allTasks, skillId)
        .slice()
        .sort((a, b) => {
          const dateA = a.dueDate || a.startDate || '';
          const dateB = b.dueDate || b.startDate || '';
          return dateA.localeCompare(dateB, 'pt-BR');
        }),
    [allTasks, skillId]
  );

  const tasksByBucket = useMemo(
    () => ({
      doing: relatedTasks.filter((task) => task.status === 'in_progress'),
      backlog: relatedTasks.filter((task) => task.status !== 'in_progress' && task.status !== 'done'),
      done: relatedTasks.filter((task) => task.status === 'done'),
    }),
    [relatedTasks]
  );

  const contextTeams = useMemo(
    () =>
      Array.from(
        new Set(
          relatedProjects.flatMap((project) => project.teams?.length ? project.teams : [project.group]).filter(Boolean)
        )
      ),
    [relatedProjects]
  );
  const metrics = useMemo(
    () => (skill ? getSkillMetrics(skill, projects, allTasks) : null),
    [skill, projects, allTasks]
  );
  const activity = useMemo(
    () => (skill ? getSkillActivity(skill, projects, allTasks) : []),
    [skill, projects, allTasks]
  );

  if (!skill) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center shadow-sm">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Habilidade não encontrada</h2>
          <p className="mb-4 text-gray-600">A habilidade que você tentou abrir não está disponível.</p>
          <button
            onClick={() => navigate(isGovernanceView ? '/governance/skills' : '/admin')}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            {isGovernanceView ? 'Voltar para Governança' : 'Voltar para Administração'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-8 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(isGovernanceView ? '/governance/skills' : -1)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <BrainCircuit className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{skill.name}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {isGovernanceView
                    ? 'Hub executivo da capacidade, com visão consolidada de projetos e execução.'
                    : 'Hub central da capacidade para conectar contexto, projetos e execução.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-slate-400" />
                <h2 className="text-lg font-semibold text-slate-900">Resumo</h2>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                {skill.description || 'Sem descrição cadastrada para esta habilidade.'}
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                <SummaryItem label="Status" value={STATUS_LABELS[skill.status]} />
                <SummaryItem label="Área" value={skill.area || 'Não definida'} />
                <SummaryItem label="Dono da habilidade" value={ownerName} />
                <SummaryItem label="Maturidade" value={skill.maturityLevel || 'Não informada'} />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <UserCircle2 className="h-4 w-4 text-slate-400" />
                <h2 className="text-lg font-semibold text-slate-900">Contexto de uso</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="Projetos" value={String(metrics?.totalProjects || 0)} />
                <MetricCard label="Tarefas" value={String(metrics?.totalTasks || 0)} />
                <MetricCard label="Em andamento" value={String(metrics?.tasksInProgress || 0)} />
                <MetricCard label="Fluxos impactados" value={String(metrics?.impactedFlows || 0)} />
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  Fluxos / equipes usando esta habilidade
                </p>
                <div className="flex flex-wrap gap-2">
                  {contextTeams.length > 0 ? contextTeams.map((team) => (
                    <span
                      key={team}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {team}
                    </span>
                  )) : (
                    <span className="text-sm text-slate-500">Nenhum contexto operacional vinculado ainda.</span>
                  )}
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Última movimentação</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {metrics?.lastMovementAt
                    ? new Date(metrics.lastMovementAt).toLocaleString('pt-BR')
                    : 'Sem movimentações registradas'}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Projetos relacionados</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Todos os projetos que evoluem ou utilizam esta habilidade.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {relatedProjects.length > 0 ? relatedProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-left transition-colors hover:bg-white"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{project.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {project.group} • Responsável: {project.responsible || 'Não definido'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      {getProjectGovernancePhaseId(project)}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      Progresso {formatPercent(getProjectMetrics(project).progress)}
                    </p>
                  </div>
                </button>
              )) : (
                <EmptyState
                  icon={<FolderKanban className="h-5 w-5 text-slate-400" />}
                  title="Nenhum projeto vinculado"
                  description="Ainda não existem projetos vinculados a esta habilidade."
                />
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Tarefas relacionadas</h2>
                <p className="mt-1 text-sm text-slate-500">
                  A execução vinculada a esta habilidade, separada por estágio operacional.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <TaskBucketColumn
                title="Em andamento"
                items={tasksByBucket.doing}
                icon={<PauseCircle className="h-4 w-4 text-amber-500" />}
                onOpenTask={(taskId) => navigate(`/my-tasks?task=${taskId}`)}
              />
              <TaskBucketColumn
                title="Backlog"
                items={tasksByBucket.backlog}
                icon={<ListTodo className="h-4 w-4 text-slate-500" />}
                onOpenTask={(taskId) => navigate(`/my-tasks?task=${taskId}`)}
              />
              <TaskBucketColumn
                title="Concluídas"
                items={tasksByBucket.done}
                icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                onOpenTask={(taskId) => navigate(`/my-tasks?task=${taskId}`)}
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-slate-400" />
                <h2 className="text-lg font-semibold text-slate-900">Fluxos / processos impactados</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {contextTeams.length > 0 ? contextTeams.map((team) => (
                  <span
                    key={team}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {team}
                  </span>
                )) : (
                  <p className="text-sm text-slate-500">
                    Estrutura pronta para evoluir o mapeamento de processos quando houver modelagem adicional.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-slate-400" />
                <h2 className="text-lg font-semibold text-slate-900">Timeline da habilidade</h2>
              </div>
              <div className="space-y-3">
                {activity.length > 0 ? activity.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() =>
                      entry.entityType === 'project'
                        ? navigate(`/project/${entry.projectId || entry.entityId}`)
                        : navigate(`/my-tasks?task=${entry.taskId || entry.entityId}`)
                    }
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{entry.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{entry.description}</p>
                      </div>
                      <span className="whitespace-nowrap text-xs text-slate-500">
                        {new Date(entry.timestamp).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </button>
                )) : (
                  <EmptyState
                    icon={<Clock3 className="h-5 w-5 text-slate-400" />}
                    title="Sem atividade registrada"
                    description="A timeline será preenchida conforme projetos e tarefas usarem esta habilidade."
                  />
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white">
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function TaskBucketColumn({
  title,
  items,
  icon,
  onOpenTask,
}: {
  title: string;
  items: Array<{
    id: string;
    title: string;
    assignee?: string;
    projectName?: string;
    phaseName?: string;
    dueDate?: string;
    itemTypeLabel?: string;
  }>;
  icon: React.ReactNode;
  onOpenTask: (taskId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
          {items.length}
        </span>
      </div>

      <div className="space-y-2">
        {items.length > 0 ? items.map((task) => (
          <button
            key={task.id}
            onClick={() => onOpenTask(task.id)}
            className="block w-full rounded-2xl border border-white bg-white px-3 py-3 text-left hover:border-slate-300"
          >
            <p className="text-sm font-medium text-slate-900">{task.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              {[task.itemTypeLabel, task.projectName, task.phaseName].filter(Boolean).join(' • ') || 'Tarefa independente'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Responsável: {task.assignee || 'Não definido'}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Prazo: {task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : 'Não definido'}
            </p>
          </button>
        )) : (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-sm text-slate-500">
            Nenhuma tarefa neste estágio.
          </p>
        )}
      </div>
    </div>
  );
}
