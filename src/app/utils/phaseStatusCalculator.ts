import { WBSTask, Project, ProjectExecutionStatus } from '../types';

export type PhaseStatus = 'não-iniciado' | 'em-andamento' | 'concluído' | 'em-risco';

/**
 * Calcula o status automático de uma fase baseado nas suas tarefas
 * @param phaseId ID da fase
 * @param allTasks Todas as tasks do projeto
 * @returns Status da fase
 */
export function getPhaseStatus(phaseId: string, allTasks: WBSTask[]): PhaseStatus {
  const phaseTasks = allTasks.filter(t => t.phaseId === phaseId);

  // 1. Sem tarefas
  if (phaseTasks.length === 0) return 'não-iniciado';

  // 2. Verificar se há tarefa vencida não concluída (prioridade máxima)
  const now = new Date();
  const hasExpiredTask = phaseTasks.some(t =>
    t.dueDate &&
    new Date(t.dueDate) < now &&
    t.status !== 'done'
  );
  if (hasExpiredTask) return 'em-risco';

  // 3. Todas tarefas completas
  const allDone = phaseTasks.every(t => t.status === 'done');
  if (allDone) return 'concluído';

  // 4. Pelo menos uma em andamento
  const hasInProgress = phaseTasks.some(t => t.status === 'doing');
  if (hasInProgress) return 'em-andamento';

  // 5. Padrão: não iniciado (todas estão em 'todo')
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
  if (!project.phases || project.phases.length === 0) {
    return 'não-iniciado';
  }

  const phaseStatuses = project.phases.map(phase => getPhaseStatus(phase.id, allTasks));

  // Ordem de prioridade:
  // 1. Em risco (máxima prioridade)
  if (phaseStatuses.some(s => s === 'em-risco')) {
    return 'em-risco';
  }

  // 2. Todas concluídas
  if (phaseStatuses.every(s => s === 'concluído')) {
    return 'concluído';
  }

  // 3. Pelo menos uma em andamento
  if (phaseStatuses.some(s => s === 'em-andamento')) {
    return 'em-andamento';
  }

  // 4. Padrão: não iniciado (todas "não-iniciado")
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
