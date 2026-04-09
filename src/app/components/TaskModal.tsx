import { ReactNode, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Flag,
  Link2,
  ListChecks,
  MessageSquareText,
  Pause,
  Play,
  Plus,
  Save,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useFeedback } from '../context/FeedbackContext';
import { useProjects } from '../context/ProjectContext';
import { useTasks } from '../context/TaskContext';
import { SearchableMultiSelect } from './filters/SearchableMultiSelect';
import { TaskProjectBindingField } from './tasks/TaskProjectBindingField';
import { TagSelector } from './filters/TagSelector';
import { ActivitySidebarShell } from './shared/ActivitySidebarShell';
import { AttachmentUploader } from './shared/AttachmentUploader';
import { CommentAttachmentGallery, CommentAttachmentPicker } from './shared/CommentAttachments';
import {
  AssigneeTransferHistoryEntry,
  Comment,
  ProjectAttachment,
  Subtask,
  TaskScopeStatus,
  TaskDependency,
  TaskDependencyClass,
  TaskDependencyType,
  TaskStatus,
  TaskTemplateItem,
  WBSTask,
} from '../types';
import {
  buildTaskHierarchy,
  createChecklistItem,
  findTaskNode,
  getChecklistProgress,
  getTaskNodeOwnTrackedSeconds,
  getTaskNodeProgress,
  getTaskNodeTotalTrackedSeconds,
  isTaskNodeEffectivelyComplete,
} from '../selectors/taskSelectors';
import { normalizeTaskStatus, TASK_STATUS_LABELS } from '../utils/taskStatus';
import { getProjectExecutionPhases } from '../utils/projectSelectors';
import { calculateProjectMetricsFromExecution } from '../utils/progressCalculator';
import { buildTaskPrefillFromTemplateItem } from '../utils/taskTemplateEngine';
import {
  TASK_DEPENDENCY_CLASS_LABELS,
  TASK_DEPENDENCY_TYPE_EXPLANATIONS,
  TASK_DEPENDENCY_TYPE_LABELS,
  TASK_RELATIONSHIP_TYPE_LABELS,
} from '../utils/taskDependencies';
import { canAccessGovernance, canUserPerform } from '../utils/permissions';
import { TASK_SCOPE_BADGE_CLASSNAMES, TASK_SCOPE_LABELS } from '../utils/taskScope';
import { getPrimaryUserTeam, getUserTeams } from '../utils/userTeams';
import { uploadCommentImages } from '../services/commentAttachmentsApi';
import {
  getPriorityCycleDateLabel,
  getPriorityCycleTypeLabel,
  getTaskPriorityCycles,
} from '../utils/priorityCyclePresentation';
import {
  formatDurationClock,
  formatDurationSummary,
  parseManualDurationInput,
} from '../utils/timeTracking';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  phaseId?: string;
  milestoneId?: string;
  editingTask?: any;
  initialValues?: Partial<CreateTaskFormState>;
}

type EditableTaskNode = Pick<
  WBSTask,
  | 'title'
  | 'description'
  | 'skillId'
  | 'skillName'
  | 'status'
  | 'assignee'
  | 'requestedBy'
  | 'stakeholders'
  | 'tags'
  | 'tagIds'
  | 'startDate'
  | 'dueDate'
  | 'priority'
  | 'attachments'
  | 'autoCompleteFromChildren'
> & { completed?: boolean };

interface CreateTaskFormState extends EditableTaskNode {
  selectedWorkspaceId: string;
  selectedProjectId: string;
  selectedPhaseId: string;
  selectedMilestoneId: string;
  selectedTemplateId: string;
  selectedTemplateItemId: string;
  checklistItems: ReturnType<typeof createChecklistItem>[];
  subtasks: WBSTask['subtasks'];
  generatedFromTaskTemplateId?: string;
  generatedFromTaskTemplateItemId?: string;
}

const INPUT_CLASS =
  'w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30';

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Não iniciada' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'blocked', label: 'Bloqueada' },
  { value: 'done', label: 'Concluída' },
] as const;

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
] as const;

const EMPTY_NODE_FORM: EditableTaskNode = {
  title: '',
  description: '',
  skillId: '',
  skillName: '',
  status: 'not_started',
  assignee: '',
  requestedBy: '',
  stakeholders: [],
  tags: [],
  tagIds: [],
  startDate: '',
  dueDate: '',
  priority: 'medium',
  attachments: [],
  autoCompleteFromChildren: false,
};

const mapNodeToForm = (node: any): EditableTaskNode => ({
  title: node?.title || '',
  description: node?.description || '',
  skillId: node?.skillId || '',
  skillName: node?.skillName || '',
  status: normalizeTaskStatus(node?.status, node?.completed),
  assignee: node?.assignee || '',
  requestedBy: node?.requestedBy || '',
  stakeholders: node?.stakeholders || [],
  tags: node?.tags || [],
  tagIds: node?.tagIds || [],
  startDate: node?.startDate || '',
  dueDate: node?.dueDate || '',
  priority: node?.priority || 'medium',
  attachments: node?.attachments || [],
  autoCompleteFromChildren: node?.autoCompleteFromChildren ?? false,
  completed: node?.completed,
});

