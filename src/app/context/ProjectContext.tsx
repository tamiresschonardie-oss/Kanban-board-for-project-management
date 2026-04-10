import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  AutomationCommand,
  FilterState,
  GovernancePhaseDefinition,
  GovernanceHistoryEntry,
  Phase,
  Project,
  ProjectComment,
  ProjectGovernance,
  ProjectMetrics,
  ProjectSituation,
  ProjectTimelineEntry,
  ProjectWorkspaceBoardState,
  WorkspaceProjectStageDefinition,
} from '../types';
import {
  DEFAULT_GOVERNANCE_PHASES,
  DEFAULT_WORKSPACE_PROJECT_STAGES,
  PROJECT_SITUATIONS,
  STORAGE_KEYS,
  STORAGE_VERSIONS,
} from '../constants/project';
import { Subtask, WBSTask } from '../types';
import { useAdmin } from './AdminContext';
import { runAutomationRules } from '../utils/automationEngine';
import { isProjectInCompletedPhase } from '../utils/projectSelectors';
import { applyPriorityCycleFocusToProjects } from '../utils/priorityCycles';
import { createNotification, extractMentionedUsers } from '../utils/notifications';
import { normalizeDependencyRecord } from '../utils/taskDependencies';
import {
  calculateNextResultEvaluation,
  normalizeProjectValueState,
  startProjectValueCycle,
} from '../services/projectValueService';
import {
  applyRoleAssignmentsToPhases,
  normalizeProjectRoleAssignments,
} from '../utils/phaseOwnership';
import { useIntegration } from './IntegrationContext';
import { applyTaskTemplateToProject } from '../utils/taskTemplateEngine';

