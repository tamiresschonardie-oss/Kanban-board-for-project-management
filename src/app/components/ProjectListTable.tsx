import { useMemo, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Edit2,
  ExternalLink,
  FolderTree,
  Layers3,
  Trash2,
} from 'lucide-react';
import { Project, WBSTask } from '../types';
import { useProjects } from '../context/ProjectContext';
import { useAdmin } from '../context/AdminContext';
import { useFeedback } from '../context/FeedbackContext';
import { useTasks, EnrichedTask } from '../context/TaskContext';
import {
  getProjectExecutionPhases,
  getProjectGovernancePhaseId,
  getProjectMetrics,
  getProjectTaskCounts,
  getWeeklyFocusTaskCountByProject,
  getWeeklyFocusTaskIds,
} from '../utils/projectSelectors';
import { getTaskNodeProgress } from '../selectors/taskSelectors';
import { getPhaseProgress } from '../utils/progressCalculator';
import { getPhaseStatus, getPhaseStatusBadge } from '../utils/phaseStatusCalculator';
import { canUserPerform } from '../utils/permissions';
import { useProjectDetailNavigation } from '../hooks/useProjectDetailNavigation';
import { TaskModal } from './TaskModal';

interface ProjectListTableProps {
  projects: Project[];
  onEdit: (project: Project) => void;
  onlyWeeklyFocus?: boolean;
  highlightWeeklyFocus?: boolean;
}

type SortField = 'name' | 'group' | 'status' | 'progress' | 'responsible';
type SortDirection = 'asc' | 'desc';

type TreeItem =
  | {
      kind: 'project';
      id: string;
      project: Project;
    }
  | {
      kind: 'phase';
      id: string;
      project: Project;
      phaseId: string;
      phaseName: string;
    }
  | {
      kind: 'milestone';
      id: string;
      project: Project;
      phaseId: string;
      milestoneId: string;
      milestoneName: string;
      rootTaskCount: number;
      statusLabel: string;
    }
  | {
      kind: 'task';
      id: string;
      project: Project;
      task: EnrichedTask;
    };

interface TreeNode {
  item: TreeItem;
  children: TreeNode[];
}

const statusLabels: Record<string, string> = {
  backlog: 'Backlog',
  'pre-analysis': 'Em análise',
  documentation: 'Documentação',
  'waiting-approval': 'Aguardando aprovação',
  construction: 'Em execução',
};

const statusColors: Record<string, string> = {
  backlog: 'bg-gray-100 text-gray-700',
  'pre-analysis': 'bg-blue-100 text-blue-700',
  documentation: 'bg-purple-100 text-purple-700',
  'waiting-approval': 'bg-yellow-100 text-yellow-700',
  construction: 'bg-green-100 text-green-700',
};

const taskStatusLabels: Record<string, string> = {
  not_started: 'Não iniciada',
  in_progress: 'Em andamento',
  blocked: 'Bloqueada',
  done: 'Concluído',
};

