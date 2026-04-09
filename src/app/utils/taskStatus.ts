import { TaskStatus } from '../types';

export type LegacyTaskStatus = 'not_started' | 'in_progress' | 'done' | string | undefined;
export type TaskVisualColumn = 'backlog' | 'in-progress' | 'done';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Não iniciada',
  in_progress: 'Em andamento',
  blocked: 'Bloqueada',
  done: 'Concluída',
};

export const TASK_STATUS_SHORT_LABELS: Record<TaskStatus, string> = {
  not_started: 'Backlog',
  in_progress: 'Fazendo',
  blocked: 'Bloqueada',
  done: 'Concluída',
};

export function normalizeTaskStatus(status?: LegacyTaskStatus, completed?: boolean): TaskStatus {
  if (completed || status === 'done') return 'done';
  if (status === 'blocked') return 'blocked';
  if (status === 'in_progress' || status === 'doing') return 'in_progress';
  return 'not_started';
}

export function isTaskDoneStatus(status?: LegacyTaskStatus, completed?: boolean) {
  return normalizeTaskStatus(status, completed) === 'done';
}

export function isTaskBlockedStatus(status?: LegacyTaskStatus, completed?: boolean) {
  return normalizeTaskStatus(status, completed) === 'blocked';
}

export function isTaskInProgressStatus(status?: LegacyTaskStatus, completed?: boolean) {
  const normalized = normalizeTaskStatus(status, completed);
  return normalized === 'in_progress' || normalized === 'blocked';
}

export function getTaskVisualColumn(status?: LegacyTaskStatus, completed?: boolean): TaskVisualColumn {
  const normalized = normalizeTaskStatus(status, completed);
  if (normalized === 'done') return 'done';
  if (normalized === 'in_progress' || normalized === 'blocked') return 'in-progress';
  return 'backlog';
}

export function getTaskStatusProgressValue(status?: LegacyTaskStatus, completed?: boolean) {
  const normalized = normalizeTaskStatus(status, completed);
  if (normalized === 'done') return 100;
  if (normalized === 'in_progress') return 50;
  return 0;
}

export function getTaskStatusFromVisualColumn(columnId?: string): TaskStatus {
  const normalized = (columnId || '').trim().toLowerCase();

  if (
    normalized === 'done' ||
    normalized.includes('concl') ||
    normalized.includes('feito')
  ) {
    return 'done';
  }

  if (
    normalized === 'backlog' ||
    normalized.includes('backlog') ||
    normalized.includes('a fazer') ||
    normalized.includes('nao iniciado') ||
    normalized.includes('não iniciado')
  ) {
    return 'not_started';
  }

  return 'in_progress';
}
