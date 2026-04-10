import {
  ActivityLog,
  EAP,
  Phase,
  Project,
  ProjectAttachment,
  ProjectPurpose,
  ProjectRoleAssignment,
  ProjectStakeholderAssignment,
  ProjectSituation,
  Skill,
  Stakeholder,
  Tag,
  Team,
  Subtask,
  WBSTask,
} from '../types';
import { DEFAULT_GOVERNANCE_PHASES, PROJECT_SITUATIONS } from '../constants/project';
import { getProjectExecutionPhases, getProjectMetrics } from './projectSelectors';
import {
  applyRoleAssignmentsToPhases,
  normalizeProjectRoleAssignments,
  normalizeProjectRoleKey,
} from './phaseOwnership';
import { normalizeProjectValueState } from '../services/projectValueService';

export interface ProjectFormValues {
  situation: ProjectSituation;
  purpose: ProjectPurpose | '';
  name: string;
  originTicket: string;
  client: string;
  responsible: string;
  requestedBy: string;
  primaryTeam: string;
  teams: string[];
  stakeholderAssignments: ProjectStakeholderAssignment[];
  projectRoleAssignments: ProjectRoleAssignment[];
  product: string;
  skillId: string;
  objective: string;
  justification: string;
  expectedBenefitsText: string;
  requestDate: string;
  deadline: string;
  completionDate: string;
  documentation: string;
  attachments: ProjectAttachment[];
  coverImage: string;
  tagIds: string[];
  eapTemplateId: string;
  logoColor: string;
  logoText: string;
}

const createActivity = (user: string, action: string, details: string): ActivityLog => ({
  id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  timestamp: new Date().toISOString(),
  user: user || 'Sistema',
  action,
  details,
  entityType: 'project',
});

const createTemplateTaskActivity = (
  title: string,
  templateTaskId?: string
): ActivityLog => ({
  id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  timestamp: new Date().toISOString(),
  user: 'Sistema',
  action: 'instanciou tarefa do template',
  details: title,
  entityType: 'task',
  entityId: templateTaskId,
  metadata: {
    templateTaskId: templateTaskId || null,
  },
});