interface ProjectContextType {
  projects: Project[];
  governancePhases: GovernancePhaseDefinition[];
  workspaceProjectStages: WorkspaceProjectStageDefinition[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  updateProject: (id: string, updates: Partial<Project>) => boolean;
  addProject: (project: Project) => void;
  duplicateProject: (id: string) => string | null;
  deleteProject: (id: string) => void;
  getWorkspaceGovernancePhases: (workspaceId?: string) => GovernancePhaseDefinition[];
  createGovernancePhase: (workspaceId: string) => GovernancePhaseDefinition | null;
  updateGovernancePhase: (
    workspaceId: string,
    phaseId: string,
    updates: Partial<Pick<GovernancePhaseDefinition, 'name' | 'color'>>
  ) => void;
  reorderGovernancePhases: (workspaceId: string, orderedPhaseIds: string[]) => void;
  deleteGovernancePhase: (
    workspaceId: string,
    phaseId: string,
    destinationPhaseId?: string
  ) => void;
  getWorkspaceProjectStages: (workspaceId?: string) => WorkspaceProjectStageDefinition[];
  createWorkspaceProjectStage: (workspaceId: string) => WorkspaceProjectStageDefinition | null;
  ensureWorkspaceDefinitions: (workspaceId: string) => void;
  updateWorkspaceProjectStage: (
    workspaceId: string,
    stageId: string,
    updates: Partial<Pick<WorkspaceProjectStageDefinition, 'name' | 'color'>>
  ) => void;
  reorderWorkspaceProjectStages: (workspaceId: string, orderedStageIds: string[]) => void;
  deleteWorkspaceProjectStage: (
    workspaceId: string,
    stageId: string,
    destinationStageId?: string
  ) => void;
  addProjectComment: (projectId: string, comment: Omit<ProjectComment, 'id' | 'timestamp'> & Partial<Pick<ProjectComment, 'id' | 'timestamp'>>) => boolean;
  updateProjectComment: (projectId: string, commentId: string, content: string) => boolean;
  deleteProjectComment: (projectId: string, commentId: string) => boolean;
}

const projectContextRegistry = globalThis as typeof globalThis & {
  __crisduProjectContext?: React.Context<ProjectContextType | undefined>;
};

const ProjectContext =
  projectContextRegistry.__crisduProjectContext ||
  createContext<ProjectContextType | undefined>(undefined);

projectContextRegistry.__crisduProjectContext = ProjectContext;

const createEntityId = (prefix: string) =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const duplicateSubtaskTree = (subtask: Subtask): Subtask => ({
  ...subtask,
  id: createEntityId('subtask'),
  title: `${subtask.title} (cópia)`,
  completed: false,
  status: 'not_started',
  startDate: undefined,
  timeLogs: [],
  comments: [],
  attachments: [],
  activities: [],
  checklistItems: (subtask.checklistItems || []).map((item) => ({
    ...item,
    id: createEntityId('checklist'),
    completed: false,
  })),
  subtasks: (subtask.subtasks || []).map(duplicateSubtaskTree),
});

const duplicateTaskTree = (
  task: WBSTask,
  phaseId: string,
  milestoneId: string
): WBSTask => ({
  ...task,
  id: createEntityId('task'),
  title: `${task.title} (cópia)`,
  completed: false,
  status: 'not_started',
  phaseId,
  milestoneId,
  startDate: undefined,
  timeLogs: [],
  comments: [],
  attachments: [],
  activities: [],
  checklistItems: (task.checklistItems || []).map((item) => ({
    ...item,
    id: createEntityId('checklist'),
    completed: false,
  })),
  subtasks: (task.subtasks || []).map(duplicateSubtaskTree),
});

interface StorageEnvelope<T> {
  version: number;
  data: T;
}

const rawProjects = [
  {
    id: 'project-seed-novo-kanban',
    name: 'Novo Kanban',
    responsible: 'João Silva',
    requestedBy: 'Guilherme Drehmer',
    client: 'Grupo Crisdu',
    group: 'Fábrica',
    status: 'construction',
    situation: PROJECT_SITUATIONS.ATIVO,
    logoColor: '#2563EB',
    logoText: 'NK',
    progress: 58,
    tasksCompleted: 6,
    tasksTotal: 13,
    hoursRemaining: 84,
    totalTimeTracked: 126,
    tags: ['Gantt', 'Seed'],
    tagIds: [],
    deadline: '2026-05-16',
    requestDate: '2026-03-24',
    product: 'Vendas Plus',
    purpose: 'operacional',
    objective: 'Evoluir o novo Kanban com visão operacional integrada.',
    justification: 'Projeto seed para validar timeline, hierarquia e progresso no Gantt.',
    stakeholderAssignments: [
      {
        stakeholderId: '1',
        name: 'Ana Paula',
        projectRole: 'Product Owner',
      },
    ],
    governance: {
      currentPhaseId: 'construction',
      situation: PROJECT_SITUATIONS.ATIVO,
      phases: DEFAULT_GOVERNANCE_PHASES,
      history: [],
    },
    execution: {
      eapTemplateId: 'eap-tpl-fábrica',
      phases: [
        {
          id: 'seed-phase-analise',
          name: 'Análise',
          description: 'Levantamento e validação inicial do escopo.',
          order: 0,
          phaseType: 'execution',
          plannedStartDate: '2026-03-24',
          plannedEndDate: '2026-04-04',
          startDate: '2026-03-24',
          endDate: '2026-04-04',
          milestones: [
            {
              id: 'seed-ms-analise',
              name: 'Alinhamento inicial',
              type: 'business',
              status: 'in-progress',
              responsible: 'João Silva',
              plannedStartDate: '2026-03-24',
              plannedEndDate: '2026-04-04',
              startDate: '2026-03-24',
              endDate: '2026-04-04',
              sla: 10,
              description: 'Levantamento de requisitos e validação com stakeholders.',
              order: 0,
              tasks: [
                {
                  id: 'seed-task-requisitos',
                  title: 'Levantamento de requisitos',
                  description: 'Mapear requisitos funcionais e técnicos.',
                  status: 'done',
                  assignee: 'João Silva',
                  assigneeId: '2',
                  requestedBy: 'Guilherme Drehmer',
                  priority: 'high',
                  startDate: '2026-03-24',
                  dueDate: '2026-03-28',
                  order: 0,
                  phaseId: 'seed-phase-analise',
                  milestoneId: 'seed-ms-analise',
                  checklistItems: [],
                  comments: [],
                  attachments: [],
                  timeLogs: [
                    {
                      id: 'seed-log-requisitos-1',
                      taskId: 'seed-task-requisitos',
                      userId: '2',
                      source: 'manual',
                      durationMinutes: 180,
                      manualMinutes: 180,
                      createdAt: '2026-03-24T10:00:00.000Z',
                    },
                  ],
                  activities: [],
                  subtasks: [
                    {
                      id: 'seed-subtask-entrevistas',
                      title: 'Entrevistar stakeholders',
                      completed: true,
                      status: 'done',
                      assignee: 'Maria Santos',
                      assigneeId: '3',
                      startDate: '2026-03-24',
                      dueDate: '2026-03-26',
                      priority: 'medium',
                      subtasks: [],
                      checklistItems: [],
                      comments: [],
                      attachments: [],
                      timeLogs: [
                        {
                          id: 'seed-log-entrevistas-1',
                          taskId: 'seed-task-requisitos',
                          userId: '3',
                          source: 'manual',
                          durationMinutes: 240,
                          manualMinutes: 240,
                          createdAt: '2026-03-25T14:00:00.000Z',
                        },
                      ],
                      activities: [],
                    },
                    {
                      id: 'seed-subtask-mapa',
                      title: 'Consolidar mapa de requisitos',
                      completed: true,
                      status: 'done',
                      assignee: 'João Silva',
                      assigneeId: '2',
                      startDate: '2026-03-26',
                      dueDate: '2026-03-28',
                      priority: 'medium',
                      subtasks: [],
                      checklistItems: [],
                      comments: [],
                      attachments: [],
                      timeLogs: [
                        {
                          id: 'seed-log-mapa-1',
                          taskId: 'seed-task-requisitos',
                          userId: '2',
                          source: 'manual',
                          durationMinutes: 150,
                          manualMinutes: 150,
                          createdAt: '2026-03-27T16:30:00.000Z',
                        },
                      ],
                      activities: [],
                    },
                  ],
                },
                {
                  id: 'seed-task-validacao',
                  title: 'Validação com stakeholders',
                  description: 'Revisar escopo e alinhar prioridades.',
                  status: 'in_progress',
                  assignee: 'Maria Santos',
                  assigneeId: '3',
                  requestedBy: 'Guilherme Drehmer',
                  priority: 'high',
                  startDate: '2026-03-29',
                  dueDate: '2026-04-04',
                  order: 1,
                  phaseId: 'seed-phase-analise',
                  milestoneId: 'seed-ms-analise',
                  checklistItems: [],
                  comments: [],
                  attachments: [],
                  timeLogs: [
                    {
                      id: 'seed-log-validacao-1',
                      taskId: 'seed-task-validacao',
                      userId: '3',
                      source: 'manual',
                      durationMinutes: 120,
                      manualMinutes: 120,
                      createdAt: '2026-03-30T11:00:00.000Z',
                    },
                  ],
                  activities: [],
                  subtasks: [
                    {
                      id: 'seed-subtask-workshop',
                      title: 'Conduzir workshop de alinhamento',
                      completed: true,
                      status: 'done',
                      assignee: 'Maria Santos',
                      assigneeId: '3',
                      startDate: '2026-03-29',
                      dueDate: '2026-03-31',
                      priority: 'medium',
                      subtasks: [],
                      checklistItems: [],
                      comments: [],
                      attachments: [],
                      timeLogs: [
                        {
                          id: 'seed-log-workshop-1',
                          taskId: 'seed-task-validacao',
                          userId: '3',
                          source: 'manual',
                          durationMinutes: 210,
                          manualMinutes: 210,
                          createdAt: '2026-03-31T17:00:00.000Z',
                        },
                      ],
                      activities: [],
                    },
                    {
                      id: 'seed-subtask-ajustes-escopo',
                      title: 'Ajustar backlog inicial',
                      completed: false,
                      status: 'in_progress',
                      assignee: 'João Silva',
                      assigneeId: '2',
                      startDate: '2026-04-01',
                      dueDate: '2026-04-04',
                      priority: 'medium',
                      subtasks: [
                        {
                          id: 'seed-subnivel-backlog',
                          title: 'Refinar dependências',
                          completed: false,
                          status: 'in_progress',
                          assignee: 'João Silva',
                          assigneeId: '2',
                          startDate: '2026-04-02',
                          dueDate: '2026-04-04',
                          priority: 'medium',
                          subtasks: [],
                          checklistItems: [],
                          comments: [],
                          attachments: [],
                          timeLogs: [],
                          activities: [],
                        },
                      ],
                      checklistItems: [],
                      comments: [],
                      attachments: [],
                      timeLogs: [
                        {
                          id: 'seed-log-ajustes-1',
                          taskId: 'seed-task-validacao',
                          userId: '2',
                          source: 'manual',
                          durationMinutes: 95,
                          manualMinutes: 95,
                          createdAt: '2026-04-01T15:30:00.000Z',
                        },
                      ],
                      activities: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'seed-phase-desenvolvimento',
          name: 'Desenvolvimento',
          description: 'Implementação do núcleo do produto.',
          order: 1,
          phaseType: 'execution',
          plannedStartDate: '2026-04-05',
          plannedEndDate: '2026-04-30',
          milestones: [
            {
              id: 'seed-ms-backend',
              name: 'Backend',
              type: 'technical',
              status: 'in-progress',
              responsible: 'João Silva',
              plannedStartDate: '2026-04-05',
              plannedEndDate: '2026-04-16',
              startDate: '2026-04-05',
              endDate: '2026-04-16',
              sla: 12,
              description: 'APIs e base de dados.',
              order: 0,
              tasks: [
                {
                  id: 'seed-task-backend',
                  title: 'Backend',
                  description: 'Estruturar serviços principais.',
                  status: 'in_progress',
                  assignee: 'João Silva',
                  assigneeId: '2',
                  priority: 'high',
                  startDate: '2026-04-05',
                  dueDate: '2026-04-16',
                  order: 0,
                  phaseId: 'seed-phase-desenvolvimento',
                  milestoneId: 'seed-ms-backend',
                  checklistItems: [],
                  comments: [],
                  attachments: [],
                  timeLogs: [],
                  activities: [],
                  subtasks: [
                    {
                      id: 'seed-subtask-endpoint',
                      title: 'Criar endpoint',
                      completed: false,
                      status: 'in_progress',
                      assignee: 'João Silva',
                      assigneeId: '2',
                      startDate: '2026-04-05',
                      dueDate: '2026-04-10',
                      priority: 'high',
                      subtasks: [],
                          checklistItems: [],
                          comments: [],
                          attachments: [],
                          timeLogs: [
                            {
                              id: 'seed-log-backlog-1',
                              taskId: 'seed-task-validacao',
                              userId: '2',
                              source: 'manual',
                              durationMinutes: 80,
                              manualMinutes: 80,
                              createdAt: '2026-04-02T12:00:00.000Z',
                            },
                          ],
                          activities: [],
                        },
                    {
                      id: 'seed-subtask-payload',
                      title: 'Validar payload',
                      completed: false,
                      status: 'not_started',
                      assignee: 'Maria Santos',
                      assigneeId: '3',
                      startDate: '2026-04-11',
                      dueDate: '2026-04-16',
                      priority: 'medium',
                      subtasks: [],
                      checklistItems: [],
                      comments: [],
                      attachments: [],
                      timeLogs: [],
                      activities: [],
                    },
                  ],
                },
              ],
            },
            {
              id: 'seed-ms-frontend',
              name: 'Frontend e integração',
              type: 'technical',
              status: 'not-started',
              responsible: 'Maria Santos',
              plannedStartDate: '2026-04-17',
              plannedEndDate: '2026-04-30',
              startDate: '2026-04-17',
              endDate: '2026-04-30',
              sla: 14,
              description: 'UI e conexão com APIs.',
              order: 1,
              tasks: [
                {
                  id: 'seed-task-frontend',
                  title: 'Frontend',
                  description: 'Implementar telas principais.',
                  status: 'not_started',
                  assignee: 'Maria Santos',
                  assigneeId: '3',
                  priority: 'high',
                  startDate: '2026-04-17',
                  dueDate: '2026-04-24',
                  order: 0,
                  phaseId: 'seed-phase-desenvolvimento',
                  milestoneId: 'seed-ms-frontend',
                  checklistItems: [],
                  comments: [],
                  attachments: [],
                  timeLogs: [],
                  activities: [],
                  subtasks: [],
                },
                {
                  id: 'seed-task-integracao',
                  title: 'Integração API',
                  description: 'Conectar UI aos serviços backend.',
                  status: 'not_started',
                  assignee: 'João Silva',
                  assigneeId: '2',
                  priority: 'medium',
                  startDate: '2026-04-25',
                  dueDate: '2026-04-30',
                  order: 1,
                  phaseId: 'seed-phase-desenvolvimento',
                  milestoneId: 'seed-ms-frontend',
                  checklistItems: [],
                  comments: [],
                  attachments: [],
                  timeLogs: [],
                  activities: [],
                  subtasks: [],
                },
              ],
            },
          ],
        },
        {
          id: 'seed-phase-testes',
          name: 'Testes e entrega',
          description: 'Validação final e homologação.',
          order: 2,
          phaseType: 'execution',
          plannedStartDate: '2026-05-01',
          plannedEndDate: '2026-05-16',
          milestones: [
            {
              id: 'seed-ms-qa',
              name: 'QA e homologação',
              type: 'delivery',
              status: 'not-started',
              responsible: 'Guilherme Drehmer',
              plannedStartDate: '2026-05-01',
              plannedEndDate: '2026-05-16',
              startDate: '2026-05-01',
              endDate: '2026-05-16',
              sla: 16,
              description: 'QA interno e homologação com o cliente.',
              order: 0,
              tasks: [
                {
                  id: 'seed-task-qa',
                  title: 'QA interno',
                  description: 'Rodar cenários de teste internos.',
                  status: 'not_started',
                  assignee: 'Maria Santos',
                  assigneeId: '3',
                  priority: 'high',
                  startDate: '2026-05-01',
                  dueDate: '2026-05-08',
                  order: 0,
                  phaseId: 'seed-phase-testes',
                  milestoneId: 'seed-ms-qa',
                  checklistItems: [],
                  comments: [],
                  attachments: [],
                  timeLogs: [],
                  activities: [],
                  subtasks: [],
                },
                {
                  id: 'seed-task-homologacao',
                  title: 'Homologação',
                  description: 'Concluir validação final com stakeholders.',
                  status: 'not_started',
                  assignee: 'Guilherme Drehmer',
                  assigneeId: '1',
                  priority: 'medium',
                  startDate: '2026-05-09',
                  dueDate: '2026-05-16',
                  order: 1,
                  phaseId: 'seed-phase-testes',
                  milestoneId: 'seed-ms-qa',
                  checklistItems: [],
                  comments: [],
                  attachments: [],
                  timeLogs: [],
                  activities: [],
                  subtasks: [],
                },
              ],
            },
          ],
        },
      ],
      appliedTaskTemplateIds: [],
      manualTimelineEntries: [],
    },
    metrics: {
      progress: 58,
      tasksCompleted: 6,
      tasksTotal: 13,
      hoursRemaining: 84,
      totalTimeTracked: 126,
    },
    eapId: 'eap-tpl-fábrica',
    phases: [],
    requester: 'Guilherme Drehmer',
    isPaused: false,
    quadro: 'Operação 2026',
    attachments: [],
    activities: [],
    comments: [],
  },
  {
    id: '95662',
    name: 'Vendas Plus',
    responsible: 'Guilherme Drehmer',
    client: 'Grupo Crisdu',
    group: 'Fábrica',
    status: 'documentation',
    logoColor: '#2563EB',
    logoText: 'Vendas Plus',
    progress: 86,
    tasksCompleted: 3,
    tasksTotal: 5,
    hoursRemaining: 78,
    tags: ['Tarefas'],
    quadro: 'Crisdu labs H1/H2',
  },
  {
    id: '95663',
    name: 'Portal Seguros',
    responsible: 'Guilherme Drehmer',
    client: 'Grupo Crisdu',
    group: 'Fábrica',
    status: 'documentation',
    logoColor: '#1E293B',
    logoText: 'crisdu seguros',
    progress: 86,
    tasksCompleted: 3,
    tasksTotal: 5,
    hoursRemaining: 78,
    tags: ['Tarefas'],
    deadline: '30/02/2024',
    quadro: 'Crisdu labs H1/H2',
    isPaused: true,
  },
  {
    id: '95664',
    name: 'Sistema de RH',
    responsible: 'Guilherme Drehmer',
    client: 'Grupo Crisdu',
    group: 'AIO',
    status: 'documentation',
    logoColor: '#991B1B',
    logoText: 'TOP RH',
    progress: 86,
    tasksCompleted: 3,
    tasksTotal: 5,
    hoursRemaining: 78,
    tags: ['Tarefas'],
    quadro: 'Crisdu labs H1/H2',
  },
  {
    id: '95665',
    name: 'Portal Clientes',
    responsible: 'Maria Silva',
    client: 'Tech Corp',
    group: 'Infra',
    status: 'backlog',
    logoColor: '#059669',
    logoText: 'Portal',
    progress: 25,
    tasksCompleted: 1,
    tasksTotal: 6,
    hoursRemaining: 120,
    tags: ['Tarefas'],
    quadro: 'Tech Q1/2026',
  },
  {
    id: '95666',
    name: 'Dashboard Analytics',
    responsible: 'João Santos',
    client: 'Data Insights',
    group: 'Fábrica',
    status: 'pre-analysis',
    logoColor: '#7C3AED',
    logoText: 'Analytics',
    progress: 45,
    tasksCompleted: 2,
    tasksTotal: 4,
    hoursRemaining: 96,
    tags: ['Tarefas'],
    quadro: 'Data Q1/2026',
  },
  {
    id: '95667',
    name: 'App Mobile',
    responsible: 'Ana Costa',
    client: 'Mobile First',
    group: 'Fábrica',
    status: 'waiting-approval',
    logoColor: '#DC2626',
    logoText: 'Mobile',
    progress: 92,
    tasksCompleted: 5,
    tasksTotal: 5,
    hoursRemaining: 24,
    tags: ['Tarefas'],
    deadline: '15/04/2026',
    quadro: 'Mobile Q1/2026',
  },
  {
    id: '95668',
    name: 'Sistema ERP',
    responsible: 'Carlos Lima',
    client: 'Enterprise Co',
    group: 'AIO',
    status: 'construction',
    logoColor: '#0891B2',
    logoText: 'ERP',
    progress: 67,
    tasksCompleted: 4,
    tasksTotal: 7,
    hoursRemaining: 156,
    tags: ['Tarefas'],
    quadro: 'Enterprise H1/H2',
  },
  {
    id: 'skill-project-credit-score-v2',
    name: 'Automação score v2',
    responsible: 'João Silva',
    requestedBy: 'Guilherme Drehmer',
    client: 'Grupo Crisdu',
    group: 'AIO',
    status: 'construction',
    situation: PROJECT_SITUATIONS.ATIVO,
    logoColor: '#2563EB',
    logoText: 'SV2',
    progress: 72,
    tasksCompleted: 8,
    tasksTotal: 11,
    hoursRemaining: 42,
    totalTimeTracked: 168,
    deadline: '2026-04-22',
    requestDate: '2026-01-12',
    product: 'Crédito Core',
    purpose: 'estrategico',
    skillId: 'skill-credit-analysis',
    skillName: 'Análise de crédito',
    tags: ['Crédito', 'Score'],
    quadro: 'Crédito Q1/Q2',
    activities: [
      {
        id: 'skill-project-credit-score-v2-act-1',
        timestamp: '2026-03-28T10:00:00.000Z',
        user: 'João Silva',
        action: 'reforçou a priorização do projeto',
        details: 'Ajuste das regras do score automático para reduzir análise manual.',
        entityType: 'project',
        entityId: 'skill-project-credit-score-v2',
      },
    ],
  },
  {
    id: 'skill-project-bureau-integration',
    name: 'Integração com bureau externo',
    responsible: 'Guilherme Drehmer',
    requestedBy: 'João Silva',
    client: 'Grupo Crisdu',
    group: 'AIO',
    status: 'pre-analysis',
    situation: PROJECT_SITUATIONS.ATIVO,
    logoColor: '#1D4ED8',
    logoText: 'Bureau',
    progress: 34,
    tasksCompleted: 3,
    tasksTotal: 9,
    hoursRemaining: 96,
    totalTimeTracked: 54,
    deadline: '2026-05-14',
    requestDate: '2026-02-05',
    product: 'Crédito Core',
    purpose: 'operacional',
    skillId: 'skill-credit-analysis',
    skillName: 'Análise de crédito',
    tags: ['Crédito', 'Integração'],
    quadro: 'Crédito Q2',
    activities: [
      {
        id: 'skill-project-bureau-integration-act-1',
        timestamp: '2026-03-19T14:30:00.000Z',
        user: 'Guilherme Drehmer',
        action: 'iniciou a análise de integração',
        details: 'Mapeamento técnico e regulatório com fornecedor externo.',
        entityType: 'project',
        entityId: 'skill-project-bureau-integration',
      },
    ],
  },
  {
    id: 'skill-project-fraud-reduction',
    name: 'Redução de fraude nas aprovações',
    responsible: 'Maria Santos',
    requestedBy: 'João Silva',
    client: 'Grupo Crisdu',
    group: 'Fábrica',
    status: 'documentation',
    situation: PROJECT_SITUATIONS.ATIVO,
    logoColor: '#0F766E',
    logoText: 'Fraude',
    progress: 100,
    tasksCompleted: 10,
    tasksTotal: 10,
    hoursRemaining: 0,
    totalTimeTracked: 142,
    deadline: '2026-02-27',
    requestDate: '2025-11-10',
    completionDate: '2026-02-24',
    deliveredAt: '2026-02-24',
    product: 'Crédito Core',
    purpose: 'seguranca',
    skillId: 'skill-credit-analysis',
    skillName: 'Análise de crédito',
    tags: ['Crédito', 'Fraude'],
    quadro: 'Crédito Q1',
    activities: [
      {
        id: 'skill-project-fraud-reduction-act-1',
        timestamp: '2026-02-24T17:10:00.000Z',
        user: 'Maria Santos',
        action: 'concluiu a iniciativa',
        details: 'Entrega das novas regras de validação e monitoramento antifraude.',
        entityType: 'project',
        entityId: 'skill-project-fraud-reduction',
      },
    ],
  },
  {
    id: 'skill-project-erp-crm-sync',
    name: 'Sincronização ERP x CRM',
    responsible: 'Guilherme Drehmer',
    requestedBy: 'Maria Santos',
    client: 'Grupo Crisdu',
    group: 'Infra',
    status: 'construction',
    situation: PROJECT_SITUATIONS.ATIVO,
    logoColor: '#7C3AED',
    logoText: 'SYNC',
    progress: 61,
    tasksCompleted: 7,
    tasksTotal: 12,
    hoursRemaining: 78,
    totalTimeTracked: 133,
    deadline: '2026-04-30',
    requestDate: '2026-01-20',
    product: 'ERP Principal',
    purpose: 'operacional',
    skillId: 'skill-system-integration',
    skillName: 'Integração de sistemas',
    tags: ['Integração', 'ERP'],
    quadro: 'Integrações H1',
    activities: [
      {
        id: 'skill-project-erp-crm-sync-act-1',
        timestamp: '2026-03-26T09:20:00.000Z',
        user: 'Guilherme Drehmer',
        action: 'liberou novo pacote técnico',
        details: 'Publicação do contrato de integração para pedidos e clientes.',
        entityType: 'project',
        entityId: 'skill-project-erp-crm-sync',
      },
    ],
  },
  {
    id: 'skill-project-webhooks-operational',
    name: 'Webhooks de status operacional',
    responsible: 'João Silva',
    requestedBy: 'Guilherme Drehmer',
    client: 'Grupo Crisdu',
    group: 'Infra',
    status: 'waiting-approval',
    situation: PROJECT_SITUATIONS.PAUSADO,
    logoColor: '#6366F1',
    logoText: 'HOOK',
    progress: 48,
    tasksCompleted: 4,
    tasksTotal: 9,
    hoursRemaining: 68,
    totalTimeTracked: 81,
    deadline: '2026-05-20',
    requestDate: '2026-02-18',
    product: 'Integrações Hub',
    purpose: 'inovacao',
    skillId: 'skill-system-integration',
    skillName: 'Integração de sistemas',
    tags: ['Integração', 'Webhook'],
    quadro: 'Integrações H1',
    activities: [
      {
        id: 'skill-project-webhooks-operational-act-1',
        timestamp: '2026-03-21T16:45:00.000Z',
        user: 'João Silva',
        action: 'pausou o projeto',
        details: 'Aguardando janela do fornecedor para homologação do endpoint.',
        entityType: 'project',
        entityId: 'skill-project-webhooks-operational',
      },
    ],
  },
  {
    id: 'skill-project-settlement-hub',
    name: 'Hub de liquidação financeira',
    responsible: 'Maria Santos',
    requestedBy: 'Guilherme Drehmer',
    client: 'Grupo Crisdu',
    group: 'Infra',
    status: 'documentation',
    situation: PROJECT_SITUATIONS.ATIVO,
    logoColor: '#0EA5E9',
    logoText: 'HUB',
    progress: 100,
    tasksCompleted: 14,
    tasksTotal: 14,
    hoursRemaining: 0,
    totalTimeTracked: 212,
    deadline: '2026-01-31',
    requestDate: '2025-10-04',
    completionDate: '2026-01-28',
    deliveredAt: '2026-01-28',
    product: 'Integrações Hub',
    purpose: 'expansao',
    skillId: 'skill-system-integration',
    skillName: 'Integração de sistemas',
    tags: ['Integração', 'Financeiro'],
    quadro: 'Integrações Q1',
    activities: [
      {
        id: 'skill-project-settlement-hub-act-1',
        timestamp: '2026-01-28T18:15:00.000Z',
        user: 'Maria Santos',
        action: 'concluiu a integração principal',
        details: 'Fluxo de liquidação estabilizado entre ERP e parceiro financeiro.',
        entityType: 'project',
        entityId: 'skill-project-settlement-hub',
      },
    ],
  },
  {
    id: 'skill-project-digital-onboarding-pf',
    name: 'Onboarding digital PF',
    responsible: 'Maria Santos',
    requestedBy: 'Guilherme Drehmer',
    client: 'Grupo Crisdu',
    group: 'Fábrica',
    status: 'construction',
    situation: PROJECT_SITUATIONS.ATIVO,
    logoColor: '#10B981',
    logoText: 'PF',
    progress: 67,
    tasksCompleted: 6,
    tasksTotal: 10,
    hoursRemaining: 58,
    totalTimeTracked: 119,
    deadline: '2026-04-18',
    requestDate: '2026-01-30',
    product: 'Portal Clientes',
    purpose: 'expansao',
    skillId: 'skill-client-onboarding',
    skillName: 'Onboarding de cliente',
    tags: ['Onboarding', 'Digital'],
    quadro: 'Onboarding H1',
    activities: [
      {
        id: 'skill-project-digital-onboarding-pf-act-1',
        timestamp: '2026-03-27T11:05:00.000Z',
        user: 'Maria Santos',
        action: 'ampliou o escopo do playbook',
        details: 'Inclusão de automações para validação documental no fluxo PF.',
        entityType: 'project',
        entityId: 'skill-project-digital-onboarding-pf',
      },
    ],
  },
  {
    id: 'skill-project-enterprise-activation',
    name: 'Playbook de ativação enterprise',
    responsible: 'Guilherme Drehmer',
    requestedBy: 'Maria Santos',
    client: 'Tech Corp',
    group: 'AIO',
    status: 'pre-analysis',
    situation: PROJECT_SITUATIONS.ATIVO,
    logoColor: '#059669',
    logoText: 'ENT',
    progress: 29,
    tasksCompleted: 2,
    tasksTotal: 8,
    hoursRemaining: 104,
    totalTimeTracked: 31,
    deadline: '2026-05-09',
    requestDate: '2026-02-27',
    product: 'Portal Clientes',
    purpose: 'operacional',
    skillId: 'skill-client-onboarding',
    skillName: 'Onboarding de cliente',
    tags: ['Onboarding', 'Enterprise'],
    quadro: 'Onboarding H1',
    activities: [
      {
        id: 'skill-project-enterprise-activation-act-1',
        timestamp: '2026-03-25T13:40:00.000Z',
        user: 'Guilherme Drehmer',
        action: 'abriu discovery com comercial',
        details: 'Mapeamento dos pontos de atrito da ativação enterprise.',
        entityType: 'project',
        entityId: 'skill-project-enterprise-activation',
      },
    ],
  },
  {
    id: 'skill-project-first-access-journey',
    name: 'Jornada de primeiro acesso',
    responsible: 'João Silva',
    requestedBy: 'Maria Santos',
    client: 'Tech Corp',
    group: 'Fábrica',
    status: 'documentation',
    situation: PROJECT_SITUATIONS.ATIVO,
    logoColor: '#14B8A6',
    logoText: '1A',
    progress: 100,
    tasksCompleted: 9,
    tasksTotal: 9,
    hoursRemaining: 0,
    totalTimeTracked: 96,
    deadline: '2026-02-12',
    requestDate: '2025-12-03',
    completionDate: '2026-02-10',
    deliveredAt: '2026-02-10',
    product: 'Portal Clientes',
    purpose: 'suporte',
    skillId: 'skill-client-onboarding',
    skillName: 'Onboarding de cliente',
    tags: ['Onboarding', 'Experiência'],
    quadro: 'Onboarding Q1',
    activities: [
      {
        id: 'skill-project-first-access-journey-act-1',
        timestamp: '2026-02-10T15:00:00.000Z',
        user: 'João Silva',
        action: 'finalizou a jornada inicial',
        details: 'Entrega dos checkpoints automáticos de primeiro acesso.',
        entityType: 'project',
        entityId: 'skill-project-first-access-journey',
      },
    ],
  },
];

const initialFilters: FilterState = {
  quadro: 'Todos',
  group: 'Todos',
  client: 'Todos',
  responsible: 'Todos',
  project: 'Todos',
};

const normalizeWorkspaceId = (workspaceId?: string) => workspaceId || 'default';

const normalizeGovernancePhaseDefinition = (
  phase: GovernancePhaseDefinition,
  order: number,
  workspaceId: string
): GovernancePhaseDefinition => {
  const timestamp = new Date().toISOString();
  return {
    ...phase,
    order: phase.order ?? order,
    workspaceId: phase.workspaceId || workspaceId,
    color: phase.color || DEFAULT_GOVERNANCE_PHASES[order % DEFAULT_GOVERNANCE_PHASES.length]?.color || '#E5E7EB',
    createdAt: phase.createdAt || timestamp,
    updatedAt: phase.updatedAt || phase.createdAt || timestamp,
  };
};

const normalizeWorkspaceProjectStageDefinition = (
  stage: WorkspaceProjectStageDefinition,
  order: number,
  workspaceId: string
): WorkspaceProjectStageDefinition => {
  const timestamp = new Date().toISOString();
  return {
    ...stage,
    order: stage.order ?? order,
    workspaceId: stage.workspaceId || workspaceId,
    color:
      stage.color ||
      DEFAULT_WORKSPACE_PROJECT_STAGES[order % DEFAULT_WORKSPACE_PROJECT_STAGES.length]?.color ||
      '#E5E7EB',
    createdAt: stage.createdAt || timestamp,
    updatedAt: stage.updatedAt || stage.createdAt || timestamp,
  };
};

const buildWorkspaceGovernancePhases = (workspaceId: string, source?: GovernancePhaseDefinition[]) => {
  const base = source?.length ? source : DEFAULT_GOVERNANCE_PHASES;
  return base
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((phase, index) =>
      normalizeGovernancePhaseDefinition(
        {
          ...phase,
          id: phase.id,
        },
        index,
        workspaceId
      )
    );
};

const buildWorkspaceProjectStages = (
  workspaceId: string,
  source?: WorkspaceProjectStageDefinition[]
) => {
  const base = source?.length ? source : DEFAULT_WORKSPACE_PROJECT_STAGES;
  return base
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((stage, index) =>
      normalizeWorkspaceProjectStageDefinition(
        {
          ...stage,
          id: stage.id,
        },
        index,
        workspaceId
      )
    );
};

const syncProjectGovernancePhases = (
  project: Project,
  phaseDefinitions: GovernancePhaseDefinition[]
): Project => {
  const workspaceId = normalizeWorkspaceId(project.group);
  const workspacePhases = phaseDefinitions
    .filter((phase) => normalizeWorkspaceId(phase.workspaceId) === workspaceId)
    .sort((a, b) => a.order - b.order);

  if (!workspacePhases.length) {
    return project;
  }

  const currentPhaseStillExists = workspacePhases.some(
    (phase) => phase.id === project.governance.currentPhaseId
  );

  return {
    ...project,
    governance: {
      ...project.governance,
      currentPhaseId: currentPhaseStillExists
        ? project.governance.currentPhaseId
        : workspacePhases[0].id,
      phases: workspacePhases,
    },
    status: currentPhaseStillExists ? project.status : (workspacePhases[0].id as string),
  };
};

const syncProjectWorkspaceBoardStates = (
  project: Project,
  stageDefinitions: WorkspaceProjectStageDefinition[]
): Project => {
  const currentStates = project.workspaceBoardStates || [];
  const workspaceIds = Array.from(
    new Set(
      [project.group, ...currentStates.map((state) => state.workspaceId)]
        .filter(Boolean)
        .map((workspaceId) => normalizeWorkspaceId(workspaceId))
    )
  );

  const syncedStates: ProjectWorkspaceBoardState[] = workspaceIds
    .map((workspaceId) => {
      const workspaceStages = stageDefinitions
        .filter((stage) => normalizeWorkspaceId(stage.workspaceId) === workspaceId)
        .sort((a, b) => a.order - b.order);

      if (!workspaceStages.length) {
        return null;
      }

      const existingState = currentStates.find(
        (state) => normalizeWorkspaceId(state.workspaceId) === workspaceId
      );
      const fallbackStageId = workspaceStages[0].id;
      const stageStillExists = existingState
        ? workspaceStages.some((stage) => stage.id === existingState.stageId)
        : false;

      return {
        workspaceId,
        stageId: stageStillExists ? existingState!.stageId : fallbackStageId,
        updatedAt: existingState?.updatedAt || new Date().toISOString(),
      };
    })
    .filter(Boolean) as ProjectWorkspaceBoardState[];

  return {
    ...project,
    workspaceBoardStates: syncedStates,
  };
};

const buildGovernanceHistory = (
  projectId: string,
  currentPhaseId: string,
  situation: ProjectSituation
): GovernanceHistoryEntry[] => [
  {
    id: `${projectId}-governance-created`,
    toPhaseId: currentPhaseId,
    changedAt: new Date().toISOString(),
    reason: `Estado inicial do projeto (${situation})`,
  },
];

const normalizeSubtasks = (subtasks: Subtask[] = []): Subtask[] =>
  subtasks.map((subtask) => ({
    ...subtask,
    status: subtask.status || (subtask.completed ? 'done' : 'not_started'),
    subtasks: normalizeSubtasks(subtask.subtasks || []),
    checklistItems: subtask.checklistItems || [],
    comments: subtask.comments || [],
    attachments: subtask.attachments || [],
    timeLogs: subtask.timeLogs || [],
    activities: subtask.activities || [],
  }));

const normalizeTaskNode = (task: WBSTask, phaseId: string, milestoneId: string, order: number): WBSTask => ({
  ...task,
  order: task.order ?? order,
  phaseId: task.phaseId || phaseId,
  milestoneId: task.milestoneId || milestoneId,
  subtasks: normalizeSubtasks(task.subtasks || []),
  checklistItems: task.checklistItems || [],
  comments: task.comments || [],
  attachments: task.attachments || [],
  timeLogs: task.timeLogs || [],
  activities: task.activities || [],
});

const normalizePhases = (phases?: Phase[]): Phase[] =>
  (phases || []).map((phase, index) => ({
    ...phase,
    order: phase.order ?? index,
    phaseType: 'execution',
    milestones: (phase.milestones || []).map((milestone, milestoneIndex) => ({
      ...milestone,
      order: milestone.order ?? milestoneIndex,
      tasks: (milestone.tasks || []).map((task, taskIndex) =>
        normalizeTaskNode(task, phase.id, milestone.id, taskIndex)
      ),
    })),
  }));

const normalizeTimelineEntries = (entries?: ProjectTimelineEntry[]): ProjectTimelineEntry[] =>
  (entries || []).map((entry, index) => ({
    ...entry,
    order: entry.order ?? index,
    plannedStartDate: entry.plannedStartDate || entry.startDate,
    actualStartDate: entry.actualStartDate,
    plannedEndDate: entry.plannedEndDate || entry.endDate,
    actualEndDate: entry.actualEndDate,
    startDate: entry.startDate || entry.plannedStartDate,
    endDate: entry.endDate || entry.plannedEndDate,
  }));

const normalizeProject = (
  project: Project,
  governancePhasesState?: GovernancePhaseDefinition[],
  workspaceProjectStagesState?: WorkspaceProjectStageDefinition[]
): Project => {
  const situation: ProjectSituation =
    project.governance?.situation ||
    project.situation ||
    (project.isPaused ? PROJECT_SITUATIONS.PAUSADO : PROJECT_SITUATIONS.ATIVO);

  const currentPhaseId =
    project.governance?.currentPhaseId ||
    project.status ||
    DEFAULT_GOVERNANCE_PHASES[0].id;

  const normalizedExecutionPhases = normalizePhases(
    project.execution?.phases || project.phases
  );
  const projectRoleAssignments = normalizeProjectRoleAssignments(
    project.projectRoleAssignments || [],
    project.id
  );
  const resolvedExecutionPhases = applyRoleAssignmentsToPhases(
    normalizedExecutionPhases,
    projectRoleAssignments
  );

  const workspaceId = normalizeWorkspaceId(project.group);
  const storedWorkspacePhases = governancePhasesState?.filter(
    (phase) => normalizeWorkspaceId(phase.workspaceId) === workspaceId
  );
  const storedWorkspaceProjectStages = workspaceProjectStagesState?.filter(
    (stage) => normalizeWorkspaceId(stage.workspaceId) === workspaceId
  );
  const governance: ProjectGovernance = {
    currentPhaseId,
    situation,
    phases:
      storedWorkspacePhases?.length
        ? buildWorkspaceGovernancePhases(workspaceId, storedWorkspacePhases)
        : project.governance?.phases?.length
          ? buildWorkspaceGovernancePhases(workspaceId, project.governance.phases)
          : buildWorkspaceGovernancePhases(workspaceId),
    history:
      project.governance?.history?.length
        ? project.governance.history
        : buildGovernanceHistory(project.id, currentPhaseId, situation),
  };

  const metrics: ProjectMetrics = {
    progress: project.metrics?.progress ?? project.progress ?? 0,
    tasksTotal: project.metrics?.tasksTotal ?? project.tasksTotal ?? 0,
    tasksCompleted: project.metrics?.tasksCompleted ?? project.tasksCompleted ?? 0,
    hoursRemaining: project.metrics?.hoursRemaining ?? project.hoursRemaining ?? 0,
    totalTimeTracked:
      project.metrics?.totalTimeTracked ?? project.totalTimeTracked ?? 0,
  };

  const stakeholderAssignments =
    project.stakeholderAssignments?.length
      ? project.stakeholderAssignments.map((assignment) => ({
          stakeholderId: assignment.stakeholderId,
          name: assignment.name,
          projectRole: assignment.projectRole || undefined,
        }))
      : (project.stakeholders || []).map((stakeholderName) => ({
          stakeholderId: `legacy-${stakeholderName}`,
          name: stakeholderName,
          projectRole: undefined,
        }));

  const normalizedProject = normalizeProjectValueState({
    ...project,
    governance,
    execution: {
      eapTemplateId: project.execution?.eapTemplateId || project.eapId,
      phases: resolvedExecutionPhases,
      dependencies: (project.execution?.dependencies || []).map(normalizeDependencyRecord),
      ganttDependencies: project.execution?.ganttDependencies || [],
      appliedTaskTemplateIds: project.execution?.appliedTaskTemplateIds || [],
      manualTimelineEntries: normalizeTimelineEntries(project.execution?.manualTimelineEntries),
    },
    metrics,
    requestedBy: project.requestedBy || project.requester,
    teams: project.teams || [],
    tagIds: project.tagIds || [],
    tags: project.tags || [],
    stakeholderAssignments,
    projectRoleAssignments,
    stakeholders: stakeholderAssignments.map((assignment) => assignment.name),
    expectedBenefits: project.expectedBenefits || [],
    realizedBenefits: project.realizedBenefits || [],
    benefits: project.benefits || [],
    attachments: project.attachments || [],
    isWeeklyFocus: Boolean(project.isWeeklyFocus),
    weeklyUpdate: project.weeklyUpdate || '',
    governanceOrder: project.governanceOrder ?? 0,
    activities: project.activities || [],
    comments: project.comments || [],
    resultMaturityType: project.resultMaturityType || 'medio_prazo',
    resultStatus: project.resultStatus || 'nao_iniciado',
    resultScheduleMode:
      project.resultScheduleMode ||
      ((project.resultCustomEvaluationOffsetsDays || []).length > 0 ? 'custom' : 'default'),
    resultOwnerId: project.resultOwnerId,
    resultCustomEvaluationOffsetsDays: project.resultCustomEvaluationOffsetsDays || [],
    impactLevel: project.impactLevel || 'medio',
    nextResultEvaluationAt:
      project.nextResultEvaluationAt ||
      calculateNextResultEvaluation({
        deliveredAt: project.deliveredAt || project.completionDate,
        maturityType: project.resultMaturityType || 'medio_prazo',
        manualDate: project.nextResultEvaluationAt,
        customOffsetsDays: project.resultCustomEvaluationOffsetsDays,
      }),
    valueRealizationSummary: project.valueRealizationSummary || undefined,
    projectKpis: project.projectKpis || [],
    resultEvaluations: project.resultEvaluations || [],
    status: currentPhaseId,
    situation,
    workspaceBoardStates: project.workspaceBoardStates || [],
    eapId: project.execution?.eapTemplateId || project.eapId,
    phases: resolvedExecutionPhases,
    progress: metrics.progress,
    tasksTotal: metrics.tasksTotal,
    tasksCompleted: metrics.tasksCompleted,
    hoursRemaining: metrics.hoursRemaining,
    totalTimeTracked: metrics.totalTimeTracked,
    completionDate: project.completionDate || project.deliveredAt,
    deliveredAt: project.deliveredAt || project.completionDate,
    requester: project.requestedBy || project.requester,
    isPaused: situation === PROJECT_SITUATIONS.PAUSADO,
  });

  const projectWithGovernance = governancePhasesState?.length
    ? syncProjectGovernancePhases(normalizedProject, governancePhasesState)
    : normalizedProject;

  const workspaceStagesToApply =
    workspaceProjectStagesState?.length
      ? workspaceProjectStagesState
      : storedWorkspaceProjectStages?.length
        ? buildWorkspaceProjectStages(workspaceId, storedWorkspaceProjectStages)
        : buildWorkspaceProjectStages(workspaceId);

  const projectWithWorkspaceStates = syncProjectWorkspaceBoardStates(
    projectWithGovernance,
    workspaceStagesToApply
  );

  // Quando a execução termina, o projeto continua concluído para o Labs.
  // O acompanhamento de valor segue em paralelo, fora do Kanban operacional.
  return isProjectInCompletedPhase(projectWithWorkspaceStates)
    ? startProjectValueCycle(projectWithWorkspaceStates)
    : projectWithWorkspaceStates;
};

const parseProjectStorage = (): Project[] | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.projects);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed.map((project) => normalizeProject(project as Project));
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as StorageEnvelope<Project[]>).data)
    ) {
      return (parsed as StorageEnvelope<Project[]>).data.map((project) =>
        normalizeProject(project)
      );
    }
  } catch (error) {
    console.warn('[ProjectContext] Erro ao ler localStorage - aplicando fallback:', error);
  }

  return null;
};

const parseGovernancePhaseStorage = (): GovernancePhaseDefinition[] | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.governancePhases);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    if (Array.isArray(parsed)) {
      return parsed as GovernancePhaseDefinition[];
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as StorageEnvelope<GovernancePhaseDefinition[]>).data)
    ) {
      return (parsed as StorageEnvelope<GovernancePhaseDefinition[]>).data;
    }
  } catch (error) {
    console.warn('[ProjectContext] Erro ao ler fases de governança:', error);
  }

  return null;
};

