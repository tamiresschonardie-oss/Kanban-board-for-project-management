import type { EnrichedTask } from '../context/TaskContext';
import type { PriorityCycle } from '../types';
import { getPriorityCycleDurationDays } from './priorityCycles';

export function getPriorityCycleTypeLabel(type?: PriorityCycle['type']) {
  if (type === 'week') return 'Semanal';
  if (type === 'sprint') return 'Sprint';
  return 'Personalizado';
}

export function getPriorityCycleTypeBadgeClasses(type?: PriorityCycle['type']) {
  if (type === 'week') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
  if (type === 'sprint') return 'bg-amber-50 text-amber-800 border border-amber-200';
  return 'bg-slate-100 text-slate-700 border border-slate-200';
}

export function getPriorityCycleBehaviorLabel(cycle: PriorityCycle) {
  const durationDays = getPriorityCycleDurationDays(cycle);
  if (cycle.type === 'week') return 'Janela recorrente de 7 dias';
  if (cycle.type === 'sprint') {
    return `${durationDays || 14} dia${durationDays === 1 ? '' : 's'} com foco em execucao`;
  }
  return durationDays
    ? `${durationDays} dia${durationDays === 1 ? '' : 's'} com janela livre`
    : 'Período totalmente livre';
}

export function getPriorityCycleDateLabel(
  cycle?: Pick<PriorityCycle, 'startDate' | 'endDate'> | null
) {
  if (!cycle?.startDate || !cycle?.endDate) return 'Período não definido';
  return `${new Date(cycle.startDate).toLocaleDateString('pt-BR')} - ${new Date(cycle.endDate).toLocaleDateString('pt-BR')}`;
}

export function getTaskPriorityCycles(
  task: Pick<EnrichedTask, 'id' | 'projectId'> | null | undefined,
  cycles: PriorityCycle[]
) {
  if (!task) return [];
  return cycles.filter(
    (cycle) =>
      cycle.taskIds.includes(task.id) ||
      (task.projectId ? cycle.projectIds.includes(task.projectId) : false)
  );
}

export function getProjectPriorityCycles(
  projectId: string,
  taskIds: string[],
  cycles: PriorityCycle[]
) {
  const taskIdSet = new Set(taskIds);
  return cycles.filter(
    (cycle) =>
      cycle.projectIds.includes(projectId) ||
      cycle.taskIds.some((taskId) => taskIdSet.has(taskId))
  );
}

export function getPriorityCycleProgress(
  tasks: Array<Pick<EnrichedTask, 'id' | 'status' | 'completed'>>,
  cycle: PriorityCycle
) {
  const relevantTasks = tasks.filter((task) => cycle.taskIds.includes(task.id));
  if (!relevantTasks.length) return 0;
  const doneCount = relevantTasks.filter((task) => task.status === 'done' || task.completed).length;
  return Math.round((doneCount / relevantTasks.length) * 100);
}

export function isTaskDelayedInPriorityCycle(
  task: Pick<EnrichedTask, 'id' | 'status' | 'completed'>,
  cycles: PriorityCycle[]
) {
  const activeCycles = cycles.filter((cycle) => cycle.taskIds.includes(task.id));
  if (!activeCycles.length) return false;
  const cycle = activeCycles
    .slice()
    .sort((left, right) => right.endDate.localeCompare(left.endDate))[0];
  const cycleEnd = new Date(`${cycle.endDate}T23:59:59.999`);
  if (Number.isNaN(cycleEnd.getTime())) return false;
  const isDone = task.status === 'done' || task.completed;
  return !isDone && cycleEnd.getTime() < Date.now();
}
