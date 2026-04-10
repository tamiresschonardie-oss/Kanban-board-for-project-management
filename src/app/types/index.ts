export type GovernancePhaseId =
  | 'backlog'
  | 'pre-analysis'
  | 'documentation'
  | 'waiting-approval'
  | 'construction';
export type ProjectStatus = GovernancePhaseId;
export type ProjectExecutionStatus = 'não-iniciado' | 'em-andamento' | 'concluído' | 'em-risco';
export type ProjectSituation = 'ativo' | 'pausado' | 'cancelado';
export type ProjectPurpose = 'expansao' | 'suporte' | 'inovacao' | 'seguranca' | 'operacional' | 'estrategico';
export type ProjectResultMaturityType = 'imediato' | 'curto_prazo' | 'medio_prazo' | 'longo_prazo';
export type ProjectResultStatus =
  | 'nao_iniciado'
  | 'aguardando_avaliacao'
  | 'em_avaliacao'
  | 'avaliado'
  | 'encerrado';
export type ProjectResultScheduleMode = 'default' | 'custom';
export type ProjectImpactLevel = 'baixo' | 'medio' | 'alto';
export type ProjectKpiType =
  | 'tempo'
  | 'financeiro'
  | 'produtividade'
  | 'qualidade'
  | 'uso'
  | 'satisfacao'
  | 'outro';
export type ProjectKpiMeasurementSource = 'manual' | 'automatica' | 'integracao';
export type ProjectResultEvaluationStatus = 'pendente' | 'em_avaliacao' | 'concluida' | 'cancelada';
export type ProjectBenefitKind = 'expected' | 'realized';

// O projeto possui dois ciclos complementares:
// 1) execução/governança, que organiza o trabalho do Labs no Kanban principal;
// 2) resultado/valor, que começa após a entrega e segue fora do Kanban operacional.
// Essa separação evita manter projetos concluídos presos no fluxo principal apenas porque
// o benefício de negócio ainda está maturando.

export type MilestoneType = 'business' | 'technical' | 'regulatory' | 'delivery';
export type MilestoneStatus = 'not-started' | 'in-progress' | 'completed' | 'delayed';
export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'done';
export type TaskOriginType = 'template' | 'manual';
export type TaskScopeStatus = 'active' | 'not_applicable' | 'out_of_scope' | 'discarded' | 'deleted';
export type UserRole = 'admin' | 'pmo' | 'gestor' | 'user';
export type UserStatus = 'active' | 'inactive';
export type PasswordTokenPurpose = 'setup' | 'reset';
export type DemandType = 'projeto' | 'melhoria' | 'suporte' | 'evolucao' | 'experimentacao' | 'bug' | 'tarefa';
export type TaskOwnerSource = 'manual' | 'weekly_assignment' | 'legacy';
export type WorkspaceStatus = 'active' | 'inactive';
export type TriageComplexity = 'baixa' | 'media' | 'alta';
export type TriageScopeLevel = 'pontual' | 'moderado' | 'amplo';
export type ValueIntent =
  | 'reduzir_tempo'
  | 'reduzir_custo'
  | 'melhorar_qualidade'
  | 'melhorar_experiencia'
  | 'aumentar_controle'
  | 'evitar_erro'
  | 'aumentar_produtividade'
  | 'outro';
export type TriageStatus = 'pending' | 'completed';
export type AutomationEventType =
  | 'project.created'
  | 'project.updated'
  | 'project.phase.changed'
  | 'project.governance_phase_changed'
  | 'project.status_changed'
  | 'project.completed'
  | 'project.approved'
  | 'task.stage_changed'
  | 'task.created'
  | 'task.status_changed'
  | 'task.completed'
  | 'task.assignee.changed'
  | 'task.subtask_created'
  | 'priority.focus.entered'
  | 'gantt.phase_updated';
export type AutomationConditionOperator = 'equals' | 'not_equals' | 'contains' | 'in';
export type AutomationActionType =
  | 'append_project_activity'
  | 'create_notification'
  | 'send_email'
  | 'queue_internal_backlog'
  | 'update_task_status'
  | 'assign_project_team'
  | 'move_project_governance_phase'
  | 'move_project_to_workspace_stage'
  | 'update_project_field'
  | 'create_task_from_template';
