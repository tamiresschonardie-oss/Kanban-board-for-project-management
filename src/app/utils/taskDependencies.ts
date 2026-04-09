import {
  DependencyEntityType,
  TaskDependency,
  TaskDependencyClass,
  TaskDependencyType,
  TaskRelationshipType,
} from '../types';
import { isTaskDoneStatus, isTaskInProgressStatus } from './taskStatus';

export const TASK_DEPENDENCY_TYPE_LABELS: Record<TaskDependencyType, string> = {
  FS: 'Comeca depois que terminar',
  SS: 'Comeca junto',
  FF: 'Termina junto',
  SF: 'Termina depois que comecar',
  blocks: 'Bloqueia',
  is_blocked_by: 'Bloqueada por',
};

export const TASK_DEPENDENCY_TYPE_EXPLANATIONS: Record<TaskDependencyType, string> = {
  FS: 'O item de destino so comeca depois que o item de origem for concluido.',
  SS: 'O item de destino so comeca quando o item de origem for iniciado.',
  FF: 'O item de destino so termina quando o item de origem terminar.',
  SF: 'O item de destino so termina depois que o item de origem iniciar.',
  blocks: 'O item de origem bloqueia explicitamente o item de destino.',
  is_blocked_by: 'O item de destino depende de desbloqueio explicito do item de origem.',
};

export const TASK_RELATIONSHIP_TYPE_LABELS: Record<TaskRelationshipType, string> = {
  related_to: 'Relacionado a',
  derives_from: 'Deriva de',
  refers_to: 'Referente a',
};

export const DEPENDENCY_ENTITY_TYPE_LABELS: Record<DependencyEntityType, string> = {
  task: 'Tarefa',
  phase: 'Fase',
  project: 'Projeto',
  sprint_item: 'Item priorizado',
};

export const TASK_DEPENDENCY_CLASS_LABELS: Record<TaskDependencyClass, string> = {
  hard: 'Obrigatoria',
  soft: 'Opcional',
  external: 'Externa',
  internal: 'Interna',
};

type TaskStatusLike = string | undefined;

export interface TaskDependencyNode {
  id: string;
  title: string;
  projectId?: string;
  status?: TaskStatusLike;
  startDate?: string;
  dueDate?: string;
  completionDate?: string;
}

export interface DependencyNode {
  id: string;
  type: DependencyEntityType;
  title: string;
  projectId?: string;
  status?: TaskStatusLike;
  startDate?: string;
  dueDate?: string;
  completionDate?: string;
}

export interface CreateTaskDependencyInput {
  projectId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  dependencyType: TaskDependencyType;
  dependencyClass: TaskDependencyClass;
  lagMinutes?: number;
  lagDays?: number;
  externalDependency?: boolean;
  createdBy?: string;
}

