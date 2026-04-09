import type { EnrichedTask } from '../context/TaskContext';
import type { PriorityCycle, PriorityCycleType, Project, Subtask, WBSTask } from '../types';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const PRIORITY_CYCLE_DEFAULT_DURATIONS: Record<
  Exclude<PriorityCycleType, 'custom'>,
  number
> = {
  week: 7,
  sprint: 14,
};

function parseDateOnly(value?: string | null) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDayDifference(startDate?: string, endDate?: string) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end) return null;
  return Math.floor((end.getTime() - start.getTime()) / DAY_IN_MS);
}

function inferNextSprintSequence(cycles: PriorityCycle[], excludeCycleId?: string) {
  const explicitNumbers = cycles
    .filter((cycle) => cycle.type === 'sprint' && cycle.id !== excludeCycleId)
    .map((cycle) => {
      const match = cycle.name.match(/sprint\s+(\d+)/i);
      return match ? Number(match[1]) : Number.NaN;
    })
    .filter((value) => Number.isFinite(value));

  if (explicitNumbers.length > 0) {
    return Math.max(...explicitNumbers) + 1;
  }

  return (
    cycles.filter((cycle) => cycle.type === 'sprint' && cycle.id !== excludeCycleId).length + 1
  );
}

const sortCyclesByRecency = (cycles: PriorityCycle[]) =>
  cycles
    .slice()
    .sort((a, b) => Number(b.active) - Number(a.active) || b.createdAt.localeCompare(a.createdAt));

export function isPriorityCycleAutoScheduled(type: PriorityCycleType) {
  return type === 'week' || type === 'sprint';
}

export function getPriorityCycleDefaultDuration(type: PriorityCycleType) {
  if (type === 'custom') return null;
  return PRIORITY_CYCLE_DEFAULT_DURATIONS[type];
}

export function calculatePriorityCycleEndDate(startDate: string, durationDays: number) {
  const parsedStart = parseDateOnly(startDate);
  if (!parsedStart || durationDays < 1) return '';
  const endDate = new Date(parsedStart.getTime());
  endDate.setUTCDate(endDate.getUTCDate() + durationDays - 1);
  return formatDateOnly(endDate);
}

export function getPriorityCycleDurationDays(
  cycle: Pick<PriorityCycle, 'type' | 'startDate' | 'endDate' | 'durationDays'>
) {
  if (cycle.type === 'week') return PRIORITY_CYCLE_DEFAULT_DURATIONS.week;
  if (typeof cycle.durationDays === 'number' && cycle.durationDays > 0) {
    return cycle.durationDays;
  }
  const difference = getDayDifference(cycle.startDate, cycle.endDate);
  if (difference === null || difference < 0) {
    return cycle.type === 'sprint' ? PRIORITY_CYCLE_DEFAULT_DURATIONS.sprint : null;
  }
  return difference + 1;
}

export function getPriorityCycleSuggestedName({
  type,
  startDate,
  cycles,
  excludeCycleId,
}: {
  type: PriorityCycleType;
  startDate?: string;
  cycles?: PriorityCycle[];
  excludeCycleId?: string;
}) {
  if (type === 'custom') return '';
  if (type === 'sprint') {
    const sprintNumber = inferNextSprintSequence(cycles || [], excludeCycleId);
    return `Sprint ${sprintNumber}`;
  }

  const parsedStart = parseDateOnly(startDate);
  if (!parsedStart) return 'Semana planejada';
  const label = parsedStart.toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
  });
  return `Semana de ${label}`;
}

export function isPriorityCycleStructureLocked(
  cycle: Pick<PriorityCycle, 'type' | 'startDate'>,
  referenceDate = new Date()
) {
  if (cycle.type !== 'sprint') return false;
  const cycleStart = parseDateOnly(cycle.startDate);
  if (!cycleStart) return false;
  const today = formatDateOnly(
    new Date(Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()))
  );
  return cycle.startDate <= today;
}

export function normalizePriorityCycle(cycle: PriorityCycle): PriorityCycle {
  const normalizedType: PriorityCycleType =
    cycle.type === 'week' || cycle.type === 'sprint' ? cycle.type : 'custom';
  const normalizedDurationDays = getPriorityCycleDurationDays({
    type: normalizedType,
    startDate: cycle.startDate,
    endDate: cycle.endDate,
    durationDays: cycle.durationDays,
  });

  const nextEndDate =
    normalizedType !== 'custom' && cycle.startDate && normalizedDurationDays
      ? calculatePriorityCycleEndDate(cycle.startDate, normalizedDurationDays)
      : cycle.endDate;

  return {
    ...cycle,
    type: normalizedType,
    endDate: nextEndDate || cycle.endDate,
    durationDays: normalizedDurationDays ?? undefined,
  };
}

export function getActivePriorityCycle(cycles: PriorityCycle[]): PriorityCycle | undefined {
  return sortCyclesByRecency(cycles).find((cycle) => cycle.active);
}

export function getResolvedPriorityCycles(
  cycles: PriorityCycle[],
  options: { activeOnly?: boolean } = {}
): PriorityCycle[] {
  const sorted = sortCyclesByRecency(cycles);
  if (options.activeOnly === false) return sorted;
  return sorted.filter((cycle) => cycle.active);
}

export function getPriorityCycleProjectIds(
  cycles: PriorityCycle[],
  options: { activeOnly?: boolean } = {}
): Set<string> {
  return new Set(
    getResolvedPriorityCycles(cycles, options).flatMap((cycle) => cycle.projectIds || [])
  );
}

export function getPriorityCycleTaskIds(
  cycles: PriorityCycle[],
  options: { activeOnly?: boolean } = {}
): Set<string> {
  return new Set(
    getResolvedPriorityCycles(cycles, options).flatMap((cycle) => cycle.taskIds || [])
  );
}

export function applyPriorityCycleFocusToProjects(
  projects: Project[],
  cycles: PriorityCycle[]
): Project[] {
  const focusedProjectIds = getPriorityCycleProjectIds(cycles);

  return projects.map((project) => ({
    ...project,
    isWeeklyFocus: focusedProjectIds.has(project.id),
  }));
}

function applyFocusToSubtaskTree(
  subtasks: Subtask[] = [],
  focusedTaskIds: Set<string>
): Subtask[] {
  return subtasks.map((subtask) => ({
    ...subtask,
    isWeeklyFocus: focusedTaskIds.has(subtask.id),
    subtasks: applyFocusToSubtaskTree(subtask.subtasks || [], focusedTaskIds),
  }));
}

export function applyPriorityCycleFocusToTaskTree(
  tasks: WBSTask[],
  cycles: PriorityCycle[]
): WBSTask[] {
  const focusedTaskIds = getPriorityCycleTaskIds(cycles);

  return tasks.map((task) => ({
    ...task,
    isWeeklyFocus: focusedTaskIds.has(task.id),
    subtasks: applyFocusToSubtaskTree(task.subtasks || [], focusedTaskIds),
  }));
}

export function applyPriorityCycleFocusToTaskEntities(
  tasks: EnrichedTask[],
  cycles: PriorityCycle[]
): EnrichedTask[] {
  const focusedTaskIds = getPriorityCycleTaskIds(cycles);

  return tasks.map((task) => ({
    ...task,
    isWeeklyFocus: focusedTaskIds.has(task.id),
  }));
}