const parseWorkspaceProjectStageStorage = (): WorkspaceProjectStageDefinition[] | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.workspaceProjectStages);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    if (Array.isArray(parsed)) {
      return parsed as WorkspaceProjectStageDefinition[];
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as StorageEnvelope<WorkspaceProjectStageDefinition[]>).data)
    ) {
      return (parsed as StorageEnvelope<WorkspaceProjectStageDefinition[]>).data;
    }
  } catch (error) {
    console.warn('[ProjectContext] Erro ao ler fases locais de workspace:', error);
  }

  return null;
};

const applyProjectDeliveryTransition = (
  previousProject: Project,
  nextProject: Project
): Project => {
  const wasInCompletedPhase = isProjectInCompletedPhase(previousProject);
  const isInCompletedPhase = isProjectInCompletedPhase(nextProject);

  // Esta transição separa explicitamente os dois ciclos do produto:
  // concluir no Kanban encerra a execução, mas inicia/prepara o ciclo de resultado.
  // Assim, o projeto sai do radar operacional sem desaparecer do acompanhamento de valor.
  if (!wasInCompletedPhase && isInCompletedPhase && !nextProject.deliveredAt) {
    const deliveredAt = new Date().toISOString();
    return startProjectValueCycle({
      ...nextProject,
      deliveredAt,
      completionDate: nextProject.completionDate || deliveredAt,
    });
  }

  if (!wasInCompletedPhase && isInCompletedPhase) {
    return startProjectValueCycle(nextProject);
  }

  return nextProject;
};

