import { Project, WBSTask } from '../types';

/**
 * Calcula o progresso de uma fase baseado na quantidade de tarefas completas
 * @param phaseId ID da fase
 * @param allTasks Todas as tasks do projeto
 * @returns Percentual de progresso (0-100)
 */
export function getPhaseProgress(phaseId: string, allTasks: WBSTask[]): number {
  const phaseTasks = allTasks.filter(t => t.phaseId === phaseId);

  // Fase sem tarefas = 0%
  if (phaseTasks.length === 0) return 0;

  const completedTasks = phaseTasks.filter(t => t.status === 'done').length;
  const progress = Math.round((completedTasks / phaseTasks.length) * 100);

  return progress;
}

/**
 * Calcula o progresso do projeto como média simples das fases
 * @param project Projeto
 * @param allTasks Todas as tasks do projeto
 * @returns Percentual de progresso (0-100)
 */
export function getProjectProgress(project: Project, allTasks: WBSTask[]): number {
  if (!project.phases || project.phases.length === 0) return 0;

  const phaseProgressos = project.phases.map(phase =>
    getPhaseProgress(phase.id, allTasks)
  );

  const averageProgress = Math.round(
    phaseProgressos.reduce((a, b) => a + b, 0) / project.phases.length
  );

  return averageProgress;
}

/**
 * Formata o progresso como string com barra visual (opcional)
 * @param progress Percentual (0-100)
 * @returns String formatada
 */
export function formatProgress(progress: number): string {
  return `${progress}%`;
}
