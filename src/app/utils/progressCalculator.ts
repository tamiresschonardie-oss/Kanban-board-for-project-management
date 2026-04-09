import { Phase, Project, ProjectMetrics, WBSTask } from '../types';
import {
  getTaskNodeProgress,
  getTaskNodeTotalTrackedSeconds,
  getTaskNodeTotalTrackedMinutes,
  isTaskNodeDeleted,
  isTaskNodeEffectivelyComplete,
} from '../selectors/taskSelectors';

function getExecutionPhases(project: Project) {
  return project.execution?.phases || [];
}

function getProjectMetricProgress(project: Project) {
  return project.metrics?.progress ?? project.progress ?? 0;
}

/**
 * Calcula o progresso de uma fase baseado na quantidade de tarefas completas
 * @param phaseId ID da fase
 * @param allTasks Todas as tasks do projeto
 * @returns Percentual de progresso (0-100)
 */
export function getPhaseProgress(phaseId: string, allTasks: WBSTask[]): number {
  const phaseTasks = allTasks.filter((task) => task.phaseId === phaseId && !isTaskNodeDeleted(task));

  if (phaseTasks.length === 0) return 0;

  const totalProgress = phaseTasks.reduce(
    (accumulator, task) => accumulator + getTaskNodeProgress(task),
    0
  );
  return Math.round(totalProgress / phaseTasks.length);
}

/**
 * Calcula o progresso do projeto como média simples das fases
 * @param project Projeto
 * @param allTasks Todas as tasks do projeto
 * @returns Percentual de progresso (0-100)
 */
export function getProjectProgress(project: Project, allTasks: WBSTask[]): number {
  const executionPhases = getExecutionPhases(project);
  if (executionPhases.length === 0) {
    return getProjectMetricProgress(project);
  }

  const tasks = allTasks.filter(
    (task) => executionPhases.some((phase) => phase.id === task.phaseId) && !isTaskNodeDeleted(task)
  );

  if (tasks.length === 0) return 0;

  const totalProgress = tasks.reduce(
    (accumulator, task) => accumulator + getTaskNodeProgress(task),
    0
  );
  return Math.round(totalProgress / tasks.length);
}

export function calculateProjectMetricsFromExecution(project: Project): ProjectMetrics {
  const phases = getExecutionPhases(project);
  const rootTasks = phases.flatMap((phase) =>
    phase.milestones.flatMap((milestone) => milestone.tasks || [])
  ).filter((task) => !isTaskNodeDeleted(task));

  if (rootTasks.length === 0) {
    return {
      progress: 0,
      tasksTotal: 0,
      tasksCompleted: 0,
      hoursRemaining: 0,
      totalTimeTracked: 0,
      hoursRemainingSeconds: 0,
      totalTimeTrackedSeconds: 0,
    };
  }

  const tasksTotal = rootTasks.length;
  const tasksCompleted = rootTasks.filter((task) => isTaskNodeEffectivelyComplete(task)).length;
  const progress = Math.round(
    rootTasks.reduce((total, task) => total + getTaskNodeProgress(task), 0) / tasksTotal
  );
  const totalTrackedMinutes = rootTasks.reduce(
    (total, task) => total + getTaskNodeTotalTrackedMinutes(task),
    0
  );
  const totalTrackedSeconds = rootTasks.reduce(
    (total, task) => total + getTaskNodeTotalTrackedSeconds(task),
    0
  );
  const estimatedHours = rootTasks.reduce(
    (total, task) => total + (task.estimatedHours || 0),
    0
  );
  const hoursRemainingSeconds = Math.max(Math.round(estimatedHours * 3600) - totalTrackedSeconds, 0);

  return {
    progress,
    tasksTotal,
    tasksCompleted,
    hoursRemaining: Math.max(estimatedHours - totalTrackedMinutes / 60, 0),
    totalTimeTracked: Number((totalTrackedMinutes / 60).toFixed(2)),
    hoursRemainingSeconds,
    totalTimeTrackedSeconds: totalTrackedSeconds,
  };
}

/**
 * Formata o progresso como string com barra visual (opcional)
 * @param progress Percentual (0-100)
 * @returns String formatada
 */
export function formatProgress(progress: number): string {
  return `${progress}%`;
}
