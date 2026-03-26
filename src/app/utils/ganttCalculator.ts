import { Phase } from '../types';

export interface DateRange {
  projectStart: Date;
  projectEnd: Date;
  totalDays: number;
}

export interface BarPosition {
  left: number;  // percentage
  width: number; // percentage
}

/**
 * Extrai as datas de uma fase
 * Prioridade:
 * 1. plannedStartDate/plannedEndDate (se disponíveis, PMO usou)
 * 2. startDate/endDate (dados antigos ou existentes)
 * 3. Calcula a partir dos milestones (fallback)
 */
function getPhaseDateRange(phase: Phase): { startDate?: string; endDate?: string } {
  // Prioridade 1: Datas planejadas (novos campos)
  if (phase.plannedStartDate && phase.plannedEndDate) {
    return {
      startDate: phase.plannedStartDate,
      endDate: phase.plannedEndDate,
    };
  }

  // Prioridade 2: Datas existentes da fase
  if (phase.startDate && phase.endDate) {
    return {
      startDate: phase.startDate,
      endDate: phase.endDate,
    };
  }

  // Prioridade 3: Calcule a partir dos milestones
  const milestoneDates = phase.milestones
    ?.filter(m => m.startDate && m.endDate)
    .flatMap(m => [m.startDate!, m.endDate!]) || [];

  if (milestoneDates.length === 0) {
    return {};
  }

  // Encontre a data mínima e máxima
  const sorted = milestoneDates.sort();
  return {
    startDate: sorted[0],
    endDate: sorted[sorted.length - 1],
  };
}

/**
 * Calcula o intervalo de datas do projeto baseado nas fases e seus milestones
 * @param phases Fases do projeto
 * @returns DateRange ou null se nenhuma fase possui datas
 */
export function getProjectDateRange(phases: Phase[]): DateRange | null {
  // Extrair datas de cada fase (de startDate/endDate ou dos milestones)
  const phasesWithDates = phases
    .map(p => ({
      ...p,
      ...getPhaseDateRange(p),
    }))
    .filter(p => p.startDate && p.endDate);

  if (phasesWithDates.length === 0) {
    return null;
  }

  const allDates = phasesWithDates.flatMap(p => [
    new Date(p.startDate!),
    new Date(p.endDate!),
  ]);

  const projectStart = new Date(Math.min(...allDates.map(d => d.getTime())));
  const projectEnd = new Date(Math.max(...allDates.map(d => d.getTime())));

  // Calcular dias totais (adicionar 1 para incluir o dia final)
  const totalDays = Math.max(
    1,
    Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  return { projectStart, projectEnd, totalDays };
}

/**
 * Obtém o startDate e endDate de uma fase (da própria fase ou dos milestones)
 */
export function getPhaseDisplayDates(phase: Phase): { startDate?: string; endDate?: string } {
  return getPhaseDateRange(phase);
}

/**
 * Calcula a posição e largura da barra de uma fase
 * @param phase Fase
 * @param projectStart Data inicial do projeto
 * @param totalDays Total de dias do projeto
 * @returns BarPosition com left e width em percentual
 */
export function getPhaseBarPosition(
  phase: Phase,
  projectStart: Date,
  totalDays: number
): BarPosition {
  // Obter datas da fase (de startDate/endDate ou dos milestones)
  const phaseDates = getPhaseDateRange(phase);
  
  if (!phaseDates.startDate || !phaseDates.endDate) {
    return { left: 0, width: 0 };
  }

  const phaseStart = new Date(phaseDates.startDate);
  const phaseEnd = new Date(phaseDates.endDate);

  // Dias desde o início do projeto
  const daysFromStart = Math.max(
    0,
    Math.floor((phaseStart.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Duração da fase
  const phaseDays = Math.max(
    1,
    Math.ceil((phaseEnd.getTime() - phaseStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  // Calcular percentuais
  const left = (daysFromStart / totalDays) * 100;
  let width = (phaseDays / totalDays) * 100;

  // Garantir visibilidade mínima (5% ou 100px em uma timeline de 1200px)
  if (width < 2) {
    width = 2;
  }

  return { left, width };
}

/**
 * Formata uma data para exibição
 * @param date Data
 * @returns String formatada (DD/MM/YYYY)
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

/**
 * Calcula a duração em dias entre duas datas
 * @param startDate Data inicial
 * @param endDate Data final
 * @returns Número de dias
 */
export function calculateDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, days);
}