export function ProjectListTable({
  projects,
  onEdit,
  onlyWeeklyFocus = false,
  highlightWeeklyFocus = false,
}: ProjectListTableProps) {
  const { deleteProject } = useProjects();
  const { currentUser, operationalPriorityEntries } = useAdmin();
  const { showFeedback } = useFeedback();
  const { openProjectDetail } = useProjectDetailNavigation();
  const { allTasks } = useTasks();
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(new Set());
  const [expandedPhaseIds, setExpandedPhaseIds] = useState<Set<string>>(new Set());
  const [expandedMilestoneIds, setExpandedMilestoneIds] = useState<Set<string>>(new Set());
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<EnrichedTask | null>(null);
  const canEditProject = canUserPerform(currentUser, 'project:edit');
  const canDeleteProject = canUserPerform(currentUser, 'project:delete');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'group':
          aVal = a.group.toLowerCase();
          bVal = b.group.toLowerCase();
          break;
        case 'status':
          aVal = getProjectGovernancePhaseId(a);
          bVal = getProjectGovernancePhaseId(b);
          break;
        case 'progress':
          aVal = getProjectMetrics(a).progress;
          bVal = getProjectMetrics(b).progress;
          break;
        case 'responsible':
          aVal = a.responsible.toLowerCase();
          bVal = b.responsible.toLowerCase();
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [projects, sortField, sortDirection]);

  const projectTaskMap = useMemo(() => {
    const grouped = new Map<string, EnrichedTask[]>();
    allTasks
      .filter((task) => task.projectId)
      .forEach((task) => {
        const projectId = task.projectId as string;
        const items = grouped.get(projectId) || [];
        items.push(task);
        grouped.set(projectId, items);
      });
    return grouped;
  }, [allTasks]);
  const focusedTaskIds = useMemo(
    () => getWeeklyFocusTaskIds(allTasks, operationalPriorityEntries),
    [allTasks, operationalPriorityEntries]
  );

  const projectTrees = useMemo(() => {
    return new Map(
      sortedProjects.map((project) => [
        project.id,
        buildProjectTree(
          project,
          projectTaskMap.get(project.id) || [],
          onlyWeeklyFocus,
          focusedTaskIds
        ),
      ])
    );
  }, [focusedTaskIds, onlyWeeklyFocus, sortedProjects, projectTaskMap]);
  const weeklyFocusTaskCountByProject = useMemo(() => {
    return getWeeklyFocusTaskCountByProject(allTasks, operationalPriorityEntries);
  }, [allTasks, operationalPriorityEntries]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-blue-600" />
    );
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir este projeto?')) {
      deleteProject(id);
      showFeedback({
        tone: 'success',
        title: 'Projeto excluído',
        message: 'O projeto foi removido da base atual.',
      });
    }
  };

  const toggleSet = (setState: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setState((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <>
      <div className="overflow-hidden rounded-[28px] border border-white/70 bg-white/85 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200/70 bg-slate-50/80">
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-900"
                  >
                    Estrutura do Projeto
                    <SortIcon field="name" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('group')}
                    className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-900"
                  >
                    Contexto / Equipe
                    <SortIcon field="group" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-900"
                  >
                    Status
                    <SortIcon field="status" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('progress')}
                    className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-900"
                  >
                    Progresso
                    <SortIcon field="progress" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={() => handleSort('responsible')}
                    className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-900"
                  >
                    Responsável
                    <SortIcon field="responsible" />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Datas</span>
                </th>
                <th className="px-6 py-4 text-right">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70">
              {sortedProjects.map((project) => {
                const tree = projectTrees.get(project.id);
                return (
                  <>
                    <ProjectExecutiveRow
                      key={project.id}
                      project={project}
                      weeklyFocusTaskCount={weeklyFocusTaskCountByProject.get(project.id) || 0}
                      highlightWeeklyFocus={highlightWeeklyFocus}
                      isExpanded={expandedProjectIds.has(project.id)}
                      onToggleExpand={() => toggleSet(setExpandedProjectIds, project.id)}
                      onOpenProject={() => openProjectDetail(project.id)}
                      onEdit={() => onEdit(project)}
                      onDelete={(event) => handleDelete(event, project.id)}
                      canEditProject={canEditProject}
                      canDeleteProject={canDeleteProject}
                    />

                    {tree && expandedProjectIds.has(project.id) &&
                      tree.children.map((node) => (
                        <ProjectTreeRow
                          key={node.item.id}
                          node={node}
                          level={1}
                          expandedPhaseIds={expandedPhaseIds}
                          expandedMilestoneIds={expandedMilestoneIds}
                          expandedTaskIds={expandedTaskIds}
                          onTogglePhase={(id) => toggleSet(setExpandedPhaseIds, id)}
                          onToggleMilestone={(id) => toggleSet(setExpandedMilestoneIds, id)}
                          onToggleTask={(id) => toggleSet(setExpandedTaskIds, id)}
                          onOpenProject={(projectId) => openProjectDetail(projectId)}
                          onOpenTask={(task) => setSelectedTask(task)}
                          highlightWeeklyFocus={highlightWeeklyFocus}
                        />
                      ))}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTask && (
        <TaskModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          editingTask={selectedTask}
          projectId={selectedTask.projectId}
          phaseId={selectedTask.phaseId}
          milestoneId={selectedTask.milestoneId}
        />
      )}
    </>
  );
}

function ProjectExecutiveRow({
  project,
  weeklyFocusTaskCount,
  highlightWeeklyFocus,
  isExpanded,
  onToggleExpand,
  onOpenProject,
  onEdit,
  onDelete,
  canEditProject,
  canDeleteProject,
}: {
  project: Project;
  weeklyFocusTaskCount: number;
  highlightWeeklyFocus: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenProject: () => void;
  onEdit: () => void;
  onDelete: (event: React.MouseEvent) => void;
  canEditProject: boolean;
  canDeleteProject: boolean;
}) {
  const governancePhaseId = getProjectGovernancePhaseId(project);
  const metrics = getProjectMetrics(project);
  const taskCounts = getProjectTaskCounts(project);
  const isWeeklyFocus = project.isWeeklyFocus || weeklyFocusTaskCount > 0;

  return (
    <tr className={`transition-colors hover:bg-slate-50/70 ${highlightWeeklyFocus && isWeeklyFocus ? 'bg-emerald-50/60' : ''}`}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleExpand();
            }}
            className="rounded-lg p-1.5 hover:bg-slate-100"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )}
          </button>
          <button
            type="button"
            onClick={onOpenProject}
            className="flex items-center gap-3 text-left"
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]"
              style={{ backgroundColor: project.logoColor }}
            >
              {project.name.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-slate-900 hover:text-slate-700">{project.name}</p>
                {highlightWeeklyFocus && isWeeklyFocus ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    Foco
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-slate-500">ID: {project.id}</p>
            </div>
          </button>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-2">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700">
            {project.group}
          </span>
          {highlightWeeklyFocus && weeklyFocusTaskCount > 0 ? (
            <p className="text-xs font-medium text-emerald-700">{weeklyFocusTaskCount} tarefa(s) em foco</p>
          ) : null}
          <p className="text-xs text-slate-500">
            {getProjectExecutionPhases(project).length} fase(s) • {taskCounts.total} item(ns)
          </p>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-2">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[governancePhaseId] || 'bg-gray-100 text-gray-700'}`}
          >
            {statusLabels[governancePhaseId] || governancePhaseId}
          </span>
          <p className="text-xs text-slate-500">
            {taskCounts.completed}/{taskCounts.total} concluídos
          </p>
        </div>
      </td>
      <td className="px-6 py-4">
        <ProgressCell progress={metrics.progress} />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white">
            {project.responsible
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)}
          </div>
          <span className="text-sm text-slate-900">{project.responsible}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <DateCell deadline={project.deadline} />
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onOpenProject();
            }}
            className="rounded-2xl p-2 transition-colors hover:bg-slate-100"
            title="Ver detalhes"
          >
            <ExternalLink className="w-4 h-4 text-blue-600" />
          </button>
          {canEditProject && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
              className="rounded-2xl p-2 transition-colors hover:bg-slate-100"
            >
              <Edit2 className="w-4 h-4 text-gray-600" />
            </button>
          )}
          {canDeleteProject && (
            <button
              onClick={onDelete}
              className="rounded-2xl p-2 transition-colors hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function ProjectTreeRow({
  node,
  level,
  expandedPhaseIds,
  expandedMilestoneIds,
  expandedTaskIds,
  onTogglePhase,
  onToggleMilestone,
  onToggleTask,
  onOpenProject,
  onOpenTask,
  highlightWeeklyFocus,
}: {
  node: TreeNode;
  level: number;
  expandedPhaseIds: Set<string>;
  expandedMilestoneIds: Set<string>;
  expandedTaskIds: Set<string>;
  onTogglePhase: (id: string) => void;
  onToggleMilestone: (id: string) => void;
  onToggleTask: (id: string) => void;
  onOpenProject: (projectId: string) => void;
  onOpenTask: (task: EnrichedTask) => void;
  highlightWeeklyFocus: boolean;
}) {
  const hasChildren = node.children.length > 0;
  const expandState = getExpandState(node.item, expandedPhaseIds, expandedMilestoneIds, expandedTaskIds);
  const paddingLeft = `${level * 20}px`;
  const isWeeklyFocus = node.item.kind === 'task' ? Boolean(node.item.task.isWeeklyFocus) : false;

  return (
    <>
      <tr className={`transition-colors hover:bg-slate-50/70 ${highlightWeeklyFocus && isWeeklyFocus ? 'bg-amber-50/60' : ''}`}>
        <td className="px-6 py-3">
          <div className="flex items-center gap-2" style={{ paddingLeft }}>
            {hasChildren ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleNode(node.item, onTogglePhase, onToggleMilestone, onToggleTask);
                }}
                className="rounded-lg p-1 hover:bg-slate-100"
              >
                {expandState ? (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}

            <TreeLabel
              item={node.item}
              onOpenProject={onOpenProject}
              onOpenTask={onOpenTask}
              highlightWeeklyFocus={highlightWeeklyFocus}
            />
          </div>
        </td>
        <td className="px-6 py-3">
          <ContextCell item={node.item} />
        </td>
        <td className="px-6 py-3">
          <StatusCell item={node.item} />
        </td>
        <td className="px-6 py-3">
          <HierarchyProgressCell item={node.item} />
        </td>
        <td className="px-6 py-3">
          <ResponsibleCell item={node.item} />
        </td>
        <td className="px-6 py-3">
          <HierarchyDateCell item={node.item} />
        </td>
        <td className="px-6 py-3 text-right">
          <HierarchyActionCell
            item={node.item}
            onOpenProject={onOpenProject}
            onOpenTask={onOpenTask}
          />
        </td>
      </tr>

      {hasChildren && expandState &&
        node.children.map((child) => (
          <ProjectTreeRow
            key={child.item.id}
            node={child}
            level={level + 1}
            expandedPhaseIds={expandedPhaseIds}
            expandedMilestoneIds={expandedMilestoneIds}
            expandedTaskIds={expandedTaskIds}
            onTogglePhase={onTogglePhase}
            onToggleMilestone={onToggleMilestone}
            onToggleTask={onToggleTask}
            onOpenProject={onOpenProject}
            onOpenTask={onOpenTask}
            highlightWeeklyFocus={highlightWeeklyFocus}
          />
        ))}
    </>
  );
}