const buildTemplateSubtasks = (subtasks: Subtask[] = []): Subtask[] =>
  subtasks.map((subtask) => ({
    ...subtask,
    id: `subtask-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    completed: false,
    status: 'not_started',
    subtasks: buildTemplateSubtasks(subtask.subtasks || []),
    comments: [],
    attachments: [],
    timeLogs: [],
    activities: [
      createTemplateTaskActivity(subtask.title, subtask.templateTaskId || subtask.id),
    ],
    originType: 'template',
    templateTaskId: subtask.templateTaskId || subtask.id,
    isTemplateInstance: true,
    scopeStatus: 'active',
    removedFromScopeAt: undefined,
    removedFromScopeBy: undefined,
    removalReason: undefined,
    deletedAt: undefined,
    deletedBy: undefined,
  }));

const buildTemplateTasks = (
  tasks: WBSTask[] = [],
  projectId: string,
  phaseId: string,
  milestoneId: string
): WBSTask[] =>
  tasks
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((task, index) => ({
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      projectId,
      phaseId,
      milestoneId,
      order: index,
      status: 'not_started',
      subtasks: buildTemplateSubtasks(task.subtasks || []),
      comments: [],
      attachments: [],
      timeLogs: [],
      activities: [
        createTemplateTaskActivity(task.title, task.templateTaskId || task.id),
      ],
      originType: 'template',
      templateTaskId: task.templateTaskId || task.id,
      isTemplateInstance: true,
      scopeStatus: 'active',
      removedFromScopeAt: undefined,
      removedFromScopeBy: undefined,
      removalReason: undefined,
      deletedAt: undefined,
      deletedBy: undefined,
    }));

export function cloneExecutionFromTemplate(
  templateId: string,
  eapTemplates: EAP[],
  projectRoleAssignments: ProjectRoleAssignment[] = [],
  projectId = `project-template-${Date.now()}`
): Phase[] {
  const template = eapTemplates.find((item) => item.id === templateId);
  if (!template) return [];

  const timestamp = Date.now();
  const phases = template.phases
    .sort((a, b) => a.order - b.order)
    .map((phase, phaseIndex) => ({
      ...phase,
      id: `phase-${timestamp}-${phaseIndex}`,
      templatePhaseId: phase.id,
      expectedRoleKey:
        phase.expectedRoleKey || normalizeProjectRoleKey(phase.expectedRoleLabel),
      expectedRoleLabel: phase.expectedRoleLabel || undefined,
      assignedOwnerId: undefined,
      assignedOwnerName: undefined,
      milestones: phase.milestones
        .sort((a, b) => a.order - b.order)
        .map((milestone, milestoneIndex) => ({
          ...milestone,
          id: `milestone-${timestamp}-${milestoneIndex}`,
          tasks: buildTemplateTasks(
            milestone.tasks || [],
            projectId,
            `phase-${timestamp}-${phaseIndex}`,
            `milestone-${timestamp}-${milestoneIndex}`
          ),
        })),
    }));

  return applyRoleAssignmentsToPhases(phases, projectRoleAssignments);
}

export function mapProjectToFormValues(
  project?: Project,
  stakeholdersCatalog: Stakeholder[] = [],
  tagsCatalog: Tag[] = []
): ProjectFormValues {
  const stakeholderAssignments =
    project?.stakeholderAssignments?.length
      ? project.stakeholderAssignments
      : (project?.stakeholders || []).map((name) => {
          const catalogStakeholder = stakeholdersCatalog.find(
            (stakeholder) => stakeholder.name === name
          );

          return {
            stakeholderId: catalogStakeholder?.id || `legacy-${name}`,
            name,
            projectRole: '',
          };
        });

  const projectRoleAssignments =
    project?.projectRoleAssignments?.length
      ? project.projectRoleAssignments
      : [];

  return {
    situation: project?.governance.situation || PROJECT_SITUATIONS.ATIVO,
    purpose: project?.purpose || '',
    name: project?.name || '',
    originTicket: project?.originTicket || '',
    client: project?.client || '',
    responsible: project?.responsible || '',
    requestedBy: project?.requestedBy || '',
    primaryTeam: project?.group || '',
    teams: project?.teams || [],
    stakeholderAssignments,
    projectRoleAssignments,
    product: project?.product || '',
    skillId: project?.skillId || '',
    objective: project?.objective || '',
    justification: project?.justification || '',
    expectedBenefitsText: (project?.expectedBenefits || []).join('\n'),
    requestDate: project?.requestDate || '',
    deadline: project?.deadline || '',
    completionDate: project?.completionDate || '',
    documentation: project?.documentation || '',
    attachments: project?.attachments || [],
    coverImage: project?.coverImage || '',
    tagIds:
      project?.tagIds?.length
        ? project.tagIds
        : (project?.tags || [])
            .map((tagName) =>
              tagsCatalog.find(
                (tag) => tag.normalizedName === tagName.trim().toLocaleLowerCase('pt-BR')
              )?.id
            )
            .filter((tagId): tagId is string => Boolean(tagId)),
    eapTemplateId: project?.execution.eapTemplateId || '',
    logoColor: project?.logoColor || '#2563EB',
    logoText: project?.logoText || '',
  };
}

export function buildProjectFromFormValues(params: {
  form: ProjectFormValues;
  existingProject?: Project;
  eapTemplates: EAP[];
  teamsCatalog: Team[];
  skillsCatalog: Skill[];
  tagsCatalog: Tag[];
}): Project {
  const { form, existingProject, eapTemplates, teamsCatalog, skillsCatalog, tagsCatalog } = params;
  const existingExecutionPhases = existingProject
    ? getProjectExecutionPhases(existingProject)
    : [];
  const shouldApplyTemplate = !existingProject || existingExecutionPhases.length === 0;
  const executionPhases =
    form.eapTemplateId && shouldApplyTemplate
      ? cloneExecutionFromTemplate(
          form.eapTemplateId,
          eapTemplates,
          normalizeProjectRoleAssignments(form.projectRoleAssignments, existingProject?.id),
          existingProject?.id || `project-${Date.now()}`
        )
      : applyRoleAssignmentsToPhases(
          existingExecutionPhases,
          normalizeProjectRoleAssignments(form.projectRoleAssignments, existingProject?.id)
        );

  const primaryTeam = form.primaryTeam || form.teams[0] || existingProject?.group || '';
  const teamNames = Array.from(
    new Set([primaryTeam, ...form.teams].filter(Boolean))
  );
  const stakeholderAssignments = form.stakeholderAssignments
    .map((assignment) => ({
      stakeholderId: assignment.stakeholderId,
      name: assignment.name.trim(),
      projectRole: assignment.projectRole?.trim() || undefined,
    }))
    .filter((assignment) => assignment.name);
  const projectRoleAssignments = normalizeProjectRoleAssignments(
    form.projectRoleAssignments.map((assignment) => ({
      ...assignment,
      userName: assignment.userName?.trim() || assignment.userName,
      roleLabel: assignment.roleLabel?.trim() || '',
      roleKey: assignment.roleKey || normalizeProjectRoleKey(assignment.roleLabel),
    })),
    existingProject?.id
  );
  const teamColor =
    teamsCatalog.find((team) => team.name === primaryTeam)?.color ||
    existingProject?.logoColor ||
    '#2563EB';

  const metrics = existingProject ? getProjectMetrics(existingProject) : {
    progress: 0,
    tasksCompleted: 0,
    tasksTotal: 0,
    hoursRemaining: 0,
    totalTimeTracked: 0,
  };

  const activities = existingProject?.activities || [];
  const nextActivities = existingProject
    ? [
        ...activities,
        createActivity(form.responsible, 'Projeto editado', 'Dados principais do projeto atualizados'),
      ]
    : [
        createActivity(
          form.responsible,
          'Projeto criado',
          form.eapTemplateId
            ? `Projeto criado com EAP ${form.eapTemplateId}`
            : 'Projeto criado sem EAP inicial'
        ),
      ];

  const governancePhaseId = existingProject?.governance.currentPhaseId || 'backlog';
  const tagIds = Array.from(new Set(form.tagIds.filter(Boolean)));
  const tagNames = tagIds
    .map((tagId) => tagsCatalog.find((tag) => tag.id === tagId)?.name)
    .filter((tagName): tagName is string => Boolean(tagName));
  const selectedSkill = skillsCatalog.find((skill) => skill.id === form.skillId);

  return normalizeProjectValueState({
    id: existingProject?.id || `project-${Date.now()}`,
    name: form.name.trim(),
    group: primaryTeam,
    logoColor: form.logoColor || teamColor,
    logoText: form.logoText || form.name.slice(0, 2).toUpperCase(),
    status: governancePhaseId,
    situation: form.situation,
    governance: {
      currentPhaseId: governancePhaseId,
      situation: form.situation,
      phases: existingProject?.governance.phases || DEFAULT_GOVERNANCE_PHASES,
      history: existingProject?.governance.history || [],
    },
    responsible: form.responsible,
    requestedBy: form.requestedBy || undefined,
    client: form.client,
    teams: teamNames,
    stakeholderAssignments,
    projectRoleAssignments,
    stakeholders: stakeholderAssignments.map((assignment) => assignment.name),
    purpose: form.purpose || undefined,
    objective: form.objective || undefined,
    justification: form.justification || undefined,
    expectedBenefits: form.expectedBenefitsText
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean),
    realizedBenefits: existingProject?.realizedBenefits || [],
    benefits: existingProject?.benefits || [],
    resultMaturityType: existingProject?.resultMaturityType || 'medio_prazo',
    resultStatus: existingProject?.resultStatus || 'nao_iniciado',
    resultScheduleMode:
      existingProject?.resultScheduleMode ||
      ((existingProject?.resultCustomEvaluationOffsetsDays || []).length > 0 ? 'custom' : 'default'),
    resultOwnerId: existingProject?.resultOwnerId,
    resultCustomEvaluationOffsetsDays: existingProject?.resultCustomEvaluationOffsetsDays || [],
    impactLevel: existingProject?.impactLevel || 'medio',
    nextResultEvaluationAt: existingProject?.nextResultEvaluationAt,
    valueRealizationSummary: existingProject?.valueRealizationSummary,
    projectKpis: existingProject?.projectKpis || [],
    resultEvaluations: existingProject?.resultEvaluations || [],
    originTicket: form.originTicket || undefined,
    product: form.product || undefined,
    skillId: form.skillId || undefined,
    skillName: selectedSkill?.name || existingProject?.skillName,
    requestDate: form.requestDate || undefined,
    deadline: form.deadline || undefined,
    completionDate: form.completionDate || undefined,
    documentation: form.documentation || undefined,
    attachments: form.attachments,
    coverImage: form.coverImage || undefined,
    tagIds,
    tags: tagNames,
    execution: {
      eapTemplateId: form.eapTemplateId || undefined,
      phases: executionPhases,
      ganttDependencies: existingProject?.execution.ganttDependencies || [],
      manualTimelineEntries: existingProject?.execution.manualTimelineEntries || [],
    },
    eapId: form.eapTemplateId || undefined,
    phases: executionPhases,
    metrics,
    progress: metrics.progress,
    tasksCompleted: metrics.tasksCompleted,
    tasksTotal: metrics.tasksTotal,
    hoursRemaining: metrics.hoursRemaining,
    totalTimeTracked: metrics.totalTimeTracked,
    quadro: existingProject?.quadro || 'Backlog',
    activities: nextActivities,
    comments: existingProject?.comments || [],
    requester: form.requestedBy || undefined,
    isPaused: form.situation === PROJECT_SITUATIONS.PAUSADO,
  });
}