export function TaskModal({
  isOpen,
  onClose,
  projectId,
  phaseId,
  milestoneId,
  editingTask,
  initialValues,
}: TaskModalProps) {
  const { currentUser, users, stakeholders, skills, taskTemplates, tags, ensureTag, priorityCycles } = useAdmin();
  const { showFeedback } = useFeedback();
  const { projects, updateProject } = useProjects();
  const {
    addIndependentTask,
    addSubtask,
    updateSubtask,
    deleteSubtask,
    updateTask,
    deleteTask,
    getTaskById,
    getTaskImpactSummary,
    restoreTaskScope,
    setTaskScopeStatus,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    addComment,
    addManualTimeLog,
    getTrackingState,
    startTimeTracking,
    stopTimeTracking,
    addTaskDependency,
    removeTaskDependency,
  } = useTasks();

  const editingRootTaskId = editingTask?.rootTaskId || editingTask?.id;
  const liveRootTask = editingRootTaskId ? getTaskById(editingRootTaskId) || editingTask : null;
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [nodeForm, setNodeForm] = useState<EditableTaskNode>(EMPTY_NODE_FORM);
  const [createForm, setCreateForm] = useState<CreateTaskFormState>({
    ...EMPTY_NODE_FORM,
    selectedWorkspaceId: projectId
      ? projects.find((projectItem) => projectItem.id === projectId)?.group || ''
      : getPrimaryUserTeam(currentUser),
    selectedProjectId: projectId || '',
    selectedPhaseId: phaseId || '',
    selectedMilestoneId: milestoneId || '',
    selectedTemplateId: '',
    selectedTemplateItemId: '',
    checklistItems: [],
    subtasks: [],
    assignee: currentUser?.name || '',
    requestedBy: currentUser?.name || '',
    ...initialValues,
  });
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentAttachments, setCommentAttachments] = useState<ProjectAttachment[]>([]);
  const [commentUploadError, setCommentUploadError] = useState('');
  const [isCommentUploading, setIsCommentUploading] = useState(false);
  const [taskUpdatesTab, setTaskUpdatesTab] = useState<'timeline' | 'comments' | 'activity'>('timeline');
  const [manualTimeHours, setManualTimeHours] = useState('');
  const [manualTimeMinutes, setManualTimeMinutes] = useState('');
  const [manualTimeSeconds, setManualTimeSeconds] = useState('');
  const [newCreateSubtaskTitle, setNewCreateSubtaskTitle] = useState('');
  const [newCreateChecklistTitle, setNewCreateChecklistTitle] = useState('');
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState('');
  const [subtaskDraftParentId, setSubtaskDraftParentId] = useState<string | null>(null);
  const [expandedSubtaskIds, setExpandedSubtaskIds] = useState<Set<string>>(new Set());
  const [timerElapsedSeconds, setTimerElapsedSeconds] = useState(0);
  const [isAssigneeFlowOpen, setIsAssigneeFlowOpen] = useState(false);
  const [dependencyDirection, setDependencyDirection] = useState<'predecessor' | 'successor'>('predecessor');
  const [dependencyTaskId, setDependencyTaskId] = useState('');
  const [dependencyType, setDependencyType] = useState<TaskDependencyType>('FS');
  const [dependencyClass, setDependencyClass] = useState<TaskDependencyClass>('hard');
  const [dependencyLagDays, setDependencyLagDays] = useState('');
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);
  const currentProjectId = liveRootTask?.projectId || createForm.selectedProjectId;
  const selectedProject = projects.find((projectItem) => projectItem.id === currentProjectId);
  useEffect(() => {
    if (!editingTask) {
      setCreateForm({
        ...EMPTY_NODE_FORM,
        selectedWorkspaceId: projectId
          ? projects.find((projectItem) => projectItem.id === projectId)?.group || ''
          : getPrimaryUserTeam(currentUser),
        selectedProjectId: projectId || '',
        selectedPhaseId: phaseId || '',
        selectedMilestoneId: milestoneId || '',
        selectedTemplateId: '',
        selectedTemplateItemId: '',
        checklistItems: [],
        subtasks: [],
        assignee: currentUser?.name || '',
        requestedBy: currentUser?.name || '',
        ...initialValues,
      });
      return;
    }

    setActiveNodeId(editingTask.id);
    setNewSubtaskAssignee(editingTask.assignee || currentUser?.name || '');
  }, [editingTask, projectId, phaseId, milestoneId, isOpen, currentUser, initialValues, projects]);

  useEffect(() => {
    if (!liveRootTask) return;
    if (!activeNodeId) {
      setActiveNodeId(liveRootTask.id);
      return;
    }

    const currentNode = findTaskNode(liveRootTask, activeNodeId);
    if (currentNode) {
      (currentNode.tags || []).forEach((tagName) => {
        ensureTag(tagName, 'task', selectedProject?.group);
      });

      const resolvedTagIds =
        currentNode.tagIds?.length
          ? currentNode.tagIds
          : (currentNode.tags || [])
              .map((tagName) =>
                tags.find(
                  (tag) => tag.normalizedName === tagName.trim().toLocaleLowerCase('pt-BR')
                )?.id
              )
              .filter((tagId): tagId is string => Boolean(tagId));

      setNodeForm({
        ...mapNodeToForm(currentNode),
        tagIds: resolvedTagIds,
      });
    }
  }, [liveRootTask, activeNodeId, ensureTag, selectedProject?.group, tags]);

  useEffect(() => {
    setCommentText('');
    setCommentAttachments([]);
    setCommentUploadError('');
    setIsCommentUploading(false);
  }, [activeNodeId, liveRootTask?.id]);

  const activeNode = useMemo(
    () => (liveRootTask ? findTaskNode(liveRootTask, activeNodeId || liveRootTask.id) : null),
    [liveRootTask, activeNodeId]
  );
  const activeDependencyNode = useMemo(
    () => (activeNode?.id ? getTaskById(activeNode.id) || null : null),
    [activeNode?.id, getTaskById]
  );
  const activeNodePriorityCycle = useMemo(
    () => getTaskPriorityCycles(activeDependencyNode || activeNode || null, priorityCycles)[0] || null,
    [activeDependencyNode, activeNode, priorityCycles]
  );

  const breadcrumb = useMemo(
    () => (liveRootTask ? buildTaskHierarchy(liveRootTask, activeNodeId || liveRootTask.id) : []),
    [liveRootTask, activeNodeId]
  );

  const executionPhases = selectedProject ? getProjectExecutionPhases(selectedProject) : [];
  const isProjectStructureLocked = !editingTask && !!projectId && !!phaseId && !!milestoneId;
  const availableTaskWorkspaces = useMemo(() => {
    const allWorkspaceNames = Array.from(
      new Set(
        projects
          .map((projectItem) => projectItem.group)
          .filter(Boolean)
          .concat(getUserTeams(currentUser))
      )
    ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    if (canAccessGovernance(currentUser)) {
      return allWorkspaceNames;
    }

    const allowedWorkspaces = new Set(getUserTeams(currentUser));
    return allWorkspaceNames.filter((workspace) => allowedWorkspaces.has(workspace));
  }, [projects, currentUser]);
  const workspaceScopedProjects = useMemo(
    () =>
      createForm.selectedWorkspaceId
        ? projects.filter((projectItem) => projectItem.group === createForm.selectedWorkspaceId)
        : [],
    [projects, createForm.selectedWorkspaceId]
  );

  const selectedPhaseId = liveRootTask?.phaseId || createForm.selectedPhaseId || phaseId;
  const selectedPhase = executionPhases.find((phase) => phase.id === selectedPhaseId);
  const selectedMilestoneId = liveRootTask?.milestoneId || createForm.selectedMilestoneId || milestoneId;
  const selectedMilestone = selectedPhase?.milestones.find(
    (milestoneItem) => milestoneItem.id === selectedMilestoneId
  );
  const canManageTemplateStructure = canUserPerform(currentUser, 'project:edit');
  const activeChecklistProgress = activeNode ? getChecklistProgress(activeNode) : null;
  const isSubtaskContext = !!(liveRootTask && activeNode && activeNode.id !== liveRootTask.id);
  const parentBreadcrumb = breadcrumb.length > 1 ? breadcrumb[breadcrumb.length - 2] : null;
  const activeNodeOwnTrackedSeconds = activeNode ? getTaskNodeOwnTrackedSeconds(activeNode) : 0;
  const activeNodeTotalTrackedSeconds = activeNode ? getTaskNodeTotalTrackedSeconds(activeNode) : 0;
  const activeNodeProgress = activeNode ? getTaskNodeProgress(activeNode) : 0;
  const activeTrackingState = activeNode
    ? getTrackingState(activeNode.id)
    : { isTracking: false, sessions: [], activeSession: undefined };
  const activeNodeComments = useMemo(
    () =>
      [...(activeNode?.comments || [])].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [activeNode?.comments]
  );
  const activeNodeActivities = [...(activeNode?.activities || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const activeNodeImpactSummary = activeNode ? getTaskImpactSummary(activeNode.id) : null;
  const activeNodeScopeStatus = (activeNode?.scopeStatus || 'active') as TaskScopeStatus;
  const canEditTemplateInstance =
    Boolean(activeNode?.isTemplateInstance) && canManageTemplateStructure;
  const assigneeFlowSummary = useMemo(() => getAssigneeFlowSummary(activeNode), [activeNode]);
  const isActiveNodeComplete = activeNode ? isTaskNodeEffectivelyComplete(activeNode) : false;
  const stakeholderOptions = useMemo(
    () =>
      stakeholders
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        .map((stakeholder) => ({
          value: stakeholder.name,
          label: stakeholder.name,
        })),
    [stakeholders]
  );
  const activeTaskTemplates = useMemo(
    () => taskTemplates.filter((template) => template.isActive),
    [taskTemplates]
  );
  const selectedTaskTemplate = activeTaskTemplates.find(
    (template) => template.id === createForm.selectedTemplateId
  );
  const subtaskAssigneeOptions = useMemo(() => {
    const names = [
      ...(activeNode?.stakeholders || []),
      ...(liveRootTask?.stakeholders || []),
      ...((selectedProject?.stakeholderAssignments || []).map((assignment) => assignment.name)),
      ...users.map((user) => user.name),
    ].filter(Boolean);

    return Array.from(new Set(names)).map((name) => ({
      value: name,
      label: name,
    }));
  }, [activeNode, liveRootTask, selectedProject, users]);
  const dependencyTaskOptions = useMemo(
    () =>
      currentProjectId
        ? getTaskOptionsForDependency(
            projects,
            currentProjectId,
            activeDependencyNode?.id
          )
        : [],
    [projects, currentProjectId, activeDependencyNode?.id]
  );
  const resolveTagNames = (tagIds: string[]) =>
    Array.from(new Set(tagIds.filter(Boolean)))
      .map((tagId) => tags.find((tag) => tag.id === tagId)?.name)
      .filter((tagName): tagName is string => Boolean(tagName));

  useEffect(() => {
    if (!liveRootTask) return;
    setNewSubtaskAssignee(activeNode?.assignee || liveRootTask.assignee || currentUser?.name || '');
  }, [activeNode?.id, activeNode?.assignee, liveRootTask?.id, liveRootTask?.assignee, currentUser]);

  useEffect(() => {
    if (!activeNode) {
      setSubtaskDraftParentId(null);
      setExpandedSubtaskIds(new Set());
      setIsAssigneeFlowOpen(false);
      return;
    }

    setSubtaskDraftParentId(activeNode.id);
    setExpandedSubtaskIds(new Set());
    setIsAssigneeFlowOpen(false);
    setTaskUpdatesTab('timeline');
    setDependencyTaskId('');
    setDependencyDirection('predecessor');
    setDependencyType('FS');
    setDependencyClass('hard');
    setDependencyLagDays('');
  }, [activeNode?.id]);

  useEffect(() => {
    if (!activeTrackingState.isTracking || !activeTrackingState.activeSession?.startTime) {
      setTimerElapsedSeconds(0);
      return;
    }

    const tick = () => {
      const startedAt = new Date(activeTrackingState.activeSession?.startTime || new Date().toISOString()).getTime();
      setTimerElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [activeTrackingState.isTracking, activeTrackingState.activeSession?.startTime, activeNode?.id]);
  // Keep every hook above this guard so opening/closing the modal never changes
  // the number or order of hooks between renders.
  if (!isOpen) return null;

  const applyTemplateItemToCreateForm = (
    templateId: string,
    item: TaskTemplateItem | undefined,
    keepSelection = true
  ) => {
    if (!item) return;

    const prefill = buildTaskPrefillFromTemplateItem(item, templateId);

    setCreateForm((prev) => ({
      ...prev,
      title: prefill.title,
      description: prefill.description,
      assignee: prefill.assignee,
      requestedBy: prefill.requestedBy,
      stakeholders: prefill.stakeholders,
      priority: prefill.priority,
      checklistItems: prefill.checklistItems,
      subtasks: prefill.subtasks,
      generatedFromTaskTemplateId: prefill.generatedFromTaskTemplateId,
      generatedFromTaskTemplateItemId: prefill.generatedFromTaskTemplateItemId,
      selectedTemplateId: keepSelection ? templateId : prev.selectedTemplateId,
      selectedTemplateItemId: keepSelection ? item.id : prev.selectedTemplateItemId,
    }));
  };

  const handleTemplateChange = (templateId: string) => {
    const template = activeTaskTemplates.find((candidate) => candidate.id === templateId);
    const firstItem = template?.items[0];

    setCreateForm((prev) => ({
      ...prev,
      selectedTemplateId: templateId,
      selectedTemplateItemId: firstItem?.id || '',
      generatedFromTaskTemplateId: undefined,
      generatedFromTaskTemplateItemId: undefined,
    }));

    if (template && firstItem) {
      applyTemplateItemToCreateForm(template.id, firstItem);
      showFeedback({
        tone: 'info',
        title: 'Template aplicado ao formulário',
        message: 'Os campos da tarefa foram pré-preenchidos e ainda podem ser ajustados.',
      });
    }
  };

  const handleTemplateItemChange = (itemId: string) => {
    if (!selectedTaskTemplate) return;
    const item = selectedTaskTemplate.items.find((candidate) => candidate.id === itemId);
    setCreateForm((prev) => ({
      ...prev,
      selectedTemplateItemId: itemId,
    }));
    if (item) {
      applyTemplateItemToCreateForm(selectedTaskTemplate.id, item);
    }
  };

  const addAttachmentsToTarget = async (
    attachments: ProjectAttachment[],
    target: 'create' | 'node'
  ) => {
    try {
      if (target === 'create') {
        setCreateForm((prev) => ({
          ...prev,
          attachments: [...(prev.attachments || []), ...attachments],
        }));
      } else {
        setNodeForm((prev) => ({
          ...prev,
          attachments: [...(prev.attachments || []), ...attachments],
        }));
      }

      showFeedback({
        tone: 'success',
        title: 'Arquivo anexado',
        message: `${attachments.length} anexo(s) adicionado(s) à tarefa.`,
      });
    } catch (error) {
      showFeedback({
        tone: 'error',
        title: 'Falha ao anexar arquivo',
        message: error instanceof Error ? error.message : 'Não foi possível ler os arquivos selecionados.',
      });
    }
  };

  const removeAttachmentFromCreateForm = (attachmentId: string) => {
    setCreateForm((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((attachment) => attachment.id !== attachmentId),
    }));
  };

  const removeAttachmentFromNodeForm = (attachmentId: string) => {
    setNodeForm((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((attachment) => attachment.id !== attachmentId),
    }));
  };

  const handleCreateTask = (event: React.FormEvent) => {
    event.preventDefault();

    if (!createForm.title.trim()) {
      showFeedback({
        tone: 'error',
        title: 'Título obrigatório',
        message: 'Informe um título para criar a tarefa.',
      });
      return;
    }

    const taskId = `task-${Date.now()}`;
    const initialAssigneeId = users.find((user) => user.name === createForm.assignee)?.id;
    const selectedCreateSkill = skills.find((skill) => skill.id === createForm.skillId);
    const createTagIds = Array.from(new Set((createForm.tagIds || []).filter(Boolean)));
    const newTask: WBSTask = {
      id: taskId,
      title: createForm.title.trim(),
      description: createForm.description || undefined,
      skillId: createForm.skillId || undefined,
      skillName: selectedCreateSkill?.name,
      status: createForm.status,
      assignee: createForm.assignee || undefined,
      requestedBy: createForm.requestedBy || undefined,
      stakeholders: createForm.stakeholders,
      tagIds: createTagIds,
      tags: resolveTagNames(createTagIds),
      startDate: createForm.startDate || undefined,
      dueDate: createForm.dueDate || undefined,
      priority: createForm.priority,
      subtasks: createForm.subtasks,
      order: 0,
      workspaceId: selectedProject?.group || createForm.selectedWorkspaceId || undefined,
      projectId: createForm.selectedProjectId || undefined,
      phaseId: createForm.selectedPhaseId || undefined,
      milestoneId: createForm.selectedMilestoneId || undefined,
      checklistItems: createForm.checklistItems,
      comments: [],
      attachments: createForm.attachments || [],
      timeLogs: [],
      personalStages: initialAssigneeId
        ? { [initialAssigneeId]: 'backlog' }
        : currentUser?.id
          ? { [currentUser.id]: 'backlog' }
          : {},
      autoCompleteFromChildren: false,
      assigneeId: initialAssigneeId,
      generatedFromTaskTemplateId: createForm.generatedFromTaskTemplateId,
      generatedFromTaskTemplateItemId: createForm.generatedFromTaskTemplateItemId,
    };

    if (createForm.selectedProjectId) {
      const selectedProjectForSave = projects.find(
        (projectItem) => projectItem.id === createForm.selectedProjectId
      );
      const projectPhases = selectedProjectForSave
        ? getProjectExecutionPhases(selectedProjectForSave)
        : [];

      if (selectedProjectForSave && projectPhases.length > 0) {
        const fallbackPhaseId =
          createForm.selectedPhaseId || projectPhases[0]?.id;

        const updatedPhases = projectPhases.map((phase) => {
          if (phase.id !== fallbackPhaseId) return phase;

          const fallbackMilestoneId =
            createForm.selectedMilestoneId || phase.milestones[0]?.id;

          return {
            ...phase,
            milestones: phase.milestones.map((milestone) =>
              milestone.id === fallbackMilestoneId
                ? {
                    ...milestone,
                    tasks: [
                      ...milestone.tasks,
                      {
                        ...newTask,
                        phaseId: phase.id,
                        milestoneId: milestone.id,
                        activities: [
                          {
                            id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                            timestamp: new Date().toISOString(),
                            user: newTask.assignee || newTask.requestedBy || 'Sistema',
                            action: 'criou a tarefa',
                            details: newTask.title,
                            entityType: 'task',
                            entityId: newTask.id,
                          },
                        ],
                      },
                    ],
                  }
                : milestone
            ),
          };
        });

        const metrics = calculateProjectMetricsFromExecution({
          ...selectedProjectForSave,
          execution: {
            ...selectedProjectForSave.execution,
            phases: updatedPhases,
          },
        });

        updateProject(createForm.selectedProjectId, {
          execution: {
            ...selectedProjectForSave.execution,
            phases: updatedPhases,
          },
          metrics,
          progress: metrics.progress,
          tasksTotal: metrics.tasksTotal,
          tasksCompleted: metrics.tasksCompleted,
          hoursRemaining: metrics.hoursRemaining,
          totalTimeTracked: metrics.totalTimeTracked,
          activities: [
            ...(selectedProjectForSave.activities || []),
            {
              id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              timestamp: new Date().toISOString(),
              user: newTask.assignee || newTask.requestedBy || 'Sistema',
              action: 'criou uma tarefa no projeto',
              details: newTask.title,
              entityType: 'task',
              entityId: newTask.id,
            },
          ],
        });
      } else {
        addIndependentTask({
          ...newTask,
          workspaceId: selectedProjectForSave?.group || createForm.selectedWorkspaceId || undefined,
          taskType: createForm.selectedProjectId ? 'project' : newTask.taskType,
        });

        if (selectedProjectForSave) {
          updateProject(createForm.selectedProjectId, {
            activities: [
              ...(selectedProjectForSave.activities || []),
              {
                id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                timestamp: new Date().toISOString(),
                user: newTask.assignee || newTask.requestedBy || 'Sistema',
                action: 'criou uma tarefa operacional vinculada',
                details: newTask.title,
                entityType: 'task',
                entityId: newTask.id,
              },
            ],
          });
        }
      }
    } else {
      addIndependentTask(newTask);
    }

    showFeedback({
      tone: 'success',
      title: 'Tarefa criada',
      message: 'A nova tarefa já está disponível no fluxo correspondente.',
    });
    onClose();
  };

  const handleSaveNode = () => {
    if (!liveRootTask || !activeNode) return;
    if (!nodeForm.title.trim()) {
      showFeedback({
        tone: 'error',
        title: 'Título obrigatório',
        message: 'Informe um título válido antes de salvar.',
      });
      return;
    }

    const baseUpdates = {
      title: nodeForm.title.trim(),
      description: nodeForm.description || undefined,
      skillId: nodeForm.skillId || undefined,
      skillName: skills.find((skill) => skill.id === nodeForm.skillId)?.name,
      assignee: nodeForm.assignee || undefined,
      requestedBy: nodeForm.requestedBy || undefined,
      stakeholders: nodeForm.stakeholders,
      tagIds: Array.from(new Set((nodeForm.tagIds || []).filter(Boolean))),
      tags: resolveTagNames(nodeForm.tagIds || []),
      startDate: nodeForm.startDate || undefined,
      dueDate: nodeForm.dueDate || undefined,
      priority: nodeForm.priority,
      attachments: nodeForm.attachments || [],
      autoCompleteFromChildren: nodeForm.autoCompleteFromChildren ?? false,
      assigneeId: users.find((user) => user.name === nodeForm.assignee)?.id,
    };

    if (activeNode.id === liveRootTask.id) {
      updateTask(liveRootTask.id, {
        ...baseUpdates,
        status: nodeForm.status,
      });
      showFeedback({
        tone: 'success',
        title: 'Tarefa atualizada',
        message: 'As alterações foram salvas com sucesso.',
      });
      return;
    }

    updateSubtask(liveRootTask.id, activeNode.id, {
      ...baseUpdates,
      status: nodeForm.status,
      completed: nodeForm.status === 'done',
    });
    showFeedback({
      tone: 'success',
      title: 'Subtarefa atualizada',
      message: 'As alterações deste nível foram salvas.',
    });
  };

  const handleStructuralScopeChange = (
    scopeStatus: Exclude<TaskScopeStatus, 'active'>,
    reason: string
  ) => {
    if (!activeNode || !canEditTemplateInstance) return;

    const impact = getTaskImpactSummary(activeNode.id);
    const impactMessage = impact.hasImpact
      ? ` Impactos detectados: ${impact.subtasks} subtarefa(s), ${impact.timeLogs} apontamento(s), ${impact.comments} comentário(s), ${impact.attachments} anexo(s) e ${impact.dependencies} dependência(s).`
      : '';
    const confirmed = window.confirm(
      `${TASK_SCOPE_LABELS[scopeStatus]}: ${activeNode.title}.${impactMessage}`
    );

    if (!confirmed) return;

    if (scopeStatus === 'deleted') {
      deleteTask(activeNode.id);
    } else {
      setTaskScopeStatus(activeNode.id, scopeStatus, reason);
    }

    showFeedback({
      tone: 'success',
      title: 'Estrutura atualizada',
      message:
        scopeStatus === 'deleted'
          ? 'A tarefa foi excluída logicamente do projeto e saiu do fluxo operacional.'
          : `A tarefa agora está como ${TASK_SCOPE_LABELS[scopeStatus].toLowerCase()}.`,
    });
    onClose();
  };

  const handleRestoreScope = () => {
    if (!activeNode || !canEditTemplateInstance) return;

    restoreTaskScope(activeNode.id);
    showFeedback({
      tone: 'success',
      title: 'Tarefa restaurada',
      message: 'A tarefa voltou ao escopo ativo do projeto.',
    });
  };

  const handleAddSubtask = (parentIdOverride?: string) => {
    if (!liveRootTask || !activeNode || !newSubtaskTitle.trim()) {
      showFeedback({
        tone: 'error',
        title: 'Subtarefa inválida',
        message: 'Informe um título antes de criar a subtarefa.',
      });
      return;
    }

    const defaultAssignee = activeNode.assignee || liveRootTask.assignee || currentUser?.name || '';
    const resolvedAssignee = newSubtaskAssignee || defaultAssignee;

    addSubtask(
      liveRootTask.id,
      newSubtaskTitle,
      !parentIdOverride || parentIdOverride === liveRootTask.id ? undefined : parentIdOverride,
      resolvedAssignee || undefined
    );
    setNewSubtaskTitle('');
    setNewSubtaskAssignee(defaultAssignee);
    setSubtaskDraftParentId(activeNode.id);
    showFeedback({
      tone: 'success',
      title: 'Subtarefa criada',
      message: resolvedAssignee
        ? `A subtarefa foi criada e atribuída a ${resolvedAssignee}.`
        : 'A estrutura hierárquica foi atualizada.',
    });
  };

  const handleAddChecklistItem = () => {
    if (!liveRootTask || !activeNode || !newChecklistTitle.trim()) {
      showFeedback({
        tone: 'error',
        title: 'Checklist inválido',
        message: 'Informe um título para o item do checklist.',
      });
      return;
    }

    addChecklistItem(
      liveRootTask.id,
      createChecklistItem(newChecklistTitle.trim()),
      activeNode.id === liveRootTask.id ? undefined : activeNode.id
    );
    setNewChecklistTitle('');
    showFeedback({
      tone: 'success',
      title: 'Checklist atualizado',
      message: 'O novo item foi adicionado com sucesso.',
    });
  };

  const handleAddComment = () => {
    if (!liveRootTask || !activeNode || (!commentText.trim() && commentAttachments.length === 0)) {
      showFeedback({
        tone: 'error',
        title: 'Comentário vazio',
        message: 'Escreva um comentário ou anexe uma imagem antes de enviar.',
      });
      return;
    }

    const comment: Comment = {
      id: `comment-${Date.now()}`,
      taskId: liveRootTask.id,
      userId: currentUser?.id || 'system',
      userName: currentUser?.name || nodeForm.assignee || liveRootTask.assignee || 'Usuário',
      content: commentText.trim(),
      timestamp: new Date().toISOString(),
      entityType: 'task',
      entityId: activeNode.id,
      attachments: commentAttachments,
    };

    addComment(
      liveRootTask.id,
      comment,
      activeNode.id === liveRootTask.id ? undefined : activeNode.id
    );
    setCommentText('');
    setCommentAttachments([]);
    setCommentUploadError('');
    showFeedback({
      tone: 'success',
      title: 'Comentário registrado',
      message: 'O comentário foi salvo neste nível da tarefa.',
    });
  };

  const handleCommentKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleAddComment();
    }
  };

  const handleSelectCommentAttachments = async (files: File[]) => {
    try {
      setIsCommentUploading(true);
      setCommentUploadError('');
      const attachments = await uploadCommentImages(files);
      setCommentAttachments((current) => [...current, ...attachments]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível enviar a imagem.';
      setCommentUploadError(message);
      showFeedback({
        tone: 'error',
        title: 'Upload inválido',
        message,
      });
    } finally {
      setIsCommentUploading(false);
    }
  };

  const handleAddManualTime = () => {
    if (!liveRootTask || !activeNode) return;

    const normalizedTime = parseManualDurationInput(
      manualTimeHours,
      manualTimeMinutes,
      manualTimeSeconds
    );
    if (!normalizedTime || normalizedTime.totalSeconds <= 0) {
      showFeedback({
        tone: 'error',
        title: 'Tempo inválido',
        message: 'Informe horas, minutos e segundos válidos, maiores que zero.',
      });
      return;
    }

    addManualTimeLog(
      liveRootTask.id,
      normalizedTime.totalSeconds,
      activeNode.id === liveRootTask.id ? undefined : activeNode.id
    );
    setManualTimeHours('');
    setManualTimeMinutes('');
    setManualTimeSeconds('');
    showFeedback({
      tone: 'success',
      title: 'Tempo registrado',
      message: `${formatDurationSummary(normalizedTime.totalSeconds)} foram apontados com sucesso.`,
    });
  };

  const handleAddCreateChecklistItem = () => {
    if (!newCreateChecklistTitle.trim()) {
      showFeedback({
        tone: 'error',
        title: 'Checklist inválido',
        message: 'Informe um título para o item do checklist.',
      });
      return;
    }

    setCreateForm((prev) => ({
      ...prev,
      checklistItems: [...prev.checklistItems, createChecklistItem(newCreateChecklistTitle.trim())],
    }));
    setNewCreateChecklistTitle('');
  };

  const handleAddDependency = () => {
    if (!selectedProject?.id || !activeDependencyNode?.id || !dependencyTaskId) {
      showFeedback({
        tone: 'error',
        title: 'Dependência incompleta',
        message: 'Selecione a tarefa relacionada antes de salvar a dependência.',
      });
      return;
    }

    const parsedLagDays =
      dependencyLagDays.trim() === '' ? undefined : Number(dependencyLagDays);
    if (typeof parsedLagDays !== 'undefined' && (!Number.isFinite(parsedLagDays) || parsedLagDays < 0)) {
      showFeedback({
        tone: 'error',
        title: 'Lag inválido',
        message: 'Informe um valor válido de dias de defasagem.',
      });
      return;
    }

    const result = addTaskDependency({
      projectId: selectedProject.id,
      predecessorTaskId: dependencyDirection === 'predecessor' ? dependencyTaskId : activeDependencyNode.id,
      successorTaskId: dependencyDirection === 'predecessor' ? activeDependencyNode.id : dependencyTaskId,
      dependencyType,
      dependencyClass,
      lagDays: parsedLagDays ? Math.floor(parsedLagDays) : undefined,
    });

    if (!result.success) {
      showFeedback({
        tone: 'error',
        title: 'Não foi possível criar a dependência',
        message: result.reason || 'A relação informada é inválida.',
      });
      return;
    }

    setDependencyTaskId('');
    setDependencyType('FS');
    setDependencyClass('hard');
    setDependencyLagDays('');
    showFeedback({
      tone: 'success',
      title: 'Dependência criada',
      message: 'A relação entre tarefas foi salva com sucesso.',
    });
  };

  const handleRemoveDependency = (dependency: TaskDependency) => {
    if (!selectedProject?.id) return;

    removeTaskDependency(selectedProject.id, dependency.id);
    showFeedback({
      tone: 'success',
      title: 'Dependência removida',
      message: 'A relação foi removida desta tarefa.',
    });
  };

  const handleAddCreateSubtask = () => {
    if (!newCreateSubtaskTitle.trim()) {
      showFeedback({
        tone: 'error',
        title: 'Subtarefa inválida',
        message: 'Informe um título antes de adicionar a subtarefa.',
      });
      return;
    }

    setCreateForm((prev) => ({
      ...prev,
      subtasks: [
        ...prev.subtasks,
        {
          id: `subtask-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: newCreateSubtaskTitle.trim(),
          completed: false,
          status: 'not_started',
          priority: 'medium',
          subtasks: [],
          checklistItems: [],
          comments: [],
          attachments: [],
          timeLogs: [],
          activities: [],
        },
      ],
    }));
    setNewCreateSubtaskTitle('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="flex h-[min(92vh,calc(100vh-2rem))] w-full max-w-6xl min-h-0 flex-col overflow-hidden rounded-[32px] border border-white/70 bg-[#f8fafc]/95 shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
        <div className="z-10 shrink-0 flex items-start justify-between border-b border-slate-200/70 bg-[#f8fafc]/95 px-6 py-5 backdrop-blur-xl">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              {liveRootTask ? 'Detalhe da Tarefa' : 'Nova Tarefa'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {liveRootTask
                ? 'Fluxo unificado para tarefa e subtarefas em qualquer nivel.'
                : 'Crie uma tarefa independente ou vinculada a um projeto.'}
            </p>
            {activeDependencyNode?.isDependencyBlocked && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                Bloqueada por dependência
              </div>
            )}
            {activeNode?.isWeeklyFocus ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800">
                <Flag className="h-4 w-4" />
                Foco definido pela governança
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {activeNode?.isTemplateInstance ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800">
                  Do template
                </span>
              ) : null}
              {activeNode && activeNodeScopeStatus !== 'active' ? (
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${TASK_SCOPE_BADGE_CLASSNAMES[activeNodeScopeStatus]}`}
                >
                  {TASK_SCOPE_LABELS[activeNodeScopeStatus]}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white/90 p-2 transition-colors hover:bg-slate-100"
            >
              <X className="h-5 w-5 text-slate-600" />
            </button>
          </div>
        </div>

        {!liveRootTask ? (
          <form onSubmit={handleCreateTask} className="min-h-0 flex-1 overflow-y-auto space-y-6 p-6">
            <section className="rounded-[24px] border border-slate-200 bg-white/90 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Template de tarefa">
                  <select
                    value={createForm.selectedTemplateId}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option value="">Sem template</option>
                    {activeTaskTemplates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Item do template">
                  <select
                    value={createForm.selectedTemplateItemId}
                    onChange={(e) => handleTemplateItemChange(e.target.value)}
                    disabled={!selectedTaskTemplate}
                    className={INPUT_CLASS}
                  >
                    <option value="">Selecione</option>
                    {(selectedTaskTemplate?.items || []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <p className="mt-3 text-sm text-slate-500">
                Selecione um template para pré-preencher a tarefa e ajustar os dados antes de salvar.
              </p>
            </section>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Titulo">
                <input
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Responsavel">
                <select
                  value={createForm.assignee}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, assignee: e.target.value }))}
                  className={INPUT_CLASS}
                >
                  <option value="">Selecione</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.name}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Descricao" className="md:col-span-2">
                <textarea
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={4}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Habilidade">
                <select
                  value={createForm.skillId}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      skillId: e.target.value,
                      skillName: skills.find((skill) => skill.id === e.target.value)?.name || '',
                    }))
                  }
                  className={INPUT_CLASS}
                >
                  <option value="">Sem habilidade</option>
                  {skills
                    .filter((skill) => skill.status !== 'archived')
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                    .map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={createForm.status}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, status: e.target.value as WBSTask['status'] }))
                  }
                  className={INPUT_CLASS}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Solicitante">
                <select
                  value={createForm.requestedBy}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, requestedBy: e.target.value }))
                  }
                  className={INPUT_CLASS}
                >
                  <option value="">Selecione</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.name}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Inicio">
                <input
                  type="date"
                  value={createForm.startDate}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Prazo">
                <input
                  type="date"
                  value={createForm.dueDate}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                  className={INPUT_CLASS}
                />
              </Field>
              <Field label="Prioridade">
                <select
                  value={createForm.priority}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      priority: e.target.value as WBSTask['priority'],
                    }))
                  }
                  className={INPUT_CLASS}
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="md:col-span-2">
                <TaskProjectBindingField
                  workspaces={availableTaskWorkspaces}
                  selectedWorkspaceId={createForm.selectedWorkspaceId}
                  selectedProject={selectedProject || null}
                  availableProjects={workspaceScopedProjects}
                  onWorkspaceChange={(workspaceId) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      selectedWorkspaceId: workspaceId,
                      selectedProjectId:
                        prev.selectedProjectId &&
                        projects.find((projectItem) => projectItem.id === prev.selectedProjectId)?.group === workspaceId
                          ? prev.selectedProjectId
                          : '',
                      selectedPhaseId: '',
                      selectedMilestoneId: '',
                    }))
                  }
                  onProjectSelect={(projectItem) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      selectedWorkspaceId: projectItem.group,
                      selectedProjectId: projectItem.id,
                      selectedPhaseId: '',
                      selectedMilestoneId: '',
                    }))
                  }
                  onClearProject={() =>
                    setCreateForm((prev) => ({
                      ...prev,
                      selectedProjectId: '',
                      selectedPhaseId: '',
                      selectedMilestoneId: '',
                    }))
                  }
                  pickerOpen={isProjectPickerOpen}
                  onOpenPicker={() => setIsProjectPickerOpen(true)}
                  onClosePicker={() => setIsProjectPickerOpen(false)}
                  helperText="Selecione a equipe e depois pesquise o projeto. A tarefa também pode ser criada sem projeto."
                />
              </div>
              {isProjectStructureLocked ? (
                <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field label="Projeto">
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-900">
                      {selectedProject?.name || 'Projeto atual'}
                    </div>
                  </Field>
                  <Field label="Fase da execucao">
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-900">
                      {selectedPhase?.name || 'Fase atual'}
                    </div>
                  </Field>
                  <Field label="Marco">
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-900">
                      {selectedMilestone?.name || 'Marco atual'}
                    </div>
                  </Field>
                </div>
              ) : (
                <>
                  {executionPhases.length > 0 && (
                    <>
                      <Field label="Fase da execucao">
                        <select
                          value={createForm.selectedPhaseId}
                          onChange={(e) =>
                            setCreateForm((prev) => ({
                              ...prev,
                              selectedPhaseId: e.target.value,
                              selectedMilestoneId: '',
                            }))
                          }
                          className={INPUT_CLASS}
                        >
                          <option value="">Selecione</option>
                          {executionPhases.map((phase) => (
                            <option key={phase.id} value={phase.id}>
                              {phase.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Marco">
                        <select
                          value={createForm.selectedMilestoneId}
                          onChange={(e) =>
                            setCreateForm((prev) => ({
                              ...prev,
                              selectedMilestoneId: e.target.value,
                            }))
                          }
                          className={INPUT_CLASS}
                        >
                          <option value="">Primeiro marco disponivel</option>
                          {(selectedPhase?.milestones || []).map((milestoneItem) => (
                            <option key={milestoneItem.id} value={milestoneItem.id}>
                              {milestoneItem.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </>
                  )}
                </>
              )}
              <div className="md:col-span-2">
                <Field label="Stakeholders / Envolvidos">
                  <SearchableMultiSelect
                    value={createForm.stakeholders}
                    onChange={(value) =>
                      setCreateForm((prev) => ({ ...prev, stakeholders: value }))
                    }
                    options={stakeholderOptions}
                    placeholder="Selecionar stakeholders"
                    allLabel="Todos"
                    searchPlaceholder="Buscar stakeholder..."
                    emptyMessage="Nenhum stakeholder encontrado."
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Tags da tarefa">
                  <TagSelector
                    value={createForm.tagIds || []}
                    onChange={(value) =>
                      setCreateForm((prev) => ({ ...prev, tagIds: value }))
                    }
                    scope="task"
                    workspaceId={selectedProject?.group}
                    placeholder="Buscar ou criar tags da tarefa"
                    emptyMessage="Nenhuma tag disponível para tarefa."
                  />
                </Field>
              </div>
            </div>

            <section className="section-card">
              <div className="mb-4 flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900">Checklist inicial</h3>
              </div>
              <div className="space-y-2">
                {createForm.checklistItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
                    <input
                      value={item.title}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          checklistItems: prev.checklistItems.map((candidate) =>
                            candidate.id === item.id
                              ? { ...candidate, title: e.target.value }
                              : candidate
                          ),
                        }))
                      }
                      className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCreateForm((prev) => ({
                          ...prev,
                          checklistItems: prev.checklistItems.filter((candidate) => candidate.id !== item.id),
                        }))
                      }
                      className="rounded p-1 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {createForm.checklistItems.length === 0 && (
                  <p className="text-sm text-gray-500">Nenhum item inicial definido.</p>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <input
                  value={newCreateChecklistTitle}
                  onChange={(e) => setNewCreateChecklistTitle(e.target.value)}
                  placeholder="Novo item do checklist"
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  onClick={handleAddCreateChecklistItem}
                  className="rounded-lg border border-gray-300 px-3 py-2 hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </section>

            <section className="section-card">
              <div className="mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900">Subtarefas iniciais</h3>
              </div>
              <div className="space-y-2">
                {createForm.subtasks.map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
                    <input
                      value={subtask.title}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          subtasks: prev.subtasks.map((candidate) =>
                            candidate.id === subtask.id
                              ? { ...candidate, title: e.target.value }
                              : candidate
                          ),
                        }))
                      }
                      className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCreateForm((prev) => ({
                          ...prev,
                          subtasks: prev.subtasks.filter((candidate) => candidate.id !== subtask.id),
                        }))
                      }
                      className="rounded p-1 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {createForm.subtasks.length === 0 && (
                  <p className="text-sm text-gray-500">Nenhuma subtarefa inicial definida.</p>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <input
                  value={newCreateSubtaskTitle}
                  onChange={(e) => setNewCreateSubtaskTitle(e.target.value)}
                  placeholder="Nova subtarefa"
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  onClick={handleAddCreateSubtask}
                  className="rounded-lg border border-gray-300 px-3 py-2 hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </section>

            <AttachmentUploader
              attachments={createForm.attachments || []}
              onAddAttachments={(attachments) => addAttachmentsToTarget(attachments, 'create')}
              onRemove={removeAttachmentFromCreateForm}
              title="Anexos"
              description="Anexe imagens, PDFs, planilhas e documentos à tarefa."
              emptyMessage="Nenhum arquivo anexado a esta tarefa."
            />

            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Criar tarefa
              </button>
            </div>
          </form>
        ) : (
	          <div className="min-h-0 flex-1 overflow-hidden">
	            <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto p-6 2xl:overflow-hidden">
	            <div className="shrink-0 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              {breadcrumb.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveNodeId(item.id)}
                    className={`rounded-md px-2 py-1 ${
                      item.id === activeNode?.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    {item.title}
                  </button>
                  {index < breadcrumb.length - 1 && <ChevronRight className="w-4 h-4" />}
                </div>
              ))}
            </div>

	            <div className="min-h-0 2xl:hidden">
              <TaskActivitySidebar
                activeTab={taskUpdatesTab}
                onTabChange={setTaskUpdatesTab}
                activeNodePriorityCycle={activeNodePriorityCycle}
                comments={activeNodeComments}
                activities={activeNodeActivities}
                commentText={commentText}
                onCommentTextChange={setCommentText}
                onCommentKeyDown={handleCommentKeyDown}
                commentAttachments={commentAttachments}
                onSelectAttachments={handleSelectCommentAttachments}
                onRemoveAttachment={(attachmentId) =>
                  setCommentAttachments((current) =>
                    current.filter((attachment) => attachment.id !== attachmentId)
                  )
                }
                isCommentUploading={isCommentUploading}
                commentUploadError={commentUploadError}
                onSubmitComment={handleAddComment}
                assigneeFlowSummary={assigneeFlowSummary}
                isAssigneeFlowOpen={isAssigneeFlowOpen}
                onToggleAssigneeFlow={() => setIsAssigneeFlowOpen((prev) => !prev)}
              />
            </div>

	            <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 2xl:h-full 2xl:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]">
	              <div className="min-h-0 space-y-6 2xl:overflow-y-auto 2xl:pr-2">
	                <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
	                  <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5">
	                    <div className="grid min-w-0 gap-5">
	                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Execução operacional
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                          {activeNode?.title || 'Tarefa sem título'}
                        </h3>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                            {TASK_STATUS_LABELS[nodeForm.status as TaskStatus] || 'Sem status'}
                          </span>
                          {activeNode?.assignee ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              <User className="h-3.5 w-3.5" />
                              {activeNode.assignee}
                            </span>
                          ) : null}
                          {selectedProject?.group ? (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              Equipe: {selectedProject.group}
                            </span>
                          ) : null}
                          {parentBreadcrumb ? (
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                              Subtarefa de {parentBreadcrumb.title}
                            </span>
                          ) : null}
                        </div>
	                        <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
	                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
	                          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
	                            Status da tarefa
                          </label>
                          <select
                            value={nodeForm.status}
                            onChange={(e) =>
                              setNodeForm((prev) => ({
                                ...prev,
                                status: e.target.value as WBSTask['status'],
                              }))
                            }
                            className={`${INPUT_CLASS} mt-2 px-3 py-2.5`}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

	                        <div className="min-w-0 w-full max-w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
	                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
	                            Timer da tarefa
	                          </p>
	                          <p className="mt-2 break-all text-[1.75rem] font-semibold tracking-tight text-slate-950 sm:text-3xl">
	                            {formatDurationClock(timerElapsedSeconds)}
	                          </p>
                          <p className="mt-2 text-xs leading-5 text-slate-600">
                            {activeTrackingState.isTracking
                              ? 'Cronômetro em execução neste nível.'
                              : 'Inicie ou pause o registro automático sem sair do topo do card.'}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              activeNode &&
                              (activeTrackingState.isTracking
                                ? stopTimeTracking(activeNode.id)
                                : startTimeTracking(activeNode.id))
                            }
                            className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium shadow-sm ${
                              activeTrackingState.isTracking
                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {activeTrackingState.isTracking ? (
                              <>
                                <Pause className="h-4 w-4" />
                                Pausar
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4" />
                                Iniciar
                              </>
	                            )}
	                          </button>
	                        </div>

	                        {activeNode?.description ? (
	                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 lg:col-span-2">
	                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
	                              Contexto
	                            </p>
	                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
	                              {activeNode.description}
	                            </p>
	                          </div>
	                        ) : null}

	                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
	                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
	                            Solicitante
	                          </p>
	                          <p className="mt-2 text-sm font-medium text-slate-900">
	                            {activeNode?.requestedBy || 'Não informado'}
	                          </p>
	                        </div>

	                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
	                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
	                            Prazo
	                          </p>
	                          <p className="mt-2 text-sm font-medium text-slate-900">
	                            {activeNode?.dueDate
	                              ? new Date(activeNode.dueDate).toLocaleDateString('pt-BR')
	                              : 'Sem prazo'}
	                          </p>
	                        </div>
	                      </div>
	                    </div>
	                  </div>
	                </div>

                  <div className="space-y-5 px-6 py-5">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                      <MetricCard label="Tempo direto" value={formatDurationSummary(activeNodeOwnTrackedSeconds)} />
                      <MetricCard label="Tempo consolidado" value={formatDurationSummary(activeNodeTotalTrackedSeconds)} />
                      <MetricCard label="Progresso" value={`${activeNodeProgress}%`} />
                      <MetricCard label="Conclusão" value={isActiveNodeComplete ? 'Concluída' : 'Em aberto'} />
                    </div>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Resumo de execução</p>
                            <p className="mt-1 text-sm text-slate-600">
                              Status, horas e andamento visíveis antes dos detalhes complementares.
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700">
                            {TASK_STATUS_LABELS[nodeForm.status as TaskStatus] || 'Sem status'}
                          </span>
                        </div>

                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all"
                            style={{ width: `${activeNodeProgress}%` }}
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Lançamento manual</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Registre horas, minutos e segundos sem sair da área principal.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddManualTime}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Lançar tempo
                          </button>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                              Horas
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              value={manualTimeHours}
                              onChange={(e) => setManualTimeHours(e.target.value)}
                              placeholder="0"
                              className={`${INPUT_CLASS} px-3 py-2.5`}
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                              Minutos
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              value={manualTimeMinutes}
                              onChange={(e) => setManualTimeMinutes(e.target.value)}
                              placeholder="00"
                              className={`${INPUT_CLASS} px-3 py-2.5`}
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
                              Segundos
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              step="1"
                              inputMode="numeric"
                              value={manualTimeSeconds}
                              onChange={(e) => setManualTimeSeconds(e.target.value)}
                              placeholder="00"
                              className={`${INPUT_CLASS} px-3 py-2.5`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {currentProjectId && activeDependencyNode && (
                  <DependencySection
                    task={activeDependencyNode}
                    dependencyTaskOptions={dependencyTaskOptions}
                    dependencyDirection={dependencyDirection}
                    dependencyTaskId={dependencyTaskId}
                    dependencyType={dependencyType}
                    dependencyClass={dependencyClass}
                    dependencyLagDays={dependencyLagDays}
                    onDirectionChange={setDependencyDirection}
                    onTaskChange={setDependencyTaskId}
                    onTypeChange={setDependencyType}
                    onClassChange={setDependencyClass}
                    onLagDaysChange={setDependencyLagDays}
                    onAddDependency={handleAddDependency}
                    onRemoveDependency={handleRemoveDependency}
                  />
                )}

                <section className="section-card">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Titulo">
                      <input
                        value={nodeForm.title}
                        onChange={(e) => setNodeForm((prev) => ({ ...prev, title: e.target.value }))}
                        className={INPUT_CLASS}
                      />
                    </Field>
                    <Field label="Responsavel">
                      <select
                        value={nodeForm.assignee}
                        onChange={(e) => setNodeForm((prev) => ({ ...prev, assignee: e.target.value }))}
                        className={INPUT_CLASS}
                      >
                        <option value="">Selecione</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.name}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Descricao" className="md:col-span-2">
                      <textarea
                        value={nodeForm.description}
                        onChange={(e) =>
                          setNodeForm((prev) => ({ ...prev, description: e.target.value }))
                        }
                        rows={4}
                        className={INPUT_CLASS}
                      />
                    </Field>
                    <Field label="Habilidade">
                      <select
                        value={nodeForm.skillId}
                        onChange={(e) =>
                          setNodeForm((prev) => ({
                            ...prev,
                            skillId: e.target.value,
                            skillName: skills.find((skill) => skill.id === e.target.value)?.name || '',
                          }))
                        }
                        className={INPUT_CLASS}
                      >
                        <option value="">Sem habilidade</option>
                        {skills
                          .filter((skill) => skill.status !== 'archived')
                          .slice()
                          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                          .map((skill) => (
                            <option key={skill.id} value={skill.id}>
                              {skill.name}
                            </option>
                          ))}
                      </select>
                    </Field>
                    <Field label="Solicitante">
                      <select
                        value={nodeForm.requestedBy}
                        onChange={(e) =>
                          setNodeForm((prev) => ({ ...prev, requestedBy: e.target.value }))
                        }
                        className={INPUT_CLASS}
                      >
                        <option value="">Selecione</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.name}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Inicio">
                      <input
                        type="date"
                        value={nodeForm.startDate}
                        onChange={(e) =>
                          setNodeForm((prev) => ({ ...prev, startDate: e.target.value }))
                        }
                        className={INPUT_CLASS}
                      />
                    </Field>
                    <Field label="Prazo">
                      <input
                        type="date"
                        value={nodeForm.dueDate}
                        onChange={(e) =>
                          setNodeForm((prev) => ({ ...prev, dueDate: e.target.value }))
                        }
                        className={INPUT_CLASS}
                      />
                    </Field>
                    <Field label="Prioridade">
                      <select
                        value={nodeForm.priority}
                        onChange={(e) =>
                          setNodeForm((prev) => ({
                            ...prev,
                            priority: e.target.value as WBSTask['priority'],
                          }))
                        }
                        className={INPUT_CLASS}
                      >
                        {PRIORITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Stakeholders / Envolvidos">
                        <SearchableMultiSelect
                          value={nodeForm.stakeholders || []}
                          onChange={(value) =>
                            setNodeForm((prev) => ({ ...prev, stakeholders: value }))
                          }
                          options={stakeholderOptions}
                          placeholder="Selecionar stakeholders"
                          allLabel="Todos"
                          searchPlaceholder="Buscar stakeholder..."
                          emptyMessage="Nenhum stakeholder encontrado."
                        />
                      </Field>
                    </div>
                    <div className="md:col-span-2">
                      <Field label="Tags da tarefa">
                        <TagSelector
                          value={nodeForm.tagIds || []}
                          onChange={(value) =>
                            setNodeForm((prev) => ({ ...prev, tagIds: value }))
                          }
                          scope="task"
                          workspaceId={selectedProject?.group}
                          placeholder="Buscar ou criar tags da tarefa"
                          emptyMessage="Nenhuma tag disponível para tarefa."
                        />
                      </Field>
                    </div>
                    <div className="md:col-span-2">
                      <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={nodeForm.autoCompleteFromChildren ?? false}
                          onChange={(e) =>
                            setNodeForm((prev) => ({
                              ...prev,
                              autoCompleteFromChildren: e.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            Concluir automaticamente pelos filhos
                          </p>
                          <p className="text-xs text-gray-500">
                            Quando ativo, este item pode ser concluído automaticamente ao finalizar
                            todos os filhos executáveis.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {canEditTemplateInstance && activeNodeScopeStatus === 'active' ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleStructuralScopeChange('not_applicable', 'Marcada como não aplicável no projeto')
                            }
                            className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-100"
                          >
                            Marcar não aplicável
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleStructuralScopeChange('discarded', 'Descartada pela PMO/Admin')
                            }
                            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
                          >
                            Descartar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleStructuralScopeChange('out_of_scope', 'Removida do escopo do projeto')
                            }
                            className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800 hover:bg-orange-100"
                          >
                            Fora de escopo
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleStructuralScopeChange('deleted', 'Excluída logicamente do projeto')
                            }
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
                          >
                            Excluir do projeto
                          </button>
                        </>
                      ) : null}
                      {canEditTemplateInstance && activeNodeScopeStatus !== 'active' ? (
                        <button
                          type="button"
                          onClick={handleRestoreScope}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          Restaurar no projeto
                        </button>
                      ) : null}
                    </div>
                    <button
                      onClick={handleSaveNode}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                    >
                      <Save className="w-4 h-4" />
                      Salvar alteracoes
                    </button>
                  </div>
                  {canEditTemplateInstance && activeNodeImpactSummary?.hasImpact ? (
                    <p className="mt-3 text-xs text-slate-500">
                      Impacto atual: {activeNodeImpactSummary.subtasks} subtarefa(s), {activeNodeImpactSummary.timeLogs} apontamento(s), {activeNodeImpactSummary.comments} comentário(s), {activeNodeImpactSummary.attachments} anexo(s) e {activeNodeImpactSummary.dependencies} dependência(s).
                    </p>
                  ) : null}
                </section>

                <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white/85 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                  <div className="border-b border-gray-200 px-6 py-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-gray-900">Subtarefas</h3>
                              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                                {(activeNode?.subtasks || []).length}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">
                              Lista operacional com hierarquia expansível e navegação por clique.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const expandableIds = collectExpandableSubtaskIds(activeNode?.subtasks || []);
                            setExpandedSubtaskIds(new Set(expandableIds));
                          }}
                          disabled={(activeNode?.subtasks || []).length === 0}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Expandir tudo
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedSubtaskIds(new Set())}
                          disabled={(activeNode?.subtasks || []).length === 0}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Recolher tudo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSubtaskDraftParentId(activeNode?.id || null);
                            setNewSubtaskAssignee(
                              activeNode?.assignee || liveRootTask?.assignee || currentUser?.name || ''
                            );
                          }}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4" />
                          Nova subtarefa
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-5">
                    {(activeNode?.subtasks || []).length > 0 ? (
                      <div className="overflow-hidden rounded-[24px] border border-white/70 bg-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                        <div className="overflow-x-auto">
                          <table className="min-w-full table-fixed border-collapse">
                            <colgroup>
                              <col className="w-[48%]" />
                              <col className="w-[18%]" />
                              <col className="w-[12%]" />
                              <col className="w-[14%]" />
                              <col className="w-[8%]" />
                            </colgroup>
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                                  Nome
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                                  Responsável
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                                  Prioridade
                                </th>
                                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                                  Status
                                </th>
                                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
                                  Filhos
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(activeNode?.subtasks || []).map((subtask) => (
                                <TaskSubtaskRow
                                  key={subtask.id}
                                  subtask={subtask}
                                  level={0}
                                  expandedIds={expandedSubtaskIds}
                                  activeNodeId={activeNode?.id}
                                  creationTargetId={subtaskDraftParentId}
                                  assigneeOptions={subtaskAssigneeOptions}
                                  currentAssignee={newSubtaskAssignee}
                                  draftTitle={newSubtaskTitle}
                                  onToggleExpand={(subtaskId) =>
                                    setExpandedSubtaskIds((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(subtaskId)) {
                                        next.delete(subtaskId);
                                      } else {
                                        next.add(subtaskId);
                                      }
                                      return next;
                                    })
                                  }
                                  onOpen={(subtaskId) => setActiveNodeId(subtaskId)}
                                  onStartAddChild={(subtaskId, assignee) => {
                                    setSubtaskDraftParentId(subtaskId);
                                    setNewSubtaskAssignee(
                                      assignee || activeNode?.assignee || liveRootTask?.assignee || currentUser?.name || ''
                                    );
                                    setExpandedSubtaskIds((prev) => new Set(prev).add(subtaskId));
                                  }}
                                  onDraftTitleChange={setNewSubtaskTitle}
                                  onDraftAssigneeChange={setNewSubtaskAssignee}
                                  onSubmitDraft={(parentId) => handleAddSubtask(parentId)}
                                  onCancelDraft={() => {
                                    setNewSubtaskTitle('');
                                    setSubtaskDraftParentId(activeNode?.id || null);
                                    setNewSubtaskAssignee(
                                      activeNode?.assignee || liveRootTask?.assignee || currentUser?.name || ''
                                    );
                                  }}
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-5 py-8 text-center">
                        <p className="text-sm font-medium text-gray-900">
                          Nenhuma subtarefa vinculada a este nível.
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          Use a ação abaixo para começar a estruturar a hierarquia operacional.
                        </p>
                      </div>
                    )}

                    {subtaskDraftParentId === activeNode?.id && (
                      <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 px-4 py-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">Nova subtarefa</p>
                            <p className="text-xs text-gray-600">
                              Será criada dentro de <span className="font-medium">{activeNode?.title}</span>.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNewSubtaskTitle('');
                              setSubtaskDraftParentId(null);
                            }}
                            className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-white"
                          >
                            Fechar
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
                          <input
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            placeholder="Nome da subtarefa"
                            className={INPUT_CLASS}
                          />
                          <select
                            value={newSubtaskAssignee}
                            onChange={(e) => setNewSubtaskAssignee(e.target.value)}
                            className={INPUT_CLASS}
                          >
                            <option value="">
                              {activeNode?.assignee || liveRootTask?.assignee || currentUser?.name
                                ? `Responsável padrão: ${activeNode?.assignee || liveRootTask?.assignee || currentUser?.name}`
                                : 'Selecionar responsável'}
                            </option>
                            {subtaskAssigneeOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleAddSubtask(activeNode?.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            <Plus className="h-4 w-4" />
                            Adicionar
                          </button>
                        </div>
                      </div>
                    )}

                    {isSubtaskContext && (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <button
                          onClick={() => setActiveNodeId(parentBreadcrumb?.id || liveRootTask.id)}
                          className="text-sm font-medium text-blue-700 hover:text-blue-800"
                        >
                          Voltar para o nível pai
                        </button>
                        <button
                          onClick={() => {
                            if (canEditTemplateInstance) {
                              handleStructuralScopeChange('deleted', 'Excluída logicamente do projeto');
                              return;
                            }

                            deleteSubtask(liveRootTask.id, activeNode!.id);
                          }}
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          Excluir subtarefa atual
                        </button>
                      </div>
                    )}
                  </div>
                </section>

                <AttachmentUploader
                  attachments={nodeForm.attachments || []}
                  onAddAttachments={(attachments) => addAttachmentsToTarget(attachments, 'node')}
                  onRemove={removeAttachmentFromNodeForm}
                  title="Anexos"
                  description="Anexe imagens, PDFs, planilhas e documentos à tarefa."
                  emptyMessage="Nenhum arquivo anexado a esta tarefa."
                />

                <section className="section-card">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <ListChecks className="w-4 h-4 text-gray-400" />
                        <h3 className="text-lg font-semibold text-gray-900">Checklist</h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {activeChecklistProgress?.completed || 0}/{activeChecklistProgress?.total || 0} itens
                        {' '}concluidos
                      </p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                      {activeChecklistProgress?.percentage || 0}%
                    </span>
                  </div>

                  <div className="mb-4 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all"
                      style={{ width: `${activeChecklistProgress?.percentage || 0}%` }}
                    />
                  </div>

                  <div className="space-y-2">
                    {(activeNode?.checklistItems || []).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2"
                      >
                        <button
                          onClick={() =>
                            toggleChecklistItem(
                              liveRootTask.id,
                              item.id,
                              isSubtaskContext ? activeNode?.id : undefined
                            )
                          }
                        >
                          {item.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-gray-300" />
                          )}
                        </button>
                        <span
                          className={`flex-1 text-sm ${
                            item.completed ? 'text-gray-400 line-through' : 'text-gray-800'
                          }`}
                        >
                          {item.title}
                        </span>
                        <button
                          onClick={() =>
                            deleteChecklistItem(
                              liveRootTask.id,
                              item.id,
                              isSubtaskContext ? activeNode?.id : undefined
                            )
                          }
                          className="rounded p-1 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <input
                      value={newChecklistTitle}
                      onChange={(e) => setNewChecklistTitle(e.target.value)}
                      placeholder="Novo item do checklist"
                      className={INPUT_CLASS}
                    />
                    <button
                      onClick={handleAddChecklistItem}
                      className="rounded-lg border border-gray-300 px-3 py-2 hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </section>

                <section className="section-card">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900">Fluxo da tarefa</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard
                      label="Transferências"
                      value={String(assigneeFlowSummary.totalTransfers)}
                    />
                    <MetricCard
                      label="Retornos"
                      value={String(assigneeFlowSummary.totalReturns)}
                    />
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-gray-600">
                    <ContextLine
                      label="Responsável inicial"
                      value={assigneeFlowSummary.initialAssignee}
                    />
                    <ContextLine
                      label="Responsável atual"
                      value={assigneeFlowSummary.currentAssignee}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAssigneeFlowOpen((prev) => !prev)}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    {isAssigneeFlowOpen ? 'Ocultar histórico de responsáveis' : 'Ver histórico de responsáveis'}
                  </button>
                </section>

                <section className="section-card">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="w-4 h-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900">Contexto</h3>
                  </div>
                  <div className="space-y-3 text-sm text-gray-600">
                    <ContextLine label="Projeto" value={selectedProject?.name || 'Tarefa independente'} />
                    <ContextLine label="Fase" value={selectedPhase?.name || 'Nao vinculada'} />
                    <ContextLine
                      label="Marco"
                      value={selectedPhase?.milestones.find((milestoneItem) => milestoneItem.id === selectedMilestoneId)?.name || 'Nao vinculado'}
                    />
                  </div>
                </section>
              </div>

	              <aside className="hidden min-h-0 2xl:flex 2xl:h-full">
                <TaskActivitySidebar
                  activeTab={taskUpdatesTab}
                  onTabChange={setTaskUpdatesTab}
                  activeNodePriorityCycle={activeNodePriorityCycle}
                  comments={activeNodeComments}
                  activities={activeNodeActivities}
                  commentText={commentText}
                  onCommentTextChange={setCommentText}
                  onCommentKeyDown={handleCommentKeyDown}
                  commentAttachments={commentAttachments}
                  onSelectAttachments={handleSelectCommentAttachments}
                  onRemoveAttachment={(attachmentId) =>
                    setCommentAttachments((current) =>
                      current.filter((attachment) => attachment.id !== attachmentId)
                    )
                  }
                  isCommentUploading={isCommentUploading}
                  commentUploadError={commentUploadError}
                  onSubmitComment={handleAddComment}
                  assigneeFlowSummary={assigneeFlowSummary}
                  isAssigneeFlowOpen={isAssigneeFlowOpen}
                  onToggleAssigneeFlow={() => setIsAssigneeFlowOpen((prev) => !prev)}
                />
              </aside>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function TaskActivitySidebar({
  activeTab,
  onTabChange,
  activeNodePriorityCycle,
  comments,
  activities,
  commentText,
  onCommentTextChange,
  onCommentKeyDown,
  commentAttachments,
  onSelectAttachments,
  onRemoveAttachment,
  isCommentUploading,
  commentUploadError,
  onSubmitComment,
  assigneeFlowSummary,
  isAssigneeFlowOpen,
  onToggleAssigneeFlow,
}: {
  activeTab: 'timeline' | 'comments' | 'activity';
  onTabChange: (tab: 'timeline' | 'comments' | 'activity') => void;
  activeNodePriorityCycle?: {
    name: string;
    startDate: string;
    endDate: string;
    type: 'week' | 'custom' | 'sprint';
    active: boolean;
  } | null;
  comments: Comment[];
  activities: Array<{ id: string; user: string; action: string; details?: string; timestamp: string }>;
  commentText: string;
  onCommentTextChange: (value: string) => void;
  onCommentKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  commentAttachments: ProjectAttachment[];
  onSelectAttachments: (files: File[]) => Promise<void>;
  onRemoveAttachment: (attachmentId: string) => void;
  isCommentUploading: boolean;
  commentUploadError: string;
  onSubmitComment: () => void;
  assigneeFlowSummary: {
    initialAssignee: string;
    currentAssignee: string;
    totalTransfers: number;
    totalReturns: number;
    timeline: AssigneeTransferHistoryEntry[];
  };
  isAssigneeFlowOpen: boolean;
  onToggleAssigneeFlow: () => void;
}) {
  const timelineEntries = useMemo(
    () => buildTaskTimelineEntries(comments, activities),
    [comments, activities]
  );
  const visibleTimelineEntries = useMemo(() => {
    if (activeTab === 'comments') {
      return timelineEntries.filter((entry) => entry.source === 'manual');
    }
    if (activeTab === 'activity') {
      return timelineEntries.filter((entry) => entry.source === 'system');
    }
    return timelineEntries;
  }, [activeTab, timelineEntries]);

  const composer = (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-4 w-4 text-slate-400" />
        <p className="text-sm font-semibold text-slate-900">Novo comentário</p>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        O comentário entra imediatamente no topo da timeline e fica junto dos eventos automáticos deste nível.
      </p>
      <textarea
        value={commentText}
        onChange={(event) => onCommentTextChange(event.target.value)}
        onKeyDown={onCommentKeyDown}
        rows={4}
        placeholder="Escreva um comentário..."
        className={`${INPUT_CLASS} min-h-[104px] resize-y px-3 py-3`}
      />
      <CommentAttachmentPicker
        attachments={commentAttachments}
        onFilesSelected={onSelectAttachments}
        onRemove={onRemoveAttachment}
        loading={isCommentUploading}
        error={commentUploadError}
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSubmitComment}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Comentar
        </button>
      </div>
    </div>
  );

  return (
    <ActivitySidebarShell
      title="Timeline da tarefa"
      subtitle="Comentários manuais e histórico automático em uma única leitura, com itens mais recentes primeiro."
      className="h-full min-h-0"
      tabs={[
        { id: 'timeline', label: 'Timeline', count: timelineEntries.length },
        { id: 'comments', label: 'Comentários', count: comments.length },
        { id: 'activity', label: 'Atividade', count: activities.length },
      ]}
      activeTab={activeTab}
      onTabChange={(tabId) => onTabChange(tabId as 'timeline' | 'comments' | 'activity')}
      listHeader={
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Ciclo atual</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {activeNodePriorityCycle ? activeNodePriorityCycle.name : 'Sem ciclo'}
              </p>
            </div>
            <div className="text-right text-sm text-slate-600">
              <p>{activeNodePriorityCycle ? getPriorityCycleDateLabel(activeNodePriorityCycle) : 'Item fora de ciclo'}</p>
              {activeNodePriorityCycle ? (
                <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  {getPriorityCycleTypeLabel(activeNodePriorityCycle.type)} • {activeNodePriorityCycle.active ? 'Ativo' : 'Inativo'}
                </p>
              ) : null}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Fluxo de responsável</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{assigneeFlowSummary.currentAssignee}</p>
              </div>
              <button
                type="button"
                onClick={onToggleAssigneeFlow}
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                {isAssigneeFlowOpen ? 'Ocultar histórico' : 'Ver histórico'}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <MetricCard label="Inicial" value={assigneeFlowSummary.initialAssignee} />
              <MetricCard label="Trocas" value={String(assigneeFlowSummary.totalTransfers)} />
            </div>
          </div>
          {isAssigneeFlowOpen ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="space-y-3">
                {assigneeFlowSummary.timeline.length > 0 ? (
                  assigneeFlowSummary.timeline
                    .slice()
                    .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
                    .map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-slate-900">
                            {`${entry.fromAssignee || 'Sem responsável'} -> ${entry.toAssignee || 'Sem responsável'}`}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(entry.changedAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          Alterado por {entry.changedBy || 'Sistema'}
                        </p>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-slate-500">Nenhuma troca de responsável registrada até o momento.</p>
                )}
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <span>
              {activeTab === 'timeline'
                ? `${visibleTimelineEntries.length} registro${visibleTimelineEntries.length !== 1 ? 's' : ''}`
                : activeTab === 'comments'
                  ? `${visibleTimelineEntries.length} comentário${visibleTimelineEntries.length !== 1 ? 's' : ''}`
                  : `${visibleTimelineEntries.length} evento${visibleTimelineEntries.length !== 1 ? 's' : ''}`}
            </span>
            <span>Mais recentes primeiro</span>
          </div>
        </div>
      }
      footer={composer}
    >
      <div className="divide-y divide-slate-200">
        {visibleTimelineEntries.length > 0 ? (
          visibleTimelineEntries.map((entry) => {
            const appearance = getTaskTimelineAppearance(entry.type);
            return (
              <article key={entry.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${appearance.badgeClassName}`}>
                        {appearance.label}
                      </span>
                      <p className="text-sm font-semibold text-slate-900">{entry.author}</p>
                      <span className="text-xs text-slate-400">
                        {entry.source === 'manual' ? 'Manual' : 'Sistema'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">{entry.title}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {entry.message}
                    </p>
                    {entry.comment?.attachments?.length ? (
                      <CommentAttachmentGallery attachments={entry.comment.attachments} />
                    ) : null}
                  </div>
                  <span className="whitespace-nowrap text-xs text-slate-400">
                    {new Date(entry.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>
              </article>
            );
          })
        ) : (
          <div className="flex min-h-full items-center justify-center px-5 py-12 text-center">
            <div>
              <p className="text-sm font-semibold text-slate-900">Nenhum registro nesta visualização</p>
              <p className="mt-2 text-sm text-slate-500">
                Comentários da equipe e eventos automáticos vão aparecer aqui em uma timeline única.
              </p>
            </div>
          </div>
        )}
      </div>
    </ActivitySidebarShell>
  );
}