function TreeLabel({
  item,
  onOpenProject,
  onOpenTask,
  highlightWeeklyFocus,
}: {
  item: TreeItem;
  onOpenProject: (projectId: string) => void;
  onOpenTask: (task: EnrichedTask) => void;
  highlightWeeklyFocus: boolean;
}) {
  if (item.kind === 'phase') {
    return (
      <div>
        <p className="text-sm font-medium text-slate-900">{item.phaseName}</p>
        <p className="text-xs text-slate-500">Fase de execução</p>
      </div>
    );
  }

  if (item.kind === 'milestone') {
    return (
      <div>
        <p className="text-sm font-medium text-slate-900">{item.milestoneName}</p>
        <p className="text-xs text-slate-500">Marco operacional</p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (item.kind === 'project') {
          onOpenProject(item.project.id);
        } else {
          onOpenTask(item.task);
        }
      }}
      className="text-left"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-slate-900 hover:text-slate-700">
          {item.kind === 'project' ? item.project.name : item.task.title}
        </p>
        {highlightWeeklyFocus && item.kind === 'task' && item.task.isWeeklyFocus ? (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
            Foco
          </span>
        ) : null}
      </div>
      <p className="text-xs text-slate-500">
        {item.kind === 'project'
          ? 'Projeto'
          : item.task.itemTypeLabel || (item.task.parentTaskId ? 'Subtarefa' : 'Tarefa')}
      </p>
    </button>
  );
}