const getInitialProjects = (): Project[] => {
  const storedProjects = parseProjectStorage();
  if (storedProjects) {
    const hasStructuredProject = storedProjects.some(
      (project) => normalizeProject(project).execution.phases.length > 0
    );
    const hasDemoProject = storedProjects.some(
      (project) => project.id === 'project-seed-novo-kanban'
    );
    const storedIds = new Set(storedProjects.map((project) => project.id));
    const missingMockProjects = rawProjects.filter((project) => !storedIds.has(project.id));

    if (!hasStructuredProject && !hasDemoProject) {
      return [
        ...storedProjects,
        normalizeProject(rawProjects[0] as Project),
        ...missingMockProjects.slice(1).map((project) => normalizeProject(project as Project)),
      ];
    }

    return [
      ...storedProjects,
      ...missingMockProjects.map((project) => normalizeProject(project as Project)),
    ];
  }

  return rawProjects.map((project) => normalizeProject(project as Project));
};

const getInitialGovernancePhases = (projects: Project[]): GovernancePhaseDefinition[] => {
  const storedGovernancePhases = parseGovernancePhaseStorage();
  if (storedGovernancePhases?.length) {
    return storedGovernancePhases
      .map((phase, index) =>
        normalizeGovernancePhaseDefinition(
          phase,
          phase.order ?? index,
          normalizeWorkspaceId(phase.workspaceId)
        )
      )
      .sort((a, b) => {
        if (normalizeWorkspaceId(a.workspaceId) !== normalizeWorkspaceId(b.workspaceId)) {
          return normalizeWorkspaceId(a.workspaceId).localeCompare(normalizeWorkspaceId(b.workspaceId));
        }
        return a.order - b.order;
      });
  }

  const workspaces = Array.from(
    new Set(projects.map((project) => normalizeWorkspaceId(project.group)))
  );

  return workspaces.flatMap((workspaceId) => {
    const workspaceProject = projects.find(
      (project) => normalizeWorkspaceId(project.group) === workspaceId
    );
    return buildWorkspaceGovernancePhases(workspaceId, workspaceProject?.governance?.phases);
  });
};