type TaskTimelineEntryType =
  | 'manual_comment'
  | 'status_change'
  | 'created'
  | 'edited'
  | 'timer_event'
  | 'assignment_change'
  | 'system_event';

interface TaskTimelineEntry {
  id: string;
  type: TaskTimelineEntryType;
  source: 'manual' | 'system';
  author: string;
  title: string;
  message: string;
  createdAt: string;
  comment?: Comment;
}

function buildTaskTimelineEntries(
  comments: Comment[],
  activities: Array<{ id: string; user: string; action: string; details?: string; timestamp: string }>
): TaskTimelineEntry[] {
  const commentEntries: TaskTimelineEntry[] = comments.map((comment) => ({
    id: `comment-${comment.id}`,
    type: 'manual_comment',
    source: 'manual',
    author: comment.userName,
    title: 'Comentário',
    message: comment.content || 'Comentário sem texto',
    createdAt: comment.timestamp,
    comment,
  }));

  const activityEntries: TaskTimelineEntry[] = activities
    .filter((activity) => !isShadowTaskCommentActivity(activity))
    .map((activity) => ({
      id: `activity-${activity.id}`,
      type: classifyTaskActivityType(activity),
      source: 'system',
      author: activity.user || 'Sistema',
      title: activity.action,
      message: activity.details || 'Evento registrado na tarefa.',
      createdAt: activity.timestamp,
    }));

  return [...commentEntries, ...activityEntries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function isShadowTaskCommentActivity(activity: { action: string; details?: string }) {
  const action = activity.action.toLowerCase();
  return action === 'comentou' || action.includes('comentário');
}

function classifyTaskActivityType(activity: { action: string; details?: string }): TaskTimelineEntryType {
  const action = activity.action.toLowerCase();
  const details = (activity.details || '').toLowerCase();
  const combined = `${action} ${details}`;

  if (combined.includes('timer') || combined.includes('cronometro') || combined.includes('apontamento')) {
    return 'timer_event';
  }

  if (combined.includes('responsável') || combined.includes('assignee')) {
    return 'assignment_change';
  }

  if (combined.includes('status') || combined.includes('conclu') || combined.includes('bloque')) {
    return 'status_change';
  }

  if (combined.includes('criou') || combined.includes('adicionou')) {
    return 'created';
  }

  if (combined.includes('editou') || combined.includes('atualizou') || combined.includes('removeu')) {
    return 'edited';
  }

  return 'system_event';
}

function getTaskTimelineAppearance(type: TaskTimelineEntryType) {
  switch (type) {
    case 'manual_comment':
      return { label: 'Comentário', badgeClassName: 'bg-blue-50 text-blue-700' };
    case 'status_change':
      return { label: 'Status', badgeClassName: 'bg-amber-50 text-amber-700' };
    case 'created':
      return { label: 'Criação', badgeClassName: 'bg-emerald-50 text-emerald-700' };
    case 'edited':
      return { label: 'Edição', badgeClassName: 'bg-violet-50 text-violet-700' };
    case 'timer_event':
      return { label: 'Timer', badgeClassName: 'bg-cyan-50 text-cyan-700' };
    case 'assignment_change':
      return { label: 'Responsável', badgeClassName: 'bg-orange-50 text-orange-700' };
    default:
      return { label: 'Sistema', badgeClassName: 'bg-slate-100 text-slate-700' };
  }
}

function DependencySection({
  task,
  dependencyTaskOptions,
  dependencyDirection,
  dependencyTaskId,
  dependencyType,
  dependencyClass,
  dependencyLagDays,
  onDirectionChange,
  onTaskChange,
  onTypeChange,
  onClassChange,
  onLagDaysChange,
  onAddDependency,
  onRemoveDependency,
}: {
  task: {
    id: string;
    isDependencyBlocked?: boolean;
    dependencyBlockedReason?: string | null;
    dependencyConflicts?: Array<{ dependencyId: string; relation: string; message: string }>;
    predecessorDependencies?: TaskDependency[];
    successorDependencies?: TaskDependency[];
    relationships?: TaskDependency[];
  };
  dependencyTaskOptions: Array<{ value: string; label: string }>;
  dependencyDirection: 'predecessor' | 'successor';
  dependencyTaskId: string;
  dependencyType: TaskDependencyType;
  dependencyClass: TaskDependencyClass;
  dependencyLagDays: string;
  onDirectionChange: (value: 'predecessor' | 'successor') => void;
  onTaskChange: (value: string) => void;
  onTypeChange: (value: TaskDependencyType) => void;
  onClassChange: (value: TaskDependencyClass) => void;
  onLagDaysChange: (value: string) => void;
  onAddDependency: () => void;
  onRemoveDependency: (dependency: TaskDependency) => void;
}) {
  const relationshipDirectionLabel =
    dependencyDirection === 'predecessor'
      ? 'Tarefa que bloqueia esta'
      : 'Tarefa que depende desta';

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-900 p-2 text-white">
                <Link2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Dependências</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Ajuste predecessoras e sucessoras desta tarefa sem sair do card.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {task.predecessorDependencies?.length || 0} predecessora(s)
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {task.successorDependencies?.length || 0} sucessora(s)
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {task.relationships?.length || 0} relacionamento(s)
            </span>
            {task.isDependencyBlocked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5" />
                Bloqueada por dependência
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-5 px-6 py-5">
        {task.isDependencyBlocked && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Tarefa bloqueada</p>
                <p className="mt-1 text-sm text-amber-800">
                  {task.dependencyBlockedReason || 'Existe uma relação impedindo o avanço desta tarefa.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {task.dependencyConflicts && task.dependencyConflicts.length > 0 && (
          <div className="space-y-2">
            {task.dependencyConflicts.slice(0, 3).map((conflict) => (
              <div
                key={conflict.dependencyId}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                  Conflito de cronograma
                </p>
                <p className="mt-1 text-sm text-rose-900">{conflict.message}</p>
                <p className="mt-1 text-xs text-rose-700">{conflict.relation}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <DependencyList
            title="Predecessoras"
            emptyMessage="Nenhuma predecessora vinculada."
            dependencies={task.predecessorDependencies || []}
            currentTaskId={task.id}
            taskLookupOptions={dependencyTaskOptions}
            onRemove={onRemoveDependency}
          />
          <DependencyList
            title="Sucessoras"
            emptyMessage="Nenhuma sucessora vinculada."
            dependencies={task.successorDependencies || []}
            currentTaskId={task.id}
            taskLookupOptions={dependencyTaskOptions}
            onRemove={onRemoveDependency}
          />
        </div>

        <DependencyList
          title="Relacionamentos"
          emptyMessage="Nenhum relacionamento contextual vinculado."
          dependencies={task.relationships || []}
          currentTaskId={task.id}
          taskLookupOptions={dependencyTaskOptions}
          onRemove={onRemoveDependency}
          variant="relationship"
        />

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-sm font-semibold text-gray-900">Nova relação</p>
          <p className="mt-1 text-xs text-gray-600">
            Adicione uma predecessora ou sucessora dentro do mesmo projeto.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tipo de relacao
                </span>
                <select
                  value={dependencyDirection}
                  onChange={(event) => onDirectionChange(event.target.value as 'predecessor' | 'successor')}
                  className={INPUT_CLASS}
                >
                  <option value="predecessor">Adicionar predecessora</option>
                  <option value="successor">Adicionar sucessora</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {relationshipDirectionLabel}
                </span>
                <select
                  value={dependencyTaskId}
                  onChange={(event) => onTaskChange(event.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Selecionar tarefa</option>
                  {dependencyTaskOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tipo de dependencia
                </span>
                <select
                  value={dependencyType}
                  onChange={(event) => onTypeChange(event.target.value as TaskDependencyType)}
                  className={INPUT_CLASS}
                >
                  <option value="FS">{TASK_DEPENDENCY_TYPE_LABELS.FS}</option>
                  <option value="SS">{TASK_DEPENDENCY_TYPE_LABELS.SS}</option>
                  <option value="FF">{TASK_DEPENDENCY_TYPE_LABELS.FF}</option>
                  <option value="SF">{TASK_DEPENDENCY_TYPE_LABELS.SF}</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Lag em dias
                </span>
                <input
                  value={dependencyLagDays}
                  onChange={(event) => onLagDaysChange(event.target.value)}
                  inputMode="numeric"
                  placeholder="0"
                  className={INPUT_CLASS}
                />
              </label>
            </div>

            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Classificacao da dependencia
              </span>
              <select
                value={dependencyClass}
                onChange={(event) => onClassChange(event.target.value as TaskDependencyClass)}
                className={INPUT_CLASS}
              >
                <option value="hard">{TASK_DEPENDENCY_CLASS_LABELS.hard}</option>
                <option value="soft">{TASK_DEPENDENCY_CLASS_LABELS.soft}</option>
                <option value="external">{TASK_DEPENDENCY_CLASS_LABELS.external}</option>
                <option value="internal">{TASK_DEPENDENCY_CLASS_LABELS.internal}</option>
              </select>
            </label>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Como funciona
              </p>
              <p className="mt-1 text-sm text-blue-900">
                {TASK_DEPENDENCY_TYPE_EXPLANATIONS[dependencyType]}
              </p>
            </div>

            <button
              type="button"
              onClick={onAddDependency}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Salvar dependência
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function DependencyList({
  title,
  emptyMessage,
  dependencies,
  currentTaskId,
  taskLookupOptions,
  onRemove,
  variant = 'dependency',
}: {
  title: string;
  emptyMessage: string;
  dependencies: TaskDependency[];
  currentTaskId: string;
  taskLookupOptions: Array<{ value: string; label: string }>;
  onRemove: (dependency: TaskDependency) => void;
  variant?: 'dependency' | 'relationship';
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
          {dependencies.length}
        </span>
      </div>
      {dependencies.length > 0 ? (
        <div className="space-y-2">
          {dependencies.map((dependency) => (
            <div
              key={dependency.id}
              className="rounded-xl border border-gray-200 bg-white px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {variant === 'relationship' ? (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                        {dependency.relationshipType
                          ? TASK_RELATIONSHIP_TYPE_LABELS[dependency.relationshipType]
                          : 'Relacionamento'}
                      </span>
                    ) : (
                      <>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {dependency.dependencyType
                            ? TASK_DEPENDENCY_TYPE_LABELS[dependency.dependencyType]
                            : 'Dependência'}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                          {TASK_DEPENDENCY_CLASS_LABELS[dependency.dependencyClass]}
                        </span>
                      </>
                    )}
                    {dependency.lagDays ? (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                        Lag {dependency.lagDays}d
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 truncate text-sm text-gray-800">
                    {taskLookupOptions.find((option) => option.value === (
                      dependency.sourceId === currentTaskId || dependency.predecessorTaskId === currentTaskId
                        ? dependency.targetId || dependency.successorTaskId
                        : dependency.sourceId || dependency.predecessorTaskId
                    ))?.label ||
                      'Tarefa relacionada'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(dependency)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-500">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}

const TASK_STATUS_META: Record<TaskStatus, { label: string; className: string }> = {
  not_started: {
    label: 'Não iniciada',
    className: 'bg-slate-100 text-slate-700',
  },
  in_progress: {
    label: 'Em andamento',
    className: 'bg-amber-100 text-amber-700',
  },
  blocked: {
    label: 'Bloqueada',
    className: 'bg-rose-100 text-rose-700',
  },
  done: {
    label: 'Concluída',
    className: 'bg-emerald-100 text-emerald-700',
  },
};

const PRIORITY_META: Record<NonNullable<WBSTask['priority']>, { label: string; className: string }> = {
  low: {
    label: 'Baixa',
    className: 'bg-emerald-100 text-emerald-700',
  },
  medium: {
    label: 'Média',
    className: 'bg-amber-100 text-amber-700',
  },
  high: {
    label: 'Alta',
    className: 'bg-rose-100 text-rose-700',
  },
};

function collectExpandableSubtaskIds(items: Subtask[]): string[] {
  return items.flatMap((item) => {
    const nestedIds = collectExpandableSubtaskIds(item.subtasks || []);
    if ((item.subtasks || []).length === 0) return nestedIds;
    return [item.id, ...nestedIds];
  });
}

function countNestedChildren(subtask: Subtask): number {
  return (subtask.subtasks || []).reduce(
    (total, child) => total + 1 + countNestedChildren(child),
    0
  );
}

function TaskSubtaskRow({
  subtask,
  level,
  expandedIds,
  activeNodeId,
  creationTargetId,
  assigneeOptions,
  currentAssignee,
  draftTitle,
  onToggleExpand,
  onOpen,
  onStartAddChild,
  onDraftTitleChange,
  onDraftAssigneeChange,
  onSubmitDraft,
  onCancelDraft,
}: {
  subtask: Subtask;
  level: number;
  expandedIds: Set<string>;
  activeNodeId?: string | null;
  creationTargetId: string | null;
  assigneeOptions: Array<{ value: string; label: string }>;
  currentAssignee: string;
  draftTitle: string;
  onToggleExpand: (subtaskId: string) => void;
  onOpen: (subtaskId: string) => void;
  onStartAddChild: (subtaskId: string, assignee?: string) => void;
  onDraftTitleChange: (value: string) => void;
  onDraftAssigneeChange: (value: string) => void;
  onSubmitDraft: (parentId: string) => void;
  onCancelDraft: () => void;
}) {
  const { getTaskById } = useTasks();
  const enrichedSubtask = getTaskById(subtask.id);
  const children = subtask.subtasks || [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(subtask.id);
  const statusKey = normalizeTaskStatus(subtask.status, subtask.completed);
  const statusMeta = TASK_STATUS_META[statusKey];
  const priorityMeta = subtask.priority ? PRIORITY_META[subtask.priority] : null;
  const nestedChildrenCount = countNestedChildren(subtask);
  const isCreationTarget = creationTargetId === subtask.id;

  return (
    <>
      <tr className="group border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80">
        <td className="px-4 py-3 align-middle">
          <div
            className="relative flex min-w-0 items-center gap-2"
            style={{ paddingLeft: `${level * 20}px` }}
          >
            {level > 0 && (
              <span
                className="absolute left-0 top-0 bottom-0 w-px bg-gray-200"
                style={{ left: `${Math.max(0, level * 20 - 10)}px` }}
              />
            )}

            {hasChildren ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleExpand(subtask.id);
                }}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-200"
                aria-label={isExpanded ? 'Recolher subtarefa' : 'Expandir subtarefa'}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center text-gray-300">
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
              </span>
            )}

            <button
              type="button"
              onClick={() => onOpen(subtask.id)}
              className={`min-w-0 flex-1 rounded-xl px-3 py-2 text-left transition-colors ${
                activeNodeId === subtask.id
                  ? 'bg-blue-50 text-blue-900 ring-1 ring-blue-200'
                  : 'hover:bg-white'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-medium text-gray-900">{subtask.title}</span>
                {enrichedSubtask?.isTemplateInstance ? (
                  <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                    Do template
                  </span>
                ) : null}
                {enrichedSubtask?.scopeStatus && enrichedSubtask.scopeStatus !== 'active' ? (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${TASK_SCOPE_BADGE_CLASSNAMES[enrichedSubtask.scopeStatus]}`}
                  >
                    {TASK_SCOPE_LABELS[enrichedSubtask.scopeStatus]}
                  </span>
                ) : null}
                {nestedChildrenCount > 0 && (
                  <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                    +{nestedChildrenCount}
                  </span>
                )}
                {enrichedSubtask?.isDependencyBlocked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                    <AlertTriangle className="h-3 w-3" />
                    Bloqueada
                  </span>
                )}
                {(enrichedSubtask?.predecessorDependencies?.length || enrichedSubtask?.successorDependencies?.length) ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    <Link2 className="h-3 w-3" />
                    {`${enrichedSubtask?.predecessorDependencies?.length || 0}/${enrichedSubtask?.successorDependencies?.length || 0}`}
                  </span>
                ) : null}
              </div>
              {level > 0 && (
                <p className="mt-1 text-[11px] text-gray-500">
                  Nível {level + 1} da hierarquia
                </p>
              )}
              {enrichedSubtask?.dependencyBlockedReason && (
                <p className="mt-1 truncate text-[11px] text-amber-700">
                  {enrichedSubtask.dependencyBlockedReason}
                </p>
              )}
            </button>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onStartAddChild(subtask.id, subtask.assignee);
              }}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-blue-600 group-hover:opacity-100"
              aria-label="Adicionar subtarefa filha"
              title="Adicionar subtarefa filha"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </td>

        <td className="px-4 py-3 align-middle text-sm text-gray-600">
          <div className="truncate">{subtask.assignee || '—'}</div>
        </td>

        <td className="px-4 py-3 align-middle">
          {priorityMeta ? (
            <span className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-medium ${priorityMeta.className}`}>
              <Flag className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{priorityMeta.label}</span>
            </span>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </td>

        <td className="px-4 py-3 align-middle">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta.className}`}>
            {statusMeta.label}
          </span>
        </td>

        <td className="px-4 py-3 text-center align-middle text-sm text-gray-500">
          {children.length > 0 ? children.length : '—'}
        </td>
      </tr>

      {isCreationTarget && (
        <tr className="border-b border-dashed border-blue-200 bg-blue-50/50">
          <td className="px-4 py-4 align-top" colSpan={5}>
            <div
              className="rounded-xl border border-blue-100 bg-white/70 p-4"
              style={{ marginLeft: `${level * 20 + 40}px` }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Nova subtarefa filha</p>
                  <p className="text-xs text-gray-600">
                    Será criada abaixo de <span className="font-medium">{subtask.title}</span>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCancelDraft}
                  className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-white"
                >
                  Cancelar
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
                <input
                  value={draftTitle}
                  onChange={(event) => onDraftTitleChange(event.target.value)}
                  placeholder="Nome da subtarefa"
                  className={INPUT_CLASS}
                />
                <select
                  value={currentAssignee}
                  onChange={(event) => onDraftAssigneeChange(event.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Selecionar responsável</option>
                  {assigneeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onSubmitDraft(subtask.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}

      {hasChildren && isExpanded && children.map((child) => (
        <TaskSubtaskRow
          key={child.id}
          subtask={child}
          level={level + 1}
          expandedIds={expandedIds}
          activeNodeId={activeNodeId}
          creationTargetId={creationTargetId}
          assigneeOptions={assigneeOptions}
          currentAssignee={currentAssignee}
          draftTitle={draftTitle}
          onToggleExpand={onToggleExpand}
          onOpen={onOpen}
          onStartAddChild={onStartAddChild}
          onDraftTitleChange={onDraftTitleChange}
          onDraftAssigneeChange={onDraftAssigneeChange}
          onSubmitDraft={onSubmitDraft}
          onCancelDraft={onCancelDraft}
        />
      ))}
    </>
  );
}

function ContextLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
      <span>{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}

function getAssigneeFlowSummary(node: any): {
  initialAssignee: string;
  currentAssignee: string;
  totalTransfers: number;
  totalReturns: number;
  timeline: AssigneeTransferHistoryEntry[];
} {
  const timeline = [...((node?.assigneeHistory || []) as AssigneeTransferHistoryEntry[])].sort(
    (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime()
  );
  const initialAssignee =
    timeline[0]?.fromAssignee || node?.assignee || 'Sem responsável';
  const currentAssignee =
    node?.assignee || timeline[timeline.length - 1]?.toAssignee || 'Sem responsável';

  const seenAssignees = new Set<string>();
  if (timeline[0]?.fromAssignee) {
    seenAssignees.add(timeline[0].fromAssignee);
  } else if (node?.assignee) {
    seenAssignees.add(node.assignee);
  }

  let totalReturns = 0;
  // Retorno acontece quando a tarefa volta para alguém que já apareceu antes no fluxo.
  timeline.forEach((entry) => {
    if (!entry.toAssignee) return;
    if (seenAssignees.has(entry.toAssignee)) {
      totalReturns += 1;
    }
    seenAssignees.add(entry.toAssignee);
  });

  return {
    initialAssignee,
    currentAssignee,
    totalTransfers: timeline.length,
    totalReturns,
    timeline,
  };
}

function getTaskOptionsForDependency(
  projects: Array<{ id: string; name: string; execution: { phases: Array<{ milestones: Array<{ tasks: WBSTask[] }> }> } }>,
  projectId: string,
  activeNodeId?: string | null
) {
  const project = projects.find((candidate) => candidate.id === projectId);
  if (!project) return [];

  const options: Array<{ value: string; label: string }> = [];

  const walkSubtasks = (subtasks: Subtask[] = [], path: string[]) => {
    subtasks.forEach((subtask) => {
      if (subtask.id !== activeNodeId && (subtask.scopeStatus || 'active') === 'active') {
        options.push({
          value: subtask.id,
          label: [...path, subtask.title].join(' > '),
        });
      }
      walkSubtasks(subtask.subtasks || [], [...path, subtask.title]);
    });
  };

  getProjectExecutionPhases(project).forEach((phase) => {
    (phase.milestones || []).forEach((milestone) => {
      (milestone.tasks || []).forEach((task) => {
        if (task.id !== activeNodeId && (task.scopeStatus || 'active') === 'active') {
          options.push({
            value: task.id,
            label: `${phase.name} > ${milestone.name} > ${task.title}`,
          });
        }
        walkSubtasks(task.subtasks || [], [phase.name, milestone.name, task.title]);
      });
    });
  });

  return options.filter((option) => option.value !== activeNodeId);
}
