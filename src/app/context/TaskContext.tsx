import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import {
  DependencyEntityType,
  ActivityLog,
  AssigneeTransferHistoryEntry,
  ChecklistItem,
  Comment,
  DemandType,
  OperationalPrioritySyncState,
  Project,
  Subtask,
  TaskScopeStatus,
  TaskDependency,
  TaskDependencyClass,
  TaskDependencyType,
  TaskTemplate,
  TimeLog,
  WBSTask,
} from '../types';
import { useProjects } from './ProjectContext';
import { useAdmin } from './AdminContext';
import { STORAGE_KEYS, STORAGE_VERSIONS } from '../constants/project';
import {
  AutomationCommand,
  canTaskNodeBeCompleted,
  buildTaskHierarchy,
  findTaskNode,
  getTaskNodeOwnTrackedSeconds,
  getTaskNodeScopeStatus,
  isTaskNodeDeleted,
  isTaskNodeOperationallyVisible,
  getTaskNodeTotalTrackedSeconds,
  insertSubtask,
  removeSubtaskTree,
  updateSubtaskTree,
} from '../selectors/taskSelectors';
import { calculateProjectMetricsFromExecution } from '../utils/progressCalculator';
import { getProjectExecutionPhases } from '../utils/projectSelectors';
import { runAutomationRules } from '../utils/automationEngine';
import { applyTaskTemplateToProject as applyTaskTemplateToProjectEngine } from '../utils/taskTemplateEngine';
import { createNotification, extractMentionedUsers } from '../utils/notifications';
import {
  CreateProjectDependencyInput,
  DependencyNode,
  createDependency,
  createProjectDependency,
  getBlockedReason,
  getDependencyConflicts,
  getTaskRelationships,
  getTaskPredecessors,
  getTaskSuccessors,
  isTaskBlocked,
  normalizeDependencyRecord,
} from '../utils/taskDependencies';
import {
  getTaskStatusFromVisualColumn,
  getTaskStatusProgressValue,
  getTaskVisualColumn,
  isTaskBlockedStatus,
  isTaskDoneStatus,
  isTaskInProgressStatus,
  normalizeTaskStatus,
} from '../utils/taskStatus';
import { applyPriorityCycleFocusToTaskEntities } from '../utils/priorityCycles';
import { formatDurationSummary, formatDurationHours, normalizeTimeLogs } from '../utils/timeTracking';
import { useIntegration } from './IntegrationContext';
import { findWeeklyAssignmentForDemand } from '../utils/weeklyDemandRouting';
import { normalizeDemandTriage } from '../utils/demandTriage';

interface TaskContextType {
  allTasks: EnrichedTask[];
  independentTasks: WBSTask[];
  addIndependentTask: (task: WBSTask) => void;
  duplicateTask: (taskId: string) => string | null;
  updateTask: (taskId: string, updates: Partial<WBSTask>) => void;
  deleteTask: (taskId: string) => void;
  setTaskScopeStatus: (
    taskId: string,
    scopeStatus: Exclude<TaskScopeStatus, 'active'>,
    reason?: string
  ) => void;
  restoreTaskScope: (taskId: string) => void;
  getTaskImpactSummary: (taskId: string) => {
    subtasks: number;
    timeLogs: number;
    comments: number;
    attachments: number;
    activities: number;
    dependencies: number;
    hasImpact: boolean;
  };
  toggleSubtaskCompletion: (taskId: string, subtaskId: string) => void;
  addSubtask: (
    taskId: string,
    title: string,
    parentSubtaskId?: string,
    assignee?: string
  ) => void;
  updateSubtask: (taskId: string, subtaskId: string, updates: Partial<Subtask>) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  addChecklistItem: (taskId: string, item: ChecklistItem, subtaskId?: string) => void;
  toggleChecklistItem: (taskId: string, checklistItemId: string, subtaskId?: string) => void;
  deleteChecklistItem: (taskId: string, checklistItemId: string, subtaskId?: string) => void;
  addComment: (taskId: string, comment: Comment, subtaskId?: string) => void;
  addManualTimeLog: (taskId: string, durationSeconds: number, subtaskId?: string) => void;
  startTimeTracking: (taskId: string) => void;
  stopTimeTracking: (taskId: string) => void;
  getTrackingState: (taskId: string) => { isTracking: boolean; sessions: TimeLog[]; activeSession?: TimeLog };
  getTaskById: (taskId: string) => EnrichedTask | undefined;
  getTasksForProject: (projectId: string) => WBSTask[];
  getTasksForPhase: (projectId: string, phaseId: string) => WBSTask[];
  getTasksForMilestone: (
    projectId: string,
    phaseId: string,
    milestoneId: string
  ) => WBSTask[];
  reorderTasksInGroup: (
    projectId: string,
    phaseId: string,
    milestoneId: string | undefined,
    taskIds: string[]
  ) => void;
  moveTaskInGroup: (
    projectId: string,
    phaseId: string,
    milestoneId: string | undefined,
    taskId: string,
    direction: 'up' | 'down'
  ) => void;
  moveIndependentTask: (taskId: string, direction: 'up' | 'down') => void;
  updatePersonalTaskStage: (taskId: string, stageId: string) => void;
  getProjectDependencies: (projectId: string) => TaskDependency[];
  addProjectDependency: (input: CreateProjectDependencyInput) => {
    success: boolean;
    reason?: string;
    dependency?: TaskDependency;
  };
  addTaskDependency: (input: {
    projectId: string;
    predecessorTaskId: string;
    successorTaskId: string;
    dependencyType: TaskDependencyType;
    dependencyClass: TaskDependencyClass;
    lagDays?: number;
    lagMinutes?: number;
  }) => { success: boolean; reason?: string; dependency?: TaskDependency };
  removeTaskDependency: (projectId: string, dependencyId: string) => void;
  removeProjectDependency: (projectId: string, dependencyId: string) => void;
  applyTaskTemplateToProject: (projectId: string, template: TaskTemplate) => {
    createdTasks: number;
    skippedTasks: number;
    alreadyApplied: boolean;
  };
}

export interface EnrichedTask extends WBSTask, Partial<OperationalPrioritySyncState> {
  projectName?: string;
  projectGroup?: string;
  phaseName?: string;
  milestoneName?: string;
  rootTaskId?: string;
  isSubtaskNode?: boolean;
  projectId?: string;
  phaseId?: string;
  tags?: string[];
  timeTracking?: TimeLog[];
  isTracking?: boolean;
  kanbanColumn?: string;
  isLinkedToProject?: boolean;
  personalStatus?: string;
  projectStatus?: string;
  itemTypeLabel?: 'Tarefa' | 'Subtarefa' | 'Subnivel';
  hierarchyDepth?: number;
  hierarchyPath?: string[];
  hierarchyBreadcrumb?: string;
  predecessorDependencies?: TaskDependency[];
  successorDependencies?: TaskDependency[];
  relationships?: TaskDependency[];
  dependencyConflicts?: ReturnType<typeof getDependencyConflicts>;
  isDependencyBlocked?: boolean;
  dependencyBlockedReason?: string | null;
  canStartByDependency?: boolean;
  canFinishByDependency?: boolean;
  ownTimeSeconds?: number;
  totalTimeSeconds?: number;
  projectTotalTimeSeconds?: number;
}

