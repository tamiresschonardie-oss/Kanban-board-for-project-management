import {
  ActivityLog,
  ChecklistItem,
  Phase,
  Project,
  Subtask,
  TaskTemplate,
  TaskTemplateItem,
  WBSTask,
} from '../types';
import { calculateProjectMetricsFromExecution } from './progressCalculator';
import { getProjectExecutionPhases } from './projectSelectors';

interface ApplyTaskTemplateResult {
  updatedProject: Project;
  createdTasks: number;
  skippedTasks: number;
  alreadyApplied: boolean;
}

const createActivity = (details: string, projectId: string): ActivityLog => ({
  id: `task-template-activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  timestamp: new Date().toISOString(),
  user: 'Sistema',
  action: 'Template de tarefas aplicado',
  details,
  entityType: 'project',
  entityId: projectId,
  metadata: {
    automation: false,
  },
});

const nextId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const buildChecklistItemsFromTemplate = (
  titles: string[] | undefined
): ChecklistItem[] =>
  (titles || [])
    .map((title) => title.trim())
    .filter(Boolean)
    .map((title) => ({
      id: nextId('checklist'),
      title,
      completed: false,
    }));

export const buildSubtasksFromTemplate = (
  items: TaskTemplateItem[] | undefined,
  templateId: string
): Subtask[] =>
  (items || []).map((item) => ({
    id: nextId('subtask'),
    title: item.title,
    completed: false,
    status: 'not_started',
    taskType: item.taskTypeId as Subtask['taskType'],
    priority: item.priority || 'medium',
    description: item.description,
    assignee: item.assignee,
    assigneeId: item.assigneeId,
    requestedBy: item.requestedBy,
    stakeholders: item.stakeholders || [],
    tagIds: item.tagIds || [],
    subtasks: buildSubtasksFromTemplate(item.subtasks, templateId),
    checklistItems: buildChecklistItemsFromTemplate(item.checklistTitles),
    comments: [],
    attachments: [],
    timeLogs: [],
    activities: [],
    generatedFromTaskTemplateId: templateId,
    generatedFromTaskTemplateItemId: item.id,
  }));

export function buildTaskPrefillFromTemplateItem(
  item: TaskTemplateItem,
  templateId: string
) {
  return {
    title: item.title || '',
    description: item.description || '',
    priority: item.priority || ('medium' as const),
    assignee: item.assignee || '',
    assigneeId: item.assigneeId,
    requestedBy: item.requestedBy || '',
    stakeholders: item.stakeholders || [],
    tagIds: item.tagIds || [],
    taskTypeId: item.taskTypeId,
    productId: item.productId,
    teamId: item.teamId,
    subtasks: buildSubtasksFromTemplate(item.subtasks, templateId),
    checklistItems: buildChecklistItemsFromTemplate(item.checklistTitles),
    generatedFromTaskTemplateId: templateId,
    generatedFromTaskTemplateItemId: item.id,
  };
}

const createTaskFromTemplateItem = (
  item: TaskTemplateItem,
  project: Project,
  phaseId?: string,
  milestoneId?: string,
  order = 0,
  templateId?: string
): WBSTask => {
  const prefill = buildTaskPrefillFromTemplateItem(item, templateId || '');

  return {
    id: nextId('task'),
    title: prefill.title,
    description: prefill.description,
    status: 'not_started',
    assignee: prefill.assignee || undefined,
    requestedBy: prefill.requestedBy || project.requestedBy,
    stakeholders: prefill.stakeholders,
    assigneeId: prefill.assigneeId || undefined,
    tagIds: prefill.tagIds,
    taskType: prefill.taskTypeId as WBSTask['taskType'],
    priority: prefill.priority,
    subtasks: prefill.subtasks,
    order,
    comments: [],
    checklistItems: prefill.checklistItems,
    attachments: [],
    timeLogs: [],
    activities: [],
    projectId: project.id,
    phaseId,
    milestoneId,
    generatedFromTaskTemplateId: prefill.generatedFromTaskTemplateId,
    generatedFromTaskTemplateItemId: prefill.generatedFromTaskTemplateItemId,
  };
};

const findTargetLocation = (phases: Phase[], item: TaskTemplateItem) => {
  const phase =
    phases.find((candidate) => candidate.id === item.targetPhaseId) ||
    phases.find((candidate) => candidate.name === item.targetPhaseName) ||
    phases.find((candidate) => !item.targetPhaseName) ||
    phases[0];

  if (!phase) return { phase: undefined, milestone: undefined };

  const milestone =
    phase.milestones.find((candidate) => candidate.id === item.targetMilestoneId) ||
    phase.milestones.find((candidate) => candidate.name === item.targetMilestoneName) ||
    phase.milestones[0];

  return { phase, milestone };
};

export function applyTaskTemplateToProject(
  project: Project,
  template: TaskTemplate
): ApplyTaskTemplateResult {
  const appliedTemplateIds = project.execution.appliedTaskTemplateIds || [];
  if (appliedTemplateIds.includes(template.id)) {
    return {
      updatedProject: project,
      createdTasks: 0,
      skippedTasks: template.items.length,
      alreadyApplied: true,
    };
  }

  let createdTasks = 0;
  let skippedTasks = 0;

  const updatedPhases = getProjectExecutionPhases(project).map((phase) => ({
    ...phase,
    milestones: (phase.milestones || []).map((milestone) => ({
      ...milestone,
      tasks: [...(milestone.tasks || [])],
    })),
  }));

  template.items.forEach((item) => {
    const { phase, milestone } = findTargetLocation(updatedPhases, item);

    if (!phase) {
      skippedTasks += 1;
      return;
    }

    if (milestone) {
      const targetMilestone = phase.milestones.find((candidate) => candidate.id === milestone.id);
      if (!targetMilestone) {
        skippedTasks += 1;
        return;
      }

      targetMilestone.tasks = [
        ...(targetMilestone.tasks || []),
        createTaskFromTemplateItem(
          item,
          project,
          phase.id,
          targetMilestone.id,
          targetMilestone.tasks.length,
          template.id
        ),
      ];
      createdTasks += 1;
      return;
    }

    if (phase.milestones.length === 0) {
      skippedTasks += 1;
      return;
    }
  });

  const appliedTaskTemplateIds =
    createdTasks > 0 ? [...(project.execution.appliedTaskTemplateIds || []), template.id] : project.execution.appliedTaskTemplateIds || [];

  const nextProject: Project = {
    ...project,
    execution: {
      ...project.execution,
      phases: updatedPhases,
      appliedTaskTemplateIds,
    },
    activities: [
      ...(project.activities || []),
      createActivity(
        createdTasks > 0
          ? `Template "${template.name}" aplicado. ${createdTasks} tarefa(s) criada(s), ${skippedTasks} ignorada(s).`
          : `Tentativa de aplicar template "${template.name}" sem criar tarefas. ${skippedTasks} item(ns) ignorado(s).`,
        project.id
      ),
    ],
  };

  const metrics = calculateProjectMetricsFromExecution(nextProject);

  return {
    updatedProject: {
      ...nextProject,
      metrics,
      progress: metrics.progress,
      tasksCompleted: metrics.tasksCompleted,
      tasksTotal: metrics.tasksTotal,
      hoursRemaining: metrics.hoursRemaining,
      totalTimeTracked: metrics.totalTimeTracked,
    },
    createdTasks,
    skippedTasks,
    alreadyApplied: false,
  };
}
