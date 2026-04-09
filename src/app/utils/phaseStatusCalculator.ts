import { WBSTask, Project, ProjectExecutionStatus } from '../types';
import { getProjectExecutionPhases } from './projectSelectors';
import {
  getTaskNodeProgress,
  isTaskNodeDeleted,
  isTaskNodeEffectivelyComplete,
} from '../selectors/taskSelectors';

export type PhaseStatus = 'não-iniciado' | 'em-andamento' | 'concluído' | 'em-risco';

/**
 * Calcula o status automático de uma fase baseado nas suas tarefas
 * @param phaseId ID da fase
 * @param allTasks Todas as tasks do projeto
 * @returns Status da fase
 */
export function getPhaseStatus(phaseId: string, allTasks: WBSTask[]): PhaseStatus {
  const phaseTasks = allTasks.filter((task) => task.phaseId === phaseId && !isTaskNodeDeleted(task));

  if (phaseTasks.length === 0) return 'não-iniciado';

  const now = new Date();
  const hasExpiredTask = phaseTasks.some((task) =>
    task.dueDate &&
    new Date(task.dueDate) < now &&
    !isTaskNodeEffectivelyComplete(task)
  );
  if (hasExpiredTask) return 'em-risco';

  const allDone = phaseTasks.every((task) => isTaskNodeEffectivelyComplete(task));
  if (allDone) return 'concluído';

  const hasInProgress = phaseTasks.some(
    (task) => getTaskNodeProgress(task) > 0 || task.status === 'in_progress'
  );
  if (hasInProgress) return 'em-andamento';

  return 'não-iniciado';
}

/**
 * Retorna um badge formatado com emoji e label do status
 * @param status Status da fase
 * @returns Objeto com emoji e label
 */
export function getPhaseStatusBadge(status: PhaseStatus): { emoji: string; label: string; color: string } {
  const statusConfig: Record<PhaseStatus, { emoji: string; label: string; color: string }> = {
    'não-iniciado': { emoji: '⭕', label: 'Não iniciado', color: 'bg-gray-100 text-gray-700' },
    'em-andamento': { emoji: '🔵', label: 'Em andamento', color: 'bg-blue-100 text-blue-700' },
    'concluído': { emoji: '✅', label: 'Concluído', color: 'bg-green-100 text-green-700' },
    'em-risco': { emoji: '⚠️', label: 'Em risco', color: 'bg-red-100 text-red-700' },
  };

  return statusConfig[status];
}

/**
 * Retorna a cor de borda/destaque baseada no status
 * @param status Status da fase
 * @returns String de cor Tailwind
 */
export function getPhaseStatusColor(status: PhaseStatus): string {
  const colorMap: Record<PhaseStatus, string> = {
    'não-iniciado': 'border-gray-200',
    'em-andamento': 'border-blue-500',
    'concluído': 'border-green-500',
    'em-risco': 'border-red-500',
  };

  return colorMap[status];
}

/**
 * Calcula o status automático de execução do projeto baseado no status das fases
 * @param project Projeto
 * @param allTasks Todas as tasks do projeto
 * @returns Status de execução do projeto
 */
export function getProjectExecutionStatus(project: Project, allTasks: WBSTask[]): ProjectExecutionStatus {
  const executionPhases = getProjectExecutionPhases(project);
  if (executionPhases.length === 0) {
    return 'não-iniciado';
  }

  const phaseStatuses = executionPhases.map((phase) => getPhaseStatus(phase.id, allTasks));

  if (phaseStatuses.some(s => s === 'em-risco')) {
    return 'em-risco';
  }

  if (phaseStatuses.every(s => s === 'concluído')) {
    return 'concluído';
  }

  if (phaseStatuses.some(s => s === 'em-andamento')) {
    return 'em-andamento';
  }

  return 'não-iniciado';
}

/**
 * Retorna um badge formatado com emoji e label do status de execução do projeto
 * @param status Status de execução do projeto
 * @returns Objeto com emoji e label
 */
export function getProjectExecutionStatusBadge(status: ProjectExecutionStatus): { emoji: string; label: string; color: string } {
  const statusConfig: Record<ProjectExecutionStatus, { emoji: string; label: string; color: string }> = {
    'não-iniciado': { emoji: '⭕', label: 'Não iniciado', color: 'bg-gray-100 text-gray-700' },
    'em-andamento': { emoji: '🔵', label: 'Em andamento', color: 'bg-blue-100 text-blue-700' },
    'concluído': { emoji: '✅', label: 'Concluído', color: 'bg-green-100 text-green-700' },
    'em-risco': { emoji: '⚠️', label: 'Em risco', color: 'bg-red-100 text-red-700' },
  };

  return statusConfig[status];
}
