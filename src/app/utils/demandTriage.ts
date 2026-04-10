import {
  DemandType,
  ProjectImpactLevel,
  TriageComplexity,
  TriageScopeLevel,
  ValueIntent,
  WBSTask,
} from '../types';

export const TRIAGE_COMPLEXITY_LABELS: Record<TriageComplexity, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

export const TRIAGE_SCOPE_LABELS: Record<TriageScopeLevel, string> = {
  pontual: 'Pontual',
  moderado: 'Moderado',
  amplo: 'Amplo',
};

export const VALUE_INTENT_LABELS: Record<ValueIntent, string> = {
  reduzir_tempo: 'Reduzir tempo',
  reduzir_custo: 'Reduzir custo',
  melhorar_qualidade: 'Melhorar qualidade',
  melhorar_experiencia: 'Melhorar experiência',
  aumentar_controle: 'Aumentar controle',
  evitar_erro: 'Evitar erro',
  aumentar_produtividade: 'Aumentar produtividade',
  outro: 'Outro',
};

export type DemandTriageSnapshot = Pick<
  WBSTask,
  | 'triageComplexity'
  | 'expectedBusinessImpact'
  | 'scopeLevel'
  | 'demandType'
  | 'suggestedDemandType'
  | 'valueIntent'
  | 'valueIntentNotes'
  | 'typeDefinedBy'
  | 'typeDefinedAt'
  | 'triageStatus'
  | 'originTicket'
  | 'originTicketReference'
  | 'sourceSystem'
  | 'expectedImpactLevel'
>;

export function suggestDemandTypeFromTriage(input: {
  triageComplexity?: TriageComplexity;
  expectedBusinessImpact?: ProjectImpactLevel;
  scopeLevel?: TriageScopeLevel;
}): DemandType | undefined {
  const { triageComplexity, expectedBusinessImpact, scopeLevel } = input;
  if (!triageComplexity && !expectedBusinessImpact && !scopeLevel) return undefined;

  if (expectedBusinessImpact === 'alto') return 'projeto';
  if (triageComplexity === 'alta') return 'projeto';
  if (scopeLevel === 'amplo') return 'projeto';

  if (triageComplexity === 'baixa' && expectedBusinessImpact === 'baixo' && scopeLevel === 'pontual') {
    return 'tarefa';
  }

  if (expectedBusinessImpact === 'medio' || triageComplexity === 'media' || scopeLevel === 'moderado') {
    return 'melhoria';
  }

  return 'tarefa';
}

export function normalizeDemandTriage(task: WBSTask): WBSTask {
  const suggestedDemandType =
    task.suggestedDemandType ||
    suggestDemandTypeFromTriage({
      triageComplexity: task.triageComplexity,
      expectedBusinessImpact: task.expectedBusinessImpact || task.expectedImpactLevel,
      scopeLevel: task.scopeLevel,
    });

  return {
    ...task,
    expectedImpactLevel: task.expectedImpactLevel || task.expectedBusinessImpact,
    expectedBusinessImpact: task.expectedBusinessImpact || task.expectedImpactLevel,
    suggestedDemandType,
    triageStatus:
      task.triageStatus ||
      (task.triageComplexity || task.expectedBusinessImpact || task.scopeLevel || task.valueIntent
        ? 'completed'
        : 'pending'),
  };
}
