import { GovernancePhaseDefinition, WorkspaceProjectStageDefinition } from '../types';

export const PROJECT_SITUATIONS = {
  ATIVO: 'ativo',
  PAUSADO: 'pausado',
  CANCELADO: 'cancelado',
} as const;

export const PROJECT_PURPOSES = {
  EXPANSAO: 'expansao',
  SUPORTE: 'suporte',
  INOVACAO: 'inovacao',
  SEGURANCA: 'seguranca',
  OPERACIONAL: 'operacional',
  ESTRATEGICO: 'estrategico',
} as const;

export const PROJECT_SITUATIONS_LABELS: Record<string, string> = {
  [PROJECT_SITUATIONS.ATIVO]: 'Ativo',
  [PROJECT_SITUATIONS.PAUSADO]: 'Pausado',
  [PROJECT_SITUATIONS.CANCELADO]: 'Cancelado',
};

export const PROJECT_PURPOSES_LABELS: Record<string, string> = {
  [PROJECT_PURPOSES.EXPANSAO]: 'Expansão',
  [PROJECT_PURPOSES.SUPORTE]: 'Suporte',
  [PROJECT_PURPOSES.INOVACAO]: 'Inovação',
  [PROJECT_PURPOSES.SEGURANCA]: 'Segurança',
  [PROJECT_PURPOSES.OPERACIONAL]: 'Operacional',
  [PROJECT_PURPOSES.ESTRATEGICO]: 'Estratégico',
};

export const PROJECT_SITUATIONS_OPTIONS = Object.entries(PROJECT_SITUATIONS).map(([key, value]) => ({
  value,
  label: PROJECT_SITUATIONS_LABELS[value],
}));

export const PROJECT_PURPOSES_OPTIONS = Object.entries(PROJECT_PURPOSES).map(([key, value]) => ({
  value,
  label: PROJECT_PURPOSES_LABELS[value],
}));

export const DEFAULT_GOVERNANCE_PHASES: GovernancePhaseDefinition[] = [
  {
    id: 'backlog',
    name: 'Backlog',
    order: 0,
    color: '#E5E7EB',
  },
  {
    id: 'pre-analysis',
    name: 'Em análise',
    order: 1,
    color: '#DBEAFE',
  },
  {
    id: 'construction',
    name: 'Em execução',
    order: 2,
    color: '#D1FAE5',
  },
  {
    id: 'waiting-approval',
    name: 'Pausado',
    order: 3,
    color: '#FEF3C7',
  },
  {
    id: 'documentation',
    name: 'Concluído',
    order: 4,
    color: '#DCFCE7',
    isTerminal: true,
  },
];

export const DEFAULT_WORKSPACE_PROJECT_STAGES: WorkspaceProjectStageDefinition[] = [
  {
    id: 'workspace-queue',
    name: 'Fila da equipe',
    order: 0,
    color: '#E5E7EB',
  },
  {
    id: 'workspace-active',
    name: 'Em execução',
    order: 1,
    color: '#DBEAFE',
  },
  {
    id: 'workspace-waiting',
    name: 'Aguardando retorno',
    order: 2,
    color: '#FEF3C7',
  },
  {
    id: 'workspace-review',
    name: 'Em validação',
    order: 3,
    color: '#D1FAE5',
  },
  {
    id: 'workspace-done',
    name: 'Concluído',
    order: 4,
    color: '#DCFCE7',
    isTerminal: true,
  },
];

export const STORAGE_KEYS = {
  projects: 'crisdu_projects',
  governancePhases: 'crisdu_governance_phases',
  workspaceProjectStages: 'crisdu_workspace_project_stages',
  eapTemplates: 'crisdu_eap_templates',
  independentTasks: 'crisdu_independent_tasks',
  taskTrackingSessions: 'crisdu_task_tracking_sessions',
  activeTaskTracking: 'crisdu_active_task_tracking',
  scheduleEvents: 'crisdu_schedule_events',
  meetingRooms: 'crisdu_meeting_rooms',
} as const;

export const STORAGE_VERSIONS = {
  projects: 3,
  governancePhases: 1,
  workspaceProjectStages: 1,
  eapTemplates: 2,
  independentTasks: 2,
  taskTrackingSessions: 1,
  activeTaskTracking: 1,
  scheduleEvents: 1,
  meetingRooms: 1,
} as const;
