import type { EnrichedTask } from '../context/TaskContext';
import type { Sprint } from '../types';

const DAY_END_SUFFIX = 'T23:59:59.999';

export function getSprintDateLabel(sprint?: Pick<Sprint, 'startDate' | 'endDate'> | null) {
  if (!sprint?.startDate || !sprint?.endDate) return 'Período não definido';
  return `${new Date(sprint.startDate).toLocaleDateString('pt-BR')} - ${new Date(sprint.endDate).toLocaleDateString('pt-BR')}`;
}

export function isTaskOutsideSprint(task: Pick<EnrichedTask, 'startDate' | 'dueDate'>, sprint?: Pick<Sprint, 'startDate' | 'endDate'> | null) {
  if (!sprint?.startDate || !sprint?.endDate) return false;
  const sprintStart = new Date(`${sprint.startDate}T00:00:00.000`);
  const sprintEnd = new Date(`${sprint.endDate}${DAY_END_SUFFIX}`);
  const taskStart = task.startDate ? new Date(task.startDate) : null;
  const taskDue = task.dueDate ? new Date(task.dueDate) : null;

  if (taskStart && !Number.isNaN(taskStart.getTime()) && taskStart < sprintStart) return true;
  if (taskDue && !Number.isNaN(taskDue.getTime()) && taskDue > sprintEnd) return true;
  return false;
}

export function isTaskDelayedInSprint(task: Pick<EnrichedTask, 'status' | 'completed'>, sprint?: Pick<Sprint, 'endDate'> | null) {
  if (!sprint?.endDate) return false;
  const sprintEnd = new Date(`${sprint.endDate}${DAY_END_SUFFIX}`);
  if (Number.isNaN(sprintEnd.getTime())) return false;
  const isDone = task.status === 'done' || task.completed;
  return !isDone && sprintEnd.getTime() < Date.now();
}

export function getSprintProgressByTasks(tasks: Array<Pick<EnrichedTask, 'status' | 'completed'>>) {
  if (!tasks.length) return 0;
  const doneCount = tasks.filter((task) => task.status === 'done' || task.completed).length;
  return Math.round((doneCount / tasks.length) * 100);
}