const getInitialWorkspaceProjectStages = (projects: Project[]): WorkspaceProjectStageDefinition[] => {
  const storedWorkspaceProjectStages = parseWorkspaceProjectStageStorage();
  if (storedWorkspaceProjectStages?.length) {
    return storedWorkspaceProjectStages
      .map((stage, index) =>
        normalizeWorkspaceProjectStageDefinition(
          stage,
          stage.order ?? index,
          normalizeWorkspaceId(stage.workspaceId)
        )
      )
      .sort((a, b) => {
        if (normalizeWorkspaceId(a.workspaceId) !== normalizeWorkspaceId(b.workspaceId)) {
          return normalizeWorkspaceId(a.workspaceId).localeCompare(normalizeWorkspaceId(b.workspaceId));
        }
        return a.order - b.order;
      });
  }

  const workspaces = Array.from(
    new Set(projects.map((project) => normalizeWorkspaceId(project.group)))
  );

  return workspaces.flatMap((workspaceId) => buildWorkspaceProjectStages(workspaceId));
};

const getInitialProjectState = () => {
  const baseProjects = getInitialProjects();
  const initialGovernancePhases = getInitialGovernancePhases(baseProjects);
  const initialWorkspaceProjectStages = getInitialWorkspaceProjectStages(baseProjects);

  return {
    projects: baseProjects.map((project) =>
      normalizeProject(project, initialGovernancePhases, initialWorkspaceProjectStages)
    ),
    governancePhases: initialGovernancePhases,
    workspaceProjectStages: initialWorkspaceProjectStages,
  };
};

