import { ActivityLog, Project, Skill } from '../types';

export interface SkillTaskLike {
  id: string;
  title: string;
  skillId?: string;
  skillName?: string;
  status?: string;
  assignee?: string;
  projectId?: string;
  projectName?: string;
  projectGroup?: string;
  phaseName?: string;
  itemTypeLabel?: string;
  dueDate?: string;
  startDate?: string;
  completionDate?: string;
  activities?: ActivityLog[];
  rootTaskId?: string;
  isSubtaskNode?: boolean;
}

export interface SkillMetrics {
  totalProjects: number;
  totalTasks: number;
  tasksInProgress: number;
  tasksCompleted: number;
  tasksBacklog: number;
  impactedFlows: number;
  lastMovementAt?: string;
}

export interface SkillActivityEntry {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  entityType: 'project' | 'task';
  entityId: string;
  projectId?: string;
  taskId?: string;
}

const getSafeTimestamp = (value?: string) => {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export function getProjectsBySkill(projects: Project[], skillId?: string) {
  if (!skillId) return [];
  return projects.filter((project) => project.skillId === skillId);
}

export function getTasksBySkill<T extends SkillTaskLike>(tasks: T[], skillId?: string) {
  if (!skillId) return [];
  return tasks.filter((task) => task.skillId === skillId);
}

export function getSkillMetrics(
  skill: Skill,
  projects: Project[],
  tasks: SkillTaskLike[]
): SkillMetrics {
  const relatedProjects = getProjectsBySkill(projects, skill.id);
  const relatedTasks = getTasksBySkill(tasks, skill.id);
  const timestamps = [
    skill.updatedAt,
    ...relatedProjects.flatMap((project) => [
      project.requestDate,
      project.deadline,
      ...(project.activities || []).map((activity) => activity.timestamp),
    ]),
    ...relatedTasks.flatMap((task) => [
      task.startDate,
      task.dueDate,
      task.completionDate,
      ...(task.activities || []).map((activity) => activity.timestamp),
    ]),
  ]
    .map(getSafeTimestamp)
    .filter(Boolean);

  const impactedFlows = new Set(
    relatedProjects
      .flatMap((project) => (project.teams?.length ? project.teams : [project.group]))
      .filter(Boolean)
  ).size;

  const totalTasks = relatedTasks.length;
  const tasksCompleted = relatedTasks.filter((task) => task.status === 'done').length;
  const tasksInProgress = relatedTasks.filter((task) => task.status === 'in_progress').length;
  const tasksBacklog = totalTasks - tasksCompleted - tasksInProgress;

  return {
    totalProjects: relatedProjects.length,
    totalTasks,
    tasksInProgress,
    tasksCompleted,
    tasksBacklog,
    impactedFlows,
    lastMovementAt: timestamps.length
      ? new Date(Math.max(...timestamps)).toISOString()
      : skill.updatedAt,
  };
}

export function getSkillActivity(
  skill: Skill,
  projects: Project[],
  tasks: SkillTaskLike[]
): SkillActivityEntry[] {
  const projectEntries: SkillActivityEntry[] = getProjectsBySkill(projects, skill.id).flatMap((project) => {
    const fromActivities = (project.activities || []).map((activity) => ({
      id: `skill-activity-project-${project.id}-${activity.id}`,
      timestamp: activity.timestamp,
      title: activity.action,
      description: activity.details,
      entityType: 'project' as const,
      entityId: project.id,
      projectId: project.id,
    }));

    if (fromActivities.length > 0) return fromActivities;

    return [
      {
        id: `skill-activity-project-created-${project.id}`,
        timestamp: project.requestDate || project.deadline || skill.createdAt,
        title: 'Projeto iniciado',
        description: `${project.name} passou a evoluir esta habilidade.`,
        entityType: 'project',
        entityId: project.id,
        projectId: project.id,
      },
    ];
  });

  const taskEntries: SkillActivityEntry[] = getTasksBySkill(tasks, skill.id).flatMap((task) => {
    const fromActivities = (task.activities || []).map((activity) => ({
      id: `skill-activity-task-${task.id}-${activity.id}`,
      timestamp: activity.timestamp,
      title: activity.action,
      description: activity.details,
      entityType: 'task' as const,
      entityId: task.id,
      taskId: task.id,
      projectId: task.projectId,
    }));

    if (fromActivities.length > 0) return fromActivities;

    if (task.status === 'done') {
      return [
        {
          id: `skill-activity-task-done-${task.id}`,
          timestamp: task.completionDate || task.dueDate || skill.updatedAt,
          title: 'Tarefa concluída',
          description: `${task.title} foi concluída no contexto da habilidade.`,
          entityType: 'task',
          entityId: task.id,
          taskId: task.id,
          projectId: task.projectId,
        },
      ];
    }

    return [
      {
        id: `skill-activity-task-created-${task.id}`,
        timestamp: task.startDate || task.dueDate || skill.createdAt,
        title: 'Tarefa criada',
        description: `${task.title} entrou no fluxo operacional desta habilidade.`,
        entityType: 'task',
        entityId: task.id,
        taskId: task.id,
        projectId: task.projectId,
      },
    ];
  });

  return [...projectEntries, ...taskEntries]
    .filter((entry) => entry.timestamp)
    .sort((a, b) => getSafeTimestamp(b.timestamp) - getSafeTimestamp(a.timestamp))
    .slice(0, 12);
}