interface StorageEnvelope<T> {
  version: number;
  data: T;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

const createEntityId = (prefix: string) =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizePersonalStages = (value?: Record<string, string>) =>
  value && typeof value === 'object' ? value : {};

const getDefaultPersonalStage = (status?: string, legacyColumn?: string) => {
  if (legacyColumn) return legacyColumn;
  return getTaskVisualColumn(status);
};

const normalizeSubtasks = (subtasks: Subtask[] = []): Subtask[] =>
  subtasks.map((subtask) => ({
    ...subtask,
    analystOwnerId: subtask.analystOwnerId,
    analystOwnerName: subtask.analystOwnerName || subtask.requestedBy,
    technicalOwnerId: subtask.technicalOwnerId || subtask.assigneeId,
    technicalOwnerName: subtask.technicalOwnerName || subtask.assignee,
    technicalOwnerSource:
      subtask.technicalOwnerSource || (subtask.technicalOwnerId || subtask.assigneeId ? 'legacy' : undefined),
    assignee: subtask.technicalOwnerName || subtask.assignee,
    assigneeId: subtask.technicalOwnerId || subtask.assigneeId,
    suggestedDemandType:
      normalizeDemandTriage({
        ...subtask,
        subtasks: subtask.subtasks || [],
        status: normalizeTaskStatus(subtask.status, subtask.completed),
        completed: isTaskDoneStatus(subtask.status, subtask.completed),
      } as WBSTask).suggestedDemandType,
    expectedBusinessImpact: subtask.expectedBusinessImpact || subtask.expectedImpactLevel,
    expectedImpactLevel: subtask.expectedImpactLevel || subtask.expectedBusinessImpact,
    triageStatus:
      subtask.triageStatus ||
      (subtask.triageComplexity || subtask.expectedBusinessImpact || subtask.scopeLevel || subtask.valueIntent
        ? 'completed'
        : 'pending'),
    originTicket: subtask.originTicket ?? false,
    status: normalizeTaskStatus(subtask.status, subtask.completed),
    completed: isTaskDoneStatus(subtask.status, subtask.completed),
    taskType: subtask.taskType || 'project',
    sprintStatus:
      subtask.sprintStatus ||
      getTaskVisualColumn(subtask.status, subtask.completed),
    sprintOrder: subtask.sprintOrder ?? 0,
    subtasks: normalizeSubtasks(subtask.subtasks || []),
    tags: subtask.tags || [],
    tagIds: subtask.tagIds || [],
    checklistItems: subtask.checklistItems || [],
    comments: subtask.comments || [],
    attachments: subtask.attachments || [],
    timeLogs: normalizeTimeLogs(subtask.timeLogs || []),
    activities: subtask.activities || [],
    assigneeHistory: subtask.assigneeHistory || [],
    followerUserIds: subtask.followerUserIds || [],
    personalStages: normalizePersonalStages(subtask.personalStages),
    autoCompleteFromChildren: subtask.autoCompleteFromChildren ?? false,
    isWeeklyFocus: Boolean(subtask.isWeeklyFocus),
    originType: subtask.originType || (subtask.isTemplateInstance ? 'template' : 'manual'),
    templateTaskId: subtask.templateTaskId,
    isTemplateInstance: Boolean(subtask.isTemplateInstance || subtask.templateTaskId),
    scopeStatus: subtask.scopeStatus || 'active',
    removedFromScopeAt: subtask.removedFromScopeAt,
    removedFromScopeBy: subtask.removedFromScopeBy,
    removalReason: subtask.removalReason,
    deletedAt: subtask.deletedAt,
    deletedBy: subtask.deletedBy,
  }));

const normalizeTask = (task: WBSTask): WBSTask => ({
  ...normalizeDemandTriage(task),
  analystOwnerId: task.analystOwnerId,
  analystOwnerName: task.analystOwnerName || task.requestedBy,
  technicalOwnerId: task.technicalOwnerId || task.assigneeId,
  technicalOwnerName: task.technicalOwnerName || task.assignee,
  technicalOwnerSource:
    task.technicalOwnerSource || (task.technicalOwnerId || task.assigneeId ? 'legacy' : undefined),
  assignee: task.technicalOwnerName || task.assignee,
  assigneeId: task.technicalOwnerId || task.assigneeId,
  expectedBusinessImpact: task.expectedBusinessImpact || task.expectedImpactLevel,
  expectedImpactLevel: task.expectedImpactLevel || task.expectedBusinessImpact,
  originTicket: task.originTicket ?? false,
  status: normalizeTaskStatus(task.status, (task as WBSTask & { completed?: boolean }).completed),
  taskType: task.taskType || (task.projectId ? 'project' : 'personal'),
  sprintStatus:
    task.sprintStatus ||
    getTaskVisualColumn(task.status, (task as WBSTask & { completed?: boolean }).completed),
  sprintOrder: task.sprintOrder ?? 0,
  subtasks: normalizeSubtasks(task.subtasks || []),
  tags: task.tags || [],
  tagIds: task.tagIds || [],
  checklistItems: task.checklistItems || [],
  comments: task.comments || [],
  attachments: task.attachments || [],
  timeLogs: normalizeTimeLogs(task.timeLogs || []),
  activities: task.activities || [],
  assigneeHistory: task.assigneeHistory || [],
  followerUserIds: task.followerUserIds || [],
  personalStages: normalizePersonalStages(task.personalStages),
  autoCompleteFromChildren: task.autoCompleteFromChildren ?? false,
  isWeeklyFocus: Boolean(task.isWeeklyFocus),
  originType: task.originType || (task.isTemplateInstance ? 'template' : 'manual'),
  templateTaskId: task.templateTaskId,
  isTemplateInstance: Boolean(task.isTemplateInstance || task.templateTaskId),
  scopeStatus: task.scopeStatus || 'active',
  removedFromScopeAt: task.removedFromScopeAt,
  removedFromScopeBy: task.removedFromScopeBy,
  removalReason: task.removalReason,
  deletedAt: task.deletedAt,
  deletedBy: task.deletedBy,
});

const resolveTaskDemandType = (task: Pick<WBSTask, 'demandType'>, project?: Pick<Project, 'demandType'>): DemandType | undefined =>
  task.demandType || project?.demandType;

const cloneChecklistForDuplication = (items: ChecklistItem[] = []) =>
  items.map((item) => ({
    ...item,
    id: createEntityId('checklist'),
    completed: false,
  }));

const cloneSubtaskForDuplication = (subtask: Subtask): Subtask => ({
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
  checklistItems: cloneChecklistForDuplication(subtask.checklistItems || []),
  subtasks: (subtask.subtasks || []).map(cloneSubtaskForDuplication),
});

const cloneTaskForDuplication = (task: WBSTask): WBSTask =>
  normalizeTask({
    ...task,
    id: createEntityId('task'),
    title: `${task.title} (cópia)`,
    completed: false,
    status: 'not_started',
    startDate: undefined,
    timeLogs: [],
    comments: [],
    attachments: [],
    activities: [],
    checklistItems: cloneChecklistForDuplication(task.checklistItems || []),
    subtasks: (task.subtasks || []).map(cloneSubtaskForDuplication),
  });

const getNodeOwnStatus = (node: WBSTask | Subtask) =>
  normalizeTaskStatus(node.status, node.completed);

const getNodeTypeLabel = (depth: number): EnrichedTask['itemTypeLabel'] => {
  if (depth <= 0) return 'Tarefa';
  if (depth === 1) return 'Subtarefa';
  return 'Subnivel';
};

const buildHierarchyBreadcrumb = (
  path: string[],
  projectName?: string,
  phaseName?: string,
  milestoneName?: string
) =>
  [projectName, phaseName, milestoneName, ...path].filter(Boolean).join(' > ');

const applyAutoCompletionToSubtasks = (subtasks: Subtask[] = []): Subtask[] =>
  subtasks.map((subtask) => {
    const nextChildren = applyAutoCompletionToSubtasks(subtask.subtasks || []);
    const allChildrenDone =
      nextChildren.length > 0 && nextChildren.every((child) => canTaskNodeBeCompleted(child) && isTaskDoneStatus(getNodeOwnStatus(child)));

    const shouldAutoComplete = subtask.autoCompleteFromChildren && allChildrenDone;

    return {
      ...subtask,
      subtasks: nextChildren,
      completed: shouldAutoComplete ? true : subtask.completed,
      status: shouldAutoComplete ? 'done' : getNodeOwnStatus(subtask),
    };
  });

const collectSubtaskIds = (subtasks: Subtask[] = []): string[] =>
  subtasks.flatMap((subtask) => [subtask.id, ...collectSubtaskIds(subtask.subtasks || [])]);

const countNestedNodes = (subtasks: Subtask[] = []): number =>
  subtasks.reduce((total, subtask) => total + 1 + countNestedNodes(subtask.subtasks || []), 0);

const collectNodeArtifacts = (node: WBSTask | Subtask) => {
  const subtasks = node.subtasks || [];
  return subtasks.reduce(
    (totals, child) => {
      const nested = collectNodeArtifacts(child);
      return {
        subtasks: totals.subtasks + 1 + nested.subtasks,
        timeLogs: totals.timeLogs + nested.timeLogs,
        comments: totals.comments + nested.comments,
        attachments: totals.attachments + nested.attachments,
        activities: totals.activities + nested.activities,
      };
    },
    {
      subtasks: 0,
      timeLogs: (node.timeLogs || []).length,
      comments: (node.comments || []).length,
      attachments: (node.attachments || []).length,
      activities: (node.activities || []).length,
    }
  );
};

const updateScopeStateInTree = (
  items: Subtask[],
  subtaskId: string,
  updater: (subtask: Subtask) => Subtask
): Subtask[] =>
  items.map((item) => {
    if (item.id === subtaskId) {
      return updater(item);
    }

    return {
      ...item,
      subtasks: updateScopeStateInTree(item.subtasks || [], subtaskId, updater),
    };
  });

const enrichSubtaskTree = (
  subtasks: Subtask[],
  context: {
    projectName?: string;
    projectGroup?: string;
    projectId?: string;
    phaseName?: string;
    phaseId?: string;
    milestoneName?: string;
    milestoneId?: string;
    isLinkedToProject: boolean;
    rootTaskId: string;
    parentTaskId?: string;
    ancestorPath: string[];
    trackingSessions: Record<string, TimeLog[]>;
    activeTracking: Record<string, boolean>;
    currentUserId?: string;
    userIdByName: Map<string, string>;
  }
): EnrichedTask[] =>
  subtasks.flatMap((subtask, index) => {
    const normalizedSubtask = normalizeSubtasks([subtask])[0];
    const hierarchyPath = [...context.ancestorPath];
    const resolvedAssigneeId =
      normalizedSubtask.assigneeId ||
      context.userIdByName.get(normalizedSubtask.assignee || '') ||
      undefined;
    const personalStatus = getTaskVisualColumn(normalizedSubtask.status, normalizedSubtask.completed);
    const enrichedSubtask: EnrichedTask = {
      ...(normalizedSubtask as unknown as EnrichedTask),
      assigneeId: resolvedAssigneeId,
      projectName: context.projectName,
      projectGroup: context.projectGroup,
      projectId: context.projectId,
      phaseName: context.phaseName,
      phaseId: context.phaseId,
      milestoneName: context.milestoneName,
      milestoneId: context.milestoneId,
      isLinkedToProject: context.isLinkedToProject,
      rootTaskId: context.rootTaskId,
      parentTaskId: context.parentTaskId,
      isSubtaskNode: true,
      projectStatus: normalizedSubtask.status,
      personalStatus,
      kanbanColumn: personalStatus,
      hierarchyDepth: hierarchyPath.length,
      hierarchyPath,
      hierarchyBreadcrumb: buildHierarchyBreadcrumb(
        hierarchyPath,
        context.projectName,
        context.phaseName,
        context.milestoneName
      ),
      itemTypeLabel: getNodeTypeLabel(hierarchyPath.length),
      timeTracking: context.trackingSessions[normalizedSubtask.id] || normalizedSubtask.timeLogs || [],
      isTracking: context.activeTracking[normalizedSubtask.id] || false,
    };

    return [
      enrichedSubtask,
      ...enrichSubtaskTree(normalizedSubtask.subtasks || [], {
        ...context,
        parentTaskId: normalizedSubtask.id,
        ancestorPath: [...hierarchyPath, normalizedSubtask.title],
      }),
    ];
  });

const finalizeRootTask = (task: WBSTask): WBSTask => {
  const normalizedTask = normalizeTask(task);
  const nextSubtasks = applyAutoCompletionToSubtasks(normalizedTask.subtasks || []);
  const allChildrenDone =
    nextSubtasks.length > 0 &&
    nextSubtasks.every((subtask) => canTaskNodeBeCompleted(subtask) && isTaskDoneStatus(getNodeOwnStatus(subtask)));
  const shouldAutoComplete = normalizedTask.autoCompleteFromChildren && allChildrenDone;

  return normalizeTask({
    ...normalizedTask,
    subtasks: nextSubtasks,
    status: shouldAutoComplete ? 'done' : normalizedTask.status,
    completionDate:
      shouldAutoComplete && !normalizedTask.completionDate
        ? new Date().toISOString()
        : normalizedTask.completionDate,
    actualHours: formatDurationHours(getTaskNodeTotalTrackedSeconds({
      ...normalizedTask,
      subtasks: nextSubtasks,
      status: shouldAutoComplete ? 'done' : normalizedTask.status,
    })),
  });
};

const createActivity = (
  user: string,
  action: string,
  details: string,
  entityType: ActivityLog['entityType'],
  entityId?: string
): ActivityLog => ({
  id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  timestamp: new Date().toISOString(),
  user: user || 'Sistema',
  action,
  details,
  entityType,
  entityId,
});

const createAssigneeTransferEntry = (
  fromAssignee?: string,
  toAssignee?: string,
  changedBy?: string
): AssigneeTransferHistoryEntry => ({
  id: `assignee-transfer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  changedAt: new Date().toISOString(),
  fromAssignee,
  toAssignee,
  changedBy,
});

const appendActivityToTaskNode = (
  task: WBSTask,
  activity: ActivityLog,
  subtaskId?: string
): WBSTask => {
  if (!subtaskId) {
    return normalizeTask({
      ...task,
      activities: [...(task.activities || []), activity],
    });
  }

  return normalizeTask({
    ...task,
    activities: [...(task.activities || []), activity],
    subtasks: updateSubtaskTree(task.subtasks || [], subtaskId, (subtask) => ({
      ...subtask,
      activities: [...(subtask.activities || []), activity],
    })),
  });
};

const mockIndependentTasks: WBSTask[] = [
  {
    id: 'skill-task-credit-rules',
    title: 'Refinar regras de aprovação automática',
    description: 'Ajustar thresholds por faixa de renda e histórico transacional.',
    skillId: 'skill-credit-analysis',
    skillName: 'Análise de crédito',
    status: 'in_progress',
    assignee: 'João Silva',
    assigneeId: '2',
    requestedBy: 'Guilherme Drehmer',
    priority: 'high',
    startDate: '2026-03-24',
    dueDate: '2026-04-03',
    order: 0,
    projectId: 'skill-project-credit-score-v2',
    comments: [],
    attachments: [],
    checklistItems: [],
    timeLogs: [],
    subtasks: [],
    activities: [
      {
        id: 'skill-task-credit-rules-activity-1',
        timestamp: '2026-03-29T10:20:00.000Z',
        user: 'João Silva',
        action: 'atualizou a tarefa',
        details: 'Incluiu nova regra para clientes com histórico recente de inadimplência.',
        entityType: 'task',
        entityId: 'skill-task-credit-rules',
      },
    ],
  },
  {
    id: 'skill-task-credit-bureau-mapping',
    title: 'Mapear payload do bureau externo',
    description: 'Consolidar campos obrigatórios e erros esperados da consulta.',
    skillId: 'skill-credit-analysis',
    skillName: 'Análise de crédito',
    status: 'not_started',
    assignee: 'Maria Santos',
    assigneeId: '3',
    requestedBy: 'João Silva',
    priority: 'medium',
    startDate: '2026-04-04',
    dueDate: '2026-04-10',
    order: 1,
    projectId: 'skill-project-bureau-integration',
    comments: [],
    attachments: [],
    checklistItems: [],
    timeLogs: [],
    subtasks: [],
    activities: [],
  },
  {
    id: 'skill-task-credit-fraud-retro',
    title: 'Encerrar retro de fraude com operação',
    description: 'Registrar aprendizados da implantação das novas regras antifraude.',
    skillId: 'skill-credit-analysis',
    skillName: 'Análise de crédito',
    status: 'done',
    assignee: 'Guilherme Drehmer',
    assigneeId: '1',
    requestedBy: 'Maria Santos',
    priority: 'low',
    startDate: '2026-02-18',
    dueDate: '2026-02-25',
    completionDate: '2026-02-24T16:40:00.000Z',
    order: 2,
    projectId: 'skill-project-fraud-reduction',
    comments: [],
    attachments: [],
    checklistItems: [],
    timeLogs: [],
    subtasks: [],
    activities: [
      {
        id: 'skill-task-credit-fraud-retro-activity-1',
        timestamp: '2026-02-24T16:40:00.000Z',
        user: 'Guilherme Drehmer',
        action: 'concluiu a tarefa',
        details: 'Retro concluída e ações incorporadas ao playbook de crédito.',
        entityType: 'task',
        entityId: 'skill-task-credit-fraud-retro',
      },
    ],
  },
  {
    id: 'skill-task-integration-contract',
    title: 'Versionar contrato ERP x CRM',
    description: 'Fechar versão estável do schema para pedidos, clientes e status.',
    skillId: 'skill-system-integration',
    skillName: 'Integração de sistemas',
    status: 'in_progress',
    assignee: 'Maria Santos',
    assigneeId: '3',
    requestedBy: 'Guilherme Drehmer',
    priority: 'high',
    startDate: '2026-03-26',
    dueDate: '2026-04-02',
    order: 3,
    projectId: 'skill-project-erp-crm-sync',
    comments: [],
    attachments: [],
    checklistItems: [],
    timeLogs: [],
    subtasks: [],
    activities: [
      {
        id: 'skill-task-integration-contract-activity-1',
        timestamp: '2026-03-30T09:10:00.000Z',
        user: 'Maria Santos',
        action: 'criou revisão técnica',
        details: 'Contrato ajustado para suportar novos eventos de cliente.',
        entityType: 'task',
        entityId: 'skill-task-integration-contract',
      },
    ],
  },
  {
    id: 'skill-task-webhook-retry',
    title: 'Definir política de retry dos webhooks',
    description: 'Formalizar tentativas, backoff e alerta operacional para falhas.',
    skillId: 'skill-system-integration',
    skillName: 'Integração de sistemas',
    status: 'not_started',
    assignee: 'João Silva',
    assigneeId: '2',
    requestedBy: 'Guilherme Drehmer',
    priority: 'medium',
    startDate: '2026-04-08',
    dueDate: '2026-04-14',
    order: 4,
    projectId: 'skill-project-webhooks-operational',
    comments: [],
    attachments: [],
    checklistItems: [],
    timeLogs: [],
    subtasks: [],
    activities: [],
  },
  {
    id: 'skill-task-settlement-playbook',
    title: 'Atualizar playbook de suporte da liquidação',
    description: 'Registrar fallback operacional para falhas de integração financeira.',
    skillId: 'skill-system-integration',
    skillName: 'Integração de sistemas',
    status: 'done',
    assignee: 'Guilherme Drehmer',
    assigneeId: '1',
    requestedBy: 'Maria Santos',
    priority: 'low',
    startDate: '2026-01-20',
    dueDate: '2026-01-28',
    completionDate: '2026-01-28T15:00:00.000Z',
    order: 5,
    projectId: 'skill-project-settlement-hub',
    comments: [],
    attachments: [],
    checklistItems: [],
    timeLogs: [],
    subtasks: [],
    activities: [
      {
        id: 'skill-task-settlement-playbook-activity-1',
        timestamp: '2026-01-28T15:00:00.000Z',
        user: 'Guilherme Drehmer',
        action: 'concluiu a tarefa',
        details: 'Playbook repassado para operação e suporte N1.',
        entityType: 'task',
        entityId: 'skill-task-settlement-playbook',
      },
    ],
  },
  {
    id: 'skill-task-onboarding-docs',
    title: 'Automatizar checklist documental PF',
    description: 'Reduzir retrabalho no envio e validação de documentos de entrada.',
    skillId: 'skill-client-onboarding',
    skillName: 'Onboarding de cliente',
    status: 'in_progress',
    assignee: 'Maria Santos',
    assigneeId: '3',
    requestedBy: 'Guilherme Drehmer',
    priority: 'high',
    startDate: '2026-03-25',
    dueDate: '2026-04-01',
    order: 6,
    projectId: 'skill-project-digital-onboarding-pf',
    comments: [],
    attachments: [],
    checklistItems: [],
    timeLogs: [],
    subtasks: [],
    activities: [
      {
        id: 'skill-task-onboarding-docs-activity-1',
        timestamp: '2026-03-28T08:35:00.000Z',
        user: 'Maria Santos',
        action: 'moveu a tarefa para execução',
        details: 'Fluxo automático habilitado para CPF e comprovante.',
        entityType: 'task',
        entityId: 'skill-task-onboarding-docs',
      },
    ],
  },
  {
    id: 'skill-task-onboarding-enterprise-map',
    title: 'Mapear handoff comercial → implantação',
    description: 'Desenhar o fluxo de passagem do cliente enterprise para ativação.',
    skillId: 'skill-client-onboarding',
    skillName: 'Onboarding de cliente',
    status: 'not_started',
    assignee: 'João Silva',
    assigneeId: '2',
    requestedBy: 'Maria Santos',
    priority: 'medium',
    startDate: '2026-04-02',
    dueDate: '2026-04-09',
    order: 7,
    projectId: 'skill-project-enterprise-activation',
    comments: [],
    attachments: [],
    checklistItems: [],
    timeLogs: [],
    subtasks: [],
    activities: [],
  },
  {
    id: 'skill-task-first-access-guide',
    title: 'Fechar guia de primeiro acesso',
    description: 'Publicar orientação final de ativação para clientes recém-implantados.',
    skillId: 'skill-client-onboarding',
    skillName: 'Onboarding de cliente',
    status: 'done',
    assignee: 'Guilherme Drehmer',
    assigneeId: '1',
    requestedBy: 'João Silva',
    priority: 'low',
    startDate: '2026-02-02',
    dueDate: '2026-02-10',
    completionDate: '2026-02-10T14:00:00.000Z',
    order: 8,
    projectId: 'skill-project-first-access-journey',
    comments: [],
    attachments: [],
    checklistItems: [],
    timeLogs: [],
    subtasks: [],
    activities: [
      {
        id: 'skill-task-first-access-guide-activity-1',
        timestamp: '2026-02-10T14:00:00.000Z',
        user: 'Guilherme Drehmer',
        action: 'publicou o material',
        details: 'Guia final disponibilizado para operação e sucesso do cliente.',
        entityType: 'task',
        entityId: 'skill-task-first-access-guide',
      },
    ],
  },
];

const readStorage = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      'data' in parsed
    ) {
      return (parsed as StorageEnvelope<T>).data;
    }

    return parsed as T;
  } catch (error) {
    console.warn(`[TaskContext] Erro ao ler ${key}:`, error);
    return null;
  }
};

const writeStorage = <T,>(key: string, version: number, data: T) => {
  const payload: StorageEnvelope<T> = {
    version,
    data,
  };
  localStorage.setItem(key, JSON.stringify(payload));
};

export function TaskProvider({ children }: { children: ReactNode }) {
  const {
    currentUser,
    users,
    teams,
    automationRules,
    emailTemplates,
    addNotification,
    recordAutomationExecutions,
    sendEmailMessage,
    priorityCycles,
    weeklyDemandAssignments,
  } = useAdmin();
  const { projects, updateProject } = useProjects();
  const { publishDomainEvent } = useIntegration();
  const teamIdByName = React.useMemo(
    () => new Map(teams.map((team) => [team.name, team.id])),
    [teams]
  );

  const applyTechnicalOwnerSuggestion = React.useCallback(
    (task: WBSTask, project?: Project) => {
      const normalizedTask = normalizeTask(task);
      if (normalizedTask.technicalOwnerId || normalizedTask.assigneeId) {
        return normalizedTask;
      }

      const demandType = resolveTaskDemandType(normalizedTask, project);
      const teamId = project?.group ? teamIdByName.get(project.group) : normalizedTask.workspaceId ? teamIdByName.get(normalizedTask.workspaceId) : undefined;
      const assignment = findWeeklyAssignmentForDemand(weeklyDemandAssignments, {
        demandType,
        teamId,
        referenceDate: new Date(),
      });

      if (!assignment) {
        return normalizedTask;
      }

      const responsibleUser = users.find((user) => user.id === assignment.responsibleUserId);
      if (!responsibleUser) {
        return normalizedTask;
      }

      return normalizeTask({
        ...normalizedTask,
        technicalOwnerId: responsibleUser.id,
        technicalOwnerName: responsibleUser.name,
        technicalOwnerSource: 'weekly_assignment',
        technicalOwnerSuggestedByAssignmentId: assignment.id,
        technicalOwnerSuggestedAt: new Date().toISOString(),
        assigneeId: responsibleUser.id,
        assignee: responsibleUser.name,
      });
    },
    [teamIdByName, users, weeklyDemandAssignments]
  );
  const [independentTasks, setIndependentTasks] = useState<WBSTask[]>(() => {
    const saved = readStorage<WBSTask[]>(STORAGE_KEYS.independentTasks);
    if (saved?.length) {
      const savedIds = new Set(saved.map((task) => task.id));
      const merged = [
        ...saved,
        ...mockIndependentTasks.filter((task) => !savedIds.has(task.id)),
      ];
      return merged.map(normalizeTask);
    }
    return mockIndependentTasks.map(normalizeTask);
  });
  const [trackingSessions, setTrackingSessions] = useState<Record<string, TimeLog[]>>(
    () => {
      const stored = readStorage<Record<string, TimeLog[]>>(STORAGE_KEYS.taskTrackingSessions) || {};
      return Object.fromEntries(
        Object.entries(stored).map(([taskId, logs]) => [taskId, normalizeTimeLogs(logs || [])])
      );
    }
  );
  const [activeTracking, setActiveTracking] = useState<Record<string, boolean>>(
    () => readStorage<Record<string, boolean>>(STORAGE_KEYS.activeTaskTracking) || {}
  );

  useEffect(() => {
    writeStorage(
      STORAGE_KEYS.independentTasks,
      STORAGE_VERSIONS.independentTasks,
      independentTasks.map(normalizeTask)
    );
  }, [independentTasks]);

  useEffect(() => {
    writeStorage(
      STORAGE_KEYS.taskTrackingSessions,
      STORAGE_VERSIONS.taskTrackingSessions,
      trackingSessions
    );
  }, [trackingSessions]);

  useEffect(() => {
    writeStorage(
      STORAGE_KEYS.activeTaskTracking,
      STORAGE_VERSIONS.activeTaskTracking,
      activeTracking
    );
  }, [activeTracking]);

  const taskRecords: EnrichedTask[] = React.useMemo(() => {
    const projectTasks: EnrichedTask[] = [];
    const currentUserId = currentUser?.id;
    const userIdByName = new Map(users.map((user) => [user.name, user.id]));

    projects.forEach((project) => {
      const phases = getProjectExecutionPhases(project);
      phases.forEach((phase) => {
        phase.milestones.forEach((milestone: any) => {
          milestone.tasks.forEach((task: WBSTask) => {
            const normalizedTask = normalizeTask(task);
            const resolvedAssigneeId =
              normalizedTask.assigneeId ||
              userIdByName.get(normalizedTask.assignee || '') ||
              undefined;
            const personalStatus = getTaskVisualColumn(normalizedTask.status, normalizedTask.completed);
            projectTasks.push({
              ...normalizedTask,
              assigneeId: resolvedAssigneeId,
              projectName: project.name,
              projectGroup: project.group,
              projectId: project.id,
              phaseName: phase.name,
              phaseId: phase.id,
              milestoneName: milestone.name,
              milestoneId: milestone.id,
              projectStatus: normalizedTask.status,
              personalStatus,
              kanbanColumn: personalStatus,
              hierarchyDepth: 0,
              hierarchyPath: [],
              hierarchyBreadcrumb: buildHierarchyBreadcrumb([], project.name, phase.name, milestone.name),
              itemTypeLabel: 'Tarefa',
              timeTracking: trackingSessions[task.id] || task.timeLogs || [],
              isTracking: activeTracking[task.id] || false,
              isLinkedToProject: true,
              rootTaskId: task.id,
              isSubtaskNode: false,
            });
            projectTasks.push(
              ...enrichSubtaskTree(normalizedTask.subtasks || [], {
                projectName: project.name,
                projectGroup: project.group,
                projectId: project.id,
                phaseName: phase.name,
                phaseId: phase.id,
                milestoneName: milestone.name,
                milestoneId: milestone.id,
                isLinkedToProject: true,
                rootTaskId: task.id,
                parentTaskId: task.id,
                ancestorPath: [normalizedTask.title],
                trackingSessions,
                activeTracking,
                currentUserId,
                userIdByName,
              })
            );
          });
        });
      });
    });

    const independentEnriched: EnrichedTask[] = independentTasks.flatMap((task) => {
      const normalizedTask = normalizeTask(task);
      const relatedProject = normalizedTask.projectId
        ? projects.find((project) => project.id === normalizedTask.projectId)
        : undefined;
      const resolvedAssigneeId =
        normalizedTask.assigneeId ||
        userIdByName.get(normalizedTask.assignee || '') ||
        undefined;
      const personalStatus = getTaskVisualColumn(normalizedTask.status, normalizedTask.completed);
      return [
        {
          ...normalizedTask,
          assigneeId: resolvedAssigneeId,
          projectName: relatedProject?.name,
          projectGroup: relatedProject?.group || normalizedTask.workspaceId,
          projectStatus: normalizedTask.status,
          personalStatus,
          kanbanColumn: personalStatus,
          hierarchyDepth: 0,
          hierarchyPath: [],
          hierarchyBreadcrumb: '',
          itemTypeLabel: 'Tarefa',
          timeTracking: trackingSessions[task.id] || task.timeLogs || [],
          isTracking: activeTracking[task.id] || false,
          isLinkedToProject: Boolean(normalizedTask.projectId),
          rootTaskId: task.id,
          isSubtaskNode: false,
        },
        ...enrichSubtaskTree(normalizedTask.subtasks || [], {
          projectName: relatedProject?.name,
          projectGroup: relatedProject?.group || normalizedTask.workspaceId,
          projectId: normalizedTask.projectId,
          isLinkedToProject: Boolean(normalizedTask.projectId),
          rootTaskId: task.id,
          parentTaskId: task.id,
          ancestorPath: [normalizedTask.title],
          trackingSessions,
          activeTracking,
          currentUserId,
          userIdByName,
        }),
      ];
    });

    const combinedTasks = [...projectTasks, ...independentEnriched];
    const tasksById = new Map(
      combinedTasks.map((task) => [
        task.id,
        {
          id: task.id,
          title: task.title,
          projectId: task.projectId,
          status: task.status,
          startDate: task.startDate,
          dueDate: task.dueDate,
          completionDate: task.completionDate,
        },
      ])
    );
    const dependenciesByProject = new Map<string, TaskDependency[]>();

    projects.forEach((project) => {
      dependenciesByProject.set(
        project.id,
        (project.execution?.dependencies || []).map(normalizeDependencyRecord)
      );
    });

    const projectTotalTimeByProjectId = combinedTasks
      .filter((task) => !task.isSubtaskNode && task.projectId)
      .reduce<Record<string, number>>((accumulator, task) => {
        if (!task.projectId) return accumulator;
        accumulator[task.projectId] =
          (accumulator[task.projectId] || 0) + getTaskNodeTotalTrackedSeconds(task);
        return accumulator;
      }, {});

    return applyPriorityCycleFocusToTaskEntities(
      combinedTasks.map((task) => {
      const projectDependencies = task.projectId
        ? dependenciesByProject.get(task.projectId) || []
        : [];
      const predecessorDependencies = getTaskPredecessors(task.id, projectDependencies);
      const successorDependencies = getTaskSuccessors(task.id, projectDependencies);
      const relationships = getTaskRelationships(task.id, projectDependencies);
      const dependencyBlockedReason = getBlockedReason(task, projectDependencies, tasksById, 'start');
      const completionBlockedReason = getBlockedReason(task, projectDependencies, tasksById, 'finish');

        return {
          ...task,
          ownTimeSeconds: getTaskNodeOwnTrackedSeconds(task),
          totalTimeSeconds: getTaskNodeTotalTrackedSeconds(task),
          projectTotalTimeSeconds: task.projectId
            ? projectTotalTimeByProjectId[task.projectId] || 0
            : getTaskNodeTotalTrackedSeconds(task),
          predecessorDependencies,
          successorDependencies,
          relationships,
          dependencyConflicts: getDependencyConflicts(task, projectDependencies, tasksById),
          isDependencyBlocked: Boolean(dependencyBlockedReason || completionBlockedReason),
          dependencyBlockedReason: dependencyBlockedReason || completionBlockedReason,
          canStartByDependency: !isTaskBlocked(task, projectDependencies, tasksById, 'start'),
          canFinishByDependency: !isTaskBlocked(task, projectDependencies, tasksById, 'finish'),
        };
      }),
      priorityCycles
    );
  }, [projects, independentTasks, trackingSessions, activeTracking, currentUser?.id, users, priorityCycles]);

  const allTasks: EnrichedTask[] = React.useMemo(
    () => taskRecords.filter((task) => isTaskNodeOperationallyVisible(task)),
    [taskRecords]
  );

  const dispatchAutomationResult = (
    result: ReturnType<typeof runAutomationRules>,
    projectId?: string
  ) => {
    if (projectId && result.projectPatch) {
      updateProject(projectId, result.projectPatch);
    }
    result.notifications.forEach(addNotification);
    result.emails.forEach(sendEmailMessage);
    recordAutomationExecutions(result.executions);
  };

  const notifyUsers = (userIds: string[], factory: (userId: string) => ReturnType<typeof createNotification> | null) => {
    Array.from(new Set(userIds.filter(Boolean))).forEach((userId) => {
      const notification = factory(userId);
      if (notification) {
        addNotification(notification);
      }
    });
  };

  const applyAutomationCommandsToTask = (
    taskId: string,
    commands: AutomationCommand[]
  ) => {
    commands.forEach((command) => {
      if (command.type === 'update_task_status') {
        const currentTask = taskRecords.find((task) => task.id === taskId);
        if (!currentTask || currentTask.status === command.status) return;
        updateTask(taskId, { status: command.status });
      }
    });
  };

  const addIndependentTask = (task: WBSTask) => {
    const relatedProject = task.projectId
      ? projects.find((project) => project.id === task.projectId)
      : undefined;
    const normalizedTask = applyTechnicalOwnerSuggestion(
      {
        ...normalizeTask(task),
        analystOwnerName: task.analystOwnerName || task.requestedBy,
        analystOwnerId: task.analystOwnerId,
        typeDefinedBy: task.demandType ? currentUser?.name || task.typeDefinedBy : task.typeDefinedBy,
        typeDefinedAt: task.demandType ? new Date().toISOString() : task.typeDefinedAt,
      },
      relatedProject
    );
    const createdActivity = createActivity(
      normalizedTask.technicalOwnerName || normalizedTask.analystOwnerName || normalizedTask.requestedBy || 'Sistema',
      'criou a tarefa',
      normalizedTask.title,
      'task',
      normalizedTask.id
    );
    const routingActivity =
      normalizedTask.technicalOwnerSource === 'weekly_assignment' && normalizedTask.technicalOwnerSuggestedByAssignmentId
        ? createActivity(
            currentUser?.name || normalizedTask.analystOwnerName || 'Sistema',
            'aplicou sugestão de escala semanal',
            `${normalizedTask.title}: ${normalizedTask.technicalOwnerName || 'Sem responsável técnico'} sugerido pela escala`,
            'task',
            normalizedTask.id
          )
        : undefined;

    setIndependentTasks((prev) => [
      ...prev,
      finalizeRootTask({
        ...normalizedTask,
        activities: [...(normalizedTask.activities || []), createdActivity, ...(routingActivity ? [routingActivity] : [])],
      }),
    ]);

    publishDomainEvent({
      name: 'task.created',
      entityType: 'task',
      entityId: normalizedTask.id,
      payloadJson: {
        taskId: normalizedTask.id,
        title: normalizedTask.title,
        projectId: normalizedTask.projectId,
        assigneeId: normalizedTask.assigneeId,
        status: normalizedTask.status,
      },
    });
  };

  const duplicateTask: TaskContextType['duplicateTask'] = (taskId) => {
    const selectedTask = taskRecords.find((candidate) => candidate.id === taskId);
    if (!selectedTask) return null;

    const rootTaskId = selectedTask.rootTaskId || selectedTask.id;
    const rootTask = taskRecords.find((candidate) => candidate.id === rootTaskId);
    if (!rootTask) return null;

    const rootClone = cloneTaskForDuplication(rootTask);

    if (selectedTask.id === rootTask.id) {
      if (!selectedTask.projectId) {
        addIndependentTask(rootClone);
        return rootClone.id;
      }

      const project = projects.find((candidate) => candidate.id === selectedTask.projectId);
      if (!project) return null;

      const updatedPhases = getProjectExecutionPhases(project).map((phase) => ({
        ...phase,
        milestones: phase.milestones.map((milestone: any) => {
          if (milestone.id !== selectedTask.milestoneId) return milestone;

          const insertionIndex = milestone.tasks.findIndex(
            (candidate: WBSTask) => candidate.id === rootTask.id
          );
          const nextTasks = [...milestone.tasks];
          nextTasks.splice(insertionIndex >= 0 ? insertionIndex + 1 : nextTasks.length, 0, {
            ...rootClone,
            projectId: selectedTask.projectId,
            phaseId: phase.id,
            milestoneId: milestone.id,
            order: insertionIndex >= 0 ? insertionIndex + 1 : nextTasks.length,
          });

          return {
            ...milestone,
            tasks: nextTasks.map((candidate: WBSTask, index: number) => ({
              ...candidate,
              order: index,
            })),
          };
        }),
      }));

      const metrics = calculateProjectMetricsFromExecution({
        ...project,
        execution: {
          ...project.execution,
          phases: updatedPhases,
        },
      });

      updateProject(project.id, {
        execution: {
          ...project.execution,
          phases: updatedPhases,
        },
        metrics,
        progress: metrics.progress,
        tasksTotal: metrics.tasksTotal,
        tasksCompleted: metrics.tasksCompleted,
        hoursRemaining: metrics.hoursRemaining,
        totalTimeTracked: metrics.totalTimeTracked,
      });

      return rootClone.id;
    }

    const hierarchy = buildTaskHierarchy(rootTask, selectedTask.id);
    const parentId = hierarchy.length >= 2 ? hierarchy[hierarchy.length - 2].id : undefined;
    const targetNode = findTaskNode(rootTask, selectedTask.id);
    if (!targetNode || !('subtasks' in targetNode)) return null;

    const duplicatedSubtask = cloneSubtaskForDuplication(targetNode as Subtask);

    applyRootTaskMutation(rootTask.id, (candidate) => {
      const insertSibling = (items: Subtask[]): Subtask[] =>
        items.flatMap((item) => {
          if (item.id === selectedTask.id) {
            return [item, duplicatedSubtask];
          }
          return [
            {
              ...item,
              subtasks: insertSibling(item.subtasks || []),
            },
          ];
        });

      const nextRoot =
        parentId && parentId !== candidate.id
          ? {
              ...candidate,
              subtasks: insertSibling(candidate.subtasks || []),
            }
          : {
              ...candidate,
              subtasks: (() => {
                const nextItems = [...(candidate.subtasks || [])];
                const insertionIndex = nextItems.findIndex((item) => item.id === selectedTask.id);
                nextItems.splice(
                  insertionIndex >= 0 ? insertionIndex + 1 : nextItems.length,
                  0,
                  duplicatedSubtask
                );
                return nextItems;
              })(),
            };

      return normalizeTask(nextRoot);
    });

    return duplicatedSubtask.id;
  };

  const applyRootTaskMutation = (
    taskId: string,
    updater: (task: WBSTask) => WBSTask,
    projectActivity?: ActivityLog,
    projectExecutionUpdater?: (execution: Project['execution']) => Project['execution']
  ) => {
    const independentTask = independentTasks.find((candidate) => candidate.id === taskId);

    if (independentTask) {
      setIndependentTasks((prev) =>
        prev.map((candidate) =>
          candidate.id === taskId ? finalizeRootTask(updater(candidate)) : candidate
        )
      );
      return;
    }

    projects.forEach((project) => {
      const phases = getProjectExecutionPhases(project);
      if (!phases.length) return;

      let updated = false;
      const updatedPhases = phases.map((phase) => ({
        ...phase,
        milestones: phase.milestones.map((milestone: any) => ({
          ...milestone,
          tasks: milestone.tasks.map((candidate: WBSTask) => {
            if (candidate.id === taskId) {
              updated = true;
              return finalizeRootTask(updater(candidate));
            }
            return candidate;
          }),
        })),
      }));

      if (!updated) return;

      const nextExecution = {
        ...project.execution,
        phases: updatedPhases,
      };
      const updatedExecution = projectExecutionUpdater
        ? projectExecutionUpdater(nextExecution)
        : nextExecution;
      const metrics = calculateProjectMetricsFromExecution({
        ...project,
        execution: updatedExecution,
      });

      updateProject(project.id, {
        execution: updatedExecution,
        metrics,
        progress: metrics.progress,
        tasksTotal: metrics.tasksTotal,
        tasksCompleted: metrics.tasksCompleted,
        hoursRemaining: metrics.hoursRemaining,
        totalTimeTracked: metrics.totalTimeTracked,
        activities: projectActivity
          ? [...(project.activities || []), projectActivity]
          : project.activities,
      });
    });
  };

  const updateTask = (taskId: string, updates: Partial<WBSTask>) => {
    const task = taskRecords.find((candidate) => candidate.id === taskId);
    if (!task) return;

    if (task.isSubtaskNode && task.rootTaskId && task.rootTaskId !== task.id) {
      updateSubtask(task.rootTaskId, task.id, updates as Partial<Subtask>);
      return;
    }

    const nextStatus =
      typeof updates.status !== 'undefined'
        ? normalizeTaskStatus(updates.status, updates.completed)
        : undefined;

    if (nextStatus === 'done' && !canTaskNodeBeCompleted(task)) {
      console.warn(
        'Não é possível marcar como concluído: existem subtarefas inconclusas'
      );
      return;
    }

    if (nextStatus === 'done' && (task.checklistItems || []).some((item) => !item.completed)) {
      console.warn('Não é possível concluir a tarefa: existem itens de checklist pendentes.');
      return;
    }

    if (nextStatus === 'in_progress' && task.isDependencyBlocked) {
      console.warn('Não é possível iniciar a tarefa: existem dependências bloqueando o início.');
      return;
    }

    if (
      nextStatus === 'done' &&
      task.projectId &&
      task.canFinishByDependency === false
    ) {
      console.warn('Não é possível concluir a tarefa: existem dependências bloqueando a conclusão.');
      return;
    }

    const nextTechnicalOwnerId =
      typeof updates.technicalOwnerId !== 'undefined'
        ? updates.technicalOwnerId
        : typeof updates.assigneeId !== 'undefined'
          ? updates.assigneeId
          : task.technicalOwnerId || task.assigneeId;
    const nextTechnicalOwnerName =
      typeof updates.technicalOwnerName !== 'undefined'
        ? updates.technicalOwnerName
        : typeof updates.assignee !== 'undefined'
          ? updates.assignee
          : task.technicalOwnerName || task.assignee;
    const nextDemandType =
      typeof updates.demandType !== 'undefined' ? updates.demandType : task.demandType;
    const nextTask = applyTechnicalOwnerSuggestion(
      {
        ...task,
        ...updates,
        demandType: nextDemandType,
        typeDefinedBy:
          typeof updates.demandType !== 'undefined'
            ? currentUser?.name || task.typeDefinedBy
            : task.typeDefinedBy,
        typeDefinedAt:
          typeof updates.demandType !== 'undefined'
            ? new Date().toISOString()
            : task.typeDefinedAt,
        triageStatus:
          updates.triageStatus ||
          (updates.triageComplexity || updates.expectedBusinessImpact || updates.scopeLevel || updates.valueIntent
            ? 'completed'
            : task.triageStatus),
        technicalOwnerId: nextTechnicalOwnerId,
        technicalOwnerName: nextTechnicalOwnerName,
        analystOwnerName:
          typeof updates.analystOwnerName !== 'undefined'
            ? updates.analystOwnerName
            : task.analystOwnerName || task.requestedBy,
        assigneeId: nextTechnicalOwnerId,
        assignee: nextTechnicalOwnerName,
        status: nextStatus ?? task.status,
        completed: nextStatus ? nextStatus === 'done' : updates.completed ?? task.completed,
      } as WBSTask,
      task.projectId ? projects.find((project) => project.id === task.projectId) : undefined
    );
    const hasStatusChange =
      typeof nextStatus !== 'undefined' && nextStatus !== task.status;
    const hasAssigneeChange =
      (Object.prototype.hasOwnProperty.call(updates, 'assignee') ||
        Object.prototype.hasOwnProperty.call(updates, 'assigneeId') ||
        Object.prototype.hasOwnProperty.call(updates, 'technicalOwnerId') ||
        Object.prototype.hasOwnProperty.call(updates, 'technicalOwnerName')) &&
      (task.technicalOwnerId || task.assigneeId || '') !== (nextTask.technicalOwnerId || nextTask.assigneeId || '');
    const hasSprintChange =
      Object.prototype.hasOwnProperty.call(updates, 'sprintId') && updates.sprintId !== task.sprintId;
    const hasSprintOrderChange =
      Object.prototype.hasOwnProperty.call(updates, 'sprintOrder') && updates.sprintOrder !== task.sprintOrder;
    const hasAnalystChange =
      (Object.prototype.hasOwnProperty.call(updates, 'analystOwnerId') ||
        Object.prototype.hasOwnProperty.call(updates, 'analystOwnerName')) &&
      (task.analystOwnerId || task.analystOwnerName || task.requestedBy || '') !==
        (nextTask.analystOwnerId || nextTask.analystOwnerName || nextTask.requestedBy || '');
    const hasDemandTypeChange =
      (Object.prototype.hasOwnProperty.call(updates, 'demandType') ||
        Object.prototype.hasOwnProperty.call(updates, 'suggestedDemandType')) &&
      (task.demandType || '') !== (nextTask.demandType || '');
    const hasTriageChange =
      Object.prototype.hasOwnProperty.call(updates, 'triageComplexity') ||
      Object.prototype.hasOwnProperty.call(updates, 'expectedBusinessImpact') ||
      Object.prototype.hasOwnProperty.call(updates, 'scopeLevel') ||
      Object.prototype.hasOwnProperty.call(updates, 'valueIntent') ||
      Object.prototype.hasOwnProperty.call(updates, 'valueIntentNotes') ||
      Object.prototype.hasOwnProperty.call(updates, 'originTicketReference') ||
      Object.prototype.hasOwnProperty.call(updates, 'originTicket');
    const nextAssigneeId = nextTask.technicalOwnerId || nextTask.assigneeId;
    const assigneeTransferEntry = hasAssigneeChange
      ? createAssigneeTransferEntry(
          task.technicalOwnerName || task.assignee,
          nextTask.technicalOwnerName || nextTask.assignee,
          currentUser?.name
        )
      : undefined;

    const taskActivity = createActivity(
      currentUser?.name || nextTask.technicalOwnerName || nextTask.analystOwnerName || task.requestedBy || 'Sistema',
      hasAssigneeChange
        ? 'alterou o responsável técnico da tarefa'
        : hasStatusChange
          ? 'alterou o status da tarefa'
          : hasSprintOrderChange
            ? 'repriorizou a tarefa na sprint'
          : hasSprintChange
              ? 'moveu a tarefa entre sprints'
              : hasAnalystChange
                ? 'alterou o analista responsável'
                : hasDemandTypeChange
                  ? 'converteu o tipo da demanda'
                  : hasTriageChange
                    ? 'atualizou a triagem da demanda'
          : 'editou a tarefa',
      hasAssigneeChange
        ? `${task.title}: ${task.technicalOwnerName || task.assignee || 'Sem responsável técnico'} -> ${nextTask.technicalOwnerName || nextTask.assignee || 'Sem responsável técnico'}`
        : hasStatusChange
          ? `${task.title}: ${task.status} -> ${nextStatus}`
          : hasSprintOrderChange
            ? `${task.title}: prioridade ${typeof task.sprintOrder === 'number' ? task.sprintOrder + 1 : '—'} -> ${typeof nextTask.sprintOrder === 'number' ? nextTask.sprintOrder + 1 : '—'}`
            : hasSprintChange
            ? `${task.title}: ${task.sprintId || 'Sem sprint'} -> ${nextTask.sprintId || 'Sem sprint'}`
              : hasAnalystChange
                ? `${task.title}: ${task.analystOwnerName || task.requestedBy || 'Sem analista'} -> ${nextTask.analystOwnerName || 'Sem analista'}`
                : hasDemandTypeChange
                  ? `${task.title}: ${task.demandType || 'indefinido'} -> ${nextTask.demandType || 'indefinido'}`
                  : hasTriageChange
                    ? `${task.title}: triagem revisada e sugestão ${nextTask.suggestedDemandType || 'não gerada'}`
          : `Dados atualizados em ${task.title}`,
      'task',
      taskId
    );

    applyRootTaskMutation(
      taskId,
      () =>
        appendActivityToTaskNode(
          {
            ...nextTask,
            assigneeHistory: assigneeTransferEntry
              ? [...(nextTask.assigneeHistory || []), assigneeTransferEntry]
              : nextTask.assigneeHistory,
            followerUserIds: hasAssigneeChange
              ? Array.from(
                  new Set(
                    [
                      ...(nextTask.followerUserIds || []),
                      task.assigneeId,
                    ].filter(Boolean) as string[]
                  )
                )
              : nextTask.followerUserIds,
            assigneeId: nextAssigneeId || nextTask.assigneeId,
            assignee: nextTask.technicalOwnerName || nextTask.assignee,
            technicalOwnerId: nextAssigneeId || nextTask.technicalOwnerId,
            technicalOwnerName: nextTask.technicalOwnerName || nextTask.assignee,
          },
          taskActivity
        ),
      task.projectId
        ? createActivity(
            currentUser?.name || task.assignee || task.requestedBy || 'Sistema',
            hasAssigneeChange
              ? 'redefiniu o responsável técnico de uma tarefa'
              : hasStatusChange
                ? 'alterou o status de uma tarefa'
                : hasSprintOrderChange
                  ? 'repriorizou uma tarefa na sprint'
                : hasSprintChange
                    ? 'moveu uma tarefa entre sprints'
                    : hasAnalystChange
                      ? 'alterou o analista responsável'
                      : hasDemandTypeChange
                        ? 'converteu o tipo de uma demanda'
                        : hasTriageChange
                          ? 'atualizou a triagem de uma demanda'
                : 'editou uma tarefa',
            hasAssigneeChange
              ? `${task.title}: ${task.technicalOwnerName || task.assignee || 'Sem responsável técnico'} -> ${nextTask.technicalOwnerName || nextTask.assignee || 'Sem responsável técnico'}`
              : task.title,
            'task',
            taskId
          )
        : undefined
    );

    if (hasStatusChange) {
      publishDomainEvent({
        name: nextStatus === 'done' ? 'task.completed' : 'task.updated',
        entityType: 'task',
        entityId: taskId,
        payloadJson: {
          taskId,
          title: nextTask.title,
          fromStatus: task.status,
          toStatus: nextStatus,
          projectId: task.projectId,
        },
      });

      if (nextTask.assigneeId && nextTask.assigneeId !== currentUser?.id) {
        addNotification(
          createNotification({
            userId: nextTask.assigneeId,
            type: 'task_updated',
            title: 'Tarefa atualizada',
            description: `${currentUser?.name || 'Alguém'} alterou o status de "${nextTask.title}" para ${
              nextStatus === 'done'
                ? 'Concluído'
                : nextStatus === 'blocked'
                  ? 'Bloqueado'
                  : nextStatus === 'in_progress'
                  ? 'Em andamento'
                  : 'Não iniciada'
            }.`,
            entityType: 'task',
            entityId: taskId,
            linkTo: `/my-tasks?task=${taskId}`,
          })
        );
      }

      const relatedProject = task.projectId
        ? projects.find((project) => project.id === task.projectId)
        : undefined;
      const automationResult = runAutomationRules({
        rules: automationRules,
        event: 'task.status_changed',
        currentUser,
        users,
        emailTemplates,
        project: relatedProject,
        task: nextTask,
        metadata: {
          fromStatus: task.status,
          toStatus: nextStatus,
          taskId,
        },
      });
      dispatchAutomationResult(automationResult, relatedProject?.id);
    }

    if (hasAssigneeChange) {
      publishDomainEvent({
        name: 'task.assignee_changed',
        entityType: 'task',
        entityId: taskId,
        payloadJson: {
          taskId,
          title: nextTask.title,
          projectId: task.projectId,
          fromAssigneeId: task.technicalOwnerId || task.assigneeId,
          toAssigneeId: nextAssigneeId,
          fromAssigneeName: task.technicalOwnerName || task.assignee,
          toAssigneeName: nextTask.technicalOwnerName || nextTask.assignee,
        },
      });

      if (nextAssigneeId) {
        addNotification(
          createNotification({
            userId: nextAssigneeId,
            type: 'task_assigned',
            title: 'Nova responsabilidade',
            description: `${currentUser?.name || 'Alguém'} atribuiu a execução técnica de "${nextTask.title}" para você.`,
            entityType: 'task',
            entityId: taskId,
            linkTo: `/my-tasks?task=${taskId}`,
          })
        );
      }

      if ((task.technicalOwnerId || task.assigneeId) && (task.technicalOwnerId || task.assigneeId) !== nextAssigneeId) {
        addNotification(
          createNotification({
            userId: (task.technicalOwnerId || task.assigneeId) as string,
            type: 'task_unassigned',
            title: 'Tarefa transferida',
            description: `${currentUser?.name || 'Alguém'} removeu você da execução técnica de "${nextTask.title}".`,
            entityType: 'task',
            entityId: taskId,
            linkTo: `/my-tasks?task=${taskId}`,
          })
        );
      }

      const relatedProject = task.projectId
        ? projects.find((project) => project.id === task.projectId)
        : undefined;
      const automationResult = runAutomationRules({
        rules: automationRules,
        event: 'task.assignee.changed',
        currentUser,
        users,
        emailTemplates,
        project: relatedProject,
        task: nextTask,
        metadata: {
          fromAssigneeId: task.technicalOwnerId || task.assigneeId,
          toAssigneeId: nextAssigneeId,
          taskId,
        },
      });
      dispatchAutomationResult(automationResult, relatedProject?.id);
    }

    if (!hasStatusChange && !hasAssigneeChange) {
      publishDomainEvent({
        name: 'task.updated',
        entityType: 'task',
        entityId: taskId,
        payloadJson: {
          taskId,
          title: nextTask.title,
          projectId: task.projectId,
          updates,
        },
      });
    }
  };

  const deleteTask = (taskId: string) => {
    const task = taskRecords.find((candidate) => candidate.id === taskId);
    if (task?.isSubtaskNode && task.rootTaskId && task.rootTaskId !== task.id) {
      setTaskScopeStatus(task.id, 'deleted', 'Excluída do projeto');
      return;
    }

    const isIndependent = independentTasks.some((task) => task.id === taskId);

    if (isIndependent) {
      setIndependentTasks((prev) =>
        prev.map((candidate) =>
          candidate.id === taskId
            ? normalizeTask({
                ...candidate,
                scopeStatus: 'deleted',
                removedFromScopeAt: new Date().toISOString(),
                removedFromScopeBy: currentUser?.id,
                removalReason: 'Excluída do projeto',
                deletedAt: new Date().toISOString(),
                deletedBy: currentUser?.id,
                activities: [
                  ...(candidate.activities || []),
                  createActivity(
                    currentUser?.name || 'Sistema',
                    'excluiu a tarefa do projeto',
                    candidate.title,
                    'task',
                    candidate.id
                  ),
                ],
              })
            : candidate
        )
      );
      return;
    }
    setTaskScopeStatus(taskId, 'deleted', 'Excluída do projeto');
  };

  const getTaskImpactSummary: TaskContextType['getTaskImpactSummary'] = (taskId) => {
    const task = taskRecords.find((candidate) => candidate.id === taskId);
    if (!task) {
      return {
        subtasks: 0,
        timeLogs: 0,
        comments: 0,
        attachments: 0,
        activities: 0,
        dependencies: 0,
        hasImpact: false,
      };
    }

    const totals = collectNodeArtifacts(task);
    const dependencies =
      (task.predecessorDependencies?.length || 0) + (task.successorDependencies?.length || 0);

    return {
      ...totals,
      dependencies,
      hasImpact:
        totals.subtasks > 0 ||
        totals.timeLogs > 0 ||
        totals.comments > 0 ||
        totals.attachments > 0 ||
        totals.activities > 0 ||
        dependencies > 0,
    };
  };

  const setTaskScopeStatus: TaskContextType['setTaskScopeStatus'] = (
    taskId,
    scopeStatus,
    reason
  ) => {
    const task = taskRecords.find((candidate) => candidate.id === taskId);
    if (!task) return;

    const timestamp = new Date().toISOString();
    const actorName = currentUser?.name || 'Sistema';
    const actorId = currentUser?.id;
    const isDeletion = scopeStatus === 'deleted';
    const actionLabel =
      scopeStatus === 'not_applicable'
        ? 'marcou a tarefa como não aplicável'
        : scopeStatus === 'out_of_scope'
          ? 'removeu a tarefa do escopo'
          : scopeStatus === 'discarded'
            ? 'descartou a tarefa'
            : 'excluiu a tarefa do projeto';
    const details = reason ? `${task.title} • ${reason}` : task.title;
    const impactedTaskIds = [task.id, ...collectSubtaskIds(task.subtasks || [])];
    const nextScopeData = {
      scopeStatus,
      removedFromScopeAt: timestamp,
      removedFromScopeBy: actorId,
      removalReason: reason,
      deletedAt: isDeletion ? timestamp : undefined,
      deletedBy: isDeletion ? actorId : undefined,
    };

    if (task.isSubtaskNode && task.rootTaskId && task.rootTaskId !== task.id) {
      applyRootTaskMutation(
        task.rootTaskId,
        (currentTask) =>
          appendActivityToTaskNode(
            {
              ...currentTask,
              subtasks: updateScopeStateInTree(currentTask.subtasks || [], task.id, (subtask) => ({
                ...subtask,
                ...nextScopeData,
                activities: [
                  ...(subtask.activities || []),
                  createActivity(actorName, actionLabel, details, 'task', task.id),
                ],
              })),
            },
            createActivity(actorName, actionLabel, details, 'task', task.id),
            task.id
          ),
        task.projectId
          ? createActivity(actorName, actionLabel, details, 'task', task.rootTaskId)
          : undefined,
        task.projectId
          ? (execution) => ({
              ...execution,
              dependencies: (execution.dependencies || []).filter(
                (dependency) =>
                  !impactedTaskIds.includes(dependency.predecessorTaskId) &&
                  !impactedTaskIds.includes(dependency.successorTaskId)
              ),
            })
          : undefined
      );
      return;
    }

    applyRootTaskMutation(
      task.id,
      (currentTask) =>
        appendActivityToTaskNode(
          {
            ...currentTask,
            ...nextScopeData,
          },
          createActivity(actorName, actionLabel, details, 'task', task.id)
        ),
      task.projectId
        ? createActivity(actorName, actionLabel, details, 'task', task.id)
        : undefined,
      task.projectId
        ? (execution) => ({
            ...execution,
            dependencies: (execution.dependencies || []).filter(
              (dependency) =>
                !impactedTaskIds.includes(dependency.predecessorTaskId) &&
                !impactedTaskIds.includes(dependency.successorTaskId)
            ),
          })
        : undefined
    );
  };

  const restoreTaskScope: TaskContextType['restoreTaskScope'] = (taskId) => {
    const task = taskRecords.find((candidate) => candidate.id === taskId);
    if (!task) return;

    const actorName = currentUser?.name || 'Sistema';
    const restoredState = {
      scopeStatus: 'active' as const,
      removedFromScopeAt: undefined,
      removedFromScopeBy: undefined,
      removalReason: undefined,
      deletedAt: undefined,
      deletedBy: undefined,
    };

    if (task.isSubtaskNode && task.rootTaskId && task.rootTaskId !== task.id) {
      applyRootTaskMutation(
        task.rootTaskId,
        (currentTask) =>
          appendActivityToTaskNode(
            {
              ...currentTask,
              subtasks: updateScopeStateInTree(currentTask.subtasks || [], task.id, (subtask) => ({
                ...subtask,
                ...restoredState,
                activities: [
                  ...(subtask.activities || []),
                  createActivity(actorName, 'restaurou a tarefa', task.title, 'task', task.id),
                ],
              })),
            },
            createActivity(actorName, 'restaurou a tarefa', task.title, 'task', task.id),
            task.id
          ),
        task.projectId
          ? createActivity(actorName, 'restaurou uma tarefa no projeto', task.title, 'task', task.rootTaskId)
          : undefined
      );
      return;
    }

    applyRootTaskMutation(
      task.id,
      (currentTask) =>
        appendActivityToTaskNode(
          {
            ...currentTask,
            ...restoredState,
          },
          createActivity(actorName, 'restaurou a tarefa', task.title, 'task', task.id)
        ),
      task.projectId
        ? createActivity(actorName, 'restaurou uma tarefa no projeto', task.title, 'task', task.id)
        : undefined
    );
  };

  const updatePersonalTaskStage = (taskId: string, stageId: string) => {
    const task = taskRecords.find((candidate) => candidate.id === taskId);
    if (!task) return;
    const previousStage = getTaskVisualColumn(task.status, task.completed);
    const nextStatus = getTaskStatusFromVisualColumn(stageId);

    if (task.isSubtaskNode && task.rootTaskId && task.rootTaskId !== task.id) {
      updateSubtask(task.rootTaskId, task.id, {
        status: nextStatus,
        completed: nextStatus === 'done',
      } as Partial<Subtask>);
    } else {
      updateTask(task.id, {
        status: nextStatus,
        completed: nextStatus === 'done',
      });
    }

    const relatedProject = task.projectId
      ? projects.find((project) => project.id === task.projectId)
      : undefined;
    const automationResult = runAutomationRules({
      rules: automationRules,
      event: 'task.stage_changed',
      currentUser,
      users,
      emailTemplates,
      project: relatedProject,
      task,
      metadata: {
        taskId,
        fromStageId: previousStage,
        toStageId: stageId,
        workspace: relatedProject?.group || currentUser.team,
      },
    });
    dispatchAutomationResult(automationResult, relatedProject?.id);
    applyAutomationCommandsToTask(taskId, automationResult.commands);
  };

  const toggleSubtaskCompletion = (taskId: string, subtaskId: string) => {
    const task = taskRecords.find((candidate) => candidate.id === taskId);
    if (!task) return;

    const updatedSubtasks = updateSubtaskTree(task.subtasks, subtaskId, (subtask) => {
      const nextCompleted = !subtask.completed;
      return {
        ...subtask,
        completed: nextCompleted,
        status: nextCompleted ? 'done' : 'not_started',
      };
    });

    const taskActivity = createActivity(
      task.assignee || task.requestedBy || 'Sistema',
      'alterou o status de uma subtarefa',
      task.title,
      'task',
      subtaskId
    );

    applyRootTaskMutation(
      taskId,
      (currentTask) =>
        appendActivityToTaskNode(
          {
            ...currentTask,
            subtasks: updatedSubtasks,
          },
          taskActivity,
          subtaskId
        ),
      task.projectId
        ? createActivity(
            task.assignee || task.requestedBy || 'Sistema',
            'alterou uma subtarefa',
            task.title,
            'task',
            taskId
          )
        : undefined
    );

    if (nextStatus && currentSubtask?.assigneeId && currentSubtask.assigneeId !== currentUser?.id) {
      addNotification(
        createNotification({
          userId: currentSubtask.assigneeId,
          type: 'task_updated',
          title: 'Subtarefa atualizada',
          description: `${currentUser?.name || 'Alguém'} alterou o status de "${currentSubtask.title}" para ${
            nextStatus === 'done'
              ? 'Concluído'
              : nextStatus === 'blocked'
                ? 'Bloqueado'
                : nextStatus === 'in_progress'
                ? 'Em andamento'
                : 'Não iniciada'
          }.`,
          entityType: 'task',
          entityId: subtaskId,
          linkTo: `/my-tasks?task=${subtaskId}`,
        })
      );
    }

    if (hasAssigneeChange) {
      if (nextAssigneeId) {
        addNotification(
          createNotification({
            userId: nextAssigneeId,
            type: 'task_assigned',
            title: 'Nova subtarefa atribuída',
            description: `${currentUser?.name || 'Alguém'} atribuiu "${currentSubtask?.title || 'uma subtarefa'}" para você.`,
            entityType: 'task',
            entityId: subtaskId,
            linkTo: `/my-tasks?task=${subtaskId}`,
          })
        );
      }

      if (currentSubtask?.assigneeId && currentSubtask.assigneeId !== nextAssigneeId) {
        addNotification(
          createNotification({
            userId: currentSubtask.assigneeId,
            type: 'task_unassigned',
            title: 'Subtarefa transferida',
            description: `${currentUser?.name || 'Alguém'} removeu você da responsabilidade de "${currentSubtask.title}".`,
            entityType: 'task',
            entityId: subtaskId,
            linkTo: `/my-tasks?task=${subtaskId}`,
          })
        );
      }
    }
  };

  const addSubtask = (
    taskId: string,
    title: string,
    parentSubtaskId?: string,
    assignee?: string
  ) => {
    const task = taskRecords.find((candidate) => candidate.id === taskId);
    if (!task || !title.trim()) return;

    const fallbackAssignee =
      assignee ||
      (parentSubtaskId
        ? findTaskNode(task, parentSubtaskId)?.assignee
        : task.assignee) ||
      currentUser?.name ||
      undefined;

    const newSubtask: Subtask = {
      id: `subtask-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      completed: false,
      status: 'not_started',
      assignee: fallbackAssignee,
      assigneeId: users.find((user) => user.name === fallbackAssignee)?.id,
      priority: 'medium',
      requestedBy: task.requestedBy,
      stakeholders: task.stakeholders || [],
      subtasks: [],
      checklistItems: [],
      comments: [],
      attachments: [],
      timeLogs: [],
      activities: [],
      personalStages: {},
      autoCompleteFromChildren: false,
    };

    const activity = createActivity(
      fallbackAssignee || task.assignee || task.requestedBy || 'Sistema',
      'criou uma subtarefa',
      fallbackAssignee ? `${newSubtask.title} • responsável: ${fallbackAssignee}` : newSubtask.title,
      'task',
      newSubtask.id
    );

    applyRootTaskMutation(
      taskId,
      (currentTask) =>
        appendActivityToTaskNode(
          {
            ...currentTask,
            subtasks: insertSubtask(currentTask.subtasks || [], parentSubtaskId, newSubtask),
          },
          activity,
          parentSubtaskId
        ),
      task.projectId
        ? createActivity(
            fallbackAssignee || task.assignee || task.requestedBy || 'Sistema',
            'criou uma subtarefa no projeto',
            `${task.title} > ${newSubtask.title}${fallbackAssignee ? ` • ${fallbackAssignee}` : ''}`,
            'task',
            taskId
          )
        : undefined
    );

    publishDomainEvent({
      name: 'task.created',
      entityType: 'task',
      entityId: newSubtask.id,
      payloadJson: {
        taskId: newSubtask.id,
        parentTaskId: parentSubtaskId || taskId,
        rootTaskId: taskId,
        projectId: task.projectId,
        title: newSubtask.title,
        assigneeId: newSubtask.assigneeId,
        status: newSubtask.status,
      },
    });
  };