export type CommunicationRecipientType =
  | 'responsible'
  | 'requester'
  | 'stakeholders'
  | 'current_user'
  | 'admins_and_pmo'
  | 'custom';
export type EmailMessageKind = 'auth' | 'project_communication' | 'automation';
export type CalendarEventType = 'personal' | 'meeting';
export type CalendarEventStatus = 'active' | 'cancelled';
export type TagScope = 'project' | 'task' | 'both';
export type FavoriteEntityType = 'project' | 'task' | 'skill';
export type OperationalPriorityItemType = 'task' | 'project';
export type OperationalPrioritySource = 'governance-task' | 'governance-project';
export type OperationalPriorityLane = 'default' | 'flow';
export type PriorityCycleType = 'week' | 'custom' | 'sprint';
export type SprintStatus = 'planned' | 'active' | 'finished';
export type SprintTaskType = 'project' | 'personal' | 'sprint';
export type SprintKanbanStatus = 'backlog' | 'in-progress' | 'review' | 'done';
export type IntegrationType =
  | 'webhook'
  | 'n8n'
  | 'documentation'
  | 'email'
  | 'calendar'
  | 'erp'
  | 'internal';
export type IntegrationMethod = 'GET' | 'POST' | 'PUT' | 'PATCH';
export type IntegrationAuthType = 'none' | 'basic' | 'bearer' | 'header';
export type IntegrationLogStatus = 'success' | 'error' | 'skipped';
export type DomainEventName =
  | 'project.created'
  | 'project.updated'
  | 'project.phase_changed'
  | 'task.created'
  | 'task.updated'
  | 'task.completed'
  | 'task.assignee_changed'
  | 'task.dependency_created'
  | 'comment.created'
  | 'attachment.added'
  | 'reminder.created'
  | 'saved_view.created'
  | 'saved_view.updated';
export type DynamicFilterOperator =
  | 'equals'
  | 'not_equals'
  | 'before'
  | 'after'
  | 'on_or_after'
  | 'on_or_before'
  | 'is_blank'
  | 'not_blank'
  | 'contains'
  | 'not_contains'
  | 'one_of'
  | 'not_one_of';
export type DynamicFilterValueType = 'text' | 'select' | 'multi_select' | 'date';

// Demand Type Entity for Admin
export interface DemandTypeEntity {
  id: string;
  name: string;
  value: DemandType;
  createdAt: string;
}

export interface ProjectPurposeEntity {
  id: string;
  name: string;
  value: ProjectPurpose;
  createdAt: string;
}

// Admin entities
export interface User {
  id: string;
  name: string;
  email: string;
  team: string;
  teams?: string[];
  cargo?: string;
  salaryMonthly?: number;
  costPerHour?: number;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  passwordHash?: string;
  mustSetPassword?: boolean;
  lastLoginAt?: string;
  passwordResetToken?: string;
  passwordResetExpiresAt?: string;
  passwordResetPurpose?: PasswordTokenPurpose;
  passwordResetRequestedAt?: string;
  passwordSetAt?: string;
  createdAt: string;
}

export interface AuthSession {
  sessionToken: string;
  userId: string;
  createdAt: string;
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: DynamicFilterOperator;
  value?: unknown;
  valueType: DynamicFilterValueType;
}

