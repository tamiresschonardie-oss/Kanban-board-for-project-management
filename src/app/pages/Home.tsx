import { ReactNode, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FolderKanban,
  LayoutDashboard,
  ShieldAlert,
  TimerReset,
  Users,
} from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import { useAdmin } from '../context/AdminContext';
import { formatDurationSummary } from '../utils/timeTracking';
import { useTasks } from '../context/TaskContext';
import { useSchedule } from '../context/ScheduleContext';
import { TaskModal } from '../components/TaskModal';
import { useProjectDetailNavigation } from '../hooks/useProjectDetailNavigation';
import {
  getProjectFilterYear,
  getProjectMetrics,
  getProjectsCompletedByYear,
  getRecentProjectActivities,
  getWorkspaceProjects,
  isProjectDueSoon,
  isProjectOverdue,
} from '../utils/projectSelectors';
import { isTaskDoneStatus, isTaskInProgressStatus, normalizeTaskStatus } from '../utils/taskStatus';
import {
  getTaskOperationalStats,
  getTasksAssignedToUser,
} from '../selectors/taskSelectors';
import { canAccessGovernance, canManageOperationalPriority, canManageWeeklyFocus, isPmoUser } from '../utils/permissions';
import { getPrimaryUserTeam, getUserTeams } from '../utils/userTeams';
import { buildProjectHealth } from '../utils/dashboardInsights';