  const updateSubtask = (
    taskId: string,
    subtaskId: string,
    updates: Partial<Subtask>
  ) => {
    const task = taskRecords.find((candidate) => candidate.id === taskId);
    if (!task) return;
    const currentSubtask = findTaskNode(task, subtaskId) as Subtask | undefined;
    const hasAssigneeChange =
      !!currentSubtask &&
      Object.prototype.hasOwnProperty.call(updates, 'assignee') &&
      updates.assignee !== currentSubtask.assignee;
    const nextAssigneeId =
      typeof updates.assigneeId !== 'undefined'
        ? updates.assigneeId
        : users.find((user) => user.name === updates.assignee)?.id;
    const assigneeTransferEntry =
      hasAssigneeChange && currentSubtask
        ? createAssigneeTransferEntry(currentSubtask.assignee, updates.assignee, currentUser?.name)
        : undefined;

    const taskActivity = createActivity(
      currentUser?.name || task.assignee || task.requestedBy || 'Sistema',
      hasAssigneeChange
        ? 'transferiu a responsabilidade de uma subtarefa'
        : updates.status
          ? 'alterou o status de uma subtarefa'
          : 'editou uma subtarefa',
      hasAssigneeChange && currentSubtask
        ? `${currentSubtask.title}: ${currentSubtask.assignee || 'Sem responsável'} -> ${updates.assignee || 'Sem responsável'}`
        : task.title,
      'task',
      subtaskId
    );

    applyRootTaskMutation(
      taskId,
      (currentTask) =>
        appendActivityToTaskNode(
          {
            ...currentTask,
            subtasks: updateSubtaskTree(currentTask.subtasks || [], subtaskId, (subtask) => {
              if (nextStatus === 'done' && !canTaskNodeBeCompleted(subtask)) {
                console.warn(
                  'Não é possível marcar a subtarefa como concluída: existem dependências filhas inconclusas'
                );
                return subtask;
              }

              if (nextStatus === 'done' && (subtask.checklistItems || []).some((item) => !item.completed)) {
                console.warn('Não é possível concluir a subtarefa: existem itens de checklist pendentes.');
                return subtask;
              }

              if (nextStatus === 'in_progress' && currentSubtask && currentSubtask.isDependencyBlocked) {
                console.warn('Não é possível iniciar a subtarefa: existem dependências bloqueando o início.');
                return subtask;
              }

              if (nextStatus === 'done' && currentSubtask && currentSubtask.canFinishByDependency === false) {
                console.warn('Não é possível concluir a subtarefa: existem dependências bloqueando a conclusão.');
                return subtask;
              }

              return {
                ...subtask,
                ...updates,
                status: nextStatus ?? subtask.status,
                completed:
                  nextStatus ? nextStatus === 'done' : updates.completed ?? subtask.completed,
                assigneeHistory: assigneeTransferEntry
                  ? [...(subtask.assigneeHistory || []), assigneeTransferEntry]
                  : subtask.assigneeHistory,
                followerUserIds: hasAssigneeChange
                  ? Array.from(
                      new Set(
                        [
                          ...(subtask.followerUserIds || []),
                          currentSubtask?.assigneeId,
                        ].filter(Boolean) as string[]
                      )
                    )
                  : subtask.followerUserIds,
                assigneeId: nextAssigneeId || subtask.assigneeId,
              };
            }),
          },
          taskActivity,
          subtaskId
        ),
      task.projectId
        ? createActivity(
            currentUser?.name || task.assignee || task.requestedBy || 'Sistema',
            hasAssigneeChange
              ? 'redefiniu o responsável de uma subtarefa do projeto'
              : updates.status
                ? 'alterou uma subtarefa do projeto'
                : 'editou uma subtarefa do projeto',
            hasAssigneeChange && currentSubtask
              ? `${currentSubtask.title}: ${currentSubtask.assignee || 'Sem responsável'} -> ${updates.assignee || 'Sem responsável'}`
              : task.title,
            'task',
            taskId
          )
        : undefined
    );
  };

