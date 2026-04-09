import { useMemo, useState } from 'react';
import { ArrowLeft, Edit2, ExternalLink, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Project, ProjectAttachment } from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { ProjectModal } from '../ProjectModal';
import { ProjectDetailHeader } from './ProjectDetailHeader';
import { ProjectDetailOverview } from './ProjectDetailOverview';
import { ProjectExecutionPanel } from './ProjectExecutionPanel';
import { ProjectActivityPanel } from './ProjectActivityPanel';
import { ProjectGanttTab } from '../ProjectGanttTab';
import { ProjectScheduleSummary } from './ProjectScheduleSummary';
import { DEFAULT_GOVERNANCE_PHASES, PROJECT_SITUATIONS, PROJECT_SITUATIONS_LABELS } from '../../constants/project';
import { useAdmin } from '../../context/AdminContext';
import { canUserPerform } from '../../utils/permissions';
import {
  getProjectCurrentGovernancePhase,
  getProjectExecutionManualTimelineEntries,
  getProjectExecutionPhases,
  getProjectGovernancePhaseId,
  getProjectGovernanceSituation,
} from '../../utils/projectSelectors';
import { useFeedback } from '../../context/FeedbackContext';

interface ProjectDetailViewProps {
  project: Project;
  mode: 'page' | 'overlay';
  onClose?: () => void;
}

type ProjectDetailTab = 'overview' | 'execution' | 'schedule' | 'updates';

