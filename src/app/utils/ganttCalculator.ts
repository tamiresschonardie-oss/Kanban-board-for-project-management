import { Milestone, Phase, ProjectTimelineEntry, Subtask, WBSTask } from '../types';

export interface DateRange {
  projectStart: Date;
  projectEnd: Date;
  totalDays: number;
}

export interface BarPosition {
  left: number;
  width: number;
}

export type ScheduleRowStatus =
  | 'Não iniciado'
  | 'Em andamento no prazo'
  | 'Início atrasado'
  | 'Final atrasada'
  | 'Atrasado no início e no fim'
  | 'Concluído no prazo'
  | 'Concluído com atraso';

export type ScheduleRowStatusTone = 'neutral' | 'positive' | 'warning' | 'danger';

export interface PhaseExecutiveScheduleRow {
  id: string;
  name: string;
  order: number;
  plannedStartDate?: string;
  actualStartDate?: string;
  plannedEndDate?: string;
  actualEndDate?: string;
  plannedDurationDays?: number;
  actualDurationDays?: number;
  varianceDays?: number;
  colorIndex: number;
  sourceType: 'eap_phase' | 'manual_timeline';
  linkedPhaseId?: string;
  color?: string;
  status: ScheduleRowStatus;
  statusTone: ScheduleRowStatusTone;
  statusReason: string;
  startDelayDays?: number;
  finishDelayDays?: number;
}

const DAY = 1000 * 60 * 60 * 24;

function toDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateKey(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function minDate(values: Array<string | undefined>): string | undefined {
  const dates = values.map(toDate).filter(Boolean) as Date[];
  if (dates.length === 0) return undefined;
  return toDateKey(new Date(Math.min(...dates.map((item) => item.getTime()))));
}

function maxDate(values: Array<string | undefined>): string | undefined {
  const dates = values.map(toDate).filter(Boolean) as Date[];
  if (dates.length === 0) return undefined;
  return toDateKey(new Date(Math.max(...dates.map((item) => item.getTime()))));
}

function getTaskStartDates(task: WBSTask | Subtask): string[] {
  const ownDates = task.startDate ? [task.startDate] : [];
  const nestedDates = (task.subtasks || []).flatMap((subtask) => getTaskStartDates(subtask));
  return [...ownDates, ...nestedDates];
}

function getTaskPlannedEndDates(task: WBSTask | Subtask): string[] {
  const ownDates = task.dueDate ? [task.dueDate] : [];
  const nestedDates = (task.subtasks || []).flatMap((subtask) => getTaskPlannedEndDates(subtask));
  return [...ownDates, ...nestedDates];
}

function getTaskCompletionDates(task: WBSTask | Subtask): string[] {
  const ownDates =
    'completionDate' in task && typeof task.completionDate === 'string' ? [task.completionDate] : [];
  const nestedDates = (task.subtasks || []).flatMap((subtask) => getTaskCompletionDates(subtask));
  return [...ownDates, ...nestedDates];
}

function getMilestoneTaskRanges(milestone: Milestone) {
  const tasks = milestone.tasks || [];
  return {
    plannedStartDate: minDate(tasks.flatMap((task) => getTaskStartDates(task))),
    plannedEndDate: maxDate(tasks.flatMap((task) => getTaskPlannedEndDates(task))),
    actualStartDate: minDate(tasks.flatMap((task) => getTaskStartDates(task))),
    actualEndDate: maxDate(tasks.flatMap((task) => getTaskCompletionDates(task))),
  };
}

function getMilestoneControlDates(milestone: Milestone) {
  const taskRanges = getMilestoneTaskRanges(milestone);
  return {
    plannedStartDate: milestone.plannedStartDate || milestone.startDate || taskRanges.plannedStartDate,
    plannedEndDate: milestone.plannedEndDate || milestone.endDate || taskRanges.plannedEndDate,
    actualStartDate: taskRanges.actualStartDate,
    actualEndDate: taskRanges.actualEndDate,
  };
}

function getPhaseTaskRanges(phase: Phase) {
  const tasks = (phase.milestones || []).flatMap((milestone) => milestone.tasks || []);
  return {
    actualStartDate: minDate(tasks.flatMap((task) => getTaskStartDates(task))),
    actualEndDate: maxDate(tasks.flatMap((task) => getTaskCompletionDates(task))),
    fallbackEndDate: maxDate(tasks.flatMap((task) => getTaskPlannedEndDates(task))),
  };
}

export function getPhaseControlDates(phase: Phase) {
  const milestoneControlDates = (phase.milestones || []).map((milestone) => getMilestoneControlDates(milestone));
  const taskRanges = getPhaseTaskRanges(phase);

  return {
    plannedStartDate:
      phase.plannedStartDate ||
      phase.startDate ||
      minDate(milestoneControlDates.map((milestone) => milestone.plannedStartDate)),
    plannedEndDate:
      phase.plannedEndDate ||
      phase.endDate ||
      maxDate([
        ...milestoneControlDates.map((milestone) => milestone.plannedEndDate),
        taskRanges.fallbackEndDate,
      ]),
    actualStartDate:
      phase.actualStartDate ||
      taskRanges.actualStartDate ||
      undefined,
    actualEndDate:
      phase.actualEndDate ||
      taskRanges.actualEndDate ||
      undefined,
  };
}

export function getMilestoneDisplayDates(milestone: Milestone): {
  startDate?: string;
  endDate?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
} {
  const controlDates = getMilestoneControlDates(milestone);
  return {
    startDate: controlDates.actualStartDate || controlDates.plannedStartDate,
    endDate: controlDates.actualEndDate || controlDates.plannedEndDate,
    plannedStartDate: controlDates.plannedStartDate,
    plannedEndDate: controlDates.plannedEndDate,
  };
}

function resolveTimelineEntryDates(entry: ProjectTimelineEntry) {
  return {
    plannedStartDate: entry.plannedStartDate || entry.startDate,
    actualStartDate: entry.actualStartDate,
    plannedEndDate: entry.plannedEndDate || entry.endDate,
    actualEndDate: entry.actualEndDate,
  };
}

function buildStatus(params: {
  plannedStartDate?: string;
  actualStartDate?: string;
  plannedEndDate?: string;
  actualEndDate?: string;
  todayKey?: string;
}): Pick<
  PhaseExecutiveScheduleRow,
  'status' | 'statusTone' | 'statusReason' | 'varianceDays' | 'startDelayDays' | 'finishDelayDays'
> {
  const today = params.todayKey || toDateKey(new Date());
  const startDelayDays =
    params.plannedStartDate && params.actualStartDate && params.actualStartDate > params.plannedStartDate
      ? calculateDuration(params.plannedStartDate, params.actualStartDate) - 1
      : 0;
  const finishDelayDays =
    params.plannedEndDate && params.actualEndDate && params.actualEndDate > params.plannedEndDate
      ? calculateDuration(params.plannedEndDate, params.actualEndDate) - 1
      : 0;
  const activeFinishDelayDays =
    params.plannedEndDate && !params.actualEndDate && today > params.plannedEndDate
      ? calculateDuration(params.plannedEndDate, today) - 1
      : 0;

  if (!params.actualStartDate) {
    const overdueToStart =
      params.plannedStartDate && today > params.plannedStartDate
        ? calculateDuration(params.plannedStartDate, today) - 1
        : 0;

    return {
      status: 'Não iniciado',
      statusTone: overdueToStart > 0 ? 'warning' : 'neutral',
      statusReason:
        overdueToStart > 0
          ? `Ainda não começou e está ${overdueToStart} dia(s) além do início planejado.`
          : 'Ainda sem data oficial de início.',
      varianceDays: overdueToStart > 0 ? overdueToStart : undefined,
      startDelayDays: overdueToStart || undefined,
      finishDelayDays: undefined,
    };
  }

  if (!params.actualEndDate) {
    if (startDelayDays > 0 && activeFinishDelayDays > 0) {
      return {
        status: 'Atrasado no início e no fim',
        statusTone: 'danger',
        statusReason: `Começou ${startDelayDays} dia(s) depois e já ultrapassou o fim planejado em ${activeFinishDelayDays} dia(s).`,
        varianceDays: activeFinishDelayDays,
        startDelayDays,
        finishDelayDays: activeFinishDelayDays,
      };
    }

    if (activeFinishDelayDays > 0) {
      return {
        status: 'Final atrasada',
        statusTone: 'danger',
        statusReason: `Ainda em andamento e ${activeFinishDelayDays} dia(s) além da data final planejada.`,
        varianceDays: activeFinishDelayDays,
        startDelayDays: startDelayDays || undefined,
        finishDelayDays: activeFinishDelayDays,
      };
    }

    if (startDelayDays > 0) {
      return {
        status: 'Início atrasado',
        statusTone: 'warning',
        statusReason: `Começou ${startDelayDays} dia(s) após o início planejado.`,
        varianceDays: startDelayDays,
        startDelayDays,
        finishDelayDays: undefined,
      };
    }

    return {
      status: 'Em andamento no prazo',
      statusTone: 'positive',
      statusReason: 'Execução iniciada sem atraso relevante até o momento.',
      varianceDays: 0,
      startDelayDays: undefined,
      finishDelayDays: undefined,
    };
  }

  if (finishDelayDays > 0) {
    return {
      status: startDelayDays > 0 ? 'Atrasado no início e no fim' : 'Concluído com atraso',
      statusTone: 'danger',
      statusReason:
        startDelayDays > 0
          ? `Concluiu com atraso no início (${startDelayDays} dia(s)) e no fim (${finishDelayDays} dia(s)).`
          : `Concluiu ${finishDelayDays} dia(s) após a data final planejada.`,
      varianceDays: finishDelayDays,
      startDelayDays: startDelayDays || undefined,
      finishDelayDays,
    };
  }

  return {
    status: 'Concluído no prazo',
    statusTone: 'positive',
    statusReason:
      startDelayDays > 0
        ? `Começou com ${startDelayDays} dia(s) de atraso, mas concluiu dentro do prazo planejado.`
        : 'Início e conclusão dentro do prazo planejado.',
    varianceDays: 0,
    startDelayDays: startDelayDays || undefined,
    finishDelayDays: undefined,
  };
}

export function getProjectDateRange(phases: Phase[]): DateRange | null {
  const phasesWithDates = phases
    .map((phase) => {
      const dates = getPhaseControlDates(phase);
      return {
        startDate: dates.actualStartDate || dates.plannedStartDate,
        endDate: dates.actualEndDate || dates.plannedEndDate,
      };
    })
    .filter((phase) => phase.startDate && phase.endDate);

  if (phasesWithDates.length === 0) {
    return null;
  }

  const allDates = phasesWithDates.flatMap((phase) => [
    new Date(`${phase.startDate}T12:00:00`),
    new Date(`${phase.endDate}T12:00:00`),
  ]);

  const projectStart = new Date(Math.min(...allDates.map((date) => date.getTime())));
  const projectEnd = new Date(Math.max(...allDates.map((date) => date.getTime())));
  const totalDays = Math.max(1, Math.ceil((projectEnd.getTime() - projectStart.getTime()) / DAY) + 1);

  return { projectStart, projectEnd, totalDays };
}

export function getPhaseDisplayDates(phase: Phase): { startDate?: string; endDate?: string } {
  const dates = getPhaseControlDates(phase);
  return {
    startDate: dates.actualStartDate || dates.plannedStartDate,
    endDate: dates.actualEndDate || dates.plannedEndDate,
  };
}

export function getPhaseExecutiveSchedule(
  phases: Phase[],
  manualEntries: ProjectTimelineEntry[] = [],
  referenceDate = new Date()
): PhaseExecutiveScheduleRow[] {
  const todayKey = toDateKey(referenceDate);

  const eapRows = phases.map((phase, index) => {
    const dates = getPhaseControlDates(phase);
    const plannedDurationDays =
      dates.plannedStartDate && dates.plannedEndDate && isValidDateRange(dates.plannedStartDate, dates.plannedEndDate)
        ? calculateDuration(dates.plannedStartDate, dates.plannedEndDate)
        : undefined;
    const actualDurationDays =
      dates.actualStartDate && dates.actualEndDate && isValidDateRange(dates.actualStartDate, dates.actualEndDate)
        ? calculateDuration(dates.actualStartDate, dates.actualEndDate)
        : undefined;
    const scheduleStatus = buildStatus({
      ...dates,
      todayKey,
    });

    return {
      id: phase.id,
      name: phase.name,
      order: phase.order ?? index,
      plannedStartDate: dates.plannedStartDate,
      actualStartDate: dates.actualStartDate,
      plannedEndDate: dates.plannedEndDate,
      actualEndDate: dates.actualEndDate,
      plannedDurationDays,
      actualDurationDays,
      varianceDays:
        typeof plannedDurationDays === 'number' && typeof actualDurationDays === 'number'
          ? actualDurationDays - plannedDurationDays
          : scheduleStatus.varianceDays,
      colorIndex: index,
      sourceType: 'eap_phase',
      linkedPhaseId: phase.id,
      status: scheduleStatus.status,
      statusTone: scheduleStatus.statusTone,
      statusReason: scheduleStatus.statusReason,
      startDelayDays: scheduleStatus.startDelayDays,
      finishDelayDays: scheduleStatus.finishDelayDays,
    };
  });

  const manualRows = manualEntries.map((entry, index) => {
    const dates = resolveTimelineEntryDates(entry);
    const plannedDurationDays =
      dates.plannedStartDate && dates.plannedEndDate && isValidDateRange(dates.plannedStartDate, dates.plannedEndDate)
        ? calculateDuration(dates.plannedStartDate, dates.plannedEndDate)
        : undefined;
    const actualDurationDays =
      dates.actualStartDate && dates.actualEndDate && isValidDateRange(dates.actualStartDate, dates.actualEndDate)
        ? calculateDuration(dates.actualStartDate, dates.actualEndDate)
        : undefined;
    const scheduleStatus = buildStatus({
      ...dates,
      todayKey,
    });

    return {
      id: entry.id,
      name: entry.title,
      order: entry.order ?? phases.length + index,
      plannedStartDate: dates.plannedStartDate,
      actualStartDate: dates.actualStartDate,
      plannedEndDate: dates.plannedEndDate,
      actualEndDate: dates.actualEndDate,
      plannedDurationDays,
      actualDurationDays,
      varianceDays:
        typeof plannedDurationDays === 'number' && typeof actualDurationDays === 'number'
          ? actualDurationDays - plannedDurationDays
          : scheduleStatus.varianceDays,
      colorIndex: phases.length + index,
      sourceType: 'manual_timeline',
      linkedPhaseId: entry.linkedPhaseId,
      color: entry.color,
      status: scheduleStatus.status,
      statusTone: scheduleStatus.statusTone,
      statusReason: scheduleStatus.statusReason,
      startDelayDays: scheduleStatus.startDelayDays,
      finishDelayDays: scheduleStatus.finishDelayDays,
    };
  });

  return [...eapRows, ...manualRows].sort((left, right) => {
    if ((left.order ?? 0) !== (right.order ?? 0)) {
      return (left.order ?? 0) - (right.order ?? 0);
    }

    const leftStart = left.plannedStartDate || left.actualStartDate;
    const rightStart = right.plannedStartDate || right.actualStartDate;

    if (leftStart && rightStart && leftStart !== rightStart) {
      return leftStart.localeCompare(rightStart);
    }

    if (leftStart) return -1;
    if (rightStart) return 1;
    return left.name.localeCompare(right.name, 'pt-BR');
  });
}

export function getMilestoneBarPosition(
  milestone: Milestone,
  projectStart: Date,
  totalDays: number
): BarPosition {
  const milestoneDates = getMilestoneDisplayDates(milestone);
  if (!milestoneDates.startDate || !milestoneDates.endDate) {
    return { left: 0, width: 0 };
  }

  const milestoneStart = new Date(`${milestoneDates.startDate}T12:00:00`);
  const milestoneEnd = new Date(`${milestoneDates.endDate}T12:00:00`);
  const daysFromStart = Math.max(0, Math.floor((milestoneStart.getTime() - projectStart.getTime()) / DAY));
  const milestoneDays = Math.max(1, Math.ceil((milestoneEnd.getTime() - milestoneStart.getTime()) / DAY) + 1);
  const left = (daysFromStart / totalDays) * 100;
  let width = (milestoneDays / totalDays) * 100;

  if (width < 2) {
    width = 2;
  }

  return { left, width };
}

export function getPhaseBarPosition(
  phase: Phase,
  projectStart: Date,
  totalDays: number
): BarPosition {
  const phaseDates = getPhaseDisplayDates(phase);
  if (!phaseDates.startDate || !phaseDates.endDate) {
    return { left: 0, width: 0 };
  }

  const phaseStart = new Date(`${phaseDates.startDate}T12:00:00`);
  const phaseEnd = new Date(`${phaseDates.endDate}T12:00:00`);
  const daysFromStart = Math.max(0, Math.floor((phaseStart.getTime() - projectStart.getTime()) / DAY));
  const phaseDays = Math.max(1, Math.ceil((phaseEnd.getTime() - phaseStart.getTime()) / DAY) + 1);
  const left = (daysFromStart / totalDays) * 100;
  let width = (phaseDays / totalDays) * 100;

  if (width < 2) {
    width = 2;
  }

  return { left, width };
}

export function formatDate(date: string | Date): string {
  const parsed = typeof date === 'string' ? new Date(`${date}T12:00:00`) : date;
  return parsed.toLocaleDateString('pt-BR');
}

export function calculateDuration(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  const days = Math.ceil((end.getTime() - start.getTime()) / DAY) + 1;
  return Math.max(1, days);
}

export function isValidDateRange(startDate?: string, endDate?: string): boolean {
  if (!startDate || !endDate) return true;
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  return end.getTime() >= start.getTime();
}