  const deleteSubtask = (taskId: string, subtaskId: string) => {
    const task = taskRecords.find((candidate) => candidate.id === taskId);
    if (!task) return;
    const targetSubtask = findTaskNode(task, subtaskId) as Subtask | undefined;
    const removedTaskIds = targetSubtask
      ? [targetSubtask.id, ...collectSubtaskIds(targetSubtask.subtasks || [])]
      : [subtaskId];

    const activity = createActivity(
      task.assignee || task.requestedBy || 'Sistema',
      'removeu uma subtarefa',
      task.title,
      'task',
      subtaskId
    );

    applyRootTaskMutation(
      taskId,
      (currentTask) =>
        appendActivityToTaskNode(
          {
            ...currentTask,
            subtasks: removeSubtaskTree(currentTask.subtasks || [], subtaskId),
          },
          activity
        ),
      task.projectId
        ? createActivity(
            task.assignee || task.requestedBy || 'Sistema',
            'removeu uma subtarefa do projeto',
            task.title,
            'task',
            taskId
          )
        : undefined,
      task.projectId
        ? (execution) => ({
            ...execution,
            dependencies: (execution.dependencies || []).filter(
              (dependency) =>
                !removedTaskIds.includes(dependency.predecessorTaskId) &&
                !removedTaskIds.includes(dependency.successorTaskId)
            ),
          })
        : undefined
    );
  };