function ContextCell({ item }: { item: TreeItem }) {
  if (item.kind === 'project') return null;

  if (item.kind === 'phase') {
    const phase = getProjectExecutionPhases(item.project).find((candidate) => candidate.id === item.phaseId);
    return (
      <div className="text-sm text-slate-600">
        {(phase?.milestones || []).length} marco(s)
      </div>
    );
  }

  if (item.kind === 'milestone') {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700">
        <Layers3 className="h-4 w-4" />
        {item.rootTaskCount} tarefa(s)
      </div>
    );
  }

  return (
    <div className="space-y-1 text-sm text-slate-600">
      {item.task.milestoneName ? <p>{item.task.milestoneName}</p> : <p>Sem marco</p>}
      {item.task.tags && item.task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.task.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusCell({ item }: { item: TreeItem }) {
  if (item.kind === 'phase') {
    const phaseTasks = getRootTasksForPhase(item.project, item.phaseId);
    const statusBadge = getPhaseStatusBadge(getPhaseStatus(item.phaseId, phaseTasks as WBSTask[]));
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusBadge.color}`}>
        {statusBadge.label}
      </span>
    );
  }

  if (item.kind === 'milestone') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
        {item.statusLabel}
      </span>
    );
  }

  if (item.kind === 'task') {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
        {taskStatusLabels[item.task.status || 'not_started'] || item.task.status}
      </span>
    );
  }

  const governancePhaseId = getProjectGovernancePhaseId(item.project);
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusColors[governancePhaseId] || 'bg-gray-100 text-gray-700'}`}
    >
      {statusLabels[governancePhaseId] || governancePhaseId}
    </span>
  );
}

