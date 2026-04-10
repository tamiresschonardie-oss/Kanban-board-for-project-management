import { DemandType, WeeklyDemandAssignment } from '../types';

const DAY_START_SUFFIX = 'T00:00:00';
const DAY_END_SUFFIX = 'T23:59:59.999';

function normalizeDateStart(value: string) {
  return new Date(`${value}${DAY_START_SUFFIX}`);
}

function normalizeDateEnd(value: string) {
  return new Date(`${value}${DAY_END_SUFFIX}`);
}

export function getWeekRange(referenceDate = new Date()) {
  const current = new Date(referenceDate);
  current.setHours(0, 0, 0, 0);
  const day = current.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(current);
  start.setDate(current.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export function isWeeklyAssignmentActive(
  assignment: WeeklyDemandAssignment,
  referenceDate = new Date()
) {
  if (!assignment.isActive) return false;
  const start = normalizeDateStart(assignment.startDate);
  const end = normalizeDateEnd(assignment.endDate);
  const current = new Date(referenceDate);
  return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && current >= start && current <= end;
}

export function hasWeeklyAssignmentConflict(
  assignments: WeeklyDemandAssignment[],
  candidate: Pick<WeeklyDemandAssignment, 'id' | 'demandType' | 'teamId' | 'startDate' | 'endDate'>
) {
  const candidateStart = normalizeDateStart(candidate.startDate);
  const candidateEnd = normalizeDateEnd(candidate.endDate);
  if (Number.isNaN(candidateStart.getTime()) || Number.isNaN(candidateEnd.getTime())) return false;

  return assignments.some((assignment) => {
    if (assignment.id === candidate.id) return false;
    if (!assignment.isActive) return false;
    if (assignment.demandType !== candidate.demandType) return false;
    if ((assignment.teamId || '') !== (candidate.teamId || '')) return false;

    const start = normalizeDateStart(assignment.startDate);
    const end = normalizeDateEnd(assignment.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

    return candidateStart <= end && candidateEnd >= start;
  });
}

export function findWeeklyAssignmentForDemand(
  assignments: WeeklyDemandAssignment[],
  params: {
    demandType?: DemandType;
    teamId?: string;
    referenceDate?: Date;
  }
) {
  if (!params.demandType) return undefined;
  const activeAssignments = assignments.filter(
    (assignment) =>
      assignment.demandType === params.demandType &&
      isWeeklyAssignmentActive(assignment, params.referenceDate)
  );

  return (
    activeAssignments.find((assignment) => assignment.teamId && assignment.teamId === params.teamId) ||
    activeAssignments.find((assignment) => !assignment.teamId)
  );
}

export const DEMAND_TYPE_LABELS: Record<DemandType, string> = {
  projeto: 'Projeto',
  melhoria: 'Melhoria',
  suporte: 'Suporte',
  evolucao: 'Evolução',
  experimentacao: 'Experimentação',
  bug: 'Bug',
  tarefa: 'Tarefa',
};