  const addChecklistItem = (
    taskId: string,
    item: ChecklistItem,
    subtaskId?: string
  ) => {
    const task = taskRecords.find((candidate) => candidate.id === taskId);
    if (!task) return;

    const activity = createActivity(
      task.assignee || task.requestedBy || 'Sistema',
      'adicionou item no checklist',
      item.title,
      'task',
      subtaskId || taskId
    );

    applyRootTaskMutation(
      taskId,
      (currentTask) =>
        appendActivityToTaskNode(
          !subtaskId
            ? {
                ...currentTask,
                checklistItems: [...(currentTask.checklistItems || []), item],
              }
            : {
                ...currentTask,
                subtasks: updateSubtaskTree(currentTask.subtasks || [], subtaskId, (subtask) => ({
                  ...subtask,
                  checklistItems: [...(subtask.checklistItems || []), item],
                })),
              },
          activity,
          subtaskId
        ),
      task.projectId
        ? createActivity(
            task.assignee || task.requestedBy || 'Sistema',
            'atualizou checklist de tarefa',
            task.title,
            'task',
            taskId
          )
        : undefined
    );
  };

  const toggleChecklistItem = (
    taskId: string,
    checklistItemId: string,
    subtaskId?: string
  ) => {
    const task = taskRecords.find((candidate) => candidate.id === taskId);
    if (!task) return;

    const toggleItems = (items: ChecklistItem[] = []) =>
      items.map((item) =>
        item.id === checklistItemId ? { ...item, completed: !item.completed } : item
      );

    const activity = createActivity(
      task.assignee || task.requestedBy || 'Sistema',
      'alterou item de checklist',
      task.title,
      'task',
      subtaskId || taskId
    );

    applyRootTaskMutation(
      taskId,
      (currentTask) =>
        appendActivityToTaskNode(
          !subtaskId
            ? {
                ...currentTask,
                checklistItems: toggleItems(currentTask.checklistItems),
              }
            : {
                ...currentTask,
                subtasks: updateSubtaskTree(currentTask.subtasks || [], subtaskId, (subtask) => ({
                  ...subtask,
                  checklistItems: toggleItems(subtask.checklistItems),
                })),
              },
          activity,
          subtaskId
        ),
      task.projectId
        ? createActivity(
            task.assignee || task.requestedBy || 'Sistema',
            'alterou checklist de tarefa',
            task.title,
            'task',
            taskId
          )
        : undefined
    );
  };