function HierarchyProgressCell({ item }: { item: TreeItem }) {
  const progress =
    item.kind === 'project'
      ? getProjectMetrics(item.project).progress
      : item.kind === 'phase'
        ? getPhaseProgress(item.phaseId, getRootTasksForPhase(item.project, item.phaseId))
        : item.kind === 'milestone'
          ? getAverageProgress(item.childrenTasks || [])
          : getTaskNodeProgress(item.task);

  return <ProgressCell progress={progress} />;
}

function ResponsibleCell({ item }: { item: TreeItem }) {
  if (item.kind === 'project') {
    return <span className="text-sm text-gray-900">{item.project.responsible}</span>;
  }

  if (item.kind === 'phase') {
    const phase = getProjectExecutionPhases(item.project).find((candidate) => candidate.id === item.phaseId);
    return <span className="text-sm text-gray-600">{phase?.responsible || '—'}</span>;
  }

  if (item.kind === 'milestone') {
    const milestone = findMilestone(item.project, item.phaseId, item.milestoneId);
    return <span className="text-sm text-gray-600">{milestone?.responsible || '—'}</span>;
  }

  return <span className="text-sm text-gray-600">{item.task.assignee || '—'}</span>;
}

function HierarchyDateCell({ item }: { item: TreeItem }) {
  if (item.kind === 'project') {
    return <DateCell deadline={item.project.deadline} />;
  }

  if (item.kind === 'phase') {
    const phase = getProjectExecutionPhases(item.project).find((candidate) => candidate.id === item.phaseId);
    return <DateRangeCell start={phase?.plannedStartDate || phase?.startDate} end={phase?.plannedEndDate || phase?.actualEndDate || phase?.endDate} />;
  }

  if (item.kind === 'milestone') {
    const milestone = findMilestone(item.project, item.phaseId, item.milestoneId);
    return <DateRangeCell start={milestone?.plannedStartDate || milestone?.startDate} end={milestone?.plannedEndDate || milestone?.endDate} />;
  }

  return <DateRangeCell start={item.task.startDate} end={item.task.dueDate} />;
}

function HierarchyActionCell({
  item,
  onOpenProject,
  onOpenTask,
}: {
  item: TreeItem;
  onOpenProject: (projectId: string) => void;
  onOpenTask: (task: EnrichedTask) => void;
}) {
  if (item.kind === 'project') {
    return (
      <button
        type="button"
        onClick={() => onOpenProject(item.project.id)}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        <ExternalLink className="w-4 h-4" />
        Abrir
      </button>
    );
  }

  if (item.kind === 'task') {
    return (
      <button
        type="button"
        onClick={() => onOpenTask(item.task)}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
      >
        <ExternalLink className="w-4 h-4" />
        Abrir
      </button>
    );
  }

  return <span className="text-xs text-slate-400">—</span>;
}

function ProgressCell({ progress }: { progress: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 max-w-[140px]">
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-900 transition-all"
            style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
          />
        </div>
      </div>
      <span className="w-12 text-right text-sm font-medium text-slate-900">
        {progress}%
      </span>
    </div>
  );
}

function DateCell({ deadline }: { deadline?: string }) {
  if (!deadline) {
    return <span className="text-sm text-slate-400">Não definido</span>;
  }

  return (
    <div className="flex flex-col gap-1 text-sm text-slate-600">
      <span className="text-slate-500">Término</span>
      <span className="font-medium">{deadline}</span>
    </div>
  );
}

function DateRangeCell({ start, end }: { start?: string; end?: string }) {
  if (!start && !end) {
    return <span className="text-sm text-slate-400">—</span>;
  }

  return (
    <div className="space-y-1 text-sm text-slate-600">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-slate-400" />
        <span>{start || '—'} → {end || '—'}</span>
      </div>
    </div>
  );
}

