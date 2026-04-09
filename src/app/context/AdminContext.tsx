import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  AutomationExecution,
  AutomationRule,
  AuthEmailMessage,
  AuthSession,
  Client,
  CostSettings,
  DemandTypeEntity,
  EmailTemplate,
  Notification,
  OperationalPriorityEntry,
  PasswordTokenPurpose,
  PriorityCycle,
  Product,
  ProjectPurposeEntity,
  ProjectType,
  Skill,
  Sprint,
  Stakeholder,
  System,
  Tag,
  TaskTemplate,
  TaskTypeEntity,
  Team,
  User,
  UserFavoriteEntity,
  UserFavoriteTag,
} from '../types';
import {
  isDuplicateNotification,
  normalizeNotification,
  sortNotificationsByDate,
} from '../utils/notifications';
import { normalizePriorityCycle } from '../utils/priorityCycles';
import { generatePlainToken, generateSession, hashPassword, hashToken, verifyPassword } from '../utils/auth';
import { buildPasswordActionPath, createAuthEmailMessage } from '../utils/email';
import { getPrimaryUserTeam, getUserTeams } from '../utils/userTeams';

interface AdminContextType {
  currentUser?: User;
  currentUserId: string;
  authSession: AuthSession | null;
  isAuthenticated: boolean;
  authReady: boolean;
  users: User[];
  teams: Team[];
  clients: Client[];
  stakeholders: Stakeholder[];
  products: Product[];
  systems: System[];
  skills: Skill[];
  taskTypes: TaskTypeEntity[];
  tags: Tag[];
  favoriteTags: UserFavoriteTag[];
  entityFavorites: UserFavoriteEntity[];
  projectTypes: ProjectType[];
  demandTypes: DemandTypeEntity[];
  projectPurposes: ProjectPurposeEntity[];
  taskTemplates: TaskTemplate[];
  emailTemplates: EmailTemplate[];
  notifications: Notification[];
  automationRules: AutomationRule[];
  automationExecutions: AutomationExecution[];
  operationalPriorityEntries: OperationalPriorityEntry[];
  priorityCycles: PriorityCycle[];
  sprints: Sprint[];
  emailOutbox: AuthEmailMessage[];
  costSettings: CostSettings;
  setCurrentUserId: (id: string) => void;
  login: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  requestPasswordReset: (
    email: string,
    purpose?: PasswordTokenPurpose
  ) => Promise<{ ok: boolean; message: string; previewUrl?: string }>;
  consumePasswordToken: (
    token: string,
    nextPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;
  issuePasswordSetupLink: (
    userId: string
  ) => Promise<{ ok: boolean; error?: string; previewUrl?: string }>;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addTeam: (team: Team) => void;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  addClient: (client: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addStakeholder: (stakeholder: Stakeholder) => void;
  updateStakeholder: (id: string, updates: Partial<Stakeholder>) => void;
  deleteStakeholder: (id: string) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addSystem: (system: System) => void;
  updateSystem: (id: string, updates: Partial<System>) => void;
  deleteSystem: (id: string) => void;
  addSkill: (skill: Skill) => void;
  updateSkill: (id: string, updates: Partial<Skill>) => void;
  deleteSkill: (id: string) => void;
  addTaskType: (taskType: TaskTypeEntity) => void;
  updateTaskType: (id: string, updates: Partial<TaskTypeEntity>) => void;
  deleteTaskType: (id: string) => void;
  ensureTag: (name: string, scope?: Tag['scope'], workspaceId?: string) => Tag | null;
  toggleFavoriteTag: (tagId: string) => void;
  isFavoriteTag: (tagId: string) => boolean;
  toggleFavoriteEntity: (entityType: UserFavoriteEntity['entityType'], entityId: string) => void;
  isFavoriteEntity: (entityType: UserFavoriteEntity['entityType'], entityId: string) => boolean;
  getFavoriteEntityIds: (entityType: UserFavoriteEntity['entityType']) => string[];
  addProjectType: (projectType: ProjectType) => void;
  updateProjectType: (id: string, updates: Partial<ProjectType>) => void;
  deleteProjectType: (id: string) => void;
  addDemandType: (demandType: DemandTypeEntity) => void;
  updateDemandType: (id: string, updates: Partial<DemandTypeEntity>) => void;
  deleteDemandType: (id: string) => void;
  addProjectPurpose: (projectPurpose: ProjectPurposeEntity) => void;
  updateProjectPurpose: (id: string, updates: Partial<ProjectPurposeEntity>) => void;
  deleteProjectPurpose: (id: string) => void;
  addTaskTemplate: (taskTemplate: TaskTemplate) => void;
  updateTaskTemplate: (id: string, updates: Partial<TaskTemplate>) => void;
  deleteTaskTemplate: (id: string) => void;
  addEmailTemplate: (template: EmailTemplate) => void;
  updateEmailTemplate: (id: string, updates: Partial<EmailTemplate>) => void;
  deleteEmailTemplate: (id: string) => void;
  sendEmailMessage: (message: Omit<AuthEmailMessage, 'id' | 'createdAt'>) => AuthEmailMessage;
  addNotification: (notification: Notification) => void;
  markNotificationAsRead: (id: string) => void;
  addAutomationRule: (rule: AutomationRule) => void;
  updateAutomationRule: (id: string, updates: Partial<AutomationRule>) => void;
  deleteAutomationRule: (id: string) => void;
  toggleAutomationRule: (id: string) => void;
  recordAutomationExecutions: (executions: AutomationExecution[]) => void;
  addOperationalPriorityEntry: (
    entry: Omit<OperationalPriorityEntry, 'id' | 'createdAt' | 'updatedAt'>
  ) => string;
  updateOperationalPriorityEntry: (
    id: string,
    updates: Partial<OperationalPriorityEntry>
  ) => void;
  deleteOperationalPriorityEntry: (id: string) => void;
  reorderOperationalPriorityEntries: (
    assigneeId: string,
    orderedEntryIds: string[],
    segment?: Partial<Pick<OperationalPriorityEntry, 'lane' | 'flowId' | 'itemType'>>
  ) => void;
  addPriorityCycle: (
    cycle: Omit<PriorityCycle, 'id' | 'createdAt' | 'updatedAt'>
  ) => string;
  updatePriorityCycle: (id: string, updates: Partial<PriorityCycle>) => void;
  deletePriorityCycle: (id: string) => void;
  setPriorityCycleActive: (id: string, active: boolean) => void;
  addSprint: (sprint: Omit<Sprint, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateSprint: (id: string, updates: Partial<Sprint>) => void;
  deleteSprint: (id: string) => void;
  updateCostSettings: (updates: Partial<CostSettings>) => void;
}

interface AdminStorageData {
  currentUserId: string;
  users: User[];
  teams: Team[];
  clients: Client[];
  stakeholders: Stakeholder[];
  products: Product[];
  systems: System[];
  skills: Skill[];
  taskTypes: TaskTypeEntity[];
  tags: Tag[];
  favoriteTags: UserFavoriteTag[];
  entityFavorites: UserFavoriteEntity[];
  projectTypes: ProjectType[];
  demandTypes: DemandTypeEntity[];
  projectPurposes: ProjectPurposeEntity[];
  taskTemplates: TaskTemplate[];
  emailTemplates: EmailTemplate[];
  notifications: Notification[];
  automationRules: AutomationRule[];
  automationExecutions: AutomationExecution[];
  operationalPriorityEntries: OperationalPriorityEntry[];
  priorityCycles: PriorityCycle[];
  sprints: Sprint[];
  emailOutbox: AuthEmailMessage[];
  costSettings: CostSettings;
}

interface StorageEnvelope<T> {
  version: number;
  data: T;
}

const STORAGE_KEY = 'crisdu_admin_data';
const SESSION_STORAGE_KEY = 'crisdu_auth_session';
const STORAGE_VERSION = 4;

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const matchesPrioritySegment = (
  entry: OperationalPriorityEntry,
  assigneeId: string,
  segment?: Partial<Pick<OperationalPriorityEntry, 'lane' | 'flowId' | 'itemType'>>
) => {
  const lane = entry.lane || 'default';
  if (entry.assigneeId !== assigneeId) return false;
  if (segment?.lane && lane !== segment.lane) return false;
  if (segment?.itemType && entry.itemType !== segment.itemType) return false;
  if ((segment?.lane || lane) === 'flow' && (entry.flowId || 'flow:unassigned') !== (segment?.flowId || 'flow:unassigned')) {
    return false;
  }
  return true;
};

const initialUsers: User[] = [
  {
    id: '1',
    name: 'Guilherme Drehmer',
    email: 'guilherme@pmo.com',
    team: 'Fábrica',
    teams: ['Fábrica'],
    cargo: 'Coordenador',
    costPerHour: 95,
    role: 'admin',
    status: 'active',
    passwordHash:
      'pbkdf2$100000$E+nchPjdLYMR7l3jkdFWnw==$QoHBADSROLl1ZU7XlxNePmXuNmpY2SqBRMapRhlhp8o=',
    passwordSetAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'João Silva',
    email: 'joao@pmo.com',
    team: 'AIO',
    teams: ['AIO'],
    cargo: 'Analista de Projetos',
    salaryMonthly: 9600,
    role: 'pmo',
    status: 'active',
    passwordHash:
      'pbkdf2$100000$QR2QHhMgng6MuJh6lYf3/w==$JOEIx/WPRijM6IqPprNKlrgQQbh/5IISR63Zex17H2A=',
    passwordSetAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Maria Santos',
    email: 'maria@pmo.com',
    team: 'Fábrica',
    teams: ['Fábrica'],
    cargo: 'Desenvolvedora Frontend',
    salaryMonthly: 12800,
    role: 'user',
    status: 'active',
    passwordHash:
      'pbkdf2$100000$lr8mwAvl3lRvoXSkQSSG+A==$+aivgSalU/vp2Zez+BDt3S8JWHpEWxzz06LLN26O76A=',
    passwordSetAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

const initialTeams: Team[] = [
  {
    id: '1',
    name: 'Fábrica',
    description: 'Equipe de desenvolvimento de software',
    members: ['1', '3'],
    color: '#3B82F6',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'AIO',
    description: 'Equipe de análise e inovação',
    members: ['2'],
    color: '#8B5CF6',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Infra',
    description: 'Equipe de infraestrutura',
    members: [],
    color: '#10B981',
    createdAt: new Date().toISOString(),
  },
];

const initialClients: Client[] = [
  {
    id: '1',
    name: 'Grupo Crisdu',
    contactName: 'Carlos Eduardo',
    contactEmail: 'carlos@crisdu.com',
    contactPhone: '+55 11 98765-4321',
    linkedProjects: ['95662', '95663'],
    createdAt: new Date().toISOString(),
  },
];

const initialStakeholders: Stakeholder[] = [
  {
    id: '1',
    name: 'Ana Paula',
    role: 'Product Owner',
    email: 'ana@stakeholder.com',
    phone: '+55 11 99999-8888',
    linkedProjects: ['95662'],
    createdAt: new Date().toISOString(),
  },
];

const initialProducts: Product[] = [
  {
    id: '1',
    name: 'Vendas Plus',
    type: 'Sistema Web',
    description: 'Plataforma de vendas online',
    linkedProjects: ['95662'],
    createdAt: new Date().toISOString(),
  },
];

const initialSystems: System[] = [
  {
    id: '1',
    name: 'ERP Principal',
    integrations: ['SAP', 'Salesforce'],
    description: 'Sistema integrado de gestão empresarial',
    createdAt: new Date().toISOString(),
  },
];

const initialSkills: Skill[] = [
  {
    id: 'skill-credit-analysis',
    name: 'Análise de crédito',
    description:
      'Capacidade de consolidar dados, aplicar regras e suportar decisões de crédito com velocidade e rastreabilidade.',
    area: 'Crédito',
    ownerId: '2',
    status: 'active',
    maturityLevel: 'Padronizada',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'skill-system-integration',
    name: 'Integração de sistemas',
    description:
      'Capacidade de orquestrar integrações entre sistemas internos e parceiros externos com confiabilidade operacional.',
    area: 'TI',
    ownerId: '1',
    status: 'active',
    maturityLevel: 'Em evolução',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'skill-client-onboarding',
    name: 'Onboarding de cliente',
    description:
      'Capacidade de ativar novos clientes com playbooks, automações e acompanhamento operacional até a entrada em produção.',
    area: 'Comercial',
    ownerId: '3',
    status: 'active',
    maturityLevel: 'Escalando',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const initialTaskTypes: TaskTypeEntity[] = [
  { id: 'task-type-analysis', name: 'Análise', color: '#2563EB', createdAt: new Date().toISOString() },
  { id: 'task-type-planning', name: 'Planejamento', color: '#7C3AED', createdAt: new Date().toISOString() },
  { id: 'task-type-development', name: 'Desenvolvimento', color: '#059669', createdAt: new Date().toISOString() },
  { id: 'task-type-qa', name: 'Qualidade', color: '#F97316', createdAt: new Date().toISOString() },
  { id: 'task-type-communication', name: 'Comunicação', color: '#DC2626', createdAt: new Date().toISOString() },
];

const initialSprints: Sprint[] = [
  {
    id: 'sprint-seed-86',
    name: 'Sprint 86',
    startDate: '2026-03-23',
    endDate: '2026-04-03',
    status: 'active',
    teamId: '1',
    goal: 'Consolidar a operação da equipe Fábrica.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const initialCostSettings: CostSettings = {
  defaultInternalHourRate: 35,
  defaultExternalHourRate: 250,
  monthlyHoursStandard: 160,
  updatedAt: new Date().toISOString(),
};

const initialTags: Tag[] = [
  {
    id: 'tag-operacional',
    name: 'Operacional',
    normalizedName: 'operacional',
    scope: 'both',
    createdBy: initialUsers[0].id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const initialFavoriteTags: UserFavoriteTag[] = [
  {
    userId: initialUsers[0].id,
    tagId: 'tag-operacional',
    createdAt: new Date().toISOString(),
  },
];

const initialEntityFavorites: UserFavoriteEntity[] = [];

const initialProjectTypes: ProjectType[] = [
  {
    id: '1',
    name: 'Sistema Web',
    description: 'Projetos de desenvolvimento de sistemas web',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'App Mobile',
    description: 'Projetos de desenvolvimento mobile',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Integração',
    description: 'Projetos de integração entre sistemas',
    createdAt: new Date().toISOString(),
  },
];

const initialDemandTypes: DemandTypeEntity[] = [
  {
    id: '1',
    name: 'Manutenção Corretiva',
    value: 'suporte',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Novo Projeto',
    value: 'projeto',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Melhoria Contínua',
    value: 'melhoria',
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Evolução de Sistema',
    value: 'evolucao',
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'POC e Experimentação',
    value: 'experimentacao',
    createdAt: new Date().toISOString(),
  },
];

const initialProjectPurposes: ProjectPurposeEntity[] = [
  { id: '1', name: 'Expansão', value: 'expansao', createdAt: new Date().toISOString() },
  { id: '2', name: 'Suporte', value: 'suporte', createdAt: new Date().toISOString() },
  { id: '3', name: 'Inovação', value: 'inovacao', createdAt: new Date().toISOString() },
  { id: '4', name: 'Segurança', value: 'seguranca', createdAt: new Date().toISOString() },
  { id: '5', name: 'Operacional', value: 'operacional', createdAt: new Date().toISOString() },
  { id: '6', name: 'Estratégico', value: 'estrategico', createdAt: new Date().toISOString() },
];

const initialTaskTemplates: TaskTemplate[] = [
  {
    id: 'task-template-onboarding',
    name: 'Kickoff de execução',
    description: 'Pacote inicial de tarefas para iniciar a execução do projeto.',
    isActive: true,
    eapTemplateId: 'eap-tpl-fábrica',
    items: [
      {
        id: 'task-template-onboarding-1',
        title: 'Planejar kickoff operacional',
        description: 'Organizar kickoff interno da execução.',
        priority: 'medium',
        taskTypeId: 'task-type-planning',
        teamId: '1',
        targetPhaseName: 'Fase 1: Análise',
        targetPhaseId: 'phase-analise-001',
        subtasks: [
          {
            id: 'task-template-onboarding-1-1',
            title: 'Alinhar responsáveis',
            taskTypeId: 'task-type-communication',
          },
          {
            id: 'task-template-onboarding-1-2',
            title: 'Definir próximos passos',
            taskTypeId: 'task-type-planning',
          },
        ],
      },
      {
        id: 'task-template-onboarding-2',
        title: 'Preparar backlog técnico inicial',
        priority: 'high',
        taskTypeId: 'task-type-development',
        teamId: '1',
        targetPhaseName: 'Fase 2: Desenvolvimento',
        targetPhaseId: 'phase-dev-001',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_EMAIL_TEMPLATE_VARIABLES = [
  'project_name',
  'responsavel',
  'cliente',
  'fase_atual',
  'data_prevista',
  'link_projeto',
  'solicitante',
  'equipe',
];

const initialEmailTemplates: EmailTemplate[] = [
  {
    id: 'email-template-construction-start',
    nome: 'Entrada em Construção',
    assunto: 'Projeto {{project_name}} entrou em Construção',
    corpo_html:
      '<p>Olá,</p><p>O projeto <strong>{{project_name}}</strong> entrou na fase <strong>{{fase_atual}}</strong>.</p><p>Responsável: {{responsavel}}<br/>Cliente: {{cliente}}<br/>Previsão: {{data_prevista}}</p><p><a href="{{link_projeto}}">Abrir projeto</a></p>',
    variaveis_disponiveis: DEFAULT_EMAIL_TEMPLATE_VARIABLES,
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'email-template-project-finished',
    nome: 'Conclusão do Projeto',
    assunto: 'Projeto {{project_name}} concluído',
    corpo_html:
      '<p>Olá,</p><p>O projeto <strong>{{project_name}}</strong> foi concluído.</p><p>Cliente: {{cliente}}<br/>Responsável: {{responsavel}}</p><p><a href="{{link_projeto}}">Ver detalhes</a></p>',
    variaveis_disponiveis: DEFAULT_EMAIL_TEMPLATE_VARIABLES,
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const initialNotifications: Notification[] = [
  {
    id: '1',
    userId: '1',
    type: 'task_assigned',
    title: 'Nova tarefa atribuída',
    description: 'Você foi atribuído à tarefa "Implementar autenticação".',
    entityType: 'task',
    entityId: 'seed-task-auth',
    isRead: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    linkTo: '/my-tasks',
  },
  {
    id: '2',
    userId: '1',
    type: 'deadline_approaching',
    title: 'Prazo se aproximando',
    description: 'A tarefa "Documentação API" vence amanhã.',
    entityType: 'task',
    entityId: 'seed-task-api-docs',
    isRead: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    linkTo: '/my-tasks',
  },
  {
    id: '3',
    userId: '1',
    type: 'comment_added',
    title: 'Novo comentário',
    description: 'João Silva comentou na tarefa "Revisão de código".',
    entityType: 'task',
    entityId: 'seed-task-code-review',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    linkTo: '/my-tasks',
  },
];

const initialAutomationRules: AutomationRule[] = [
  {
    id: 'automation-governance-to-execution-backlog',
    name: 'Governança -> backlog da equipe responsável',
    description:
      'Quando o projeto entra em Execução na governança, posiciona o mesmo projeto no backlog da equipe responsável.',
    event: 'project.phase.changed',
    triggerType: 'project.phase.changed',
    isActive: true,
    conditions: [
      {
        id: 'automation-governance-to-execution-backlog-condition-1',
        field: 'metadata.phaseScope',
        operator: 'equals',
        value: 'governance',
      },
      {
        id: 'automation-governance-to-execution-backlog-condition-2',
        field: 'metadata.toPhaseName',
        operator: 'contains',
        value: 'Execução',
      },
      {
        id: 'automation-governance-to-execution-backlog-condition-3',
        field: 'project.group',
        operator: 'in',
        value: 'Fábrica,AIO,Infra',
      },
    ],
    action: { type: 'append_project_activity', title: 'Projeto liberado para execução', details: 'Automação executada para disponibilizar {{project.name}} no backlog operacional.' },
    actions: [
      {
        type: 'move_project_to_workspace_stage',
        targetStageName: 'Backlog',
      },
      {
        type: 'append_project_activity',
        title: 'Projeto liberado para execução',
        details: 'Automação executada para disponibilizar {{project.name}} no backlog operacional.',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'automation-execution-to-governance-completed',
    name: 'Execução concluída -> governança concluída',
    description:
      'Quando a execução do projeto atinge conclusão, move o mesmo projeto para Concluído na governança.',
    event: 'project.phase.changed',
    isActive: true,
    conditions: [
      {
        id: 'automation-execution-to-governance-completed-condition-1',
        field: 'metadata.phaseScope',
        operator: 'equals',
        value: 'workspace',
      },
      {
        id: 'automation-execution-to-governance-completed-condition-2',
        field: 'metadata.executionCompleted',
        operator: 'equals',
        value: 'true',
      },
    ],
    action: { type: 'move_project_governance_phase', targetPhaseName: 'Concluído' },
    actions: [
      {
        type: 'move_project_governance_phase',
        targetPhaseName: 'Concluído',
      },
      {
        type: 'append_project_activity',
        title: 'Execução concluída automaticamente',
        details: 'A execução do projeto foi finalizada e a governança foi atualizada para concluído.',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const normalizeAutomationRule = (rule: Partial<AutomationRule> | undefined): AutomationRule | null => {
  if (!rule?.id || !rule?.name || !rule?.event) return null;

  const fallbackAction =
    rule.action ||
    rule.actions?.[0] ||
    ({
      type: 'append_project_activity',
      title: 'Automação reidratada',
      details: 'Regra restaurada automaticamente após normalização de dados.',
    } satisfies AutomationRule['action']);

  if (!fallbackAction?.type) return null;

  return {
    id: rule.id,
    name: rule.name,
    description: rule.description || undefined,
    event: rule.event,
    triggerType: rule.triggerType || rule.event,
    isActive: rule.isActive ?? true,
    conditions: Array.isArray(rule.conditions) ? rule.conditions : [],
    action: fallbackAction,
    actions: Array.isArray(rule.actions) && rule.actions.length > 0 ? rule.actions : [fallbackAction],
    createdAt: rule.createdAt || new Date().toISOString(),
    updatedAt: rule.updatedAt || new Date().toISOString(),
  };
};

const mergeAutomationRules = (storedRules?: AutomationRule[]) => {
  const normalizedStoredRules = (storedRules || [])
    .map((rule) => normalizeAutomationRule(rule))
    .filter((rule): rule is AutomationRule => Boolean(rule));

  return [
    ...normalizedStoredRules,
    ...initialAutomationRules.filter(
      (rule) => !normalizedStoredRules.some((storedRule) => storedRule.id === rule.id)
    ),
  ];
};

const initialAdminData: AdminStorageData = {
  currentUserId: initialUsers[0].id,
  users: initialUsers,
  teams: initialTeams,
  clients: initialClients,
  stakeholders: initialStakeholders,
  products: initialProducts,
  systems: initialSystems,
  skills: initialSkills,
  taskTypes: initialTaskTypes,
  tags: initialTags,
  favoriteTags: initialFavoriteTags,
  entityFavorites: initialEntityFavorites,
  projectTypes: initialProjectTypes,
  demandTypes: initialDemandTypes,
  projectPurposes: initialProjectPurposes,
  taskTemplates: initialTaskTemplates,
  emailTemplates: initialEmailTemplates,
  notifications: initialNotifications,
  automationRules: initialAutomationRules,
  automationExecutions: [],
  operationalPriorityEntries: [],
  priorityCycles: [],
  sprints: initialSprints,
  emailOutbox: [],
  costSettings: initialCostSettings,
};

const normalizeUsers = (users: User[]): User[] =>
  users.map((user) =>
    ({
      ...user,
      teams: getUserTeams(user),
      team: getPrimaryUserTeam(user),
      role: user.id === '2' || user.name === 'João Silva' ? 'pmo' : user.role,
      status: user.id === '2' || user.name === 'João Silva' ? 'active' : user.status,
      mustSetPassword: user.mustSetPassword ?? !user.passwordHash,
    })
  );

const syncTeamMembership = (teams: Team[], users: User[]) =>
  teams.map((team) => ({
    ...team,
    members: users
      .filter((user) => getUserTeams(user).includes(team.name))
      .map((user) => user.id),
  }));

const getInitialAdminData = (): AdminStorageData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object' && 'data' in parsed) {
        const nextData = {
          ...initialAdminData,
          ...(parsed as StorageEnvelope<AdminStorageData>).data,
        };
        return {
          ...nextData,
          skills: [
            ...(nextData.skills || []),
            ...initialSkills.filter(
              (skill) => !(nextData.skills || []).some((storedSkill) => storedSkill.id === skill.id)
            ),
          ],
          taskTypes: nextData.taskTypes || initialTaskTypes,
          emailTemplates: nextData.emailTemplates || initialEmailTemplates,
          users: normalizeUsers(nextData.users || initialUsers),
          automationRules: mergeAutomationRules(nextData.automationRules),
          priorityCycles: (nextData.priorityCycles || []).map(normalizePriorityCycle),
          notifications: sortNotificationsByDate(
            (nextData.notifications || initialNotifications).map(normalizeNotification)
          ),
        };
      }
      const nextData = {
        ...initialAdminData,
        ...(parsed as Partial<AdminStorageData>),
      };
      return {
        ...nextData,
        skills: [
          ...(nextData.skills || []),
          ...initialSkills.filter(
            (skill) => !(nextData.skills || []).some((storedSkill) => storedSkill.id === skill.id)
          ),
        ],
        taskTypes: nextData.taskTypes || initialTaskTypes,
        emailTemplates: nextData.emailTemplates || initialEmailTemplates,
        users: normalizeUsers(nextData.users || initialUsers),
        automationRules: mergeAutomationRules(nextData.automationRules),
        priorityCycles: (nextData.priorityCycles || []).map(normalizePriorityCycle),
        notifications: sortNotificationsByDate(
          (nextData.notifications || initialNotifications).map(normalizeNotification)
        ),
      };
    }
  } catch (error) {
    console.warn('[AdminContext] Erro ao ler localStorage, usando seeds:', error);
  }

  return {
    ...initialAdminData,
    skills: initialAdminData.skills,
    taskTypes: initialAdminData.taskTypes,
    emailTemplates: initialAdminData.emailTemplates,
    users: normalizeUsers(initialAdminData.users),
    automationRules: mergeAutomationRules(initialAutomationRules),
    priorityCycles: initialAdminData.priorityCycles.map(normalizePriorityCycle),
    notifications: sortNotificationsByDate(
      initialAdminData.notifications.map(normalizeNotification)
    ),
  };
};

const getInitialAuthSession = (): AuthSession | null => {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as AuthSession | null;
    if (!parsed || typeof parsed !== 'object' || !parsed.userId || !parsed.sessionToken) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn('[AdminContext] Erro ao restaurar sessão autenticada:', error);
    return null;
  }
};

export function AdminProvider({ children }: { children: ReactNode }) {
  const initial = getInitialAdminData();
  const initialSession = getInitialAuthSession();
  const [authSession, setAuthSession] = useState<AuthSession | null>(initialSession);
  const [users, setUsers] = useState<User[]>(initial.users);
  const [teams, setTeams] = useState<Team[]>(initial.teams);
  const [clients, setClients] = useState<Client[]>(initial.clients);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>(initial.stakeholders);
  const [products, setProducts] = useState<Product[]>(initial.products);
  const [systems, setSystems] = useState<System[]>(initial.systems);
  const [skills, setSkills] = useState<Skill[]>(initial.skills || []);
  const [taskTypes, setTaskTypes] = useState<TaskTypeEntity[]>(initial.taskTypes || []);
  const [tags, setTags] = useState<Tag[]>(initial.tags || []);
  const [favoriteTags, setFavoriteTags] = useState<UserFavoriteTag[]>(
    initial.favoriteTags || []
  );
  const [entityFavorites, setEntityFavorites] = useState<UserFavoriteEntity[]>(
    initial.entityFavorites || []
  );
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>(initial.projectTypes);
  const [demandTypes, setDemandTypes] = useState<DemandTypeEntity[]>(initial.demandTypes);
  const [projectPurposes, setProjectPurposes] = useState<ProjectPurposeEntity[]>(
    initial.projectPurposes
  );
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>(initial.taskTemplates);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(
    initial.emailTemplates || []
  );
  const [notifications, setNotifications] = useState<Notification[]>(initial.notifications);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(
    initial.automationRules
  );
  const [automationExecutions, setAutomationExecutions] = useState<AutomationExecution[]>(
    initial.automationExecutions
  );
  const [operationalPriorityEntries, setOperationalPriorityEntries] = useState<
    OperationalPriorityEntry[]
  >(initial.operationalPriorityEntries || []);
  const [priorityCycles, setPriorityCycles] = useState<PriorityCycle[]>(
    initial.priorityCycles || []
  );
  const [sprints, setSprints] = useState<Sprint[]>(initial.sprints || []);
  const [emailOutbox, setEmailOutbox] = useState<AuthEmailMessage[]>(initial.emailOutbox || []);
  const [costSettings, setCostSettings] = useState<CostSettings>(
    initial.costSettings || initialCostSettings
  );

  const currentUser =
    users.find((user) => user.id === authSession?.userId && user.status === 'active') || undefined;
  const currentUserId = currentUser?.id || '';
  const isAuthenticated = Boolean(currentUser && authSession);
  const authReady = true;

  useEffect(() => {
    if (authSession && !currentUser) {
      setAuthSession(null);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [authSession, currentUser]);

  useEffect(() => {
    const payload: StorageEnvelope<AdminStorageData> = {
      version: STORAGE_VERSION,
      data: {
        currentUserId,
        users,
        teams,
        clients,
        stakeholders,
        products,
        systems,
        skills,
        taskTypes,
        tags,
        favoriteTags,
        entityFavorites,
        projectTypes,
        demandTypes,
        projectPurposes,
        taskTemplates,
        emailTemplates,
        notifications,
        automationRules,
        automationExecutions,
        operationalPriorityEntries,
        priorityCycles,
        sprints,
        emailOutbox,
        costSettings,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    users,
    teams,
    clients,
    stakeholders,
    products,
    systems,
    skills,
    taskTypes,
    tags,
    favoriteTags,
    entityFavorites,
    projectTypes,
    demandTypes,
    projectPurposes,
    taskTemplates,
    emailTemplates,
    notifications,
    automationRules,
    automationExecutions,
    operationalPriorityEntries,
    priorityCycles,
    sprints,
    emailOutbox,
    costSettings,
    currentUserId,
  ]);
  useEffect(() => {
    if (authSession) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authSession));
      return;
    }

    localStorage.removeItem(SESSION_STORAGE_KEY);
  }, [authSession]);

  const setCurrentUserId = (_id: string) => {
    if (import.meta.env.DEV) {
      console.info('[AdminContext] setCurrentUserId foi descontinuado no fluxo principal.');
    }
  };

  const queuePasswordEmail = async (
    targetUser: User,
    purpose: PasswordTokenPurpose
  ): Promise<{ previewUrl: string; hashedToken: string; expiresAt: string }> => {
    const plainToken = generatePlainToken();
    const hashedToken = await hashToken(plainToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    const actionUrl = buildPasswordActionPath(purpose, plainToken);

    setEmailOutbox((prev) => [
      createAuthEmailMessage({
        email: targetUser.email,
        purpose,
        actionUrl,
      }),
      ...prev,
    ]);

    return {
      previewUrl: actionUrl,
      hashedToken,
      expiresAt,
    };
  };

  const issuePasswordSetupLink: AdminContextType['issuePasswordSetupLink'] = async (userId) => {
    const targetUser = users.find((user) => user.id === userId);
    if (!targetUser) {
      return { ok: false, error: 'Usuário não encontrado.' };
    }
    if (targetUser.status !== 'active') {
      return { ok: false, error: 'Ative o usuário antes de enviar o link de acesso.' };
    }

    const { previewUrl, hashedToken, expiresAt } = await queuePasswordEmail(targetUser, 'setup');

    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId
          ? {
              ...user,
              mustSetPassword: true,
              passwordResetToken: hashedToken,
              passwordResetExpiresAt: expiresAt,
              passwordResetPurpose: 'setup',
              passwordResetRequestedAt: new Date().toISOString(),
            }
          : user
      )
    );

    return { ok: true, previewUrl };
  };

  const addUser = (user: User) => {
    const nextUser: User = {
      ...user,
      teams: getUserTeams(user),
      team: getPrimaryUserTeam(user),
      mustSetPassword: user.mustSetPassword ?? !user.passwordHash,
    };

    setUsers((prev) => {
      const nextUsers = [...prev, nextUser];
      setTeams((currentTeams) => syncTeamMembership(currentTeams, nextUsers));
      return nextUsers;
    });

    if (!nextUser.passwordHash && nextUser.status === 'active') {
      void (async () => {
        const { previewUrl, hashedToken, expiresAt } = await queuePasswordEmail(nextUser, 'setup');

        setUsers((prev) =>
          prev.map((candidate) =>
            candidate.id === nextUser.id
              ? {
                  ...candidate,
                  mustSetPassword: true,
                  passwordResetToken: hashedToken,
                  passwordResetExpiresAt: expiresAt,
                  passwordResetPurpose: 'setup',
                  passwordResetRequestedAt: new Date().toISOString(),
                }
              : candidate
          )
        );

        if (import.meta.env.DEV) {
          console.info(`[AdminContext] Link de ativação local gerado para ${nextUser.email}: ${previewUrl}`);
        }
      })();
    }
  };
  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers((prev) => {
      const nextUsers = prev.map((u) =>
        u.id === id
          ? {
              ...u,
              ...updates,
              teams: getUserTeams({ ...u, ...updates }),
              team: getPrimaryUserTeam({ ...u, ...updates }),
              mustSetPassword:
                updates.mustSetPassword ?? (updates.passwordHash ? false : u.mustSetPassword),
            }
          : u
      );
      setTeams((currentTeams) => syncTeamMembership(currentTeams, nextUsers));
      return nextUsers;
    });
  };
  const deleteUser = (id: string) => {
    if (authSession?.userId === id) {
      setAuthSession(null);
    }
    setUsers((prev) => {
      const nextUsers = prev.filter((u) => u.id !== id);
      setTeams((currentTeams) => syncTeamMembership(currentTeams, nextUsers));
      return nextUsers;
    });
  };

  const login: AdminContextType['login'] = async (email, password) => {
    const normalizedEmail = email.trim().toLocaleLowerCase('pt-BR');
    const user = users.find(
      (candidate) => candidate.email.trim().toLocaleLowerCase('pt-BR') === normalizedEmail
    );

    if (!user || user.status !== 'active') {
      return { ok: false, error: 'E-mail ou senha inválidos.' };
    }

    if (!user.passwordHash || user.mustSetPassword) {
      return {
        ok: false,
        error: 'Sua conta ainda não possui senha ativa. Use o fluxo de definição ou recuperação de senha.',
      };
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      return { ok: false, error: 'E-mail ou senha inválidos.' };
    }

    const nextSession = generateSession(user.id);
    setAuthSession(nextSession);
    setUsers((prev) =>
      prev.map((candidate) =>
        candidate.id === user.id
          ? {
              ...candidate,
              lastLoginAt: new Date().toISOString(),
            }
          : candidate
      )
    );

    return { ok: true };
  };

  const logout = () => {
    setAuthSession(null);
  };

  const requestPasswordReset: AdminContextType['requestPasswordReset'] = async (
    email,
    purpose = 'reset'
  ) => {
    const normalizedEmail = email.trim().toLocaleLowerCase('pt-BR');
    const user = users.find(
      (candidate) =>
        candidate.email.trim().toLocaleLowerCase('pt-BR') === normalizedEmail &&
        candidate.status === 'active'
    );

    const genericMessage =
      'Se existir uma conta ativa com este e-mail, o link de acesso foi preparado.';

    if (!user) {
      return { ok: true, message: genericMessage };
    }

    const { previewUrl, hashedToken, expiresAt } = await queuePasswordEmail(user, purpose);

    setUsers((prev) =>
      prev.map((candidate) =>
        candidate.id === user.id
          ? {
              ...candidate,
              mustSetPassword: purpose === 'setup' ? true : candidate.mustSetPassword,
              passwordResetToken: hashedToken,
              passwordResetExpiresAt: expiresAt,
              passwordResetPurpose: purpose,
              passwordResetRequestedAt: new Date().toISOString(),
            }
          : candidate
      )
    );

    return {
      ok: true,
      message: genericMessage,
      previewUrl,
    };
  };

  const consumePasswordToken: AdminContextType['consumePasswordToken'] = async (
    token,
    nextPassword
  ) => {
    const hashedIncomingToken = await hashToken(token);
    const user = users.find((candidate) => candidate.passwordResetToken === hashedIncomingToken);

    if (!user || !user.passwordResetExpiresAt) {
      return { ok: false, error: 'O link informado é inválido ou já foi utilizado.' };
    }

    if (new Date(user.passwordResetExpiresAt).getTime() < Date.now()) {
      return { ok: false, error: 'O link informado expirou. Solicite um novo acesso.' };
    }

    const newPasswordHash = await hashPassword(nextPassword);
    setUsers((prev) =>
      prev.map((candidate) =>
        candidate.id === user.id
          ? {
              ...candidate,
              passwordHash: newPasswordHash,
              mustSetPassword: false,
              passwordSetAt: new Date().toISOString(),
              passwordResetToken: undefined,
              passwordResetExpiresAt: undefined,
              passwordResetPurpose: undefined,
              passwordResetRequestedAt: undefined,
            }
          : candidate
      )
    );
    setEmailOutbox((prev) =>
      prev.map((message) =>
        message.to.includes(user.email) && !message.consumedAt
          ? { ...message, consumedAt: new Date().toISOString() }
          : message
      )
    );

    return { ok: true };
  };

  const addTeam = (team: Team) => setTeams([...teams, team]);
  const updateTeam = (id: string, updates: Partial<Team>) => {
    setTeams(teams.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };
  const deleteTeam = (id: string) => setTeams(teams.filter((t) => t.id !== id));

  const addClient = (client: Client) => setClients([...clients, client]);
  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients(clients.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };
  const deleteClient = (id: string) => setClients(clients.filter((c) => c.id !== id));

  const addStakeholder = (stakeholder: Stakeholder) =>
    setStakeholders([...stakeholders, stakeholder]);
  const updateStakeholder = (id: string, updates: Partial<Stakeholder>) => {
    setStakeholders(stakeholders.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };
  const deleteStakeholder = (id: string) =>
    setStakeholders(stakeholders.filter((s) => s.id !== id));

  const addProduct = (product: Product) => setProducts([...products, product]);
  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(products.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };
  const deleteProduct = (id: string) => setProducts(products.filter((p) => p.id !== id));

  const addSystem = (system: System) => setSystems([...systems, system]);
  const updateSystem = (id: string, updates: Partial<System>) => {
    setSystems(systems.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };
  const deleteSystem = (id: string) => setSystems(systems.filter((s) => s.id !== id));

  const addSkill = (skill: Skill) => setSkills([...skills, skill]);
  const updateSkill = (id: string, updates: Partial<Skill>) => {
    setSkills(
      skills.map((skill) =>
        skill.id === id
          ? {
              ...skill,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : skill
      )
    );
  };
  const deleteSkill = (id: string) => setSkills(skills.filter((skill) => skill.id !== id));

  const addTaskType = (taskType: TaskTypeEntity) => setTaskTypes((prev) => [...prev, taskType]);
  const updateTaskType = (id: string, updates: Partial<TaskTypeEntity>) => {
    setTaskTypes((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };
  const deleteTaskType = (id: string) => {
    setTaskTypes((prev) => prev.filter((item) => item.id !== id));
  };

  const ensureTag: AdminContextType['ensureTag'] = (name, scope = 'both', workspaceId) => {
    if (!name.trim() || !currentUser) return null;

    const normalizedName = name.trim().toLocaleLowerCase('pt-BR');
    const existingTag = tags.find(
      (tag) =>
        tag.normalizedName === normalizedName &&
        (tag.scope === scope || tag.scope === 'both' || scope === 'both') &&
        (tag.workspaceId || '') === (workspaceId || '')
    );

    if (existingTag) return existingTag;

    const timestamp = new Date().toISOString();
    const nextTag: Tag = {
      id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      normalizedName,
      scope,
      workspaceId,
      createdBy: currentUser.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setTags((prev) => [nextTag, ...prev]);
    return nextTag;
  };

  const toggleFavoriteTag: AdminContextType['toggleFavoriteTag'] = (tagId) => {
    if (!currentUser) return;

    setFavoriteTags((prev) => {
      const existing = prev.find(
        (favorite) => favorite.userId === currentUser.id && favorite.tagId === tagId
      );

      if (existing) {
        return prev.filter(
          (favorite) => !(favorite.userId === currentUser.id && favorite.tagId === tagId)
        );
      }

      return [
        {
          userId: currentUser.id,
          tagId,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ];
    });
  };

  const isFavoriteTag: AdminContextType['isFavoriteTag'] = (tagId) => {
    if (!currentUser) return false;
    return favoriteTags.some(
      (favorite) => favorite.userId === currentUser.id && favorite.tagId === tagId
    );
  };

  const toggleFavoriteEntity: AdminContextType['toggleFavoriteEntity'] = (entityType, entityId) => {
    if (!currentUser) return;

    setEntityFavorites((prev) => {
      const existing = prev.find(
        (favorite) =>
          favorite.userId === currentUser.id &&
          favorite.entityType === entityType &&
          favorite.entityId === entityId
      );

      if (existing) {
        return prev.filter(
          (favorite) =>
            !(
              favorite.userId === currentUser.id &&
              favorite.entityType === entityType &&
              favorite.entityId === entityId
            )
        );
      }

      return [
        {
          userId: currentUser.id,
          entityType,
          entityId,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ];
    });
  };

  const isFavoriteEntity: AdminContextType['isFavoriteEntity'] = (entityType, entityId) => {
    if (!currentUser) return false;

    return entityFavorites.some(
      (favorite) =>
        favorite.userId === currentUser.id &&
        favorite.entityType === entityType &&
        favorite.entityId === entityId
    );
  };

  const getFavoriteEntityIds: AdminContextType['getFavoriteEntityIds'] = (entityType) => {
    if (!currentUser) return [];

    return entityFavorites
      .filter(
        (favorite) =>
          favorite.userId === currentUser.id && favorite.entityType === entityType
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((favorite) => favorite.entityId);
  };

  const addProjectType = (projectType: ProjectType) =>
    setProjectTypes([...projectTypes, projectType]);
  const updateProjectType = (id: string, updates: Partial<ProjectType>) => {
    setProjectTypes(projectTypes.map((pt) => (pt.id === id ? { ...pt, ...updates } : pt)));
  };
  const deleteProjectType = (id: string) =>
    setProjectTypes(projectTypes.filter((pt) => pt.id !== id));

  const addDemandType = (demandType: DemandTypeEntity) =>
    setDemandTypes([...demandTypes, demandType]);
  const updateDemandType = (id: string, updates: Partial<DemandTypeEntity>) => {
    setDemandTypes(demandTypes.map((dt) => (dt.id === id ? { ...dt, ...updates } : dt)));
  };
  const deleteDemandType = (id: string) =>
    setDemandTypes(demandTypes.filter((dt) => dt.id !== id));

  const addProjectPurpose = (projectPurpose: ProjectPurposeEntity) =>
    setProjectPurposes([...projectPurposes, projectPurpose]);
  const updateProjectPurpose = (id: string, updates: Partial<ProjectPurposeEntity>) => {
    setProjectPurposes(
      projectPurposes.map((purpose) =>
        purpose.id === id ? { ...purpose, ...updates } : purpose
      )
    );
  };
  const deleteProjectPurpose = (id: string) =>
    setProjectPurposes(projectPurposes.filter((purpose) => purpose.id !== id));

  const addTaskTemplate = (taskTemplate: TaskTemplate) =>
    setTaskTemplates((prev) => [taskTemplate, ...prev]);
  const updateTaskTemplate = (id: string, updates: Partial<TaskTemplate>) => {
    setTaskTemplates((prev) =>
      prev.map((template) =>
        template.id === id
          ? {
              ...template,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : template
      )
    );
  };
  const deleteTaskTemplate = (id: string) =>
    setTaskTemplates((prev) => prev.filter((template) => template.id !== id));

  const addEmailTemplate = (template: EmailTemplate) =>
    setEmailTemplates((prev) => [template, ...prev]);
  const updateEmailTemplate = (id: string, updates: Partial<EmailTemplate>) => {
    setEmailTemplates((prev) =>
      prev.map((template) =>
        template.id === id
          ? {
              ...template,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : template
      )
    );
  };
  const deleteEmailTemplate = (id: string) => {
    setEmailTemplates((prev) => prev.filter((template) => template.id !== id));
  };
  const sendEmailMessage: AdminContextType['sendEmailMessage'] = (message) => {
    const nextMessage: AuthEmailMessage = {
      ...message,
      id: `mail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    setEmailOutbox((prev) => [nextMessage, ...prev]);
    return nextMessage;
  };

  const addNotification = (notification: Notification) =>
    setNotifications((prev) => {
      const normalized = normalizeNotification(notification);
      if (prev.some((existing) => isDuplicateNotification(existing, normalized))) {
        return prev;
      }
      return sortNotificationsByDate([normalized, ...prev]);
    });
  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
  };

  const addAutomationRule = (rule: AutomationRule) =>
    setAutomationRules((prev) => [rule, ...prev]);
  const updateAutomationRule = (id: string, updates: Partial<AutomationRule>) => {
    setAutomationRules((prev) =>
      prev.map((rule) =>
        rule.id === id
          ? {
              ...rule,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : rule
      )
    );
  };
  const deleteAutomationRule = (id: string) =>
    setAutomationRules((prev) => prev.filter((rule) => rule.id !== id));
  const toggleAutomationRule = (id: string) => {
    setAutomationRules((prev) =>
      prev.map((rule) =>
        rule.id === id
          ? { ...rule, isActive: !rule.isActive, updatedAt: new Date().toISOString() }
          : rule
      )
    );
  };
  const recordAutomationExecutions = (executions: AutomationExecution[]) => {
    if (executions.length === 0) return;
    setAutomationExecutions((prev) => {
      const existingFingerprints = new Set(prev.map((execution) => execution.fingerprint).filter(Boolean));
      const filteredExecutions = executions.filter(
        (execution) => !execution.fingerprint || !existingFingerprints.has(execution.fingerprint)
      );
      return [...filteredExecutions, ...prev].slice(0, 100);
    });
  };

  const addOperationalPriorityEntry: AdminContextType['addOperationalPriorityEntry'] = (entry) => {
    const timestamp = new Date().toISOString();
    const id = `priority-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setOperationalPriorityEntries((prev) => [
      ...prev,
      {
        ...entry,
        id,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);
    return id;
  };

  const updateOperationalPriorityEntry: AdminContextType['updateOperationalPriorityEntry'] = (
    id,
    updates
  ) => {
    setOperationalPriorityEntries((prev) =>
      prev.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : entry
      )
    );
  };

  const deleteOperationalPriorityEntry: AdminContextType['deleteOperationalPriorityEntry'] = (
    id
  ) => {
    setOperationalPriorityEntries((prev) => {
      const deletedEntry = prev.find((entry) => entry.id === id);
      const remaining = prev.filter((entry) => entry.id !== id);

      if (!deletedEntry) return remaining;

      const affectedEntries = remaining
        .filter((entry) =>
          matchesPrioritySegment(entry, deletedEntry.assigneeId, {
            lane: deletedEntry.lane,
            flowId: deletedEntry.flowId,
            itemType: deletedEntry.itemType,
          })
        )
        .sort((a, b) => a.order - b.order);

      return remaining.map((entry) => {
        if (
          !matchesPrioritySegment(entry, deletedEntry.assigneeId, {
            lane: deletedEntry.lane,
            flowId: deletedEntry.flowId,
            itemType: deletedEntry.itemType,
          })
        ) {
          return entry;
        }

        const nextOrder = affectedEntries.findIndex((item) => item.id === entry.id);
        if (nextOrder === -1 || entry.order === nextOrder) {
          return entry;
        }

        return {
          ...entry,
          order: nextOrder,
          updatedAt: new Date().toISOString(),
        };
      });
    });
  };

  const reorderOperationalPriorityEntries: AdminContextType['reorderOperationalPriorityEntries'] = (
    assigneeId,
    orderedEntryIds,
    segment
  ) => {
    setOperationalPriorityEntries((prev) => {
      const targetIds = new Set(orderedEntryIds);
      return prev.map((entry) => {
        if (
          !matchesPrioritySegment(entry, assigneeId, segment) ||
          !targetIds.has(entry.id)
        ) {
          return entry;
        }

        const nextOrder = orderedEntryIds.indexOf(entry.id);
        if (nextOrder === -1 || entry.order === nextOrder) {
          return entry;
        }

        return {
          ...entry,
          order: nextOrder,
          updatedAt: new Date().toISOString(),
        };
      });
    });
  };

  const addPriorityCycle: AdminContextType['addPriorityCycle'] = (cycle) => {
    const timestamp = new Date().toISOString();
    const id = `priority-cycle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    setPriorityCycles((prev) => {
      const nextCycle = normalizePriorityCycle({
        ...cycle,
        id,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      return [
        ...prev.map((item) => ({
          ...item,
          active: nextCycle.active ? false : item.active,
          updatedAt: nextCycle.active && item.active ? timestamp : item.updatedAt,
        })),
        nextCycle,
      ];
    });

    return id;
  };

  const updatePriorityCycle: AdminContextType['updatePriorityCycle'] = (id, updates) => {
    const timestamp = new Date().toISOString();

    setPriorityCycles((prev) =>
      prev.map((cycle) => {
        if (cycle.id === id) {
          return normalizePriorityCycle({
            ...cycle,
            ...updates,
            updatedAt: timestamp,
          });
        }

        if (updates.active) {
          return {
            ...cycle,
            active: false,
            updatedAt: cycle.active ? timestamp : cycle.updatedAt,
          };
        }

        return cycle;
      })
    );
  };

  const deletePriorityCycle: AdminContextType['deletePriorityCycle'] = (id) => {
    setPriorityCycles((prev) => prev.filter((cycle) => cycle.id !== id));
  };

  const setPriorityCycleActive: AdminContextType['setPriorityCycleActive'] = (id, active) => {
    const timestamp = new Date().toISOString();

    setPriorityCycles((prev) =>
      prev.map((cycle) => {
        if (cycle.id === id) {
          return {
            ...cycle,
            active,
            updatedAt: timestamp,
          };
        }

        if (active && cycle.active) {
          return {
            ...cycle,
            active: false,
            updatedAt: timestamp,
          };
        }

        return cycle;
      })
    );
  };

  const addSprint: AdminContextType['addSprint'] = (sprint) => {
    const timestamp = new Date().toISOString();
    const id = `sprint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setSprints((prev) => [
      ...prev,
      {
        ...sprint,
        id,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);
    return id;
  };

  const updateSprint: AdminContextType['updateSprint'] = (id, updates) => {
    setSprints((prev) =>
      prev.map((sprint) =>
        sprint.id === id
          ? {
              ...sprint,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : sprint
      )
    );
  };

  const deleteSprint: AdminContextType['deleteSprint'] = (id) => {
    setSprints((prev) => prev.filter((sprint) => sprint.id !== id));
  };

  const updateCostSettings: AdminContextType['updateCostSettings'] = (updates) => {
    setCostSettings((prev) => ({
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  };

  return (
    <AdminContext.Provider
      value={{
        currentUser,
        currentUserId,
        authSession,
        isAuthenticated,
        authReady,
        users,
        teams,
        clients,
        stakeholders,
        products,
        systems,
        skills,
        taskTypes,
        tags,
        favoriteTags,
        entityFavorites,
        projectTypes,
        demandTypes,
        projectPurposes,
        taskTemplates,
        emailTemplates,
        notifications,
        automationRules,
        automationExecutions,
        operationalPriorityEntries,
        priorityCycles,
        sprints,
        emailOutbox,
        costSettings,
        setCurrentUserId,
        login,
        logout,
        requestPasswordReset,
        consumePasswordToken,
        issuePasswordSetupLink,
        addUser,
        updateUser,
        deleteUser,
        addTeam,
        updateTeam,
        deleteTeam,
        addClient,
        updateClient,
        deleteClient,
        addStakeholder,
        updateStakeholder,
        deleteStakeholder,
        addProduct,
        updateProduct,
        deleteProduct,
        addSystem,
        updateSystem,
        deleteSystem,
        addSkill,
        updateSkill,
        deleteSkill,
        addTaskType,
        updateTaskType,
        deleteTaskType,
        ensureTag,
        toggleFavoriteTag,
        isFavoriteTag,
        toggleFavoriteEntity,
        isFavoriteEntity,
        getFavoriteEntityIds,
        addProjectType,
        updateProjectType,
        deleteProjectType,
        addDemandType,
        updateDemandType,
        deleteDemandType,
        addProjectPurpose,
        updateProjectPurpose,
        deleteProjectPurpose,
        addTaskTemplate,
        updateTaskTemplate,
        deleteTaskTemplate,
        addEmailTemplate,
        updateEmailTemplate,
        deleteEmailTemplate,
        sendEmailMessage,
        addNotification,
        markNotificationAsRead,
        addAutomationRule,
        updateAutomationRule,
        deleteAutomationRule,
        toggleAutomationRule,
        recordAutomationExecutions,
        addOperationalPriorityEntry,
        updateOperationalPriorityEntry,
        deleteOperationalPriorityEntry,
        reorderOperationalPriorityEntries,
        addPriorityCycle,
        updatePriorityCycle,
        deletePriorityCycle,
        setPriorityCycleActive,
        addSprint,
        updateSprint,
        deleteSprint,
        updateCostSettings,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
}