export function ProjectDetailView({
  project,
  mode,
  onClose,
}: ProjectDetailViewProps) {
  const navigate = useNavigate();
  const { updateProject } = useProjects();
  const { currentUser } = useAdmin();
  const { showFeedback } = useFeedback();
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [activeTab, setActiveTab] = useState<ProjectDetailTab>('overview');
  const [scheduleView, setScheduleView] = useState<'summary' | 'gantt'>('summary');
  const [isProjectSummaryCollapsed, setIsProjectSummaryCollapsed] = useState(false);
  const canManageProject = canUserPerform(currentUser, 'project:edit');
  const canEditProject = currentUser?.status === 'active' && currentUser.role === 'pmo';
  const canAddAttachments = currentUser?.status === 'active';
  const canRemoveAttachments = canManageProject;
  const currentSituation = getProjectGovernanceSituation(project);
  const executionPhases = useMemo(() => getProjectExecutionPhases(project), [project]);
  const executionSnapshot = useMemo(() => {
    const milestones = executionPhases.reduce((total, phase) => total + (phase.milestones || []).length, 0);
    const taskCount = executionPhases.reduce(
      (total, phase) =>
        total +
        (phase.milestones || []).reduce(
          (milestoneTotal, milestone) => milestoneTotal + (milestone.tasks || []).length,
          0
        ),
      0
    );
    const subtaskCount = executionPhases.reduce(
      (total, phase) =>
        total +
        (phase.milestones || []).reduce(
          (milestoneTotal, milestone) =>
            milestoneTotal +
            (milestone.tasks || []).reduce(
              (taskTotal, task) => taskTotal + countSubtasks(task.subtasks || []),
              0
            ),
          0
        ),
      0
    );

    return {
      phases: executionPhases.length,
      milestones,
      tasks: taskCount,
      subtasks: subtaskCount,
      timelineEntries: getProjectExecutionManualTimelineEntries(project).length,
    };
  }, [executionPhases, project]);
  const availableTabs = useMemo(
    () =>
      [
        { id: 'overview' as const, label: 'Resumo' },
        { id: 'execution' as const, label: 'Execução' },
        { id: 'schedule' as const, label: 'Cronograma' },
        { id: 'updates' as const, label: 'Atualizações' },
      ],
    []
  );

  const governancePhaseLabel = useMemo(() => {
    const governancePhaseId = getProjectGovernancePhaseId(project);
    const definition = getProjectCurrentGovernancePhase(project);
    return (
      definition?.name ||
      DEFAULT_GOVERNANCE_PHASES.find((phase) => phase.id === governancePhaseId)?.name ||
      governancePhaseId
    );
  }, [project]);

  const handleProjectUpdate = (updatedProject: typeof project) => {
    updateProject(project.id, updatedProject);
    setIsEditingProject(false);
  };

  const handleOpenStandalone = () => {
    navigate(`/project/${project.id}`);
  };

  const handleSituationChange = (nextSituation: typeof PROJECT_SITUATIONS[keyof typeof PROJECT_SITUATIONS]) => {
    if (!canManageProject || currentSituation === nextSituation) return;

    const userName = currentUser?.name || 'Sistema';
    const action =
      nextSituation === PROJECT_SITUATIONS.PAUSADO
        ? 'pausou o projeto'
        : 'reativou o projeto';

    updateProject(project.id, {
      governance: {
        ...project.governance,
        situation: nextSituation,
      },
      situation: nextSituation,
      isPaused: nextSituation === PROJECT_SITUATIONS.PAUSADO,
      activities: [
        ...(project.activities || []),
        {
          id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          user: userName,
          action,
          details: `${project.name} agora está ${PROJECT_SITUATIONS_LABELS[nextSituation].toLowerCase()}.`,
          entityType: 'project',
          entityId: project.id,
        },
      ],
    });
  };

  const situationControl = canManageProject ? (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-3 shadow-sm">
      <span className="text-sm font-medium text-gray-700">Controle operacional:</span>
      <div className="inline-flex rounded-xl bg-gray-100 p-1">
        <button
          onClick={() => handleSituationChange(PROJECT_SITUATIONS.ATIVO)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            currentSituation === PROJECT_SITUATIONS.ATIVO
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Ativo
        </button>
        <button
          onClick={() => handleSituationChange(PROJECT_SITUATIONS.PAUSADO)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            currentSituation === PROJECT_SITUATIONS.PAUSADO
              ? 'bg-white text-yellow-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Pausado
        </button>
      </div>
    </div>
  ) : undefined;

  const handleAddAttachments = (attachments: ProjectAttachment[]) => {
    if (!canAddAttachments || attachments.length === 0) return;

    updateProject(project.id, {
      attachments: [...(project.attachments || []), ...attachments],
      activities: [
        ...(project.activities || []),
        {
          id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          user: currentUser?.name || 'Sistema',
          action: 'adicionou anexos ao projeto',
          details: `${attachments.length} anexo(s) incluído(s) em ${project.name}.`,
          entityType: 'project',
          entityId: project.id,
        },
      ],
    });

    showFeedback({
      tone: 'success',
      title: 'Anexos adicionados',
      message: `${attachments.length} anexo(s) enviado(s) para o projeto.`,
    });
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    if (!canRemoveAttachments) return;

    const attachment = (project.attachments || []).find((item) => item.id === attachmentId);

    updateProject(project.id, {
      attachments: (project.attachments || []).filter((item) => item.id !== attachmentId),
      activities: [
        ...(project.activities || []),
        {
          id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          user: currentUser?.name || 'Sistema',
          action: 'removeu um anexo do projeto',
          details: attachment?.name || 'Anexo removido',
          entityType: 'project',
          entityId: project.id,
        },
      ],
    });

    showFeedback({
      tone: 'success',
      title: 'Anexo removido',
      message: attachment?.name || 'O anexo foi removido do projeto.',
    });
  };

  const shellClassName =
    mode === 'overlay'
      ? 'flex h-full flex-col overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-2xl'
      : 'h-full flex flex-col bg-gray-50';

  return (
    <>
      <div className={shellClassName}>
        <div className={`border-b border-gray-200 bg-white ${mode === 'overlay' ? 'px-6 py-4' : 'px-8 py-4'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {mode === 'page' ? (
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Voltar</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Fechar</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {mode === 'overlay' && (
                <button
                  type="button"
                  onClick={handleOpenStandalone}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Abrir página
                </button>
              )}
              {canEditProject && (
                <button
                  type="button"
                  onClick={() => setIsEditingProject(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Editar projeto</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
          <div className={`${mode === 'overlay' ? 'px-6 pb-6 pt-4' : 'px-8 pb-8 pt-5'} min-w-0`}>
            <div className="mb-5 space-y-3">
              <ProjectDetailHeader
                project={project}
                governancePhaseLabel={governancePhaseLabel}
                situationControl={situationControl}
                collapsed={isProjectSummaryCollapsed}
                onToggleCollapsed={() => {
                  setIsProjectSummaryCollapsed((previous) => !previous);
                }}
              />

              <div className="sticky top-0 z-10 -mx-2 bg-slate-50/95 px-2 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-slate-50/75">
                <div className="rounded-3xl border border-gray-200 bg-white p-2 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    {availableTabs.map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {activeTab === 'overview' ? (
              <div className="space-y-6">
                <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <OverviewMetricCard
                    title="Fases"
                    value={String(executionSnapshot.phases)}
                    helper="Estrutura da execução"
                  />
                  <OverviewMetricCard
                    title="Marcos"
                    value={String(executionSnapshot.milestones)}
                    helper="Entregas e checkpoints"
                  />
                  <OverviewMetricCard
                    title="Tarefas"
                    value={String(executionSnapshot.tasks)}
                    helper="Itens operacionais"
                  />
                  <OverviewMetricCard
                    title="Subtarefas"
                    value={String(executionSnapshot.subtasks)}
                    helper="Desdobramento técnico"
                  />
                  <OverviewMetricCard
                    title="Linhas de cronograma"
                    value={String(executionSnapshot.timelineEntries)}
                    helper="Entradas manuais extras"
                  />
                </section>

                <ProjectDetailOverview
                  project={project}
                  canAddAttachments={Boolean(canAddAttachments)}
                  canRemoveAttachments={canRemoveAttachments}
                  onAddAttachments={handleAddAttachments}
                  onRemoveAttachment={handleRemoveAttachment}
                />
              </div>
            ) : null}

            {activeTab === 'execution' ? (
              <div className="space-y-4">
                <ProjectExecutionPanel project={project} />
              </div>
            ) : null}

            {activeTab === 'schedule' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Cronograma do Projeto</h3>
                  </div>
                  <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setScheduleView('summary')}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        scheduleView === 'summary'
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Cronograma
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleView('gantt')}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        scheduleView === 'gantt'
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Gantt
                    </button>
                  </div>
                </div>

                {scheduleView === 'summary' ? (
                  <ProjectScheduleSummary project={project} />
                ) : (
                  <ProjectGanttTab project={project} />
                )}
              </div>
            ) : null}

            {activeTab === 'updates' ? (
              <div className="space-y-4">
                <ProjectActivityPanel project={project} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isEditingProject && canEditProject && (
        <ProjectModal
          isOpen={isEditingProject}
          onClose={() => setIsEditingProject(false)}
          onSave={handleProjectUpdate}
          project={project}
        />
      )}
    </>
  );
}

function countSubtasks(subtasks: NonNullable<Project['execution']['phases']>[number]['milestones'][number]['tasks'][number]['subtasks']) {
  return subtasks.reduce((total, subtask) => total + 1 + countSubtasks(subtask.subtasks || []), 0);
}

function OverviewMetricCard({
  title,
  value,
  helper,
}: {
  title: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </div>
  );
}
