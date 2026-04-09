import {
  ActivityLog,
  AutomationAction,
  AutomationCondition,
  AutomationEventType,
  AutomationExecution,
  AutomationRule,
  AuthEmailMessage,
  EmailTemplate,
  Notification,
  Project,
  TaskStatus,
  User,
  WBSTask,
} from '../types';
import { createProjectCommunicationMessage } from './email';
import {
  getProjectCurrentGovernancePhase,
  getProjectGovernancePhaseId,
  getProjectRequester,
} from './projectSelectors';

interface AutomationRunInput {
  rules: AutomationRule[];
  event: AutomationEventType;
  currentUser?: User;
  users: User[];
  emailTemplates?: EmailTemplate[];
  project?: Project;
  task?: WBSTask;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  automationContext?: {
    depth?: number;
    executedRuleIds?: string[];
  };
}

export type AutomationCommand =
  | {
      type: 'update_task_status';
      status: TaskStatus;
      ruleId: string;
      ruleName: string;
    }
  | {
      type: 'assign_project_team';
      teamId?: string;
      teamName?: string;
      ruleId: string;
      ruleName: string;
    }
  | {
      type: 'move_project_governance_phase';
      phaseId?: string;
      phaseName?: string;
      ruleId: string;
      ruleName: string;
    }
  | {
      type: 'move_project_to_workspace_stage';
      workspaceId?: string;
      workspaceName?: string;
      stageId?: string;
      stageName?: string;
      ruleId: string;
      ruleName: string;
    }
  | {
      type: 'update_project_field';
      field: string;
      value: string;
      ruleId: string;
      ruleName: string;
    }
  | {
      type: 'create_task_from_template';
      taskTemplateId: string;
      ruleId: string;
      ruleName: string;
    };

interface AutomationRunResult {
  projectPatch?: Partial<Project>;
  notifications: Notification[];
  emails: AuthEmailMessage[];
  executions: AutomationExecution[];
  commands: AutomationCommand[];
}

const getValueByPath = (source: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>((value, key) => {
    if (value && typeof value === 'object' && key in (value as Record<string, unknown>)) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, source);

const renderTemplate = (
  template: string | undefined,
  data: Record<string, unknown>
): string | undefined => {
  if (!template) return undefined;
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, rawKey) => {
    const value = getValueByPath(data, rawKey.trim());
    return value == null ? '' : String(value);
  });
};

const evaluateCondition = (
  condition: AutomationCondition,
  data: Record<string, unknown>
): boolean => {
  const rawValue = getValueByPath(data, condition.field);
  const normalized = rawValue == null ? '' : String(rawValue);
  const conditionValues =
    condition.values?.filter(Boolean) ||
    condition.value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  switch (condition.operator) {
    case 'equals':
      return normalized === condition.value;
    case 'not_equals':
      return normalized !== condition.value;
    case 'contains':
      return normalized.toLowerCase().includes(condition.value.toLowerCase());
    case 'in':
      return conditionValues.includes(normalized);
    default:
      return false;
  }
};

