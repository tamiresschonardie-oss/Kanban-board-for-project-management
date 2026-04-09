import { useMemo, useState } from 'react';
import { Layers3, Plus, TimerReset, X } from 'lucide-react';
import { Project } from '../../types';
import { useTasks } from '../../context/TaskContext';
import {
  getProjectExecutionDependencies,
  getProjectExecutionPhases,
  getProjectMetrics,
} from '../../utils/projectSelectors';
import { getProjectExecutionStatus, getProjectExecutionStatusBadge } from '../../utils/phaseStatusCalculator';
import { ProjectPhasesTab } from '../ProjectPhasesTab';
import { TaskModal } from '../TaskModal';
import { useAdmin } from '../../context/AdminContext';
import { formatDurationSummary } from '../../utils/timeTracking';
import { canUserPerform } from '../../utils/permissions';
import { useFeedback } from '../../context/FeedbackContext';
import { getProjectDependencySummary } from '../../utils/taskDependencies';

interface ProjectExecutionPanelProps {
  project: Project;
}

export function ProjectExecutionPanel({ project }: ProjectExecutionPanelProps) {
  const { allTasks, applyTaskTemplateToProject } = useTasks();
  const { currentUser, taskTemplates } = useAdmin();
  const { showFeedback } = useFeedback();
  const [editingTask, setEditingTask] = useState<any>(null);
  const [createTaskContext, setCreateTaskContext] = useState<{
    projectId: string;
    phaseId: string;
    milestoneId: string;
  } | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [templateFeedback, setTemplateFeedback] = useState<string | null>(null);
  const phases = useMemo(() => getProjectExecutionPhases(project), [project]);
  const projectTasks = useMemo(() => allTasks.filter((task) => task.projectId === project.id), [allTasks, project.id]);
  const metrics = getProjectMetrics(project);
  const executionStatus = getProjectExecutionStatus(project, allTasks);
  const executionBadge = getProjectExecutionStatusBadge(executionStatus);
  const canApplyTemplate = canUserPerform(currentUser, 'task-template:apply');
  const activeTemplates = useMemo(
    () => taskTemplates.filter((template) => template.isActive),
    [taskTemplates]
  );
  const appliedTemplateIds = project.execution?.appliedTaskTemplateIds || [];
  const projectDependencies = useMemo(() => getProjectExecutionDependencies(project), [project]);
  const dependencySummary = useMemo(
    () =>
      getProjectDependencySummary(
        projectDependencies,
        projectTasks.filter((task) => task.isDependencyBlocked).map((task) => task.id)
      ),
    [projectDependencies, projectTasks]
  );

  const handleApplyTemplate = () => {
    const template = activeTemplates.find((item) => item.id === selectedTemplateId);
    if (!template) {
      showFeedback({
        tone: 'error',
        title: 'Template não selecionado',
        message: 'Escolha um template válido antes de aplicar.',
      });
      return;
    }

    const result = applyTaskTemplateToProject(project.id, template);
    if (result.alreadyApplied) {
      const message = 'Este template já foi aplicado a este projeto.';
      setTemplateFeedback(message);
      showFeedback({ tone: 'info', title: 'Template já aplicado', message });
      return;
    }

    const message = `Template aplicado com sucesso: ${result.createdTasks} tarefa(s) criada(s)${
      result.skippedTasks ? `, ${result.skippedTasks} ignorada(s)` : ''
    }.`;
    setTemplateFeedback(message);
    showFeedback({ tone: 'success', title: 'Template aplicado', message });
    setIsTemplateModalOpen(false);
    setSelectedTemplateId('');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_320px] gap-6">
      <section className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers3 className="w-4 h-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">Plano de entrega</h3>
            </div>
            <p className="text-sm text-gray-600">
              Aqui vive a execução real do projeto: fases, marcos, tarefas, responsáveis e andamento. A estrutura nasce do template de fases aplicado ao projeto.
            </p>
            {templateFeedback && (
              <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                {templateFeedback}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {canApplyTemplate && activeTemplates.length > 0 && (
              <button
                onClick={() => {
                  setSelectedTemplateId(activeTemplates[0]?.id || '');
                  setIsTemplateModalOpen(true);
                  setTemplateFeedback(null);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
              >
                <Plus className="h-4 w-4" />
                Aplicar template
              </button>
            )}
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${executionBadge.color}`}>
              <span>{executionBadge.emoji}</span>
              {executionBadge.label}
            </span>
          </div>
        </div>

        {phases.length > 0 ? (
          <ProjectPhasesTab
            project={project}
            onEditTask={setEditingTask}
            onCreateTask={setCreateTaskContext}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
            Este projeto ainda não possui estrutura de execução aplicada. Selecione um template de fases no cadastro do projeto para começar com um plano pronto.
          </div>
        )}
      </section>

      <aside className="space-y-6">
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TimerReset className="w-4 h-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Resumo Operacional</h3>
          </div>

          <div className="space-y-3">
            <SummaryRow label="Fases de execucao" value={String(phases.length)} />
            <SummaryRow label="Tarefas totais" value={String(metrics.tasksTotal)} />
            <SummaryRow label="Tarefas concluidas" value={String(metrics.tasksCompleted)} />
            <SummaryRow label="Horas restantes" value={formatDurationSummary(metrics.hoursRemainingSeconds || 0)} />
            <SummaryRow label="Tempo apontado" value={formatDurationSummary(metrics.totalTimeTrackedSeconds || 0)} />
            <SummaryRow label="Templates aplicados" value={String(appliedTemplateIds.length)} />
            <SummaryRow label="Tarefas bloqueadas" value={String(dependencySummary.blockedTasks)} />
            <SummaryRow label="Dependências externas" value={String(dependencySummary.externalDependencies)} />
            <SummaryRow label="Dependências entre fases" value={String(dependencySummary.phaseDependencies)} />
            <SummaryRow label="Relacionamentos" value={String(dependencySummary.totalRelationships)} />
          </div>
        </section>
      </aside>

      <TaskModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        editingTask={editingTask || undefined}
        projectId={project.id}
      />

      <TaskModal
        isOpen={!!createTaskContext}
        onClose={() => setCreateTaskContext(null)}
        projectId={createTaskContext?.projectId}
        phaseId={createTaskContext?.phaseId}
        milestoneId={createTaskContext?.milestoneId}
      />

      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Aplicar template de tarefas</h3>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="rounded-lg p-1 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  {activeTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                      {appliedTemplateIds.includes(template.id) ? ' (já aplicado)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                O template cria a base operacional do projeto. Ele não é reaplicado se já constar como usado, para não duplicar fases e tarefas.
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyTemplate}
                disabled={!selectedTemplateId}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}