  const deleteChecklistItem = (
    taskId: string,
    checklistItemId: string,
    subtaskId?: string
  ) => {
    const task = taskRecords.find((candidate) => candidate.id === taskId);
    if (!task) return;

    const removeItems = (items: ChecklistItem[] = []) =>
      items.filter((item) => item.id !== checklistItemId);

    const activity = createActivity(
      task.assignee || task.requestedBy || 'Sistema',
      'removeu item de checklist',
      task.title,
      'task',
      subtaskId || taskId
    );

    applyRootTaskMutation(
      taskId,
      (currentTask) =>
        appendActivityToTaskNode(
          !subtaskId
            ? {
                ...currentTask,
                checklistItems: removeItems(currentTask.checklistItems),
              }
            : {
                ...currentTask,
                subtasks: updateSubtaskTree(currentTask.subtasks || [], subtaskId, (subtask) => ({
                  ...subtask,
                  checklistItems: removeItems(subtask.checklistItems),
                })),
              },
          activity,
          subtaskId
        ),
      task.projectId
        ? createActivity(
            task.assignee || task.requestedBy || 'Sistema',
            'editou checklist de tarefa',
            task.title,
            'task',
            taskId
          )
        : undefined
    );
  };

  const addComment = (taskId: string, comment: Comment, subtaskId?: string) => {
    const task = taskRecords.find((candidate) => candidate.id === taskId);
    if (!task) return;
    const targetNode = subtaskId ? findTaskNode(task, subtaskId) : task;
    const targetTitle = targetNode?.title || task.title;
    const mentionedUsers = extractMentionedUsers(comment.content, users, comment.userId);
    const attachmentsCount = comment.attachments?.length || 0;

    const activity = createActivity(
      comment.userName,
      'comentou',
      comment.content.trim() || `${attachmentsCount} imagem(ns) anexada(s) em ${task.title}`,
      'comment',
      subtaskId || taskId
    );

    applyRootTaskMutation(
      taskId,
      (currentTask) =>
        appendActivityToTaskNode(
          !subtaskId
            ? {
                ...currentTask,
                comments: [...(currentTask.comments || []), comment],
              }
            : {
                ...currentTask,
                subtasks: updateSubtaskTree(currentTask.subtasks || [], subtaskId, (subtask) => ({
                  ...subtask,
                  comments: [...(subtask.comments || []), comment],
                })),
              },
          activity,
          subtaskId
        ),
      task.projectId
        ? createActivity(comment.userName, 'recebeu um comentario', task.title, 'comment', taskId)
        : undefined
    );

    const targetUserIds = new Set<string>([
      targetNode?.assigneeId || '',
      ...(targetNode?.followerUserIds || []),
      ...users
        .filter((user) => (targetNode?.stakeholders || []).includes(user.name))
        .map((user) => user.id),
    ]);

    targetUserIds.delete(comment.userId);

    notifyUsers(Array.from(targetUserIds), (userId) =>
      createNotification({
        userId,
        type: 'comment_added',
        title: 'Novo comentário em tarefa',
        description: `${comment.userName} comentou em "${targetTitle}".`,
        entityType: 'task',
        entityId: subtaskId || taskId,
        linkTo: `/my-tasks?task=${subtaskId || taskId}`,
      })
    );

    notifyUsers(
      mentionedUsers.map((user) => user.id),
      (userId) =>
        createNotification({
          userId,
          type: 'mention',
          title: 'Você foi mencionado',
          description: `${comment.userName} mencionou você em "${targetTitle}".`,
          entityType: 'task',
          entityId: subtaskId || taskId,
          linkTo: `/my-tasks?task=${subtaskId || taskId}`,
        })
    );

    publishDomainEvent({
      name: 'comment.created',
      entityType: 'comment',
      entityId: comment.id,
      payloadJson: {
        commentId: comment.id,
        taskId: subtaskId || taskId,
        rootTaskId: taskId,
        projectId: task.projectId,
        authorId: comment.userId,
        authorName: comment.userName,
        attachmentsCount,
      },
    });
  };