const createActivity = (
  action: string,
  details: string,
  entityType: ActivityLog['entityType'],
  entityId?: string,
  user = 'Automação'
): ActivityLog => ({
  id: `automation-activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  timestamp: new Date().toISOString(),
  user,
  action,
  details,
  entityType,
  entityId,
  metadata: {
    automation: true,
  },
});

const resolveNotificationRecipients = (
  action: AutomationAction,
  users: User[],
  currentUser: User | undefined,
  project?: Project
): string[] => {
  if (!action.recipient) return [];

  switch (action.recipient) {
    case 'current_user':
      return currentUser ? [currentUser.id] : [];
    case 'responsible':
      return users.filter((user) => user.name === project?.responsible).map((user) => user.id);
    case 'requester':
      return users
        .filter((user) => user.name === (project ? getProjectRequester(project) : ''))
        .map((user) => user.id);
    case 'admins_and_pmo':
      return users
        .filter((user) => user.status === 'active' && ['admin', 'pmo'].includes(user.role))
        .map((user) => user.id);
    default:
      return [];
  }
};

export const AUTOMATION_EVENT_OPTIONS: Array<{ value: AutomationEventType; label: string }> = [
  { value: 'project.phase.changed', label: 'Mudança de fase do projeto' },
  { value: 'task.status_changed', label: 'Mudança de status da tarefa' },
  { value: 'task.created', label: 'Criação de tarefa' },
  { value: 'task.completed', label: 'Conclusão de tarefa' },
  { value: 'project.approved', label: 'Aprovação de projeto' },
  { value: 'priority.focus.entered', label: 'Entrada em sprint / foco da semana' },
  { value: 'project.created', label: 'Projeto criado' },
  { value: 'project.updated', label: 'Projeto editado' },
  { value: 'project.governance_phase_changed', label: 'Fase macro do projeto alterada' },
  { value: 'project.status_changed', label: 'Status do projeto alterado' },
  { value: 'project.completed', label: 'Projeto concluído' },
  { value: 'task.stage_changed', label: 'Etapa pessoal da tarefa alterada' },
  { value: 'task.assignee.changed', label: 'Responsável da tarefa alterado' },
  { value: 'task.subtask_created', label: 'Subtarefa criada' },
  { value: 'gantt.phase_updated', label: 'Gantt / fase atualizada' },
];

export const AUTOMATION_ACTION_OPTIONS: Array<{ value: AutomationAction['type']; label: string }> = [
  { value: 'send_email', label: 'Enviar e-mail' },
  { value: 'create_notification', label: 'Notificar usuário' },
  { value: 'update_task_status', label: 'Mover tarefa' },
  { value: 'update_project_field', label: 'Atualizar campo' },
  { value: 'create_task_from_template', label: 'Criar tarefa' },
  { value: 'append_project_activity', label: 'Registrar activity no projeto' },
  { value: 'assign_project_team', label: 'Atribuir projeto a uma equipe' },
  { value: 'move_project_governance_phase', label: 'Mover projeto na governança' },
  { value: 'move_project_to_workspace_stage', label: 'Mover projeto para fase local do workspace' },
  { value: 'queue_internal_backlog', label: 'Preparar fila interna / backlog' },
];

export const AUTOMATION_CONDITION_FIELDS = [
  { value: 'project.id', label: 'Projeto' },
  { value: 'project.group', label: 'Equipe do projeto' },
  { value: 'project.product', label: 'Produto do projeto' },
  { value: 'project.governance.currentPhaseId', label: 'Fase do projeto' },
  { value: 'project.governance.currentPhaseName', label: 'Nome da fase do projeto' },
  { value: 'project.governance.situation', label: 'Situação do projeto' },
  { value: 'task.status', label: 'Status da tarefa' },
  { value: 'task.assigneeId', label: 'Responsável da tarefa' },
  { value: 'task.taskType', label: 'Tipo da tarefa' },
  { value: 'metadata.phaseScope', label: 'Escopo da fase alterada' },
  { value: 'metadata.toPhaseId', label: 'Fase de destino' },
  { value: 'metadata.toPhaseName', label: 'Nome da fase de destino' },
  { value: 'metadata.workspaceId', label: 'Workspace / equipe de destino' },
  { value: 'metadata.toWorkspaceStageId', label: 'Fase local de destino' },
];

export function runAutomationRules({
  rules,
  event,
  currentUser,
  users,
  emailTemplates = [],
  project,
  task,
  metadata = {},
  automationContext,
}: AutomationRunInput): AutomationRunResult {
  const matchingRules = rules.filter(
    (rule) => rule.isActive && (rule.triggerType || rule.event) === event
  );
  const data = {
    project: project
      ? {
          ...project,
          governance: {
            ...(project.governance || {}),
            currentPhaseName:
              getProjectCurrentGovernancePhase(project)?.name || getProjectGovernancePhaseId(project),
          },
        }
      : project,
    task: task
      ? {
          ...task,
          personalStage: metadata.toStageId || task.personalStages?.[currentUser?.id || ''] || task.kanbanColumn,
        }
      : task,
    metadata,
    currentUser,
  };

  const notifications: Notification[] = [];
  const emails: AuthEmailMessage[] = [];
  const activities: ActivityLog[] = [];
  const executions: AutomationExecution[] = [];
  const commands: AutomationCommand[] = [];
  const nextTags = new Set(project?.tags || []);
  const depth = automationContext?.depth || 0;
  const executedRuleIds = new Set(automationContext?.executedRuleIds || []);

  matchingRules.forEach((rule) => {
    const entityId = project?.id || task?.id || 'unknown';
    const fingerprint = [
      event,
      rule.id,
      entityId,
      metadata.projectId,
      metadata.toPhaseId,
      metadata.toWorkspaceStageId,
      metadata.toStatus,
    ]
      .filter(Boolean)
      .join(':');

    if (depth > 5 || executedRuleIds.has(rule.id)) {
      executions.push({
        id: `automation-execution-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        event,
        status: 'skipped',
        timestamp: new Date().toISOString(),
        entityType: project ? 'project' : task ? 'task' : 'phase',
        entityId: project?.id || task?.id,
        summary: 'Regra ignorada por proteção contra loop',
        fingerprint,
      });
      return;
    }

    const conditionsPassed = (rule.conditions || []).every((condition) =>
      evaluateCondition(condition, data as unknown as Record<string, unknown>)
    );

    if (!conditionsPassed) {
      executions.push({
        id: `automation-execution-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        event,
        status: 'skipped',
        timestamp: new Date().toISOString(),
        entityType: project ? 'project' : task ? 'task' : 'phase',
        entityId: project?.id || task?.id,
        summary: 'Regra ignorada: condição não atendida',
        fingerprint,
      });
      return;
    }

    const payload = {
      project,
      task,
      metadata,
      currentUser,
    };

    const ruleActions = rule.actions?.length ? rule.actions : [rule.action];

    ruleActions.forEach((action) => {
      switch (action.type) {
      case 'append_project_activity': {
        if (project) {
          const activity = createActivity(
            renderTemplate(action.title, payload as unknown as Record<string, unknown>) || rule.name,
            renderTemplate(action.details, payload as unknown as Record<string, unknown>) ||
              'Automação executada no projeto',
            'project',
            project.id
          );
          activities.push(activity);
        }
        break;
      }

      case 'create_notification': {
        const recipientIds = resolveNotificationRecipients(action, users, currentUser, project);
        recipientIds.forEach((userId) => {
          notifications.push({
            id: `automation-notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            userId,
            type: 'automation_triggered',
            title:
              renderTemplate(action.title, payload as unknown as Record<string, unknown>) ||
              rule.name,
            description:
              renderTemplate(action.message, payload as unknown as Record<string, unknown>) ||
              'Automação executada',
            entityType: project ? 'project' : task ? 'task' : 'automation',
            entityId: project?.id || task?.id,
            isRead: false,
            createdAt: new Date().toISOString(),
            linkTo: renderTemplate(
              action.linkTo,
              payload as unknown as Record<string, unknown>
            ),
          });
        });
        break;
      }

      case 'send_email': {
        if (!project || !action.emailTemplateId) break;
        const template = emailTemplates.find(
          (candidate) => candidate.id === action.emailTemplateId && candidate.ativo
        );
        if (!template) break;

        const recipients = new Set<string>();
        const recipientsConfig = action.recipients || [];
        if (recipientsConfig.includes('responsible') && project.responsible) {
          const user = users.find((candidate) => candidate.name === project.responsible);
          if (user?.email) recipients.add(user.email);
        }
        if (recipientsConfig.includes('requester')) {
          const requesterName = getProjectRequester(project);
          const user = users.find((candidate) => candidate.name === requesterName);
          if (user?.email) recipients.add(user.email);
        }
        if (recipientsConfig.includes('stakeholders')) {
          const stakeholderNames = [
            ...(project.stakeholderAssignments || []).map((assignment) => assignment.name),
            ...(project.stakeholders || []),
          ];
          users
            .filter((candidate) => stakeholderNames.includes(candidate.name) && candidate.email)
            .forEach((candidate) => recipients.add(candidate.email));
        }
        if (recipientsConfig.includes('current_user') && currentUser?.email) {
          recipients.add(currentUser.email);
        }
        if (recipientsConfig.includes('admins_and_pmo')) {
          users
            .filter((candidate) => ['admin', 'pmo'].includes(candidate.role) && candidate.email)
            .forEach((candidate) => recipients.add(candidate.email));
        }
        (action.customEmails || []).forEach((email) => {
          if (email.trim()) recipients.add(email.trim());
        });

        if (recipients.size > 0) {
          emails.push(
            createProjectCommunicationMessage({
              to: Array.from(recipients),
              project,
              template,
              initiatedBy: currentUser?.name || 'Automação',
              kind: 'automation',
            })
          );
        }
        break;
      }

      case 'queue_internal_backlog': {
        if (project) {
          const tag = action.tag || 'automacao:backlog-interno';
          nextTags.add(tag);
          activities.push(
            createActivity(
              'Preparação automática de backlog interno',
              `Projeto preparado para fila interna "${action.queueName || 'Backlog interno'}"`,
              'project',
              project.id
            )
          );
        }
        break;
      }

      case 'update_task_status': {
        if (task && action.targetStatus) {
          commands.push({
            type: 'update_task_status',
            status: action.targetStatus as TaskStatus,
            ruleId: rule.id,
            ruleName: rule.name,
          });
        }
        break;
      }

      case 'assign_project_team': {
        if (project) {
          commands.push({
            type: 'assign_project_team',
            teamId: action.targetTeamId,
            teamName: action.targetTeamName,
            ruleId: rule.id,
            ruleName: rule.name,
          });
        }
        break;
      }

      case 'move_project_governance_phase': {
        if (project) {
          commands.push({
            type: 'move_project_governance_phase',
            phaseId: action.targetPhaseId,
            phaseName: action.targetPhaseName,
            ruleId: rule.id,
            ruleName: rule.name,
          });
        }
        break;
      }

      case 'move_project_to_workspace_stage': {
        if (project) {
          commands.push({
            type: 'move_project_to_workspace_stage',
            workspaceId: action.targetWorkspaceId,
            workspaceName: action.targetWorkspaceName,
            stageId: action.targetStageId,
            stageName: action.targetStageName,
            ruleId: rule.id,
            ruleName: rule.name,
          });
        }
        break;
      }

      case 'update_project_field': {
        if (project && action.targetField) {
          commands.push({
            type: 'update_project_field',
            field: action.targetField,
            value: action.targetValue || '',
            ruleId: rule.id,
            ruleName: rule.name,
          });
        }
        break;
      }

      case 'create_task_from_template': {
        if (project && action.taskTemplateId) {
          commands.push({
            type: 'create_task_from_template',
            taskTemplateId: action.taskTemplateId,
            ruleId: rule.id,
            ruleName: rule.name,
          });
        }
        break;
      }
      }
    });

    executions.push({
      id: `automation-execution-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      event,
      status: 'success',
      timestamp: new Date().toISOString(),
      entityType: project ? 'project' : task ? 'task' : 'phase',
      entityId: project?.id || task?.id,
      summary: `Regra executada com ${ruleActions.length} ação(ões)`,
      fingerprint,
    });
  });

  const projectPatch: Partial<Project> | undefined = project
    ? {
        activities: activities.length > 0 ? [...(project.activities || []), ...activities] : project.activities,
        tags: nextTags.size > 0 ? Array.from(nextTags) : project.tags,
      }
    : undefined;

  return {
    projectPatch,
    notifications,
    emails,
    executions,
    commands,
  };
}