function buildProjectTree(
  project: Project,
  projectTasks: EnrichedTask[],
  onlyWeeklyFocus: boolean,
  focusedTaskIds: Set<string>
): TreeNode {
  const scopedTasks = onlyWeeklyFocus ? filterTasksForWeeklyFocus(projectTasks, focusedTaskIds) : projectTasks;
  const rootTasks = scopedTasks
    .filter((task) => (task.hierarchyDepth || 0) === 0)
    .sort((a, b) => {
      if ((a.order || 0) !== (b.order || 0)) return (a.order || 0) - (b.order || 0);
      return a.title.localeCompare(b.title, 'pt-BR');
    });

  const childrenByParentId = new Map<string, EnrichedTask[]>();
  scopedTasks
    .filter((task) => task.parentTaskId)
    .forEach((task) => {
      const parentId = task.parentTaskId as string;
      const children = childrenByParentId.get(parentId) || [];
      children.push(task);
      childrenByParentId.set(parentId, children);
    });

  const phases = getProjectExecutionPhases(project);
  const phaseNodes: TreeNode[] = phases.map((phase) => {
    const phaseRootTasks = rootTasks.filter((task) => task.phaseId === phase.id);
    const milestoneNodes = phase.milestones.map((milestone) => {
      const milestoneTasks = phaseRootTasks.filter((task) => task.milestoneId === milestone.id);
      return {
        item: {
          kind: 'milestone',
          id: `${project.id}-milestone-${milestone.id}`,
          project,
          phaseId: phase.id,
          milestoneId: milestone.id,
          milestoneName: milestone.name,
          rootTaskCount: milestoneTasks.length,
          statusLabel: milestone.status,
        } as TreeItem,
        children: milestoneTasks.map((task) => buildTaskNode(project, task, childrenByParentId)),
      };
    }).filter((node) => node.children.length > 0 || findMilestone(project, phase.id, (node.item as any).milestoneId));

    const phaseTasksWithoutMilestone = phaseRootTasks
      .filter((task) => !task.milestoneId)
      .map((task) => buildTaskNode(project, task, childrenByParentId));

    return {
      item: {
        kind: 'phase',
        id: `${project.id}-phase-${phase.id}`,
        project,
        phaseId: phase.id,
        phaseName: phase.name,
      } as TreeItem,
      children: [...milestoneNodes, ...phaseTasksWithoutMilestone],
    };
  });

  return {
    item: {
      kind: 'project',
      id: project.id,
      project,
    },
    children: phaseNodes,
  };
}

function filterTasksForWeeklyFocus(projectTasks: EnrichedTask[], focusedTaskIds: Set<string>) {
  const taskById = new Map(projectTasks.map((task) => [task.id, task]));
  const includedIds = new Set<string>();

  projectTasks
    .filter((task) => focusedTaskIds.has(task.id))
    .forEach((task) => {
      let current: EnrichedTask | undefined = task;
      while (current) {
        includedIds.add(current.id);
        current = current.parentTaskId ? taskById.get(current.parentTaskId) : undefined;
      }
    });

  return projectTasks.filter((task) => includedIds.has(task.id));
}

function buildTaskNode(
  project: Project,
  task: EnrichedTask,
  childrenByParentId: Map<string, EnrichedTask[]>
): TreeNode {
  const children = (childrenByParentId.get(task.id) || [])
    .sort((a, b) => {
      if ((a.order || 0) !== (b.order || 0)) return (a.order || 0) - (b.order || 0);
      return a.title.localeCompare(b.title, 'pt-BR');
    })
    .map((child) => buildTaskNode(project, child, childrenByParentId));

  return {
    item: {
      kind: 'task',
      id: `${project.id}-task-${task.id}`,
      project,
      task,
    },
    children,
  };
}

function getExpandState(
  item: TreeItem,
  expandedPhaseIds: Set<string>,
  expandedMilestoneIds: Set<string>,
  expandedTaskIds: Set<string>
) {
  if (item.kind === 'phase') return expandedPhaseIds.has(item.id);
  if (item.kind === 'milestone') return expandedMilestoneIds.has(item.id);
  if (item.kind === 'task') return expandedTaskIds.has(item.id);
  return false;
}

function toggleNode(
  item: TreeItem,
  onTogglePhase: (id: string) => void,
  onToggleMilestone: (id: string) => void,
  onToggleTask: (id: string) => void
) {
  if (item.kind === 'phase') onTogglePhase(item.id);
  if (item.kind === 'milestone') onToggleMilestone(item.id);
  if (item.kind === 'task') onToggleTask(item.id);
}

function findMilestone(project: Project, phaseId: string, milestoneId: string) {
  const phase = getProjectExecutionPhases(project).find((candidate) => candidate.id === phaseId);
  return phase?.milestones.find((milestone) => milestone.id === milestoneId);
}

function getRootTasksForPhase(project: Project, phaseId: string) {
  return getProjectExecutionPhases(project)
    .find((phase) => phase.id === phaseId)
    ?.milestones.flatMap((milestone) => milestone.tasks)
    .filter((task) => task.phaseId === phaseId) || [];
}

function getAverageProgress(tasks: EnrichedTask[]) {
  if (tasks.length === 0) return 0;
  return Math.round(
    tasks.reduce((sum, task) => sum + getTaskNodeProgress(task), 0) / tasks.length
  );
}