export interface CreateProjectDependencyInput {
  projectId: string;
  sourceId: string;
  sourceType: DependencyEntityType;
  targetId: string;
  targetType: DependencyEntityType;
  dependencyType?: TaskDependencyType;
  relationshipType?: TaskRelationshipType;
  dependencyClass?: TaskDependencyClass;
  lagMinutes?: number;
  lagDays?: number;
  externalDependency?: boolean;
  createdBy?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface DependencyValidationResult {
  isValid: boolean;
  reason?: string;
}

export interface TaskDependencyConflict {
  dependencyId: string;
  relation: string;
  severity: 'warning' | 'error';
  message: string;
}

const toTimestamp = (value?: string) => {
  if (!value) return undefined;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : undefined;
};

const getTaskStartTimestamp = (task?: Pick<DependencyNode, 'startDate'>) => toTimestamp(task?.startDate);
const getTaskFinishTimestamp = (task?: Pick<DependencyNode, 'completionDate' | 'dueDate'>) =>
  toTimestamp(task?.completionDate || task?.dueDate);

const getLagInMinutes = (dependency: Pick<TaskDependency, 'lagMinutes' | 'lagDays'>) =>
  (dependency.lagMinutes || 0) + (dependency.lagDays || 0) * 24 * 60;

const applyLag = (timestamp: number | undefined, lagMinutes: number) =>
  typeof timestamp === 'number' ? timestamp + lagMinutes * 60 * 1000 : undefined;

const hasTaskStarted = (task?: Pick<DependencyNode, 'status' | 'startDate'>) => {
  if (!task) return false;
  if (isTaskInProgressStatus(task.status) || isTaskDoneStatus(task.status)) return true;
  return typeof getTaskStartTimestamp(task) === 'number';
};

const hasTaskFinished = (task?: Pick<DependencyNode, 'status' | 'completionDate' | 'dueDate'>) => {
  if (!task) return false;
  if (isTaskDoneStatus(task.status)) return true;
  return typeof getTaskFinishTimestamp(task) === 'number';
};

export const normalizeDependencyRecord = (dependency: TaskDependency): TaskDependency => {
  const sourceId = dependency.sourceId || dependency.predecessorTaskId || '';
  const targetId = dependency.targetId || dependency.successorTaskId || '';
  const dependencyType = dependency.dependencyType;
  const kind = dependency.kind || (dependency.relationshipType ? 'relationship' : 'dependency');
  const dependencyClass = dependency.dependencyClass || 'hard';

  return {
    ...dependency,
    projectId: dependency.projectId,
    sourceId,
    sourceType: dependency.sourceType || 'task',
    targetId,
    targetType: dependency.targetType || 'task',
    kind,
    dependencyType,
    relationshipType: kind === 'relationship' ? dependency.relationshipType || 'related_to' : undefined,
    dependencyClass,
    externalDependency: Boolean(dependency.externalDependency || dependencyClass === 'external'),
    isActive: dependency.isActive ?? true,
    createdBy: dependency.createdBy,
    metadata: dependency.metadata || {},
    predecessorTaskId: dependency.predecessorTaskId || (dependency.sourceType === 'task' || !dependency.sourceType ? sourceId : undefined),
    successorTaskId: dependency.successorTaskId || (dependency.targetType === 'task' || !dependency.targetType ? targetId : undefined),
    createdAt: dependency.createdAt,
    updatedAt: dependency.updatedAt || dependency.createdAt,
  };
};

export const isDependencyRecord = (dependency: TaskDependency) => normalizeDependencyRecord(dependency).kind === 'dependency';
export const isRelationshipRecord = (dependency: TaskDependency) => normalizeDependencyRecord(dependency).kind === 'relationship';
export const isBlockingDependency = (dependency: TaskDependency) => {
  const normalized = normalizeDependencyRecord(dependency);
  return normalized.kind === 'dependency' && Boolean(normalized.dependencyType);
};

const buildGraph = (dependencies: TaskDependency[]) => {
  const graph = new Map<string, string[]>();
  dependencies
    .filter((dependency) => normalizeDependencyRecord(dependency).isActive)
    .filter((dependency) => isBlockingDependency(dependency))
    .forEach((dependency) => {
      const normalized = normalizeDependencyRecord(dependency);
      const sourceKey = `${normalized.sourceType}:${normalized.sourceId}`;
      const targetKey = `${normalized.targetType}:${normalized.targetId}`;
      const current = graph.get(sourceKey) || [];
      current.push(targetKey);
      graph.set(sourceKey, current);
    });
  return graph;
};

const hasPath = (graph: Map<string, string[]>, sourceId: string, targetId: string, visited = new Set<string>()): boolean => {
  if (sourceId === targetId) return true;
  if (visited.has(sourceId)) return false;
  visited.add(sourceId);
  const neighbours = graph.get(sourceId) || [];
  return neighbours.some((neighbourId) => hasPath(graph, neighbourId, targetId, visited));
};

export const detectDependencyCycle = (
  dependencies: TaskDependency[],
  candidate: Pick<TaskDependency, 'sourceId' | 'sourceType' | 'targetId' | 'targetType'>
) => {
  const graph = buildGraph(dependencies);
  const sourceKey = `${candidate.sourceType}:${candidate.sourceId}`;
  const targetKey = `${candidate.targetType}:${candidate.targetId}`;
  graph.set(sourceKey, [...(graph.get(sourceKey) || []), targetKey]);
  return hasPath(graph, targetKey, sourceKey);
};

export const validateProjectDependency = (
  input: CreateProjectDependencyInput,
  dependencies: TaskDependency[],
  itemsById: Map<string, DependencyNode>
): DependencyValidationResult => {
  const source = itemsById.get(`${input.sourceType}:${input.sourceId}`) || itemsById.get(input.sourceId);
  const target = itemsById.get(`${input.targetType}:${input.targetId}`) || itemsById.get(input.targetId);

  if (!source || !target) {
    return { isValid: false, reason: 'Selecione itens válidos para criar o vínculo.' };
  }

  if (input.sourceId === input.targetId && input.sourceType === input.targetType) {
    return { isValid: false, reason: 'Um item não pode depender de si mesmo.' };
  }

  if (source.projectId && target.projectId && source.projectId !== target.projectId) {
    return { isValid: false, reason: 'O vínculo deve acontecer dentro do mesmo projeto.' };
  }

  const isRelationship = Boolean(input.relationshipType) && !input.dependencyType;
  if (!isRelationship && !input.dependencyType) {
    return { isValid: false, reason: 'Selecione um tipo de dependência ou relacionamento.' };
  }

  const duplicate = dependencies
    .map(normalizeDependencyRecord)
    .some((dependency) =>
      dependency.isActive &&
      dependency.projectId === input.projectId &&
      dependency.sourceId === input.sourceId &&
      dependency.sourceType === input.sourceType &&
      dependency.targetId === input.targetId &&
      dependency.targetType === input.targetType &&
      dependency.kind === (isRelationship ? 'relationship' : 'dependency') &&
      dependency.dependencyType === input.dependencyType &&
      dependency.relationshipType === input.relationshipType
    );

  if (duplicate) {
    return { isValid: false, reason: 'Esse vínculo já existe.' };
  }

  if (!isRelationship && detectDependencyCycle(dependencies, input)) {
    return { isValid: false, reason: 'Essa relação cria dependência circular.' };
  }

  return { isValid: true };
};

export const validateDependency = (
  input: CreateTaskDependencyInput,
  dependencies: TaskDependency[],
  tasksById: Map<string, TaskDependencyNode>
): DependencyValidationResult => {
  const itemsById = new Map<string, DependencyNode>();
  tasksById.forEach((task, id) => {
    itemsById.set(id, { ...task, id, type: 'task' });
    itemsById.set(`task:${id}`, { ...task, id, type: 'task' });
  });

  return validateProjectDependency(
    {
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
      createdBy: input.createdBy,
    },
    dependencies,
    itemsById
  );
};

export const createProjectDependency = (
  input: CreateProjectDependencyInput,
  dependencies: TaskDependency[],
  itemsById: Map<string, DependencyNode>
) => {
  const validation = validateProjectDependency(input, dependencies, itemsById);
  if (!validation.isValid) {
    return { dependency: null, validation };
  }

  const now = new Date().toISOString();
  const isRelationship = Boolean(input.relationshipType) && !input.dependencyType;
  const dependency: TaskDependency = normalizeDependencyRecord({
    id: `dependency-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId: input.projectId,
    sourceId: input.sourceId,
    sourceType: input.sourceType,
    targetId: input.targetId,
    targetType: input.targetType,
    kind: isRelationship ? 'relationship' : 'dependency',
    dependencyType: isRelationship ? undefined : input.dependencyType,
    relationshipType: isRelationship ? input.relationshipType : undefined,
    dependencyClass: input.dependencyClass || (input.externalDependency ? 'external' : 'hard'),
    externalDependency: Boolean(input.externalDependency),
    isActive: true,
    createdBy: input.createdBy,
    metadata: input.metadata || {},
    predecessorTaskId: input.sourceType === 'task' ? input.sourceId : undefined,
    successorTaskId: input.targetType === 'task' ? input.targetId : undefined,
    lagMinutes: input.lagMinutes || undefined,
    lagDays: input.lagDays || undefined,
    createdAt: now,
    updatedAt: now,
  });

  return { dependency, validation };
};

export const createDependency = (
  input: CreateTaskDependencyInput,
  dependencies: TaskDependency[],
  tasksById: Map<string, TaskDependencyNode>
) => {
  const itemsById = new Map<string, DependencyNode>();
  tasksById.forEach((task, id) => {
    itemsById.set(id, { ...task, id, type: 'task' });
    itemsById.set(`task:${id}`, { ...task, id, type: 'task' });
  });

  return createProjectDependency(
    {
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
      createdBy: input.createdBy,
    },
    dependencies,
    itemsById
  );
};

export const removeDependency = (dependencies: TaskDependency[], dependencyId: string) =>
  dependencies.filter((dependency) => dependency.id !== dependencyId);

export const getIncomingTaskDependencies = (taskId: string, dependencies: TaskDependency[]) =>
  dependencies
    .map(normalizeDependencyRecord)
    .filter(
      (dependency) =>
        dependency.isActive &&
        dependency.targetType === 'task' &&
        dependency.targetId === taskId &&
        isBlockingDependency(dependency)
    );

export const getOutgoingTaskDependencies = (taskId: string, dependencies: TaskDependency[]) =>
  dependencies
    .map(normalizeDependencyRecord)
    .filter(
      (dependency) =>
        dependency.isActive &&
        dependency.sourceType === 'task' &&
        dependency.sourceId === taskId &&
        isBlockingDependency(dependency)
    );

export const getTaskRelationships = (taskId: string, dependencies: TaskDependency[]) =>
  dependencies
    .map(normalizeDependencyRecord)
    .filter(
      (dependency) =>
        dependency.isActive &&
        isRelationshipRecord(dependency) &&
        ((dependency.sourceType === 'task' && dependency.sourceId === taskId) ||
          (dependency.targetType === 'task' && dependency.targetId === taskId))
    );

export const getTaskPredecessors = (taskId: string, dependencies: TaskDependency[]) =>
  getIncomingTaskDependencies(taskId, dependencies);

export const getTaskSuccessors = (taskId: string, dependencies: TaskDependency[]) =>
  getOutgoingTaskDependencies(taskId, dependencies);

export const getBlockedReason = (
  task: TaskDependencyNode,
  dependencies: TaskDependency[],
  tasksById: Map<string, TaskDependencyNode>,
  action: 'start' | 'finish' = 'start'
) => {
  const predecessorDependencies = getTaskPredecessors(task.id, dependencies);

  for (const dependency of predecessorDependencies) {
    const predecessor = tasksById.get(dependency.sourceId || dependency.predecessorTaskId || '');
    const lagMinutes = getLagInMinutes(dependency);
    const predecessorStart = applyLag(getTaskStartTimestamp(predecessor), lagMinutes);
    const predecessorFinish = applyLag(getTaskFinishTimestamp(predecessor), lagMinutes);
    const predecessorLabel = predecessor?.title || 'item predecessor';

    if (dependency.dependencyType === 'blocks' || dependency.dependencyType === 'is_blocked_by') {
      return `${predecessorLabel} bloqueia esta tarefa.`;
    }

    if (action === 'start') {
      if (dependency.dependencyType === 'FS' && !hasTaskFinished(predecessor)) {
        return `${predecessorLabel} precisa ser concluída antes do início.`;
      }

      if (dependency.dependencyType === 'SS' && !hasTaskStarted(predecessor)) {
        return `${predecessorLabel} precisa ser iniciada antes do início.`;
      }

      if (
        dependency.dependencyType === 'FS' &&
        predecessorFinish &&
        getTaskStartTimestamp(task) &&
        getTaskStartTimestamp(task)! < predecessorFinish
      ) {
        return `${predecessorLabel} ainda não atende ao intervalo mínimo para início.`;
      }

      if (
        dependency.dependencyType === 'SS' &&
        predecessorStart &&
        getTaskStartTimestamp(task) &&
        getTaskStartTimestamp(task)! < predecessorStart
      ) {
        return `${predecessorLabel} ainda não atende ao intervalo mínimo para início.`;
      }
    }

    if (action === 'finish') {
      if (dependency.dependencyType === 'FF' && !hasTaskFinished(predecessor)) {
        return `${predecessorLabel} precisa ser concluída antes da conclusão.`;
      }

      if (dependency.dependencyType === 'SF' && !hasTaskStarted(predecessor)) {
        return `${predecessorLabel} precisa ser iniciada antes da conclusão.`;
      }

      if (
        dependency.dependencyType === 'FF' &&
        predecessorFinish &&
        getTaskFinishTimestamp(task) &&
        getTaskFinishTimestamp(task)! < predecessorFinish
      ) {
        return `${predecessorLabel} ainda não atende ao intervalo mínimo para conclusão.`;
      }

      if (
        dependency.dependencyType === 'SF' &&
        predecessorStart &&
        getTaskFinishTimestamp(task) &&
        getTaskFinishTimestamp(task)! < predecessorStart
      ) {
        return `${predecessorLabel} ainda não atende ao intervalo mínimo para conclusão.`;
      }
    }
  }

  return null;
};

export const isTaskBlocked = (
  task: TaskDependencyNode,
  dependencies: TaskDependency[],
  tasksById: Map<string, TaskDependencyNode>,
  action: 'start' | 'finish' = 'start'
) => Boolean(getBlockedReason(task, dependencies, tasksById, action));

export const getDependencyConflicts = (
  task: TaskDependencyNode,
  dependencies: TaskDependency[],
  tasksById: Map<string, TaskDependencyNode>
): TaskDependencyConflict[] => {
  const relatedDependencies = [
    ...getTaskPredecessors(task.id, dependencies),
    ...getTaskSuccessors(task.id, dependencies),
  ];

  return relatedDependencies.flatMap((dependency) => {
    const predecessor = tasksById.get(dependency.sourceId || dependency.predecessorTaskId || '');
    const successor = tasksById.get(dependency.targetId || dependency.successorTaskId || '');
    if (!predecessor || !successor || !dependency.dependencyType) return [];

    const lagMinutes = getLagInMinutes(dependency);
    const predecessorStart = applyLag(getTaskStartTimestamp(predecessor), lagMinutes);
    const predecessorFinish = applyLag(getTaskFinishTimestamp(predecessor), lagMinutes);
    const successorStart = getTaskStartTimestamp(successor);
    const successorFinish = getTaskFinishTimestamp(successor);
    const relation = `${TASK_DEPENDENCY_TYPE_LABELS[dependency.dependencyType]}: ${predecessor.title} -> ${successor.title}`;

    if (
      dependency.dependencyType === 'FS' &&
      typeof predecessorFinish === 'number' &&
      typeof successorStart === 'number' &&
      successorStart < predecessorFinish
    ) {
      return [{
        dependencyId: dependency.id,
        relation,
        severity: 'warning' as const,
        message: 'A sucessora inicia antes da predecessora concluir.',
      }];
    }

    if (
      dependency.dependencyType === 'SS' &&
      typeof predecessorStart === 'number' &&
      typeof successorStart === 'number' &&
      successorStart < predecessorStart
    ) {
      return [{
        dependencyId: dependency.id,
        relation,
        severity: 'warning' as const,
        message: 'A sucessora inicia antes da predecessora iniciar.',
      }];
    }

    if (
      dependency.dependencyType === 'FF' &&
      typeof predecessorFinish === 'number' &&
      typeof successorFinish === 'number' &&
      successorFinish < predecessorFinish
    ) {
      return [{
        dependencyId: dependency.id,
        relation,
        severity: 'warning' as const,
        message: 'A sucessora conclui antes da predecessora concluir.',
      }];
    }

    if (
      dependency.dependencyType === 'SF' &&
      typeof predecessorStart === 'number' &&
      typeof successorFinish === 'number' &&
      successorFinish < predecessorStart
    ) {
      return [{
        dependencyId: dependency.id,
        relation,
        severity: 'warning' as const,
        message: 'A sucessora conclui antes da predecessora iniciar.',
      }];
    }

    return [];
  });
};

export const getProjectDependencySummary = (
  projectDependencies: TaskDependency[],
  blockedTaskIds: string[] = []
) => {
  const normalized = projectDependencies.map(normalizeDependencyRecord).filter((dependency) => dependency.isActive);
  return {
    totalDependencies: normalized.filter((dependency) => dependency.kind === 'dependency').length,
    totalRelationships: normalized.filter((dependency) => dependency.kind === 'relationship').length,
    externalDependencies: normalized.filter((dependency) => dependency.externalDependency).length,
    phaseDependencies: normalized.filter(
      (dependency) => dependency.kind === 'dependency' && (dependency.sourceType === 'phase' || dependency.targetType === 'phase')
    ).length,
    projectDependencies: normalized.filter(
      (dependency) => dependency.kind === 'dependency' && (dependency.sourceType === 'project' || dependency.targetType === 'project')
    ).length,
    sprintDependencies: normalized.filter(
      (dependency) => dependency.kind === 'dependency' && (dependency.sourceType === 'sprint_item' || dependency.targetType === 'sprint_item')
    ).length,
    blockedTasks: blockedTaskIds.length,
  };
};