  const addManualTimeLog = (taskId: string, durationSeconds: number, subtaskId?: string) => {
    const task = taskRecords.find((candidate) => candidate.id === taskId);
    if (!task || durationSeconds <= 0) return;

    const timeLog: TimeLog = {
      id: `timelog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      taskId,
      userId: currentUser?.id,
      source: 'manual',
      manualSeconds: durationSeconds,
      durationSeconds,
      createdAt: new Date().toISOString(),
    };

    const activity = createActivity(
      task.assignee || task.requestedBy || 'Sistema',
      'registrou tempo',
      `${formatDurationSummary(durationSeconds)} em ${task.title}`,
      'task',
      subtaskId || taskId
    );

    applyRootTaskMutation(
      taskId,
      (currentTask) =>
        appendActivityToTaskNode(
          !subtaskId
            ? {
                ...currentTask,
                timeLogs: [...(currentTask.timeLogs || []), timeLog],
                actualHours: formatDurationHours(
                  getTaskNodeOwnTrackedSeconds(currentTask) + durationSeconds
                ),
              }
            : {
                ...currentTask,
                subtasks: updateSubtaskTree(currentTask.subtasks || [], subtaskId, (subtask) => ({
                  ...subtask,
                  timeLogs: [...(subtask.timeLogs || []), timeLog],
                })),
              },
          activity,
          subtaskId
        ),
      task.projectId
        ? createActivity(
            task.assignee || task.requestedBy || 'Sistema',
            'registrou tempo em tarefa do projeto',
            `${task.title} (${formatDurationSummary(durationSeconds)})`,
            'task',
            taskId
          )
        : undefined
    );
  };

  const startTimeTracking = (taskId: string) => {
    const task = taskRecords.find((candidate) => candidate.id === taskId);
    const activeSessions = trackingSessions[taskId] || [];
    if (activeSessions.some((session) => !session.endTime)) {
      setActiveTracking((prev) => ({
        ...prev,
        [taskId]: true,
      }));
      return;
    }

    const newEntry: TimeLog = {
      id: `tracking-${Date.now()}`,
      taskId,
      userId: currentUser?.id,
      source: 'timer',
      startTime: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    setTrackingSessions((prev) => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), newEntry],
    }));

    setActiveTracking((prev) => ({
      ...prev,
      [taskId]: true,
    }));

    if (task && normalizeTaskStatus(task.status, task.completed) === 'not_started') {
      updateTask(taskId, { status: 'in_progress' });
    }
  };

  const stopTimeTracking = (taskId: string) => {
    const task = taskRecords.find((candidate) => candidate.id === taskId);
    const sessions = trackingSessions[taskId] || [];
    const activeSession = sessions.find((session) => !session.endTime);

    if (activeSession && task) {
      const endTime = new Date();
      const startTime = new Date(activeSession.startTime || endTime.toISOString());
      const durationSeconds = Math.max(
        1,
        Math.round((endTime.getTime() - startTime.getTime()) / 1000)
      );

      const updatedSessions = sessions.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              userId: session.userId || currentUser?.id,
              endTime: endTime.toISOString(),
              durationSeconds,
            }
          : session
      );

      setTrackingSessions((prev) => ({
        ...prev,
        [taskId]: updatedSessions,
      }));

      const activity = createActivity(
        task.assignee || task.requestedBy || 'Sistema',
        'registrou tempo via timer',
        `${formatDurationSummary(durationSeconds)} em ${task.title}`,
        'task',
        taskId
      );

      const rootTaskId = task.isSubtaskNode && task.rootTaskId ? task.rootTaskId : taskId;
      const targetSubtaskId = task.isSubtaskNode ? task.id : undefined;

      applyRootTaskMutation(
        rootTaskId,
        (currentTask) =>
          appendActivityToTaskNode(
            !targetSubtaskId
              ? {
                  ...currentTask,
                  timeLogs: updatedSessions,
                }
              : {
                  ...currentTask,
                  subtasks: updateSubtaskTree(currentTask.subtasks || [], targetSubtaskId, (subtask) => ({
                    ...subtask,
                    timeLogs: updatedSessions,
                  })),
                },
            activity,
            targetSubtaskId
          ),
        task.projectId
          ? createActivity(
              task.assignee || task.requestedBy || 'Sistema',
              'registrou tempo em tarefa do projeto',
              `${task.title} (${formatDurationSummary(durationSeconds)} via timer)`,
              'task',
              taskId
            )
          : undefined
      );
    }

    setActiveTracking((prev) => ({
      ...prev,
      [taskId]: false,
    }));
  };

  const getTrackingState = (taskId: string) => {
    const sessions = trackingSessions[taskId] || [];
    return {
      isTracking: activeTracking[taskId] || sessions.some((session) => !session.endTime),
      sessions,
      activeSession: sessions.find((session) => !session.endTime),
    };
  };

  const getTaskById = (taskId: string): EnrichedTask | undefined =>
    taskRecords.find((task) => task.id === taskId);

  const getTasksForProject = (projectId: string): WBSTask[] => {
    const projectTasks: WBSTask[] = [];

    const project = projects.find((candidate) => candidate.id === projectId);
    if (project) {
      const phases = getProjectExecutionPhases(project);
      phases.forEach((phase) => {
        phase.milestones.forEach((milestone: any) => {
          milestone.tasks.forEach((task: WBSTask) => {
            if (!isTaskNodeDeleted(task)) {
              projectTasks.push(normalizeTask(task));
            }
          });
        });
      });
    }

    return projectTasks;
  };

  const getTasksForPhase = (projectId: string, phaseId: string): WBSTask[] =>
    getTasksForProject(projectId)
      .filter((task) => task.phaseId === phaseId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

  const getTasksForMilestone = (
    projectId: string,
    phaseId: string,
    milestoneId: string
  ): WBSTask[] =>
    getTasksForProject(projectId)
      .filter((task) => task.phaseId === phaseId && task.milestoneId === milestoneId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

  const reorderTasksInGroup = (
    projectId: string,
    phaseId: string,
    milestoneId: string | undefined,
    taskIds: string[]
  ) => {
    taskIds.forEach((taskId, index) => {
      updateTask(taskId, { order: index });
    });
  };

  const moveTaskInGroup = (
    projectId: string,
    phaseId: string,
    milestoneId: string | undefined,
    taskId: string,
    direction: 'up' | 'down'
  ) => {
    let groupTasks = allTasks.filter(
      (task) => task.projectId === projectId && task.phaseId === phaseId
    );

    if (milestoneId) {
      groupTasks = groupTasks.filter((task) => task.milestoneId === milestoneId);
    } else {
      groupTasks = groupTasks.filter((task) => !task.milestoneId);
    }

    groupTasks = groupTasks.sort((a, b) => (a.order || 0) - (b.order || 0));
    const taskIndex = groupTasks.findIndex((task) => task.id === taskId);

    if (taskIndex === -1 || groupTasks.length <= 1) return;

    let newIndex = taskIndex;
    if (direction === 'up' && taskIndex > 0) {
      newIndex = taskIndex - 1;
    } else if (direction === 'down' && taskIndex < groupTasks.length - 1) {
      newIndex = taskIndex + 1;
    } else {
      return;
    }

    const [movedTask] = groupTasks.splice(taskIndex, 1);
    groupTasks.splice(newIndex, 0, movedTask);

    groupTasks.forEach((task, index) => {
      if (task.order !== index) {
        updateTask(task.id, { order: index });
      }
    });
  };

  const moveIndependentTask = (taskId: string, direction: 'up' | 'down') => {
    const sortedTasks = [...independentTasks].sort((a, b) => (a.order || 0) - (b.order || 0));
    const taskIndex = sortedTasks.findIndex((task) => task.id === taskId);

    if (taskIndex === -1 || sortedTasks.length <= 1) return;

    let newIndex = taskIndex;
    if (direction === 'up' && taskIndex > 0) {
      newIndex = taskIndex - 1;
    } else if (direction === 'down' && taskIndex < sortedTasks.length - 1) {
      newIndex = taskIndex + 1;
    } else {
      return;
    }

    const [movedTask] = sortedTasks.splice(taskIndex, 1);
    sortedTasks.splice(newIndex, 0, movedTask);

    sortedTasks.forEach((task, index) => {
      if (task.order !== index) {
        updateTask(task.id, { order: index });
      }
    });
  };

  const getProjectDependencies = (projectId: string) =>
    (projects.find((project) => project.id === projectId)?.execution?.dependencies || []).map(
      normalizeDependencyRecord
    );

  const buildProjectDependencyNodeMap = (project: Project) => {
    const itemsById = new Map<string, DependencyNode>();
    itemsById.set(`project:${project.id}`, {
      id: project.id,
      type: 'project',
      title: project.name,
      projectId: project.id,
      startDate: project.requestDate,
      dueDate: project.deadline,
      completionDate: project.completionDate,
    });

    getProjectExecutionPhases(project).forEach((phase) => {
      itemsById.set(`phase:${phase.id}`, {
        id: phase.id,
        type: 'phase',
        title: phase.name,
        projectId: project.id,
        startDate: phase.actualStartDate || phase.plannedStartDate || phase.startDate,
        dueDate: phase.actualEndDate || phase.plannedEndDate || phase.endDate,
        completionDate: phase.actualEndDate,
      });

      (phase.milestones || []).forEach((milestone) => {
        (milestone.tasks || []).forEach((task) => {
          itemsById.set(task.id, {
            id: task.id,
            type: 'task',
            title: task.title,
            projectId: project.id,
            status: task.status,
            startDate: task.startDate,
            dueDate: task.dueDate,
            completionDate: task.completionDate,
          });
          itemsById.set(`task:${task.id}`, {
            id: task.id,
            type: 'task',
            title: task.title,
            projectId: project.id,
            status: task.status,
            startDate: task.startDate,
            dueDate: task.dueDate,
            completionDate: task.completionDate,
          });
        });
      });
    });

    return itemsById;
  };

  const addProjectDependency: TaskContextType['addProjectDependency'] = (input) => {
    const project = projects.find((candidate) => candidate.id === input.projectId);
    if (!project) {
      return { success: false, reason: 'Projeto não encontrado.' };
    }

    const projectDependencies = getProjectDependencies(project.id);
    const itemsById = buildProjectDependencyNodeMap(project);
    const { dependency, validation } = createProjectDependency(input, projectDependencies, itemsById);
    if (!validation.isValid || !dependency) {
      return { success: false, reason: validation.reason };
    }

    updateProject(project.id, {
      execution: {
        ...project.execution,
        dependencies: [...projectDependencies, dependency],
      },
      activities: [
        ...(project.activities || []),
        createActivity(
          currentUser?.name || 'Sistema',
          dependency.kind === 'relationship'
            ? 'adicionou um relacionamento'
            : 'adicionou uma dependência',
          `${dependency.sourceType}:${dependency.sourceId} -> ${dependency.targetType}:${dependency.targetId}`,
          'task',
          dependency.id
        ),
      ],
    });

    if (dependency.kind === 'dependency') {
      publishDomainEvent({
        name: 'task.dependency_created',
        entityType: 'task',
        entityId: dependency.id,
        payloadJson: {
          dependencyId: dependency.id,
          projectId: input.projectId,
          sourceId: dependency.sourceId,
          sourceType: dependency.sourceType,
          targetId: dependency.targetId,
          targetType: dependency.targetType,
          dependencyType: dependency.dependencyType,
        },
      });
    }

    return { success: true, dependency };
  };

  const addTaskDependency: TaskContextType['addTaskDependency'] = (input) => {
    const sourceTask = taskRecords.find((task) => task.id === input.predecessorTaskId);
    const targetTask = taskRecords.find((task) => task.id === input.successorTaskId);
    const canManageAnyDependency = currentUser?.role === 'pmo' || currentUser?.role === 'admin';
    const ownsSourceTask = sourceTask?.assigneeId === currentUser?.id || sourceTask?.assignee === currentUser?.name;
    const ownsTargetTask = targetTask?.assigneeId === currentUser?.id || targetTask?.assignee === currentUser?.name;

    if (!canManageAnyDependency && !(ownsSourceTask && ownsTargetTask)) {
      return { success: false, reason: 'Você só pode criar dependências entre tarefas próprias.' };
    }

    return addProjectDependency({
      projectId: input.projectId,
      sourceId: input.predecessorTaskId,
      sourceType: 'task',
      targetId: input.successorTaskId,
      targetType: 'task',
      dependencyType: input.dependencyType,
      dependencyClass: input.dependencyClass,
      lagMinutes: input.lagMinutes,
      lagDays: input.lagDays,
      externalDependency: input.externalDependency,
      createdBy: input.createdBy || currentUser?.name,
    });
  };

  const removeTaskDependency = (projectId: string, dependencyId: string) => {
    removeProjectDependency(projectId, dependencyId);
  };

  const removeProjectDependency: TaskContextType['removeProjectDependency'] = (projectId, dependencyId) => {
    const project = projects.find((candidate) => candidate.id === projectId);
    if (!project) return;

    const dependencies = getProjectDependencies(projectId);
    const nextDependencies = dependencies.filter((dependency) => dependency.id !== dependencyId);
    if (nextDependencies.length === dependencies.length) return;

    updateProject(project.id, {
      execution: {
        ...project.execution,
        dependencies: nextDependencies,
      },
      activities: [
        ...(project.activities || []),
        createActivity(
          currentUser?.name || 'Sistema',
          'removeu um vínculo de dependência',
          dependencyId,
          'task',
          dependencyId
        ),
      ],
    });
  };

  const applyTaskTemplateToProject = (projectId: string, template: TaskTemplate) => {
    const project = projects.find((candidate) => candidate.id === projectId);
    if (!project) {
      return { createdTasks: 0, skippedTasks: 0, alreadyApplied: false };
    }

    const result = applyTaskTemplateToProjectEngine(project, template);
    if (result.alreadyApplied) {
      return {
        createdTasks: 0,
        skippedTasks: result.skippedTasks,
        alreadyApplied: true,
      };
    }

    updateProject(projectId, result.updatedProject);
    return {
      createdTasks: result.createdTasks,
      skippedTasks: result.skippedTasks,
      alreadyApplied: false,
    };
  };

  return (
    <TaskContext.Provider
      value={{
        allTasks,
        independentTasks,
        addIndependentTask,
        duplicateTask,
        updateTask,
        deleteTask,
        setTaskScopeStatus,
        restoreTaskScope,
        getTaskImpactSummary,
        toggleSubtaskCompletion,
        addSubtask,
        updateSubtask,
        deleteSubtask,
        addChecklistItem,
        toggleChecklistItem,
        deleteChecklistItem,
        addComment,
        addManualTimeLog,
        startTimeTracking,
        stopTimeTracking,
        getTrackingState,
        getTaskById,
        getTasksForProject,
        getTasksForPhase,
        getTasksForMilestone,
        reorderTasksInGroup,
        moveTaskInGroup,
        moveIndependentTask,
        updatePersonalTaskStage,
        getProjectDependencies,
        addProjectDependency,
        addTaskDependency,
        removeTaskDependency,
        removeProjectDependency,
        applyTaskTemplateToProject,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within TaskProvider');
  }
  return context;
}