export function Home() {
  const navigate = useNavigate();
  const { openProjectDetail } = useProjectDetailNavigation();
  const { projects } = useProjects();
  const { currentUser, teams, notifications, skills, getFavoriteEntityIds } = useAdmin();
  const { allTasks } = useTasks();
  const { getEventsForUser } = useSchedule();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const currentUserTasks = useMemo(
    () => getTasksAssignedToUser(allTasks, currentUser),
    [allTasks, currentUser]
  );
  const currentTask = useMemo(
    () => allTasks.find((task) => task.id === selectedTaskId) || null,
    [allTasks, selectedTaskId]
  );

  const projectStats = useMemo(() => {
    const inProgress = projects.filter((project) => {
      const metrics = getProjectMetrics(project);
      return !isProjectOverdue(project) && metrics.progress > 0 && metrics.progress < 100;
    }).length;
    const overdue = projects.filter((project) => isProjectOverdue(project)).length;
    const dueSoon = projects.filter((project) => isProjectDueSoon(project)).length;
    const currentYear = String(new Date().getFullYear());
    const completedByYear = getProjectsCompletedByYear(projects);

    return {
      total: projects.length,
      inProgress,
      overdue,
      dueSoon,
      completedThisYear: completedByYear[currentYear] || 0,
    };
  }, [projects]);

  const taskStats = useMemo(() => getTaskOperationalStats(currentUserTasks), [currentUserTasks]);
  const focusItems = useMemo(() => {
    const now = Date.now();
    const todayLabel = new Date().toDateString();

    return currentUserTasks
      .filter((task) => !isTaskDoneStatus(task.status))
      .map((task) => {
        const dueTimestamp = task.dueDate ? new Date(task.dueDate).getTime() : undefined;
        const isOverdue = !!dueTimestamp && dueTimestamp < now;
        const isToday = !!task.dueDate && new Date(task.dueDate).toDateString() === todayLabel;
        const isCritical =
          task.priority === 'high' || task.isWeeklyFocus || task.isOperationallyPrioritized;
        const isBlocked = !!task.isDependencyBlocked;

        let reason = 'Fila operacional';
        if (isOverdue) reason = 'Vencida';
        else if (isToday) reason = 'Hoje';
        else if (isBlocked) reason = 'Bloqueada';
        else if (isCritical) reason = 'Crítica';

        return {
          id: task.id,
          title: task.title,
          projectName: task.projectName,
          dueDate: task.dueDate,
          reason,
          score:
            (isOverdue ? 40 : 0) +
            (isToday ? 30 : 0) +
            (isBlocked ? 25 : 0) +
            (isCritical ? 20 : 0) +
            (isTaskInProgressStatus(task.status) ? 5 : 0),
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || (a.dueDate || '').localeCompare(b.dueDate || ''))
      .slice(0, 6);
  }, [currentUserTasks]);
  const projectHealth = useMemo(
    () => buildProjectHealth(projects, allTasks),
    [projects, allTasks]
  );
  const operationalAlerts = useMemo(() => {
    const alerts: Array<{
      id: string;
      title: string;
      description: string;
      severity: 'critical' | 'attention';
      action?: () => void;
    }> = [];

    projectHealth
      .filter((item) => item.health !== 'healthy')
      .slice(0, 3)
      .forEach((item) => {
        alerts.push({
          id: `project-risk-${item.projectId}`,
          title: `Projeto em ${item.health === 'critical' ? 'nível crítico' : 'atenção'}`,
          description: `${item.projectName} tem ${item.overdueTasks} tarefas vencidas, ${item.blockedTasks} bloqueadas e ${item.delayedPhases} fases atrasadas.`,
          severity: item.health === 'critical' ? 'critical' : 'attention',
          action: () => openProjectDetail(item.projectId),
        });
      });

    currentUserTasks
      .filter((task) => task.isDependencyBlocked)
      .slice(0, 2)
      .forEach((task) => {
        alerts.push({
          id: `blocked-task-${task.id}`,
          title: 'Tarefa travada por dependência',
          description: `${task.title}${task.dependencyBlockedReason ? ` • ${task.dependencyBlockedReason}` : ''}`,
          severity: 'attention',
          action: () => setSelectedTaskId(task.id),
        });
      });

    const meetings = currentUser ? getEventsForUser(currentUser.id).filter((event) => event.status === 'active') : [];
    const agendaConflict = meetings.find((event, index) =>
      meetings.some((candidate, candidateIndex) => {
        if (index >= candidateIndex || event.date !== candidate.date) return false;
        return !(event.endTime <= candidate.startTime || candidate.endTime <= event.startTime);
      })
    );
    if (agendaConflict) {
      alerts.push({
        id: `agenda-conflict-${agendaConflict.id}`,
        title: 'Conflito de agenda detectado',
        description: `${agendaConflict.title} conflita com outro compromisso em ${new Date(agendaConflict.date).toLocaleDateString('pt-BR')}.`,
        severity: 'attention',
        action: () => navigate('/agenda'),
      });
    }

    const inProgressByUser = currentUserTasks.filter((task) => isTaskInProgressStatus(task.status)).length;
    const overdueByUser = currentUserTasks.filter(
      (task) => !isTaskDoneStatus(task.status) && task.dueDate && new Date(task.dueDate).getTime() < Date.now()
    ).length;
    if (inProgressByUser >= 6 || overdueByUser >= 3) {
      alerts.push({
        id: 'workload-overload',
        title: 'Sobrecarga operacional',
        description: `Você está com ${inProgressByUser} tarefas em andamento e ${overdueByUser} atrasadas.`,
        severity: 'critical',
        action: () => navigate('/my-tasks'),
      });
    }

    return alerts.slice(0, 6);
  }, [projectHealth, currentUserTasks, currentUser, getEventsForUser, openProjectDetail, navigate]);
  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => notification.userId === currentUser?.id && !notification.isRead).slice(0, 4),
    [notifications, currentUser?.id]
  );
  const quickStats = useMemo(() => {
    const blocked = currentUserTasks.filter((task) => task.isDependencyBlocked).length;
    const critical = currentUserTasks.filter(
      (task) => task.priority === 'high' || task.isWeeklyFocus || task.isOperationallyPrioritized
    ).length;
    return { blocked, critical };
  }, [currentUserTasks]);
  const recentActivities = useMemo(() => getRecentProjectActivities(projects, 8), [projects]);
  const completedByYear = useMemo(
    () =>
      Object.entries(getProjectsCompletedByYear(projects))
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .slice(0, 4),
    [projects]
  );

  const canAccessAdmin = isPmoUser(currentUser);
  const canSeeGovernance = canAccessGovernance(currentUser);
  const canSeeOperationalPriority =
    canManageOperationalPriority(currentUser) || canManageWeeklyFocus(currentUser);
  const visibleTeams = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'user') {
      const userTeams = new Set(getUserTeams(currentUser));
      return teams.filter((team) => userTeams.has(team.name));
    }
    return teams;
  }, [teams, currentUser]);

  const favoriteProjectIds = useMemo(() => getFavoriteEntityIds('project'), [getFavoriteEntityIds]);
  const favoriteTaskIds = useMemo(() => getFavoriteEntityIds('task'), [getFavoriteEntityIds]);
  const favoriteSkillIds = useMemo(() => getFavoriteEntityIds('skill'), [getFavoriteEntityIds]);
  const favoriteProjects = useMemo(
    () =>
      favoriteProjectIds
        .map((id) => projects.find((project) => project.id === id))
        .filter((project): project is NonNullable<typeof project> => Boolean(project))
        .slice(0, 4),
    [favoriteProjectIds, projects]
  );
  const favoriteTasks = useMemo(
    () =>
      favoriteTaskIds
        .map((id) => allTasks.find((task) => task.id === id))
        .filter((task): task is NonNullable<typeof task> => Boolean(task))
        .slice(0, 4),
    [favoriteTaskIds, allTasks]
  );
  const favoriteSkills = useMemo(
    () =>
      favoriteSkillIds
        .map((id) => skills.find((skill) => skill.id === id))
        .filter((skill): skill is NonNullable<typeof skill> => Boolean(skill))
        .slice(0, 4),
    [favoriteSkillIds, skills]
  );

  return (
    <div className="app-shell">
      <div className="page-shell space-y-8">
        <div className="page-header gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Painel inicial
            </h1>
            <p className="mt-2 text-sm text-slate-500 md:text-base">
              Visão consolidada da operação para {currentUser?.name || 'usuário atual'}.
            </p>
          </div>

        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <StatCard label="Projetos em andamento" value={String(projectStats.inProgress)} icon={<LayoutDashboard className="w-5 h-5 text-blue-600" />} />
          <StatCard label="Projetos atrasados" value={String(projectStats.overdue)} icon={<AlertCircle className="w-5 h-5 text-red-600" />} />
          <StatCard label="Próximos do prazo" value={String(projectStats.dueSoon)} icon={<CalendarClock className="w-5 h-5 text-orange-600" />} />
          <StatCard label={`Concluídos em ${new Date().getFullYear()}`} value={String(projectStats.completedThisYear)} icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} />
          <StatCard label="Tempo apontado nas minhas tarefas" value={`${taskStats.trackedHours}h`} icon={<TimerReset className="w-5 h-5 text-purple-600" />} />
        </section>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,2fr)_360px]">
          <div className="space-y-8">
            <section className="section-card">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Foco do dia</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    O que precisa de ação agora: vencidas, de hoje, críticas e travadas.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/my-tasks')}
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-950"
                >
                  Abrir minhas tarefas
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
                <InlineStat label="Vencidas" value={String(taskStats.overdue)} />
                <InlineStat label="Hoje" value={String(taskStats.dueToday)} />
                <InlineStat label="Críticas" value={String(quickStats.critical)} />
                <InlineStat label="Bloqueadas" value={String(quickStats.blocked)} />
              </div>

              <div className="space-y-3">
                {focusItems.length > 0 ? focusItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedTaskId(item.id)}
                    className="interactive-surface w-full rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          {item.projectName || 'Tarefa operacional'}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                        item.reason === 'Vencida'
                          ? 'bg-red-100 text-red-700'
                          : item.reason === 'Bloqueada'
                            ? 'bg-amber-100 text-amber-700'
                            : item.reason === 'Crítica'
                              ? 'bg-violet-100 text-violet-700'
                              : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.reason}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                      <span>Prazo: {item.dueDate ? new Date(item.dueDate).toLocaleDateString('pt-BR') : '—'}</span>
                    </div>
                  </button>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                    Nenhuma tarefa crítica no momento. A fila está sob controle.
                  </div>
                )}
              </div>
            </section>

            <section className="section-card">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Alertas automáticos</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Problemas detectados automaticamente a partir de prazo, dependência, agenda e carga.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {operationalAlerts.length > 0 ? operationalAlerts.map((alert) => (
                  <button
                    key={alert.id}
                    onClick={alert.action}
                    className={`block w-full rounded-2xl border px-4 py-4 text-left ${
                      alert.severity === 'critical'
                        ? 'border-red-200 bg-red-50 hover:bg-red-50/80'
                        : 'border-amber-200 bg-amber-50 hover:bg-amber-50/80'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-xl p-2 ${
                        alert.severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {alert.severity === 'critical' ? (
                          <ShieldAlert className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${
                          alert.severity === 'critical' ? 'text-red-950' : 'text-amber-950'
                        }`}>
                          {alert.title}
                        </p>
                        <p className={`mt-1 text-sm ${
                          alert.severity === 'critical' ? 'text-red-800' : 'text-amber-800'
                        }`}>
                          {alert.description}
                        </p>
                      </div>
                    </div>
                  </button>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                    Nenhum alerta operacional relevante no momento.
                  </div>
                )}
              </div>
            </section>

            <section className="section-card">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Ações rápidas</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Menos cliques para entrar nos fluxos mais frequentes do dia.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {canSeeGovernance && (
                  <ShortcutCard title="Governança" description="Fluxo macro dos projetos" onClick={() => navigate('/governance')} />
                )}
                {canSeeGovernance && (
                  <ShortcutCard title="Habilidades" description="Hub estratégico das capacidades" onClick={() => navigate('/governance/skills')} />
                )}
                <ShortcutCard title="Minhas tarefas" description="Execução operacional individual" onClick={() => navigate('/my-tasks')} />
                <ShortcutCard title="Nova tarefa" description="Captura rápida para sua fila" onClick={() => setIsCreatingTask(true)} />
                <ShortcutCard title="Gantt geral" description="Cronogramas reais dos projetos" onClick={() => navigate('/gantt')} />
                <ShortcutCard title="Workspace principal" description="Kanban pai com todos os projetos" onClick={() => navigate('/workspace')} />
                {canSeeOperationalPriority && (
                  <ShortcutCard title="Priorização" description="Fila oficial de projetos e tarefas" onClick={() => navigate('/operational-priority')} />
                )}
                {canAccessAdmin ? (
                  <ShortcutCard title="Administração" description="Cadastros, templates e usuários" onClick={() => navigate('/admin')} />
                ) : (
                  <ShortcutCard
                    title={`Workspace ${getPrimaryUserTeam(currentUser) || ''}`}
                    description="Recorte principal da sua equipe"
                    onClick={() => navigate(`/workspace/${getPrimaryUserTeam(currentUser) || ''}`)}
                  />
                )}
              </div>
            </section>

            <section className="section-card">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Acesso rápido</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Itens favoritos para retomar trabalho sem procurar de novo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <FavoriteBucket
                  title="Projetos"
                  emptyMessage="Marque projetos com estrela no Kanban para tê-los sempre à mão."
                  items={favoriteProjects.map((project) => ({
                    id: project.id,
                    title: project.name,
                    subtitle: project.responsible || 'Sem responsável',
                    onClick: () => openProjectDetail(project.id),
                    icon: <FolderKanban className="h-4 w-4 text-blue-600" />,
                  }))}
                />
                <FavoriteBucket
                  title="Tarefas"
                  emptyMessage="Favoritando uma tarefa no card ela aparece aqui automaticamente."
                  items={favoriteTasks.map((task) => ({
                    id: task.id,
                    title: task.title,
                    subtitle: task.projectName || 'Fila operacional',
                    onClick: () => setSelectedTaskId(task.id),
                    icon: <LayoutDashboard className="h-4 w-4 text-violet-600" />,
                  }))}
                />
                <FavoriteBucket
                  title="Habilidades"
                  emptyMessage="Use a estrela na tela de habilidades para montar seu atalho estratégico."
                  items={favoriteSkills.map((skill) => ({
                    id: skill.id,
                    title: skill.name,
                    subtitle: skill.area || 'Área não definida',
                    onClick: () => navigate(`/governance/skills/${skill.id}`),
                    icon: <BrainCircuit className="h-4 w-4 text-emerald-600" />,
                  }))}
                />
              </div>
            </section>

            <section className="section-card">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Minhas tarefas prioritárias</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Lista operacional baseada nas tarefas realmente atribuídas ao usuário atual.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/my-tasks')}
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-950"
                >
                  Ver fluxo completo
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4 mb-5">
                <InlineStat label="Em andamento" value={String(taskStats.inProgress)} />
                <InlineStat label="Atrasadas" value={String(taskStats.overdue)} />
                <InlineStat label="Hoje" value={String(taskStats.dueToday)} />
                <InlineStat label="Próximas" value={String(taskStats.upcoming)} />
              </div>

              <div className="space-y-3">
                {currentUserTasks.slice(0, 6).map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="interactive-surface w-full rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-900">{task.title}</p>
                        <p className="mt-1 text-sm text-gray-500">
                          {task.projectName || 'Tarefa operacional'} {task.milestoneName ? `• ${task.milestoneName}` : ''}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {normalizeTaskStatus(task.status) === 'done'
                          ? 'Concluída'
                          : normalizeTaskStatus(task.status) === 'blocked'
                            ? 'Bloqueada'
                            : normalizeTaskStatus(task.status) === 'in_progress'
                              ? 'Em andamento'
                              : 'Não iniciada'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                      <span>Prazo: {task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : '—'}</span>
                      <span>Tempo: {formatDurationSummary(task.totalTimeSeconds || 0)}</span>
                    </div>
                  </button>
                ))}
                {currentUserTasks.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                    Nenhuma tarefa atribuída ao usuário atual.
                  </div>
                )}
              </div>
            </section>

            <section className="section-card">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Workspaces</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Recortes reais por equipe, respeitando perfil e permissões.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {visibleTeams.map((team) => {
                  const workspaceProjects = getWorkspaceProjects(projects, team.name);
                  const overdueCount = workspaceProjects.filter((project) => isProjectOverdue(project)).length;
                  return (
                    <button
                      key={team.id}
                      onClick={() => navigate(`/workspace/${team.name}`)}
                      className="interactive-surface rounded-[24px] border border-slate-200/80 bg-white/75 p-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl"
                          style={{ backgroundColor: team.color }}
                        >
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{team.name}</p>
                          <p className="text-sm text-slate-500">{workspaceProjects.length} projetos</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                        <span>Atrasados: {overdueCount}</span>
                        <span>Ir para workspace</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="space-y-8">
            <section className="section-card">
              <div className="flex items-center gap-2 mb-4">
                <Clock3 className="w-4 h-4 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Central de alertas</h2>
              </div>
              <div className="space-y-3">
                {unreadNotifications.length > 0 ? (
                  unreadNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => navigate(notification.linkTo || '/my-tasks')}
                      className="interactive-surface block w-full rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-left"
                    >
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      <p className="mt-1 text-sm text-gray-500">{notification.description}</p>
                      <p className="mt-2 text-xs text-gray-400">
                        {new Date(notification.createdAt).toLocaleString('pt-BR')}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Nenhum alerta pendente para o usuário atual.</p>
                )}
              </div>
            </section>

            <section className="section-card">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Concluídos por ano</h2>
              </div>
              <div className="space-y-3">
                {completedByYear.length > 0 ? (
                  completedByYear.map(([year, count]) => (
                    <div key={year} className="surface-card-muted flex items-center justify-between px-4 py-3">
                      <span className="text-sm text-slate-600">{year}</span>
                      <span className="text-sm font-semibold text-slate-900">{count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Ainda não há projetos concluídos com ano consolidado.</p>
                )}
              </div>
            </section>

            <section className="section-card">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Atividades recentes</h2>
              </div>
              <div className="space-y-4">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <button
                      key={activity.id}
                      onClick={() => openProjectDetail(activity.projectId)}
                      className="interactive-surface block w-full rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-left"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {activity.projectName}
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        <span className="font-medium">{activity.user}</span> {activity.action}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">{activity.details}</p>
                      <p className="mt-2 text-xs text-gray-400">
                        {new Date(activity.timestamp).toLocaleString('pt-BR')}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">Nenhuma atividade recente registrada.</p>
                )}
              </div>
            </section>

            <section className="section-card">
              <div className="flex items-center gap-2 mb-4">
                <FolderKanban className="w-4 h-4 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">Projetos próximos do prazo</h2>
              </div>
              <div className="space-y-3">
                {projects.filter((project) => isProjectDueSoon(project)).slice(0, 5).map((project) => (
                  <button
                    key={project.id}
                    onClick={() => openProjectDetail(project.id)}
                    className="interactive-surface block w-full rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-left"
                  >
                    <p className="text-sm font-medium text-gray-900">{project.name}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Prazo: {project.deadline ? new Date(project.deadline).toLocaleDateString('pt-BR') : '—'}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Equipe: {project.group} • Ano: {getProjectFilterYear(project) || '—'}
                    </p>
                  </button>
                ))}
                {projects.filter((project) => isProjectDueSoon(project)).length === 0 && (
                  <p className="text-sm text-gray-500">Nenhum projeto em janela crítica de prazo.</p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <TaskModal
        isOpen={!!currentTask}
        onClose={() => setSelectedTaskId(null)}
        editingTask={currentTask}
        projectId={currentTask?.projectId}
        milestoneId={currentTask?.milestoneId}
      />

      <TaskModal
        isOpen={isCreatingTask}
        onClose={() => setIsCreatingTask(false)}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="metric-card">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl bg-slate-50 p-2.5">{icon}</div>
        <span className="text-sm font-medium text-slate-600">{label}</span>
      </div>
      <p className="text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

function InlineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card-muted px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ShortcutCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="interactive-surface rounded-[24px] border border-slate-200/80 bg-white/70 p-4 text-left"
    >
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
        Abrir
        <ArrowRight className="w-4 h-4" />
      </div>
    </button>
  );
}

function FavoriteBucket({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    onClick: () => void;
    icon: ReactNode;
  }>;
  emptyMessage: string;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
          {items.length}
        </span>
      </div>

      <div className="space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className="interactive-surface flex w-full items-center gap-3 rounded-2xl border border-white/80 bg-white px-3 py-3 text-left"
            >
              <div className="rounded-xl bg-slate-50 p-2">{item.icon}</div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                <p className="truncate text-xs text-slate-500">{item.subtitle}</p>
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-3 py-6 text-sm text-slate-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}
