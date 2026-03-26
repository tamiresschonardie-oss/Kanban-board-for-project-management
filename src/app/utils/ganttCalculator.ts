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
 * Calcula o intervalo de datas do projeto baseado nas fases
 * @param phases Fases do projeto
 * @returns DateRange ou null se nenhuma fase possui datas
 */
export function getProjectDateRange(phases: Phase[]): DateRange | null {
  const phasesWithDates = phases.filter(p => p.startDate && p.endDate);

  if (phasesWithDates.length === 0) {
    return null;
  }

  const allDates = phasesWithDates.flatMap(p => [
    new Date(p.startDate),
    new Date(p.endDate),
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
  if (!phase.startDate || !phase.endDate) {
    return { left: 0, width: 0 };
  }

  const phaseStart = new Date(phase.startDate);
  const phaseEnd = new Date(phase.endDate);

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