export interface SavedView {
  id: string;
  userId: string;
  screenKey: string;
  name: string;
  filtersJson: FilterCondition[];
  sortJson?: Record<string, unknown>;
  viewMode?: string;
  isPinnedDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DomainEvent {
  id: string;
  name: DomainEventName | string;
  entityType: 'project' | 'task' | 'comment' | 'attachment' | 'reminder' | 'saved_view' | 'integration';
  entityId?: string;
  payloadJson: Record<string, unknown>;
  createdAt: string;
}

export interface IntegrationConfig {
  id: string;
  name: string;
  type: IntegrationType;
  endpoint?: string;
  method: IntegrationMethod;
  headersJson?: Record<string, string>;
  authType: IntegrationAuthType;
  authConfigJson?: Record<string, string>;
  subscribedEvents: string[];
  isActive: boolean;
  timeoutMs?: number;
  retryCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationLog {
  id: string;
  integrationId: string;
  eventName: string;
  payloadJson: Record<string, unknown>;
  status: IntegrationLogStatus;
  statusCode?: number;
  responseBody?: string;
  attempt: number;
  createdAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  description?: string;
  remindAt: string;
  dateTime?: string;
  notifyEnabled: boolean;
  notify?: boolean;
  timezone?: string;
  status: 'pending' | 'completed';
  notifiedAt?: string;
  lastNotificationChannel?: 'browser' | 'in_app';
  createdAt: string;
  updatedAt: string;
  completed: boolean;
}

export interface Note {
  id: string;
  userId: string;
  title?: string;
  content: string;
  color?: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthEmailMessage {
  id: string;
  to: string[];
  subject: string;
  template: PasswordTokenPurpose | string;
  kind: EmailMessageKind;
  actionUrl?: string;
  templateId?: string;
  templateName?: string;
  htmlBody?: string;
  textBody?: string;
  projectId?: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: string;
  consumedAt?: string;
}

export interface EmailTemplate {
  id: string;
  nome: string;
  assunto: string;
  corpo_html: string;
  variaveis_disponiveis: string[];
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  members: string[]; // User IDs
  color: string;
  usesProjectWorkspace?: boolean;
  workspaceIds?: string[];
  createdAt: string;
}

export interface WorkspaceEntity {
  id: string;
  name: string;
  description?: string;
  status: WorkspaceStatus;
  teamIds: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Client {
  id: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  linkedProjects: string[]; // Project IDs
  createdAt: string;
}

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  linkedProjects: string[]; // Project IDs
  createdAt: string;
}

export interface ProjectStakeholderAssignment {
  stakeholderId: string;
  name: string;
  projectRole?: string;
}

export interface ProjectRoleAssignment {
  id: string;
  projectId?: string;
  userId: string;
  userName?: string;
  roleKey: string;
  roleLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  type: string;
  description?: string;
  linkedProjects: string[]; // Project IDs
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  normalizedName: string;
  color?: string;
  scope: TagScope;
  workspaceId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserFavoriteTag {
  userId: string;
  tagId: string;
  createdAt: string;
}

export interface UserFavoriteEntity {
  userId: string;
  entityType: FavoriteEntityType;
  entityId: string;
  createdAt: string;
}

export interface System {
  id: string;
  name: string;
  integrations?: string[];
  description?: string;
  createdAt: string;
}

export interface TaskTypeEntity {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

export type SkillStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface Skill {
  id: string;
  name: string;
  description?: string;
  area?: string;
  ownerId?: string;
  status: SkillStatus;
  maturityLevel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectType {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
  entityType?: 'task' | 'project';
  entityId?: string;
  attachments?: ProjectAttachment[];
}

export interface ProjectComment {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
  subtype?: 'comment' | 'update' | 'attachment';
  highlightFocus?: boolean;
  entityType?: 'task' | 'project';
  entityId?: string;
  attachments?: ProjectAttachment[];
  updatedAt?: string;
  deletedAt?: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface TimeLog {
  id: string;
  taskId: string;
  userId?: string;
  source: 'manual' | 'timer';
  startTime?: string;
  endTime?: string;
  durationSeconds?: number;
  manualSeconds?: number;
  durationMinutes?: number;
  manualMinutes?: number;
  createdAt: string;
}

export type TaskDependencyType = 'FS' | 'SS' | 'FF' | 'SF' | 'blocks' | 'is_blocked_by';
export type TaskRelationshipType = 'related_to' | 'derives_from' | 'refers_to';
export type DependencyRecordKind = 'dependency' | 'relationship';
export type DependencyEntityType = 'task' | 'phase' | 'project' | 'sprint_item';
export type TaskDependencyClass = 'hard' | 'soft' | 'external' | 'internal';
export type GanttDependencyType = TaskDependencyType;
export type GanttItemType = 'project' | 'phase' | 'milestone' | 'task' | 'subtask';

export interface AssigneeTransferHistoryEntry {
  id: string;
  changedAt: string;
  fromAssignee?: string;
  toAssignee?: string;
  changedBy?: string;
}

export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  teamId?: string;
  projectId?: string;
  goal?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyDemandAssignment {
  id: string;
  demandType: DemandType;
  startDate: string;
  endDate: string;
  responsibleUserId: string;
  teamId?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type:
    | 'task_assigned'
    | 'task_unassigned'
    | 'task_updated'
    | 'comment_added'
    | 'mention'
    | 'project_stakeholder_added'
    | 'project_phase_changed'
    | 'project_updated'
    | 'deadline_approaching'
    | 'automation_triggered'
    | 'meeting_invite'
    | 'reminder_due';
  title: string;
  description: string;
  entityType?: 'task' | 'project' | 'comment' | 'meeting' | 'automation' | 'reminder';
  entityId?: string;
  isRead: boolean;
  createdAt: string;
  linkTo?: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  status?: TaskStatus;
  taskType?: SprintTaskType;
  assignee?: string;
  assigneeId?: string;
  analystOwnerId?: string;
  analystOwnerName?: string;
  technicalOwnerId?: string;
  technicalOwnerName?: string;
  technicalOwnerSource?: TaskOwnerSource;
  technicalOwnerSuggestedByAssignmentId?: string;
  technicalOwnerSuggestedAt?: string;
  demandType?: DemandType;
  suggestedDemandType?: DemandType;
  triageComplexity?: TriageComplexity;
  expectedBusinessImpact?: ProjectImpactLevel;
  scopeLevel?: TriageScopeLevel;
  valueIntent?: ValueIntent;
  valueIntentNotes?: string;
  typeDefinedBy?: string;
  typeDefinedAt?: string;
  triageStatus?: TriageStatus;
  originTicket?: boolean;
  originTicketReference?: string;
  sourceSystem?: string;
  expectedImpactLevel?: ProjectImpactLevel;
  startDate?: string;
  dueDate?: string;
  sprintId?: string;
  sprintStatus?: SprintKanbanStatus;
  sprintOrder?: number;
  subtasks?: Subtask[]; // Suporta hierarquia de subtarefas
  priority?: 'low' | 'medium' | 'high';
  description?: string;
  skillId?: string;
  skillName?: string;
  requestedBy?: string;
  stakeholders?: string[];
  tags?: string[];
  tagIds?: string[];
  checklistItems?: ChecklistItem[];
  timeLogs?: TimeLog[];
  comments?: Comment[];
  attachments?: ProjectAttachment[];
  activities?: ActivityLog[];
  assigneeHistory?: AssigneeTransferHistoryEntry[];
  followerUserIds?: string[];
  workspaceId?: string;
  personalStages?: Record<string, string>;
  kanbanColumn?: string;
  autoCompleteFromChildren?: boolean;
  isWeeklyFocus?: boolean;
  generatedFromTaskTemplateId?: string;
  generatedFromTaskTemplateItemId?: string;
  originType?: TaskOriginType;
  templateTaskId?: string;
  isTemplateInstance?: boolean;
  scopeStatus?: TaskScopeStatus;
  removedFromScopeAt?: string;
  removedFromScopeBy?: string;
  removalReason?: string;
  deletedAt?: string;
  deletedBy?: string;
}

export interface WBSTask {
  id: string;
  title: string;
  description?: string;
  skillId?: string;
  skillName?: string;
  status: TaskStatus;
  taskType?: SprintTaskType;
  assignee?: string;
  assigneeId?: string;
  analystOwnerId?: string;
  analystOwnerName?: string;
  technicalOwnerId?: string;
  technicalOwnerName?: string;
  technicalOwnerSource?: TaskOwnerSource;
  technicalOwnerSuggestedByAssignmentId?: string;
  technicalOwnerSuggestedAt?: string;
  demandType?: DemandType;
  suggestedDemandType?: DemandType;
  triageComplexity?: TriageComplexity;
  expectedBusinessImpact?: ProjectImpactLevel;
  scopeLevel?: TriageScopeLevel;
  valueIntent?: ValueIntent;
  valueIntentNotes?: string;
  typeDefinedBy?: string;
  typeDefinedAt?: string;
  triageStatus?: TriageStatus;
  originTicket?: boolean;
  originTicketReference?: string;
  sourceSystem?: string;
  expectedImpactLevel?: ProjectImpactLevel;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  priority?: 'low' | 'medium' | 'high';
  subtasks: Subtask[];
  order: number;
  comments?: Comment[];
  projectId?: string;
  phaseId?: string;
  milestoneId?: string;
  workspaceId?: string;
  parentTaskId?: string;
  requestedBy?: string;
  stakeholders?: string[];
  tags?: string[];
  tagIds?: string[];
  checklistItems?: ChecklistItem[];
  timeLogs?: TimeLog[];
  attachments?: ProjectAttachment[];
  activities?: ActivityLog[];
  assigneeHistory?: AssigneeTransferHistoryEntry[];
  followerUserIds?: string[];
  personalStages?: Record<string, string>;
  kanbanColumn?: string;
  autoCompleteFromChildren?: boolean;
  completionDate?: string; // Data real de conclusão da tarefa
  generatedFromTaskTemplateId?: string;
  generatedFromTaskTemplateItemId?: string;
  sprintId?: string;
  sprintStatus?: SprintKanbanStatus;
  sprintOrder?: number;
  isWeeklyFocus?: boolean;
  originType?: TaskOriginType;
  templateTaskId?: string;
  isTemplateInstance?: boolean;
  scopeStatus?: TaskScopeStatus;
  removedFromScopeAt?: string;
  removedFromScopeBy?: string;
  removalReason?: string;
  deletedAt?: string;
  deletedBy?: string;
}

export interface Milestone {
  id: string;
  name: string;
  type: MilestoneType;
  status: MilestoneStatus;
  responsible?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  startDate: string;
  endDate: string;
  sla: number; // days
  description?: string;
  tasks: WBSTask[];
  order: number;
}

export interface Phase {
  id: string;
  name: string;
  description?: string; // Descrição da fase
  responsible?: string;
  skillId?: string;
  skillName?: string;
  templatePhaseId?: string;
  expectedRoleKey?: string;
  expectedRoleLabel?: string;
  suggestedOwnerId?: string;
  suggestedOwnerName?: string;
  assignedOwnerId?: string;
  assignedOwnerName?: string;
  order: number;
  milestones: Milestone[];
  phaseType?: 'execution';
  startDate?: string; // Data inicial da fase (opcional)
  endDate?: string;   // Data final da fase (opcional)
  plannedStartDate?: string; // Data planejada de início (PMO edita)
  plannedEndDate?: string;   // Data planejada de conclusão (PMO edita)
  actualStartDate?: string;  // Data oficial de início da fase
  actualEndDate?: string;    // Data real de conclusão da fase
}

export interface EAP {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  projectTypeId?: string;
  phases: Phase[];
  createdAt: string;
  updatedAt: string;
}

export interface GovernancePhaseDefinition {
  id: GovernancePhaseId | string;
  name: string;
  order: number;
  workspaceId?: string;
  description?: string;
  color?: string;
  isTerminal?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspaceProjectStageDefinition {
  id: string;
  name: string;
  order: number;
  workspaceId?: string;
  description?: string;
  color?: string;
  isTerminal?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GovernanceHistoryEntry {
  id: string;
  fromPhaseId?: GovernancePhaseId | string;
  toPhaseId: GovernancePhaseId | string;
  changedAt: string;
  changedBy?: string;
  reason?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  entityType?: 'project' | 'governance' | 'phase' | 'milestone' | 'task' | 'comment';
  entityId?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface AutomationCondition {
  id: string;
  field: string;
  operator: AutomationConditionOperator;
  value: string;
  values?: string[];
}

export interface AutomationAction {
  type: AutomationActionType;
  title?: string;
  message?: string;
  details?: string;
  recipient?: 'responsible' | 'requester' | 'current_user' | 'admins_and_pmo';
  recipients?: CommunicationRecipientType[];
  customEmails?: string[];
  queueName?: string;
  tag?: string;
  linkTo?: string;
  targetStatus?: TaskStatus | ProjectStatus | string;
  targetWorkspaceId?: string;
  targetWorkspaceName?: string;
  targetTeamId?: string;
  targetTeamName?: string;
  targetPhaseId?: string;
  targetPhaseName?: string;
  targetStageId?: string;
  targetStageName?: string;
  targetField?: string;
  targetValue?: string;
  emailTemplateId?: string;
  taskTemplateId?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  event: AutomationEventType;
  triggerType?: AutomationEventType;
  isActive: boolean;
  conditions?: AutomationCondition[];
  action: AutomationAction;
  actions?: AutomationAction[];
  createdAt: string;
  updatedAt: string;
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  ruleName: string;
  event: AutomationEventType;
  status: 'success' | 'skipped' | 'error';
  timestamp: string;
  entityType: 'project' | 'task' | 'phase' | 'milestone';
  entityId?: string;
  summary: string;
  fingerprint?: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export interface ProjectAttachment {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
  type: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
}

export interface TaskDependency {
  id: string;
  projectId: string;
  sourceId: string;
  sourceType: DependencyEntityType;
  targetId: string;
  targetType: DependencyEntityType;
  kind: DependencyRecordKind;
  dependencyType?: TaskDependencyType;
  relationshipType?: TaskRelationshipType;
  dependencyClass: TaskDependencyClass;
  externalDependency?: boolean;
  isActive: boolean;
  createdBy?: string;
  metadata?: Record<string, string | number | boolean | null>;
  predecessorTaskId?: string;
  successorTaskId?: string;
  lagMinutes?: number;
  lagDays?: number;
  createdAt: string;
  updatedAt: string;
}

export interface GanttDependency {
  id: string;
  projectId: string;
  sourceItemId: string;
  targetItemId: string;
  sourceItemType: GanttItemType;
  targetItemType: GanttItemType;
  dependencyType: GanttDependencyType;
  lagDays?: number;
  createdBy?: string;
  createdAt: string;
}

export interface ProjectGovernance {
  currentPhaseId: GovernancePhaseId | string;
  situation: ProjectSituation;
  phases: GovernancePhaseDefinition[];
  history: GovernanceHistoryEntry[];
}

export interface ProjectExecution {
  eapTemplateId?: string;
  phases: Phase[];
  dependencies?: TaskDependency[];
  ganttDependencies?: GanttDependency[];
  appliedTaskTemplateIds?: string[];
  manualTimelineEntries?: ProjectTimelineEntry[];
}

export interface ProjectKpi {
  id: string;
  projectId: string;
  name: string;
  type: ProjectKpiType;
  description?: string;
  unit?: string;
  baselineValue?: number;
  expectedValue?: number;
  actualValue?: number;
  measurementSource: ProjectKpiMeasurementSource;
  measuredAt?: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectResultEvaluation {
  id: string;
  projectId: string;
  label?: string;
  sequence?: number;
  scheduledAt: string;
  completedAt?: string;
  status: ProjectResultEvaluationStatus;
  responsibleId?: string;
  valueScore?: 1 | 2 | 3 | 4 | 5;
  summary?: string;
  notes?: string;
  isAutoScheduled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectBenefit {
  id: string;
  projectId: string;
  kind: ProjectBenefitKind;
  description: string;
  createdAt: string;
  updatedAt: string;
  realizedAt?: string;
  sourceEvaluationId?: string;
}

export interface ProjectWorkspaceBoardState {
  workspaceId: string;
  stageId: string;
  updatedAt?: string;
}

export interface ProjectTimelineEntry {
  id: string;
  projectId: string;
  title: string;
  startDate?: string; // legado: mantém compatibilidade com linhas antigas
  endDate?: string;   // legado: mantém compatibilidade com linhas antigas
  plannedStartDate?: string;
  actualStartDate?: string;
  plannedEndDate?: string;
  actualEndDate?: string;
  sourceType: 'eap_phase' | 'manual_timeline';
  linkedPhaseId?: string;
  order: number;
  color?: string;
}

export interface TaskTemplateItem {
  id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  assignee?: string;
  assigneeId?: string;
  requestedBy?: string;
  requestedById?: string;
  stakeholders?: string[];
  stakeholderIds?: string[];
  taskTypeId?: string;
  productId?: string;
  teamId?: string;
  tagIds?: string[];
  checklistTitles?: string[];
  targetPhaseName?: string;
  targetMilestoneName?: string;
  targetPhaseId?: string;
  targetMilestoneId?: string;
  subtasks?: TaskTemplateItem[];
}

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  projectTypeId?: string;
  eapTemplateId?: string;
  items: TaskTemplateItem[];
  createdAt: string;
  updatedAt: string;
}

export interface MeetingRoom {
  id: string;
  name: string;
  location?: string;
  capacity?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalPriorityEntry {
  id: string;
  assigneeId: string;
  itemType: OperationalPriorityItemType;
  itemId: string;
  order: number;
  lane?: OperationalPriorityLane;
  flowId?: string;
  flowLabel?: string;
  isWeeklyFocus: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PriorityCycle {
  id: string;
  name: string;
  description?: string;
  type: PriorityCycleType;
  startDate: string;
  endDate: string;
  durationDays?: number;
  createdBy: string;
  teamIds: string[];
  projectIds: string[];
  taskIds: string[];
  userIds: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalPrioritySyncState {
  isOperationallyPrioritized: boolean;
  operationalPriorityOrder?: number;
  prioritySource?: OperationalPrioritySource;
  prioritySourceItemId?: string;
  operationalPriorityEntryId?: string;
  isWeeklyFocus?: boolean;
  isFlowPrioritized?: boolean;
  flowPriorityOrder?: number;
  flowPrioritySource?: OperationalPrioritySource;
  flowPrioritySourceItemId?: string;
  flowPriorityEntryId?: string;
  flowId?: string;
  flowLabel?: string;
  syncedAt?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  creatorId: string;
  participantIds: string[];
  roomId?: string;
  type: CalendarEventType;
  status: CalendarEventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMetrics {
  progress: number;
  tasksTotal: number;
  tasksCompleted: number;
  hoursRemaining: number;
  totalTimeTracked: number;
  hoursRemainingSeconds?: number;
  totalTimeTrackedSeconds?: number;
}

export interface CostSettings {
  defaultInternalHourRate: number;
  defaultExternalHourRate: number;
  monthlyHoursStandard: number;
  updatedAt: string;
}

export interface ProjectCostSnapshot {
  id: string;
  projectId: string;
  periodKey: string;
  totalHours: number;
  totalCostReal: number;
  totalCostBase: number;
  totalCostExternal: number;
  economy: number;
  createdAt: string;
}

export interface ProjectCostFilters {
  startDate?: string;
  endDate?: string;
  userIds?: string[];
  projectIds?: string[];
  teamNames?: string[];
  projectTeamNames?: string[];
  responsibleNames?: string[];
  productNames?: string[];
  query?: string;
}

export interface ProjectCostUserBreakdown {
  user_id: string;
  user_name: string;
  hours: number;
  cost_per_hour: number;
  total_cost: number;
}

export interface ProjectCostReport {
  project_id: string;
  project_name: string;
  total_hours: number;
  total_cost_real: number;
  total_cost_base: number;
  total_cost_external: number;
  economy: number;
  breakdown_by_user: ProjectCostUserBreakdown[];
}

export interface CostsOverviewProjectItem {
  project_id: string;
  name: string;
  total_hours: number;
  cost_real: number;
  cost_internal: number;
  cost_external: number;
  economy: number;
  progress: number;
  status: string;
  team: string;
  responsible: string;
  product?: string;
  efficiency_score: number;
}

export interface CostsOverviewResponse {
  total_hours: number;
  total_cost_real: number;
  total_cost_internal: number;
  total_cost_external: number;
  total_economy: number;
  projects: CostsOverviewProjectItem[];
}

export type AnalyticsPeriod = 'week' | 'month' | 'year';

export interface AnalyticsFilters {
  period: AnalyticsPeriod;
  years: string[];
  projectIds: string[];
  teamNames: string[];
  clientNames: string[];
  productNames: string[];
  responsibleNames: string[];
}

export interface AnalyticsOverview {
  total_projects: number;
  projects_in_progress: number;
  projects_completed: number;
  projects_delayed: number;
  upcoming_deadlines: number;
  total_tasks: number;
  tasks_completed: number;
  tasks_in_progress: number;
}

export interface AnalyticsUserPerformanceItem {
  user_id: string;
  name: string;
  total_hours: number;
  tasks_completed: number;
  tasks_in_progress: number;
  avg_task_time: number;
  productivity_score: number;
}

export interface AnalyticsPerformanceUsersResponse {
  users: AnalyticsUserPerformanceItem[];
}

export interface AnalyticsFlowResponse {
  lead_time_avg: number;
  cycle_time_avg: number;
  throughput: number;
  wip: number;
}

export interface AnalyticsProjectItem {
  project_id: string;
  name: string;
  progress: number;
  delay_status: 'ok' | 'risco' | 'atrasado';
  total_hours: number;
  total_tasks: number;
  completed_tasks: number;
  cost_real: number;
  deadline?: string;
}

export interface AnalyticsProjectsResponse {
  projects: AnalyticsProjectItem[];
}

export interface GovernanceAnalyticsFilters {
  startDate?: string;
  endDate?: string;
  years: string[];
  teamNames: string[];
  projectIds: string[];
  productNames: string[];
  responsibleNames: string[];
  userIds: string[];
  statuses: string[];
  demandTypes: string[];
  clientNames: string[];
  requesterNames: string[];
  search: string;
  includeCancelled?: boolean;
  onlyWeeklyFocus?: boolean;
}

export interface Project {
  // Identificação básica
  id: string;
  name: string;
  group: string;
  logoColor: string;
  logoText?: string;
  
  // Status e situação
  status: ProjectStatus;
  situation?: ProjectSituation;
  governance: ProjectGovernance;
  
  // Responsabilidade
  responsible: string;
  requestedBy?: string;
  client: string;
  teams?: string[];
  stakeholderAssignments?: ProjectStakeholderAssignment[];
  projectRoleAssignments?: ProjectRoleAssignment[];
  // Deprecado - compatibilidade de leitura/migracao
  stakeholders?: string[];
  
  // Contexto do negócio
  purpose?: ProjectPurpose;
  objective?: string;
  justification?: string;
  expectedBenefits?: string[];
  realizedBenefits?: string[];
  benefits?: ProjectBenefit[];
  resultMaturityType?: ProjectResultMaturityType;
  resultStatus?: ProjectResultStatus;
  resultScheduleMode?: ProjectResultScheduleMode;
  resultOwnerId?: string;
  resultCustomEvaluationOffsetsDays?: number[];
  impactLevel?: ProjectImpactLevel;
  nextResultEvaluationAt?: string;
  valueRealizationSummary?: string;
  projectKpis?: ProjectKpi[];
  resultEvaluations?: ProjectResultEvaluation[];
  
  // Informações complementares
  originTicket?: string;
  product?: string;
  skillId?: string;
  skillName?: string;
  demandType?: DemandType;
  description?: string;
  year?: number;
  budget?: number;
  
  // Datas e prazos
  startDate?: string;
  deadline?: string;
  requestDate?: string;
  completionDate?: string;
  deliveredAt?: string;
  
  // Documentação e anexos
  documentation?: string;
  attachments?: ProjectAttachment[];
  
  // Estrutura e execução
  execution: ProjectExecution;
  workspaceBoardStates?: ProjectWorkspaceBoardState[];
  governanceFlowId?: string;
  // Deprecado - compatibilidade de leitura/migração
  eapId?: string;
  // Deprecado - compatibilidade de leitura/migração
  phases?: Phase[];
  
  // Progresso
  metrics: ProjectMetrics;
  // Deprecado - compatibilidade de leitura/migração
  progress: number;
  // Deprecado - compatibilidade de leitura/migração
  tasksTotal: number;
  // Deprecado - compatibilidade de leitura/migração
  tasksCompleted: number;
  // Deprecado - compatibilidade de leitura/migração
  hoursRemaining: number;
  // Deprecado - compatibilidade de leitura/migração
  totalTimeTracked?: number;
  
  // Metadados
  coverImage?: string;
  tags?: string[];
  tagIds?: string[];
  isWeeklyFocus?: boolean;
  weeklyUpdate?: string;
  governanceOrder?: number;
  quadro?: string;
  activities?: ActivityLog[];
  comments?: ProjectComment[];
  
  // Deprecado - manter apenas para compatibilidade
  requester?: string;
  // Deprecado - compatibilidade de leitura/migração
  isPaused?: boolean;
}

export interface FilterState {
  quadro: string;
  group: string;
  client: string;
  responsible: string;
  project: string;
}