export function ProjectProvider({ children }: { children: ReactNode }) {
  const initialProjectState = React.useMemo(() => getInitialProjectState(), []);
  const {
    currentUser,
    users,
    automationRules,
    emailTemplates,
    taskTemplates,
    addNotification,
    recordAutomationExecutions,
    sendEmailMessage,
    priorityCycles,
  } = useAdmin();
  const { publishDomainEvent } = useIntegration();
  const [projects, setProjects] = useState<Project[]>(initialProjectState.projects);
  const [governancePhases, setGovernancePhases] = useState<GovernancePhaseDefinition[]>(
    initialProjectState.governancePhases
  );
  const [workspaceProjectStages, setWorkspaceProjectStages] = useState<WorkspaceProjectStageDefinition[]>(
    initialProjectState.workspaceProjectStages
  );
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const resolvedProjects = React.useMemo(
    () => applyPriorityCycleFocusToProjects(projects, priorityCycles),
    [priorityCycles, projects]
  );

  useEffect(() => {
    const payload: StorageEnvelope<Project[]> = {
      version: STORAGE_VERSIONS.projects,
      data: projects.map((project) =>
        normalizeProject(project, governancePhases, workspaceProjectStages)
      ),
    };

    localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(payload));
  }, [projects, governancePhases, workspaceProjectStages]);

  useEffect(() => {
    const payload: StorageEnvelope<GovernancePhaseDefinition[]> = {
      version: STORAGE_VERSIONS.governancePhases,
      data: governancePhases,
    };

    localStorage.setItem(STORAGE_KEYS.governancePhases, JSON.stringify(payload));
  }, [governancePhases]);

  useEffect(() => {
    const payload: StorageEnvelope<WorkspaceProjectStageDefinition[]> = {
      version: STORAGE_VERSIONS.workspaceProjectStages,
      data: workspaceProjectStages,
    };

    localStorage.setItem(STORAGE_KEYS.workspaceProjectStages, JSON.stringify(payload));
  }, [workspaceProjectStages]);

  const getWorkspaceGovernancePhases = (workspaceId?: string) =>
    governancePhases
      .filter((phase) => normalizeWorkspaceId(phase.workspaceId) === normalizeWorkspaceId(workspaceId))
      .sort((a, b) => a.order - b.order);

  const getWorkspaceProjectStages = (workspaceId?: string) =>
    workspaceProjectStages
      .filter((stage) => normalizeWorkspaceId(stage.workspaceId) === normalizeWorkspaceId(workspaceId))
      .sort((a, b) => a.order - b.order);

  const ensureWorkspaceDefinitions: ProjectContextType['ensureWorkspaceDefinitions'] = (workspaceId) => {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const hasGovernance = governancePhases.some(
      (phase) => normalizeWorkspaceId(phase.workspaceId) === normalizedWorkspaceId
    );
    const hasStages = workspaceProjectStages.some(
      (stage) => normalizeWorkspaceId(stage.workspaceId) === normalizedWorkspaceId
    );

    if (!hasGovernance) {
      setGovernancePhases((prev) => [
        ...prev,
        ...buildWorkspaceGovernancePhases(normalizedWorkspaceId).filter(
          (phase) => !prev.some((candidate) => candidate.id === phase.id)
        ),
      ]);
    }

    if (!hasStages) {
      setWorkspaceProjectStages((prev) => [
        ...prev,
        ...buildWorkspaceProjectStages(normalizedWorkspaceId).filter(
          (stage) => !prev.some((candidate) => candidate.id === stage.id)
        ),
      ]);
    }
  };

  const getCompletedGovernancePhase = (workspaceId?: string) => {
    const phases = getWorkspaceGovernancePhases(workspaceId);
    return (
      phases.find((phase) => phase.isTerminal) ||
      phases.find((phase) => phase.name.toLocaleLowerCase('pt-BR').includes('conclu')) ||
      phases[phases.length - 1]
    );
  };

  const isCompletedWorkspaceStageName = (stageName?: string) =>
    Boolean(stageName?.toLocaleLowerCase('pt-BR').includes('conclu'));

  const isProjectExecutionCompleted = (project: Project) => {
    const states = project.workspaceBoardStates || [];
    if (!states.length) return false;

    return states.every((state) => {
      const workspaceStages = getWorkspaceProjectStages(state.workspaceId);
      const currentStage = workspaceStages.find((stage) => String(stage.id) === String(state.stageId));
      return isCompletedWorkspaceStageName(currentStage?.name);
    });
  };

  const applyAutomationCommandsToProject = (
    project: Project,
    commands: AutomationCommand[]
  ): Project => {
    return commands.reduce((currentProject, command) => {
      if (command.type === 'assign_project_team') {
        const targetTeam = (command.teamId || command.teamName || '').trim();
        if (!targetTeam || targetTeam === currentProject.group) return currentProject;

        return normalizeProject(
          {
            ...currentProject,
            group: targetTeam,
          },
          governancePhases,
          workspaceProjectStages
        );
      }

      if (command.type === 'move_project_governance_phase') {
        const governancePhasesForWorkspace = getWorkspaceGovernancePhases(currentProject.group);
        const targetPhase =
          (command.phaseId
            ? governancePhasesForWorkspace.find((phase) => String(phase.id) === String(command.phaseId))
            : undefined) ||
          (command.phaseName
            ? governancePhasesForWorkspace.find(
                (phase) =>
                  phase.name.trim().toLocaleLowerCase('pt-BR') ===
                  command.phaseName?.trim().toLocaleLowerCase('pt-BR')
              )
            : undefined) ||
          (command.phaseName?.toLocaleLowerCase('pt-BR').includes('concl')
            ? getCompletedGovernancePhase(currentProject.group)
            : undefined);

        if (!targetPhase || String(targetPhase.id) === String(currentProject.governance.currentPhaseId)) {
          return currentProject;
        }

        return normalizeProject(
          {
            ...currentProject,
            governance: {
              ...currentProject.governance,
              currentPhaseId: targetPhase.id,
            },
            status: targetPhase.id as Project['status'],
          },
          governancePhases,
          workspaceProjectStages
        );
      }

      if (command.type === 'move_project_to_workspace_stage') {
        const targetWorkspaceId = normalizeWorkspaceId(
          command.workspaceId || command.workspaceName || currentProject.group
        );
        const workspaceStages = getWorkspaceProjectStages(targetWorkspaceId);
        if (!workspaceStages.length) return currentProject;

        const targetStage =
          (command.stageId
            ? workspaceStages.find((stage) => String(stage.id) === String(command.stageId))
            : undefined) ||
          (command.stageName
            ? workspaceStages.find(
                (stage) =>
                  stage.name.trim().toLocaleLowerCase('pt-BR') ===
                  command.stageName?.trim().toLocaleLowerCase('pt-BR')
              )
            : undefined);

        const currentWorkspaceStage = (currentProject.workspaceBoardStates || []).find(
          (state) => normalizeWorkspaceId(state.workspaceId) === targetWorkspaceId
        );
        if (!targetStage || currentWorkspaceStage?.stageId === String(targetStage.id)) return currentProject;

        return normalizeProject(
          {
            ...currentProject,
            workspaceBoardStates: [
              ...(currentProject.workspaceBoardStates || []).filter(
                (state) => normalizeWorkspaceId(state.workspaceId) !== targetWorkspaceId
              ),
              {
                workspaceId: targetWorkspaceId,
                stageId: String(targetStage.id),
                updatedAt: new Date().toISOString(),
              },
            ],
          },
          governancePhases,
          workspaceProjectStages
        );
      }

      if (command.type === 'update_project_field') {
        return normalizeProject(
          {
            ...currentProject,
            [command.field]: command.value,
          } as Project,
          governancePhases,
          workspaceProjectStages
        );
      }

      if (command.type === 'create_task_from_template') {
        const template = taskTemplates.find(
          (candidate) => candidate.id === command.taskTemplateId && candidate.isActive
        );
        if (!template) return currentProject;
        return applyTaskTemplateToProject(currentProject, template).updatedProject;
      }

      return currentProject;
    }, project);
  };

  const persistAutomationResult = (
    result: ReturnType<typeof runAutomationRules>,
    currentProject: Project
  ) => {
    result.notifications.forEach(addNotification);
    result.emails.forEach(sendEmailMessage);
    recordAutomationExecutions(result.executions);
    return currentProject;
  };

  const getProjectNotificationRecipients = (project: Project) => {
    const stakeholderNames = [
      ...(project.stakeholderAssignments || []).map((assignment) => assignment.name),
      ...(project.stakeholders || []),
    ];

    return Array.from(
      new Set(
        users
          .filter(
            (user) =>
              user.name === project.responsible ||
              user.name === project.requestedBy ||
              stakeholderNames.includes(user.name)
          )
          .map((user) => user.id)
      )
    );
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    const targetProject = projects.find((project) => project.id === id);
    if (!targetProject) return false;

    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== id) return project;

        const normalizedMergedProject = normalizeProject(
          { ...project, ...updates },
          governancePhases,
          workspaceProjectStages
        );
        const nextProject = applyProjectDeliveryTransition(project, normalizedMergedProject);
        let nextPatchedProject = nextProject;

        const projectUpdated = runAutomationRules({
          rules: automationRules,
          event: 'project.updated',
          currentUser,
          users,
          emailTemplates,
          project: nextProject,
          metadata: {
            projectId: nextProject.id,
          },
        });

        if (projectUpdated.projectPatch) {
          nextPatchedProject = normalizeProject(
            {
              ...nextPatchedProject,
              ...projectUpdated.projectPatch,
            },
            governancePhases,
            workspaceProjectStages
          );
        }
        if (projectUpdated.commands.length > 0) {
          nextPatchedProject = applyAutomationCommandsToProject(
            nextPatchedProject,
            projectUpdated.commands
          );
        }
        persistAutomationResult(projectUpdated, nextPatchedProject);

        const stakeholderNamesBefore = new Set([
          ...(project.stakeholderAssignments || []).map((assignment) => assignment.name),
          ...(project.stakeholders || []),
        ]);
        const stakeholderNamesAfter = new Set([
          ...(nextPatchedProject.stakeholderAssignments || []).map((assignment) => assignment.name),
          ...(nextPatchedProject.stakeholders || []),
        ]);

        Array.from(stakeholderNamesAfter)
          .filter((name) => !stakeholderNamesBefore.has(name))
          .forEach((stakeholderName) => {
            const stakeholderUser = users.find((user) => user.name === stakeholderName);
            if (!stakeholderUser) return;

            addNotification(
              createNotification({
                userId: stakeholderUser.id,
                type: 'project_stakeholder_added',
                title: 'Você foi vinculado ao projeto',
                description: `${currentUser?.name || 'Alguém'} vinculou você ao projeto "${nextPatchedProject.name}".`,
                entityType: 'project',
                entityId: nextPatchedProject.id,
                linkTo: `/governance?project=${nextPatchedProject.id}`,
              })
            );
          });

        if (project.governance.currentPhaseId !== nextProject.governance.currentPhaseId) {
          publishDomainEvent({
            name: 'project.phase_changed',
            entityType: 'project',
            entityId: nextPatchedProject.id,
            payloadJson: {
              projectId: nextPatchedProject.id,
              projectName: nextPatchedProject.name,
              phaseScope: 'governance',
              fromPhaseId: project.governance.currentPhaseId,
              toPhaseId: nextProject.governance.currentPhaseId,
            },
          });
          publishDomainEvent({
            name: 'project.phase_changed',
            entityType: 'project',
            entityId: nextPatchedProject.id,
            payloadJson: {
              projectId: nextPatchedProject.id,
              projectName: nextPatchedProject.name,
              fromPhaseId: project.governance.currentPhaseId,
              toPhaseId: nextProject.governance.currentPhaseId,
            },
          });
          const fromPhaseName =
            project.governance.phases.find((phase) => String(phase.id) === String(project.governance.currentPhaseId))
              ?.name || project.governance.currentPhaseId;
          const toPhaseName =
            nextPatchedProject.governance.phases.find((phase) => String(phase.id) === String(nextProject.governance.currentPhaseId))
              ?.name || nextProject.governance.currentPhaseId;
          const phaseChanged = runAutomationRules({
            rules: automationRules,
            event: 'project.phase.changed',
            currentUser,
            users,
            emailTemplates,
            project: nextPatchedProject,
            metadata: {
              projectId: nextPatchedProject.id,
              phaseScope: 'governance',
              fromPhaseId: project.governance.currentPhaseId,
              toPhaseId: nextProject.governance.currentPhaseId,
              fromPhaseName,
              toPhaseName,
              workspace: nextPatchedProject.group,
            },
          });

          if (phaseChanged.projectPatch) {
            nextPatchedProject = normalizeProject(
              {
                ...nextPatchedProject,
                ...phaseChanged.projectPatch,
              },
              governancePhases,
              workspaceProjectStages
            );
          }
          if (phaseChanged.commands.length > 0) {
            nextPatchedProject = applyAutomationCommandsToProject(
              nextPatchedProject,
              phaseChanged.commands
            );
          }
          persistAutomationResult(phaseChanged, nextPatchedProject);

          const governancePhaseChanged = runAutomationRules({
            rules: automationRules,
            event: 'project.governance_phase_changed',
            currentUser,
            users,
            emailTemplates,
            project: nextPatchedProject,
            metadata: {
              projectId: nextPatchedProject.id,
              fromPhaseId: project.governance.currentPhaseId,
              toPhaseId: nextProject.governance.currentPhaseId,
              fromPhaseName,
              toPhaseName,
              workspace: nextPatchedProject.group,
            },
          });

          if (governancePhaseChanged.projectPatch) {
            nextPatchedProject = normalizeProject(
              {
                ...nextPatchedProject,
                ...governancePhaseChanged.projectPatch,
              },
              governancePhases,
              workspaceProjectStages
            );
          }
          if (governancePhaseChanged.commands.length > 0) {
            nextPatchedProject = applyAutomationCommandsToProject(
              nextPatchedProject,
              governancePhaseChanged.commands
            );
          }
          persistAutomationResult(governancePhaseChanged, nextPatchedProject);

          getProjectNotificationRecipients(nextPatchedProject)
            .filter((userId) => userId !== currentUser?.id)
            .forEach((userId) => {
              addNotification(
                createNotification({
                  userId,
                  type: 'project_phase_changed',
                  title: 'Fase do projeto alterada',
                  description: `${currentUser?.name || 'Alguém'} moveu "${nextPatchedProject.name}" de "${fromPhaseName}" para "${toPhaseName}".`,
                  entityType: 'project',
                  entityId: nextPatchedProject.id,
                  linkTo: `/governance?project=${nextPatchedProject.id}`,
                })
              );
            });
        }

        const previousWorkspaceStates = new Map(
          (project.workspaceBoardStates || []).map((state) => [normalizeWorkspaceId(state.workspaceId), state.stageId])
        );
        const nextWorkspaceStates = new Map(
          (nextPatchedProject.workspaceBoardStates || []).map((state) => [normalizeWorkspaceId(state.workspaceId), state.stageId])
        );

        nextWorkspaceStates.forEach((toWorkspaceStageId, workspaceId) => {
          const fromWorkspaceStageId = previousWorkspaceStates.get(workspaceId);
          if (fromWorkspaceStageId === toWorkspaceStageId) return;

          const workspaceStages = getWorkspaceProjectStages(workspaceId);
          const fromWorkspaceStageName =
            workspaceStages.find((stage) => String(stage.id) === String(fromWorkspaceStageId))?.name ||
            fromWorkspaceStageId ||
            '';
          const toWorkspaceStageName =
            workspaceStages.find((stage) => String(stage.id) === String(toWorkspaceStageId))?.name ||
            toWorkspaceStageId ||
            '';

          publishDomainEvent({
            name: 'project.phase_changed',
            entityType: 'project',
            entityId: nextPatchedProject.id,
            payloadJson: {
              projectId: nextPatchedProject.id,
              projectName: nextPatchedProject.name,
              phaseScope: 'workspace',
              workspaceId,
              fromWorkspaceStageId,
              toWorkspaceStageId,
            },
          });

          const workspacePhaseChanged = runAutomationRules({
            rules: automationRules,
            event: 'project.phase.changed',
            currentUser,
            users,
            emailTemplates,
            project: nextPatchedProject,
            metadata: {
              projectId: nextPatchedProject.id,
              phaseScope: 'workspace',
              workspaceId,
              workspace: workspaceId,
              fromWorkspaceStageId,
              toWorkspaceStageId,
              fromWorkspaceStageName,
              toWorkspaceStageName,
              executionCompleted: isProjectExecutionCompleted(nextPatchedProject),
            },
          });

          if (workspacePhaseChanged.projectPatch) {
            nextPatchedProject = normalizeProject(
              {
                ...nextPatchedProject,
                ...workspacePhaseChanged.projectPatch,
              },
              governancePhases,
              workspaceProjectStages
            );
          }
          if (workspacePhaseChanged.commands.length > 0) {
            nextPatchedProject = applyAutomationCommandsToProject(
              nextPatchedProject,
              workspacePhaseChanged.commands
            );
          }
          persistAutomationResult(workspacePhaseChanged, nextPatchedProject);
        });

        if (project.status !== nextProject.status) {
          const statusChanged = runAutomationRules({
            rules: automationRules,
            event: 'project.status_changed',
            currentUser,
            users,
            emailTemplates,
            project: nextPatchedProject,
            metadata: {
              projectId: nextPatchedProject.id,
              fromStatus: project.status,
              toStatus: nextProject.status,
            },
          });
          if (statusChanged.projectPatch) {
            nextPatchedProject = normalizeProject(
              {
                ...nextPatchedProject,
                ...statusChanged.projectPatch,
              },
              governancePhases,
              workspaceProjectStages
            );
          }
          if (statusChanged.commands.length > 0) {
            nextPatchedProject = applyAutomationCommandsToProject(
              nextPatchedProject,
              statusChanged.commands
            );
          }
          persistAutomationResult(statusChanged, nextPatchedProject);

          getProjectNotificationRecipients(nextPatchedProject)
            .filter((userId) => userId !== currentUser?.id)
            .forEach((userId) => {
              addNotification(
                createNotification({
                  userId,
                  type: 'project_updated',
                  title: 'Status do projeto alterado',
                  description: `${currentUser?.name || 'Alguém'} alterou o status de "${nextPatchedProject.name}" para "${nextProject.status}".`,
                  entityType: 'project',
                  entityId: nextPatchedProject.id,
                  linkTo: `/governance?project=${nextPatchedProject.id}`,
                })
              );
            });
        }

        publishDomainEvent({
          name: 'project.updated',
          entityType: 'project',
          entityId: nextPatchedProject.id,
          payloadJson: {
            projectId: nextPatchedProject.id,
            projectName: nextPatchedProject.name,
            updates,
          },
        });

        if (!isProjectInCompletedPhase(project) && isProjectInCompletedPhase(nextPatchedProject)) {
          const completed = runAutomationRules({
            rules: automationRules,
            event: 'project.completed',
            currentUser,
            users,
            emailTemplates,
            project: nextPatchedProject,
            metadata: {
              projectId: nextPatchedProject.id,
              deliveredAt: nextPatchedProject.deliveredAt,
            },
          });
          if (completed.projectPatch) {
            nextPatchedProject = normalizeProject(
              {
                ...nextPatchedProject,
                ...completed.projectPatch,
              },
              governancePhases,
              workspaceProjectStages
            );
          }
          if (completed.commands.length > 0) {
            nextPatchedProject = applyAutomationCommandsToProject(
              nextPatchedProject,
              completed.commands
            );
          }
          persistAutomationResult(completed, nextPatchedProject);
        }

        return nextPatchedProject;
      })
    );

    return true;
  };

  const addProject = (project: Project) => {
    const normalizedProject = applyProjectDeliveryTransition(
      project,
      normalizeProject(project, governancePhases, workspaceProjectStages)
    );
    const automationResult = runAutomationRules({
      rules: automationRules,
      event: 'project.created',
      currentUser,
      users,
      emailTemplates,
      project: normalizedProject,
      metadata: {
        projectId: normalizedProject.id,
      },
    });

    const nextProject = automationResult.projectPatch
      ? normalizeProject(
          {
            ...normalizedProject,
            ...automationResult.projectPatch,
          },
          governancePhases,
          workspaceProjectStages
        )
      : normalizedProject;

    persistAutomationResult(automationResult, nextProject);

    publishDomainEvent({
      name: 'project.created',
      entityType: 'project',
      entityId: nextProject.id,
      payloadJson: {
        projectId: nextProject.id,
        projectName: nextProject.name,
        governancePhaseId: nextProject.governance.currentPhaseId,
        responsible: nextProject.responsible,
      },
    });

    setProjects((prev) => [...prev, nextProject]);
  };

  const duplicateProject: ProjectContextType['duplicateProject'] = (id) => {
    const sourceProject = projects.find((project) => project.id === id);
    if (!sourceProject) return null;

    const timestamp = new Date().toISOString();
    const duplicatedProjectId = createEntityId('project');
    const taskIdMap = new Map<string, string>();
    const phaseIdMap = new Map<string, string>();
    const milestoneIdMap = new Map<string, string>();

    const duplicatedExecution = {
      ...sourceProject.execution,
      phases: getProjectExecutionPhases(sourceProject).map((phase, phaseIndex) => {
        const nextPhaseId = createEntityId('phase');
        phaseIdMap.set(phase.id, nextPhaseId);
        return {
          ...phase,
          id: nextPhaseId,
          order: phaseIndex,
          startDate: undefined,
          endDate: undefined,
          actualStartDate: undefined,
          actualEndDate: undefined,
          milestones: (phase.milestones || []).map((milestone, milestoneIndex) => {
            const nextMilestoneId = createEntityId('milestone');
            milestoneIdMap.set(milestone.id, nextMilestoneId);
            return {
              ...milestone,
              id: nextMilestoneId,
              order: milestoneIndex,
              startDate: undefined,
              endDate: undefined,
              plannedStartDate: undefined,
              plannedEndDate: undefined,
              tasks: (milestone.tasks || []).map((task, taskIndex) => {
                const duplicatedTask = duplicateTaskTree(task, nextPhaseId, nextMilestoneId);
                duplicatedTask.order = taskIndex;
                taskIdMap.set(task.id, duplicatedTask.id);
                return duplicatedTask;
              }),
            };
          }),
        };
      }),
      dependencies: (sourceProject.execution.dependencies || [])
        .map((dependency) => {
          const predecessorTaskId = taskIdMap.get(dependency.predecessorTaskId);
          const successorTaskId = taskIdMap.get(dependency.successorTaskId);
          if (!predecessorTaskId || !successorTaskId) return null;
          return {
            ...dependency,
            id: createEntityId('dependency'),
            projectId: duplicatedProjectId,
            predecessorTaskId,
            successorTaskId,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
        })
        .filter(Boolean),
      ganttDependencies: (sourceProject.execution.ganttDependencies || [])
        .map((dependency) => {
          const sourceRawId = dependency.sourceItemId.split(':')[1];
          const targetRawId = dependency.targetItemId.split(':')[1];
          const remap = (itemId: string, itemType: string) => {
            if (itemType === 'phase') return phaseIdMap.get(itemId) || itemId;
            if (itemType === 'milestone') return milestoneIdMap.get(itemId) || itemId;
            if (itemType === 'task' || itemType === 'subtask') return taskIdMap.get(itemId) || itemId;
            return itemId;
          };
          return {
            ...dependency,
            id: createEntityId('gantt-dependency'),
            projectId: duplicatedProjectId,
            sourceItemId: `${dependency.sourceItemType}:${remap(sourceRawId, dependency.sourceItemType)}`,
            targetItemId: `${dependency.targetItemType}:${remap(targetRawId, dependency.targetItemType)}`,
            createdAt: timestamp,
          };
        }),
      manualTimelineEntries: (sourceProject.execution.manualTimelineEntries || []).map(
        (entry, index) => ({
          ...entry,
          id: createEntityId('timeline'),
          projectId: duplicatedProjectId,
          startDate: entry.plannedStartDate || entry.startDate,
          endDate: entry.plannedEndDate || entry.endDate,
          plannedStartDate: entry.plannedStartDate || entry.startDate,
          actualStartDate: undefined,
          plannedEndDate: entry.plannedEndDate || entry.endDate,
          actualEndDate: undefined,
          linkedPhaseId: entry.linkedPhaseId
            ? phaseIdMap.get(entry.linkedPhaseId) || entry.linkedPhaseId
            : undefined,
          order: index,
        })
      ),
    };

    const nextProject: Project = {
      ...sourceProject,
      id: duplicatedProjectId,
      name: `${sourceProject.name} (cópia)`,
      requestDate: sourceProject.requestDate || timestamp.slice(0, 10),
      completionDate: undefined,
      deliveredAt: undefined,
      governanceOrder: undefined,
      activities: [],
      comments: [],
      attachments: sourceProject.attachments || [],
      execution: duplicatedExecution,
      governance: {
        ...sourceProject.governance,
        history: [],
      },
      metrics: {
        progress: 0,
        tasksTotal: sourceProject.metrics.tasksTotal,
        tasksCompleted: 0,
        hoursRemaining: sourceProject.metrics.hoursRemaining,
        totalTimeTracked: 0,
      },
      progress: 0,
      tasksCompleted: 0,
      totalTimeTracked: 0,
    };

    addProject(nextProject);
    return duplicatedProjectId;
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== id));
  };

  const createGovernancePhase: ProjectContextType['createGovernancePhase'] = (workspaceId) => {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const workspacePhases = getWorkspaceGovernancePhases(normalizedWorkspaceId);
    const timestamp = new Date().toISOString();
    const newPhase: GovernancePhaseDefinition = {
      id: `phase-${normalizedWorkspaceId}-${Date.now()}`,
      name: 'Nova fase',
      order: workspacePhases.length,
      workspaceId: normalizedWorkspaceId,
      color: '#E5E7EB',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const nextGovernancePhases = [...governancePhases, newPhase];
    setGovernancePhases(nextGovernancePhases);
    setProjects((prev) =>
      prev.map((project) =>
        normalizeWorkspaceId(project.group) === normalizedWorkspaceId
          ? normalizeProject(project, nextGovernancePhases, workspaceProjectStages)
          : project
      )
    );

    return newPhase;
  };

  const updateGovernancePhase: ProjectContextType['updateGovernancePhase'] = (
    workspaceId,
    phaseId,
    updates
  ) => {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const nextGovernancePhases = governancePhases.map((phase) =>
      normalizeWorkspaceId(phase.workspaceId) === normalizedWorkspaceId && phase.id === phaseId
        ? {
            ...phase,
            ...updates,
            updatedAt: new Date().toISOString(),
          }
        : phase
    );

    setGovernancePhases(nextGovernancePhases);
    setProjects((prev) =>
      prev.map((project) =>
        normalizeWorkspaceId(project.group) === normalizedWorkspaceId
          ? normalizeProject(project, nextGovernancePhases, workspaceProjectStages)
          : project
      )
    );
  };

  const reorderGovernancePhases: ProjectContextType['reorderGovernancePhases'] = (
    workspaceId,
    orderedPhaseIds
  ) => {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const workspacePhases = getWorkspaceGovernancePhases(normalizedWorkspaceId);
    const phaseMap = new Map(workspacePhases.map((phase) => [phase.id, phase]));
    const nextWorkspacePhases = orderedPhaseIds
      .map((phaseId, index) => {
        const phase = phaseMap.get(phaseId);
        if (!phase) return null;
        return {
          ...phase,
          order: index,
          updatedAt: new Date().toISOString(),
        };
      })
      .filter(Boolean) as GovernancePhaseDefinition[];

    const untouchedPhases = governancePhases.filter(
      (phase) => normalizeWorkspaceId(phase.workspaceId) !== normalizedWorkspaceId
    );
    const nextGovernancePhases = [...untouchedPhases, ...nextWorkspacePhases];

    setGovernancePhases(nextGovernancePhases);
    setProjects((prev) =>
      prev.map((project) =>
        normalizeWorkspaceId(project.group) === normalizedWorkspaceId
          ? normalizeProject(project, nextGovernancePhases, workspaceProjectStages)
          : project
      )
    );
  };

  const deleteGovernancePhase: ProjectContextType['deleteGovernancePhase'] = (
    workspaceId,
    phaseId,
    destinationPhaseId
  ) => {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const workspaceProjects = projects.filter(
      (project) => normalizeWorkspaceId(project.group) === normalizedWorkspaceId
    );
    const phaseProjects = workspaceProjects.filter(
      (project) => project.governance.currentPhaseId === phaseId
    );

    if (phaseProjects.length > 0 && !destinationPhaseId) {
      return;
    }

    const nextGovernancePhases = governancePhases
      .filter(
        (phase) =>
          !(
            normalizeWorkspaceId(phase.workspaceId) === normalizedWorkspaceId &&
            phase.id === phaseId
          )
      )
      .map((phase) => phase);

    const normalizedNextGovernancePhases = nextGovernancePhases.map((phase, index, all) => {
      if (normalizeWorkspaceId(phase.workspaceId) !== normalizedWorkspaceId) return phase;
      const workspaceIndex = all
        .filter((candidate) => normalizeWorkspaceId(candidate.workspaceId) === normalizedWorkspaceId)
        .findIndex((candidate) => candidate.id === phase.id);
      return {
        ...phase,
        order: workspaceIndex,
        updatedAt: new Date().toISOString(),
      };
    });

    setGovernancePhases(normalizedNextGovernancePhases);
    setProjects((prev) =>
      prev.map((project) => {
        if (normalizeWorkspaceId(project.group) !== normalizedWorkspaceId) {
          return project;
        }

        const nextPhaseId =
          project.governance.currentPhaseId === phaseId
            ? destinationPhaseId || project.governance.currentPhaseId
            : project.governance.currentPhaseId;

        return normalizeProject(
          {
            ...project,
            governance: {
              ...project.governance,
              currentPhaseId: nextPhaseId,
            },
          },
          normalizedNextGovernancePhases,
          workspaceProjectStages
        );
      })
    );
  };

  const createWorkspaceProjectStage: ProjectContextType['createWorkspaceProjectStage'] = (
    workspaceId
  ) => {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const workspaceStages = getWorkspaceProjectStages(normalizedWorkspaceId);
    const timestamp = new Date().toISOString();
    const newStage: WorkspaceProjectStageDefinition = {
      id: `workspace-stage-${normalizedWorkspaceId}-${Date.now()}`,
      name: 'Nova fase local',
      order: workspaceStages.length,
      workspaceId: normalizedWorkspaceId,
      color: '#E5E7EB',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const nextWorkspaceProjectStages = [...workspaceProjectStages, newStage];
    setWorkspaceProjectStages(nextWorkspaceProjectStages);
    setProjects((prev) =>
      prev.map((project) =>
        normalizeProject(project, governancePhases, nextWorkspaceProjectStages)
      )
    );

    return newStage;
  };

  const updateWorkspaceProjectStage: ProjectContextType['updateWorkspaceProjectStage'] = (
    workspaceId,
    stageId,
    updates
  ) => {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const nextWorkspaceProjectStages = workspaceProjectStages.map((stage) =>
      normalizeWorkspaceId(stage.workspaceId) === normalizedWorkspaceId && stage.id === stageId
        ? {
            ...stage,
            ...updates,
            updatedAt: new Date().toISOString(),
          }
        : stage
    );

    setWorkspaceProjectStages(nextWorkspaceProjectStages);
    setProjects((prev) =>
      prev.map((project) =>
        normalizeProject(project, governancePhases, nextWorkspaceProjectStages)
      )
    );
  };

  const reorderWorkspaceProjectStages: ProjectContextType['reorderWorkspaceProjectStages'] = (
    workspaceId,
    orderedStageIds
  ) => {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const workspaceStages = getWorkspaceProjectStages(normalizedWorkspaceId);
    const stageMap = new Map(workspaceStages.map((stage) => [stage.id, stage]));
    const nextWorkspaceStages = orderedStageIds
      .map((stageId, index) => {
        const stage = stageMap.get(stageId);
        if (!stage) return null;
        return {
          ...stage,
          order: index,
          updatedAt: new Date().toISOString(),
        };
      })
      .filter(Boolean) as WorkspaceProjectStageDefinition[];

    const untouchedStages = workspaceProjectStages.filter(
      (stage) => normalizeWorkspaceId(stage.workspaceId) !== normalizedWorkspaceId
    );
    const nextWorkspaceProjectStages = [...untouchedStages, ...nextWorkspaceStages];

    setWorkspaceProjectStages(nextWorkspaceProjectStages);
    setProjects((prev) =>
      prev.map((project) =>
        normalizeProject(project, governancePhases, nextWorkspaceProjectStages)
      )
    );
  };

  const deleteWorkspaceProjectStage: ProjectContextType['deleteWorkspaceProjectStage'] = (
    workspaceId,
    stageId,
    destinationStageId
  ) => {
    const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
    const workspaceStatesInUse = projects.filter((project) =>
      project.workspaceBoardStates?.some(
        (state) =>
          normalizeWorkspaceId(state.workspaceId) === normalizedWorkspaceId &&
          state.stageId === stageId
      )
    );

    if (workspaceStatesInUse.length > 0 && !destinationStageId) {
      return;
    }

    const nextWorkspaceProjectStages = workspaceProjectStages
      .filter(
        (stage) =>
          !(
            normalizeWorkspaceId(stage.workspaceId) === normalizedWorkspaceId &&
            stage.id === stageId
          )
      )
      .map((stage) => stage);

    const normalizedNextWorkspaceProjectStages = nextWorkspaceProjectStages.map((stage, index, all) => {
      if (normalizeWorkspaceId(stage.workspaceId) !== normalizedWorkspaceId) return stage;
      const workspaceIndex = all
        .filter((candidate) => normalizeWorkspaceId(candidate.workspaceId) === normalizedWorkspaceId)
        .findIndex((candidate) => candidate.id === stage.id);
      return {
        ...stage,
        order: workspaceIndex,
        updatedAt: new Date().toISOString(),
      };
    });

    setWorkspaceProjectStages(normalizedNextWorkspaceProjectStages);
    setProjects((prev) =>
      prev.map((project) =>
        normalizeProject(
          {
            ...project,
            workspaceBoardStates: (project.workspaceBoardStates || []).map((state) =>
              normalizeWorkspaceId(state.workspaceId) === normalizedWorkspaceId &&
              state.stageId === stageId
                ? {
                    ...state,
                    stageId: destinationStageId || state.stageId,
                    updatedAt: new Date().toISOString(),
                  }
                : state
            ),
          },
          governancePhases,
          normalizedNextWorkspaceProjectStages
        )
      )
    );
  };

  const addProjectComment: ProjectContextType['addProjectComment'] = (projectId, comment) => {
    const project = projects.find((candidate) => candidate.id === projectId);
    if (!project) return false;
    const mentionedUsers = extractMentionedUsers(comment.content, users, comment.userId);
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id !== projectId) return project;

        return normalizeProject(
          {
            ...project,
            comments: [
              ...(project.comments || []),
              {
                id: comment.id || `project-comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                projectId,
                userId: comment.userId,
                userName: comment.userName,
                content: comment.content,
                timestamp: comment.timestamp || new Date().toISOString(),
                subtype: comment.subtype || (comment.attachments?.length ? 'attachment' : 'comment'),
                highlightFocus: Boolean(comment.highlightFocus),
                entityType: 'project',
                entityId: projectId,
                attachments: comment.attachments || [],
                updatedAt: undefined,
                deletedAt: undefined,
              },
            ],
          },
          governancePhases,
          workspaceProjectStages
        );
      })
    );

    getProjectNotificationRecipients(project)
      .filter((userId) => userId !== comment.userId)
      .forEach((userId) => {
        addNotification(
          createNotification({
            userId,
            type: 'comment_added',
            title: 'Novo comentário em projeto',
            description: `${comment.userName} comentou em "${project.name}".`,
            entityType: 'project',
            entityId: projectId,
            linkTo: `/governance?project=${projectId}`,
          })
        );
      });

    mentionedUsers.forEach((user) => {
      addNotification(
        createNotification({
          userId: user.id,
          type: 'mention',
          title: 'Você foi mencionado',
          description: `${comment.userName} mencionou você em "${project.name}".`,
          entityType: 'project',
          entityId: projectId,
          linkTo: `/governance?project=${projectId}`,
        })
      );
    });

    return true;
  };

  const canManageProjectComment = (comment: ProjectComment) =>
    currentUser?.role === 'admin' ||
    currentUser?.role === 'pmo' ||
    currentUser?.id === comment.userId;

  const updateProjectComment: ProjectContextType['updateProjectComment'] = (
    projectId,
    commentId,
    content
  ) => {
    const project = projects.find((candidate) => candidate.id === projectId);
    const comment = project?.comments?.find((item) => item.id === commentId && !item.deletedAt);
    if (!project || !comment || !content.trim() || !canManageProjectComment(comment)) return false;

    setProjects((prev) =>
      prev.map((candidate) => {
        if (candidate.id !== projectId) return candidate;

        return normalizeProject(
          {
            ...candidate,
            comments: (candidate.comments || []).map((item) =>
              item.id === commentId
                ? {
                    ...item,
                    content: content.trim(),
                    updatedAt: new Date().toISOString(),
                  }
                : item
            ),
            activities: [
              ...(candidate.activities || []),
              {
                id: `project-activity-comment-edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                timestamp: new Date().toISOString(),
                user: currentUser?.name || comment.userName || 'Sistema',
                action: 'editou uma observação',
                details: candidate.name,
                entityType: 'comment',
                entityId: commentId,
                metadata: {
                  recordType: 'comment_edit',
                },
              },
            ],
          },
          governancePhases,
          workspaceProjectStages
        );
      })
    );

    return true;
  };

  const deleteProjectComment: ProjectContextType['deleteProjectComment'] = (
    projectId,
    commentId
  ) => {
    const project = projects.find((candidate) => candidate.id === projectId);
    const comment = project?.comments?.find((item) => item.id === commentId && !item.deletedAt);
    if (!project || !comment || !canManageProjectComment(comment)) return false;

    setProjects((prev) =>
      prev.map((candidate) => {
        if (candidate.id !== projectId) return candidate;

        return normalizeProject(
          {
            ...candidate,
            comments: (candidate.comments || []).map((item) =>
              item.id === commentId
                ? {
                    ...item,
                    deletedAt: new Date().toISOString(),
                  }
                : item
            ),
            activities: [
              ...(candidate.activities || []),
              {
                id: `project-activity-comment-delete-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                timestamp: new Date().toISOString(),
                user: currentUser?.name || comment.userName || 'Sistema',
                action: 'removeu uma observação',
                details: candidate.name,
                entityType: 'comment',
                entityId: commentId,
                metadata: {
                  recordType: 'comment_delete',
                },
              },
            ],
          },
          governancePhases,
          workspaceProjectStages
        );
      })
    );

    return true;
  };

  return (
    <ProjectContext.Provider
      value={{
        projects: resolvedProjects,
        governancePhases,
        workspaceProjectStages,
        setProjects,
        filters,
        setFilters,
        updateProject,
        addProject,
        duplicateProject,
        deleteProject,
        getWorkspaceGovernancePhases,
        createGovernancePhase,
        updateGovernancePhase,
        reorderGovernancePhases,
        deleteGovernancePhase,
        getWorkspaceProjectStages,
        createWorkspaceProjectStage,
        ensureWorkspaceDefinitions,
        updateWorkspaceProjectStage,
        reorderWorkspaceProjectStages,
        deleteWorkspaceProjectStage,
        addProjectComment,
        updateProjectComment,
        deleteProjectComment,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within ProjectProvider');
  }
  return context;
}
