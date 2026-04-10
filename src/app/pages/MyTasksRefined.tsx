import { memo, useState, useMemo, useCallback, useRef, useEffect, useDeferredValue } from 'react';
import { useSearchParams } from 'react-router';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Plus,
  Clock,
  Flag,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  List,
  LayoutGrid,
  BarChart3,
  AlertCircle,
  AlertTriangle,
  Copy,
  Play,
  Pause,
  Save,
  Settings,
  Star,
  Edit2,
  Trash2,
  GripVertical,
  Link2,
  X,
} from 'lucide-react';
import { useTasks, EnrichedTask } from '../context/TaskContext';
import { useUserKanban, KanbanColumn } from '../context/UserKanbanContext';
import { useAdmin } from '../context/AdminContext';
import { formatDurationSummary } from '../utils/timeTracking';
import { useProjects } from '../context/ProjectContext';
import { TaskModal } from '../components/TaskModal';
import { AdvancedFilter, FilterOption } from '../components/AdvancedFilter';
import { DynamicFiltersPanel } from '../components/filters/DynamicFiltersPanel';
import { UnifiedFilterPanel } from '../components/filters/UnifiedFilterPanel';
import { MyTasksDashboard } from '../components/tasks/MyTasksDashboard';
import { RemindersPanel } from '../components/personal/RemindersPanel';
import { NotesBoard } from '../components/personal/NotesBoard';
import {
  KanbanAddColumnButton,
  KanbanBoardViewport,
  KanbanColumnFrame,
  KanbanEmptyState,
  KanbanPageHeader,
  KanbanToolbar,
} from '../components/kanban/KanbanLayout';
import {
  DEFAULT_TASK_FILTERS,
  filterTasks,
  getTasksAssignedToUser,
  getTaskFilterOptions,
  hasUserEverBeenResponsibleForTask,
  isTaskCurrentlyAssignedToUser,
  isTaskFollowedByUser,
} from '../selectors/taskSelectors';
import { KanbanDropPlacement } from '../utils/kanbanReorderUtils';
import { buildMyTasksDashboardData } from '../utils/myTasksDashboard';
import {
  partitionTasksByOperationalPriority,
  sortTasksByOperationalPriority,
  syncOperationalPriorityForTasks,
} from '../utils/operationalPriority';
import { applyDynamicFilters, DynamicFilterFieldDefinition } from '../utils/dynamicFilters';
import { FilterCondition, SavedView } from '../types';
import { useSavedViews } from '../hooks/useSavedViews';
import { AppErrorBoundary } from '../components/shared/AppErrorBoundary';
import { VALUE_INTENT_LABELS } from '../utils/demandTriage';
import {
  getTaskStatusFromVisualColumn,
  getTaskVisualColumn,
  isTaskBlockedStatus,
  normalizeTaskStatus,
} from '../utils/taskStatus';

type ViewMode = 'kanban' | 'list' | 'dashboard';
type MyTasksScope = 'assigned' | 'history';
type MyTasksWorkspace = 'tasks' | 'reminders' | 'notes';
type ListSortKey = 'title' | 'project' | 'phase' | 'team' | 'assignee' | 'status' | 'dueDate' | 'priority' | 'type';
type ListSortDirection = 'asc' | 'desc';

const MY_TASKS_VIEW_STORAGE_KEY = 'crisdu_my_tasks_view_mode';
const MY_TASKS_WORKSPACE_STORAGE_KEY = 'crisdu_my_tasks_workspace';

const OFFICIAL_STATUS_LABELS: Record<string, string> = {
  not_started: 'Projeto: Backlog',
  in_progress: 'Projeto: Fazendo',
  blocked: 'Projeto: Bloqueada',
  done: 'Projeto: Concluído',
};

const ITEM_TYPE_STYLES: Record<string, string> = {
  Tarefa: 'bg-slate-100 text-slate-700',
  Subtarefa: 'bg-blue-100 text-blue-700',
  Subnivel: 'bg-indigo-100 text-indigo-700',
};

function sortTasksForExecutionQueue(tasks: EnrichedTask[]) {
  const base = sortTasksByOperationalPriority(tasks);
  return base
    .map((task, index) => ({ task, index }))
    .sort((left, right) => {
      if (
        left.task.sprintId &&
        right.task.sprintId &&
        left.task.sprintId === right.task.sprintId &&
        typeof left.task.sprintOrder === 'number' &&
        typeof right.task.sprintOrder === 'number'
      ) {
        return left.task.sprintOrder - right.task.sprintOrder || left.index - right.index;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.task);
}

function normalizeMyTasksViewMode(value?: string | null): ViewMode {
  if (value === 'dashboard') return 'dashboard';
  if (value === 'list' || value === 'list_due_date' || value === 'list_flow') return 'list';
  return 'kanban';
}

interface DraggableTaskCardProps {
  task: EnrichedTask;
  columnId: string;
  index: number;
  personalStatusLabel: string;
  onClick: () => void;
  onToggleAutoComplete: (task: EnrichedTask) => void;
  onTaskDrop: (
    taskId: string,
    columnId: string,
    targetTaskId?: string,
    placement?: KanbanDropPlacement
  ) => void;
}

const DraggableTaskCard = memo(function DraggableTaskCard({
  task,
  columnId,
  index,
  personalStatusLabel,
  onClick,
  onToggleAutoComplete,
  onTaskDrop,
}: DraggableTaskCardProps) {
  const { startTimeTracking, stopTimeTracking, updateTask, duplicateTask } = useTasks();
  const { users, toggleFavoriteEntity, isFavoriteEntity } = useAdmin();
  const cardRef = useRef<HTMLDivElement | null>(null);
  
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TASK',
    item: { taskId: task.id, columnId, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [task.id, columnId, index]);
  const [, drop] = useDrop(
    () => ({
      accept: 'TASK',
      drop: (item: { taskId: string }, monitor) => {
        if (item.taskId === task.id) return;
        const clientOffset = monitor.getClientOffset();
        const bounds = cardRef.current?.getBoundingClientRect();
        const placement: KanbanDropPlacement =
          clientOffset && bounds && clientOffset.y < bounds.top + bounds.height / 2
            ? 'before'
            : 'after';
        onTaskDrop(item.taskId, columnId, task.id, placement);
        return { handled: true };
      },
    }),
    [columnId, onTaskDrop, task.id]
  );

  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
  const normalizedStatus = normalizeTaskStatus(task.status, task.completed);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-300 bg-white';
    }
  };

  const isLate = task.dueDate && new Date(task.dueDate) < new Date() && normalizedStatus !== 'done';
  const operationalPriorityLabel =
    task.prioritySource === 'governance-project'
      ? 'Projeto priorizado'
      : 'Prioridade operacional';
  const activeUsers = users
    .filter((user) => user.status === 'active')
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const isFavorite = isFavoriteEntity('task', task.id);

  const handleTimeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.isTracking) {
      stopTimeTracking(task.id);
    } else {
      startTimeTracking(task.id);
    }
  };

  const dragRef = (el: HTMLDivElement | null) => {
    drag(el);
  };

  return (
    <div
      ref={(node) => {
        cardRef.current = node;
        dragRef(node);
        drop(node);
      }}
      onClick={onClick}
      className={`kanban-card interactive-surface mb-3 cursor-pointer border-l-4 p-5 transition-colors ${getPriorityColor(task.priority)} ${
        task.isWeeklyFocus ? 'ring-2 ring-sky-200 shadow-[0_16px_36px_rgba(14,165,233,0.12)]' : ''
      } ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Header */}
      <div className="mb-2 flex items-start justify-between">
        <div className="min-w-0 flex-1 pr-2">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                ITEM_TYPE_STYLES[task.itemTypeLabel || 'Tarefa'] || ITEM_TYPE_STYLES.Tarefa
              }`}
            >
              {task.itemTypeLabel || 'Tarefa'}
            </span>
            {task.isOperationallyPrioritized && (
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                {task.operationalPriorityOrder !== undefined
                  ? `${operationalPriorityLabel} #${task.operationalPriorityOrder + 1}`
                  : operationalPriorityLabel}
              </span>
            )}
            {task.isWeeklyFocus && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                Foco
              </span>
            )}
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
              Pessoal: {personalStatusLabel}
            </span>
          </div>
          <h4 className="font-semibold text-gray-900 text-sm">{task.title}</h4>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavoriteEntity('task', task.id);
            }}
            className={`rounded-full p-1.5 transition-colors ${
              isFavorite
                ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                : 'bg-white/70 text-slate-400 hover:bg-slate-100 hover:text-amber-500'
            }`}
            title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              duplicateTask(task.id);
            }}
            className="rounded-full bg-white/70 p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            title="Duplicar tarefa"
          >
            <Copy className="h-4 w-4" />
          </button>
          {task.priority && (
            <Flag className={`w-4 h-4 flex-shrink-0 ${
              task.priority === 'high' ? 'text-red-500' :
              task.priority === 'medium' ? 'text-yellow-500' :
              'text-green-500'
            }`} />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAutoComplete(task);
            }}
            className={`rounded-full px-2 py-1 text-[11px] font-medium transition-colors ${
              task.autoCompleteFromChildren
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Concluir automaticamente quando todos os filhos forem concluídos"
          >
            Auto filhos
          </button>
        </div>
      </div>

      <div className="mb-3 space-y-2">
        {task.hierarchyBreadcrumb ? (
          <p className="text-xs leading-relaxed text-gray-500">{task.hierarchyBreadcrumb}</p>
        ) : (
          <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
            Operacional independente
          </span>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
            {OFFICIAL_STATUS_LABELS[normalizedStatus] || 'Projeto'}
          </span>
          {(task.technicalOwnerName || task.assignee) && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
              Técnico: {task.technicalOwnerName || task.assignee}
            </span>
          )}
          {(task.analystOwnerName || task.requestedBy) && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
              Analista: {task.analystOwnerName || task.requestedBy}
            </span>
          )}
          {task.sprintId && typeof task.sprintOrder === 'number' && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              Sprint #{task.sprintOrder + 1}
            </span>
          )}
          {task.originTicket && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-800">
              {task.originTicketReference || 'Ticket'}
            </span>
          )}
          {task.valueIntent && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
              {VALUE_INTENT_LABELS[task.valueIntent]}
            </span>
          )}
          {(task.predecessorDependencies?.length || task.successorDependencies?.length) ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
              <Link2 className="h-3 w-3" />
              {`${task.predecessorDependencies?.length || 0}/${task.successorDependencies?.length || 0}`}
            </span>
          ) : null}
          {(task.isDependencyBlocked || isTaskBlockedStatus(normalizedStatus)) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              <AlertTriangle className="h-3 w-3" />
              Bloqueada
            </span>
          )}
        </div>
        {task.isDependencyBlocked && task.dependencyBlockedReason ? (
          <p className="text-xs text-amber-700">{task.dependencyBlockedReason}</p>
        ) : null}
      </div>

      <div
        className="mb-3 rounded-2xl border border-slate-200/80 bg-white/80 p-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Ações rápidas
          </p>
          <button
            type="button"
            onClick={() => updateTask(task.id, { status: 'done', completed: true })}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-200"
            title="Concluir sem abrir o modal"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Concluir
          </button>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-slate-500">Responsável técnico</span>
            <select
              value={task.assigneeId || ''}
              onChange={(event) => {
                const assigneeId = event.target.value || undefined;
                const assignee = activeUsers.find((user) => user.id === assigneeId)?.name;
                updateTask(task.id, { assigneeId, assignee });
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-300"
            >
              <option value="">Sem responsável</option>
              {activeUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium text-slate-500">Status</span>
            <select
              value={task.status}
              onChange={(event) =>
                updateTask(task.id, {
                  status: event.target.value as EnrichedTask['status'],
                  completed: event.target.value === 'done',
                })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-300"
            >
              <option value="not_started">Não iniciada</option>
              <option value="in_progress">Em andamento</option>
              <option value="blocked">Bloqueada</option>
              <option value="done">Concluída</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium text-slate-500">Prazo</span>
            <input
              type="date"
              value={task.dueDate || ''}
              onChange={(event) =>
                updateTask(task.id, { dueDate: event.target.value || undefined })
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-300"
            />
          </label>
        </div>
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 2).map((tag, idx) => (
            <span key={idx} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
              {tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
              +{task.tags.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {totalSubtasks > 0 && (
        <div className="mb-2">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {completedSubtasks}/{totalSubtasks} checklist
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-3">
        <div className="flex items-center gap-3 text-xs text-gray-600">
          {task.dueDate && (
            <div className={`flex items-center gap-1 ${isLate ? 'text-red-600 font-medium' : ''}`}>
              <Calendar className="w-3 h-3" />
              <span>{new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
            </div>
          )}
          {(task.estimatedHours || task.actualHours) && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDurationSummary(task.totalTimeSeconds || 0)}</span>
            </div>
          )}
        </div>

        {/* Time Tracking Button */}
        <button
          onClick={handleTimeToggle}
          className={`p-1.5 rounded transition-colors ${
            task.isTracking
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
          title={task.isTracking ? 'Pausar cronômetro' : 'Iniciar cronômetro'}
        >
          {task.isTracking ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </button>
      </div>

      {/* Status Indicators */}
      <div className="mt-2 flex items-center gap-2">
        {isLate && (
          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Atrasada
          </span>
        )}
        {task.isTracking && (
          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
            Em execução
          </span>
        )}
        {task.isOperationallyPrioritized && !task.isWeeklyFocus && (
          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
            Fila oficial
          </span>
        )}
      </div>
    </div>
  );
});

interface DraggableColumnProps {
  column: KanbanColumn;
  tasks: EnrichedTask[];
  index: number;
  onTaskClick: (task: EnrichedTask) => void;
  onTaskDrop: (
    taskId: string,
    columnId: string,
    targetTaskId?: string,
    placement?: KanbanDropPlacement
  ) => void;
  onColumnDrop: (draggedColumnId: string, targetColumnId: string) => void;
  onEditColumn: (column: KanbanColumn) => void;
  onDeleteColumn: (columnId: string) => void;
  onToggleAutoComplete: (task: EnrichedTask) => void;
}

const DraggableColumn = memo(function DraggableColumn({
  column,
  tasks,
  index,
  onTaskClick,
  onTaskDrop,
  onColumnDrop,
  onEditColumn,
  onDeleteColumn,
  onToggleAutoComplete,
}: DraggableColumnProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Drag source for column reordering
  const [{ isDraggingColumn }, dragColumn] = useDrag(() => ({
    type: 'COLUMN',
    item: { columnId: column.id, index },
    collect: (monitor) => ({
      isDraggingColumn: monitor.isDragging(),
    }),
  }), [column.id, index]);

  // Drop zone for column reordering
  const [{ isOverColumn }, dropColumn] = useDrop(() => ({
    accept: 'COLUMN',
    drop: (item: { columnId: string; index: number }) => {
      if (item.columnId !== column.id) {
        onColumnDrop(item.columnId, column.id);
      }
    },
    collect: (monitor) => ({
      isOverColumn: monitor.isOver(),
    }),
  }), [column.id, onColumnDrop]);

  // Drop zone for tasks
  const [{ isOverTask }, dropTask] = useDrop(() => ({
    accept: 'TASK',
    drop: (item: { taskId: string }, monitor) => {
      if (monitor.didDrop()) return;
      onTaskDrop(item.taskId, column.id);
    },
    collect: (monitor) => ({
      isOverTask: monitor.isOver(),
    }),
  }), [column.id, onTaskDrop]);

  // Combine refs for column (drag + drop for reordering)
  const combinedColumnRef = (el: HTMLDivElement | null) => {
    dragColumn(el);
    dropColumn(el);
  };

  // Combine refs for task drop zone
  const combinedTaskRef = (el: HTMLDivElement | null) => {
    dropTask(el);
  };

  return (
    <div
      ref={combinedColumnRef}
      className={`${isDraggingColumn ? 'opacity-40' : ''} ${isOverColumn ? 'scale-[1.02]' : ''} transition-all`}
    >
      <KanbanColumnFrame
        title={column.name}
        count={tasks.length}
        tone={`${column.color} cursor-move`}
        isActive={isOverTask}
        actions={
          <div className="relative group">
            <div className="flex items-center gap-1">
              <GripVertical className="h-4 w-4 text-gray-400" />
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="rounded-full p-1 transition-colors hover:bg-white/50"
              >
                <Settings className="h-4 w-4 text-gray-600" />
              </button>
            </div>
            {showMenu && (
              <div className="absolute right-0 top-full z-10 mt-2 min-w-[160px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                <button
                  onClick={() => {
                    onEditColumn(column);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit2 className="h-4 w-4" />
                  Renomear
                </button>
                <button
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir esta coluna?')) {
                      onDeleteColumn(column.id);
                    }
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </button>
              </div>
            )}
          </div>
        }
      >
        <div ref={combinedTaskRef} className="space-y-3">
          {tasks.map((task, taskIndex) => (
            <DraggableTaskCard
              key={task.id}
              task={task}
              columnId={column.id}
              index={taskIndex}
              personalStatusLabel={column.name}
              onClick={() => onTaskClick(task)}
              onToggleAutoComplete={onToggleAutoComplete}
              onTaskDrop={onTaskDrop}
            />
          ))}
          {tasks.length === 0 && (
            <KanbanEmptyState
              title="Nenhuma tarefa nesta etapa"
              description="Arraste tarefas para cá ou ajuste os filtros para preencher a fila."
            />
          )}
        </div>
      </KanbanColumnFrame>
    </div>
  );
});

export function MyTasksRefined() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    allTasks,
    addSubtask,
    updateTask,
    updatePersonalTaskStage,
    getTaskById,
  } = useTasks();
  const { columns, addColumn, updateColumn, deleteColumn, reorderColumns } = useUserKanban();
  const { currentUser, operationalPriorityEntries } = useAdmin();
  const { projects } = useProjects();
  
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return normalizeMyTasksViewMode(localStorage.getItem(MY_TASKS_VIEW_STORAGE_KEY));
    } catch {
      return 'kanban';
    }
  });
  const [workspace, setWorkspace] = useState<MyTasksWorkspace>(() => {
    try {
      const stored = localStorage.getItem(MY_TASKS_WORKSPACE_STORAGE_KEY);
      return stored === 'reminders' || stored === 'notes' ? stored : 'tasks';
    } catch {
      return 'tasks';
    }
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTask, setSelectedTask] = useState<EnrichedTask | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [newColumnName, setNewColumnName] = useState('');
  const [scope, setScope] = useState<MyTasksScope>('assigned');
  const [listSortKey, setListSortKey] = useState<ListSortKey>('dueDate');
  const [listSortDirection, setListSortDirection] = useState<ListSortDirection>('asc');
  const [dynamicConditions, setDynamicConditions] = useState<FilterCondition[]>([]);
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);
  const { views, pinnedView, saveView, deleteView, pinView, clearPinnedView } = useSavedViews('my_tasks');

  // Advanced Filters with Multi-Select
  const [filters, setFilters] = useState(DEFAULT_TASK_FILTERS);

  const myAssignedTasks = useMemo(
    () => getTasksAssignedToUser(allTasks, currentUser),
    [allTasks, currentUser]
  );

  const myHistoryTasks = useMemo(
    () =>
      allTasks.filter(
        (task) =>
          !isTaskCurrentlyAssignedToUser(task, currentUser) &&
          (hasUserEverBeenResponsibleForTask(task, currentUser) ||
            isTaskFollowedByUser(task, currentUser))
      ),
    [allTasks, currentUser]
  );

  const myTasks = scope === 'assigned' ? myAssignedTasks : myHistoryTasks;
  const myTasksWithOperationalPriority = useMemo(
    () =>
      syncOperationalPriorityForTasks(
        myTasks,
        operationalPriorityEntries,
        currentUser?.id
      ),
    [myTasks, operationalPriorityEntries, currentUser?.id]
  );
  useEffect(() => {
    localStorage.setItem(MY_TASKS_VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem(MY_TASKS_WORKSPACE_STORAGE_KEY, workspace);
  }, [workspace]);

  useEffect(() => {
    if (!pinnedView) {
      setDynamicConditions([]);
      setActiveSavedViewId(null);
      return;
    }
    setDynamicConditions(pinnedView.filtersJson || []);
    if (pinnedView.viewMode) {
      setViewMode(normalizeMyTasksViewMode(pinnedView.viewMode));
    }
    setActiveSavedViewId(pinnedView.id);
  }, [pinnedView?.id]);

  useEffect(() => {
    const taskId = searchParams.get('task');
    if (!taskId) return;

    const task = getTaskById(taskId);
    if (!task) return;

    setWorkspace('tasks');
    setScope('assigned');
    setViewMode('list');
    setSelectedTask(task);
    setIsDetailPanelOpen(true);
  }, [getTaskById, searchParams]);

  // Generate filter options
  const deferredTaskSearch = useDeferredValue('');
  const effectiveFilters = useMemo(
    () => ({ ...filters, searchTerm: deferredTaskSearch }),
    [filters, deferredTaskSearch]
  );

  const taskFilterOptions = useMemo(
    () => getTaskFilterOptions(myTasksWithOperationalPriority, projects),
    [myTasksWithOperationalPriority, projects]
  );

  const projectOptions: FilterOption[] = useMemo(
    () => taskFilterOptions.projects.map((project) => ({ value: project.value, label: project.label })),
    [taskFilterOptions.projects]
  );

  const teamOptions: FilterOption[] = useMemo(
    () => taskFilterOptions.teams.map((team) => ({ value: team, label: team })),
    [taskFilterOptions.teams]
  );

  const clientOptions: FilterOption[] = useMemo(
    () => taskFilterOptions.clients.map((client) => ({ value: client, label: client })),
    [taskFilterOptions.clients]
  );

  const productOptions: FilterOption[] = useMemo(
    () => taskFilterOptions.products.map((product) => ({ value: product, label: product })),
    [taskFilterOptions.products]
  );

  const assigneeOptions: FilterOption[] = useMemo(
    () => taskFilterOptions.assignees.map((assignee) => ({ value: assignee, label: assignee })),
    [taskFilterOptions.assignees]
  );

  const priorityOptions: FilterOption[] = [
    { value: 'high', label: 'Alta' },
    { value: 'medium', label: 'Média' },
    { value: 'low', label: 'Baixa' },
  ];

  const statusOptions: FilterOption[] = useMemo(
    () =>
      columns
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((column) => ({
          value: column.id,
          label: column.name,
        })),
    [columns]
  );

  const projectStatusOptions: FilterOption[] = useMemo(
    () =>
      taskFilterOptions.projectStatuses.map((status) => ({
        value: status,
        label: OFFICIAL_STATUS_LABELS[status] || status,
      })),
    [taskFilterOptions.projectStatuses]
  );

  const originOptions: FilterOption[] = taskFilterOptions.origins.map((origin) => ({
    value: origin.value,
    label: origin.label,
  }));
  const dynamicTaskFields = useMemo<DynamicFilterFieldDefinition<EnrichedTask>[]>(
    () => [
      { key: 'title', label: 'Título', valueType: 'text', getValue: (task) => task.title },
      { key: 'description', label: 'Descrição', valueType: 'text', getValue: (task) => task.description },
      { key: 'assignee', label: 'Responsável', valueType: 'select', getValue: (task) => task.assignee, options: taskFilterOptions.assignees.map((item) => ({ value: item, label: item })) },
      { key: 'projectGroup', label: 'Equipe', valueType: 'select', getValue: (task) => task.projectGroup, options: teamOptions },
      { key: 'priority', label: 'Prioridade', valueType: 'select', getValue: (task) => task.priority, options: priorityOptions },
      { key: 'personalStatus', label: 'Etapa', valueType: 'select', getValue: (task) => getTaskVisualColumn(task.status, task.completed), options: statusOptions },
      { key: 'projectName', label: 'Projeto', valueType: 'select', getValue: (task) => task.projectName, options: projectOptions },
      { key: 'flow', label: 'Fluxo', valueType: 'select', getValue: (task) => task.flowLabel || task.projectGroup, options: Array.from(new Set(myTasksWithOperationalPriority.map((task) => task.flowLabel || task.projectGroup).filter(Boolean))).map((item) => ({ value: item as string, label: item as string })) },
      { key: 'requestedBy', label: 'Solicitante', valueType: 'text', getValue: (task) => task.requestedBy },
      { key: 'dueDate', label: 'Data de vencimento', valueType: 'date', getValue: (task) => task.dueDate },
      { key: 'startDate', label: 'Data de criação', valueType: 'date', getValue: (task) => task.startDate },
      { key: 'itemTypeLabel', label: 'Tipo de item', valueType: 'select', getValue: (task) => task.itemTypeLabel, options: Array.from(new Set(myTasksWithOperationalPriority.map((task) => task.itemTypeLabel).filter(Boolean))).map((item) => ({ value: item as string, label: item as string })) },
      { key: 'tags', label: 'Etiqueta', valueType: 'multi_select', getValue: (task) => task.tags || [], options: Array.from(new Set(myTasksWithOperationalPriority.flatMap((task) => task.tags || []))).map((item) => ({ value: item, label: item })) },
    ],
    [myTasksWithOperationalPriority, priorityOptions, projectOptions, statusOptions, taskFilterOptions.assignees, teamOptions]
  );

  // Apply filters
  const filteredTasks = useMemo(() => {
    return sortTasksForExecutionQueue(
      applyDynamicFilters(
        filterTasks(myTasksWithOperationalPriority, projects, effectiveFilters),
        dynamicConditions,
        dynamicTaskFields
      )
    );
  }, [myTasksWithOperationalPriority, projects, effectiveFilters, dynamicConditions, dynamicTaskFields]);

  const listTasks = useMemo(
    () => sortTasksForListView(filteredTasks, listSortKey, listSortDirection),
    [filteredTasks, listSortDirection, listSortKey]
  );

  const dashboardData = useMemo(
    () =>
      buildMyTasksDashboardData(filteredTasks, {
        columns,
        projects,
        currentUser,
      }),
    [filteredTasks, columns, projects, currentUser]
  );

  const handleTaskClick = (task: EnrichedTask) => {
    setSelectedTask(task);
    setIsDetailPanelOpen(true);
  };

  const handleApplySavedView = (view: SavedView) => {
    setDynamicConditions(view.filtersJson || []);
    if (view.viewMode) {
      setViewMode(normalizeMyTasksViewMode(view.viewMode));
    }
    setActiveSavedViewId(view.id);
  };

  const handleSaveDynamicView = (viewId?: string) => {
    const current = viewId ? views.find((item) => item.id === viewId) : undefined;
    const name = window.prompt('Nome da visualização', current?.name || '');
    if (!name?.trim()) return;
    const saved = saveView({
      id: viewId,
      name: name.trim(),
      filtersJson: dynamicConditions,
      viewMode,
    });
    if (saved) setActiveSavedViewId(saved.id);
  };

  const getTaskStageForCurrentUser = useCallback(
    (task: EnrichedTask) => {
      const visualColumn = getTaskVisualColumn(task.status, task.completed);
      const normalizedColumns = columns.map((column) => ({
        ...column,
        normalizedName: `${column.id} ${column.name}`.toLowerCase(),
      }));

      const doneColumn =
        normalizedColumns.find((column) => column.id === 'done') ||
        normalizedColumns.find((column) => column.normalizedName.includes('concl') || column.normalizedName.includes('done'));
      const backlogColumn =
        normalizedColumns.find((column) => column.id === 'backlog') ||
        normalizedColumns.find((column) => column.normalizedName.includes('backlog') || column.normalizedName.includes('a fazer'));
      const doingColumn =
        normalizedColumns.find((column) => column.id === 'in-progress') ||
        normalizedColumns.find((column) => column.normalizedName.includes('andamento') || column.normalizedName.includes('fazendo') || column.normalizedName.includes('progress')) ||
        normalizedColumns.find((column) => column.id !== doneColumn?.id && column.id !== backlogColumn?.id);

      if (visualColumn === 'done') return doneColumn?.id || 'done';
      if (visualColumn === 'backlog') return backlogColumn?.id || columns[0]?.id || 'backlog';
      return doingColumn?.id || columns[1]?.id || backlogColumn?.id || 'in-progress';
    },
    [columns]
  );

  const handleTaskDrop = useCallback((
    taskId: string,
    columnId: string,
    targetTaskId?: string,
    placement: KanbanDropPlacement = 'after'
  ) => {
    if (!currentUser?.id) return;

    const draggableTasks = scope === 'assigned' ? myAssignedTasks : myTasksWithOperationalPriority;
    const tasksWithPriority = syncOperationalPriorityForTasks(
      draggableTasks,
      operationalPriorityEntries,
      currentUser.id
    );
    const draggedTask = tasksWithPriority.find((task) => task.id === taskId);
    if (!draggedTask) return;

    const sourceColumnId = getTaskStageForCurrentUser(draggedTask as EnrichedTask);
    const getColumnTasks = (targetColumnId: string) =>
      sortTasksForExecutionQueue(
        tasksWithPriority.filter(
          (task) => getTaskStageForCurrentUser(task as EnrichedTask) === targetColumnId
        )
      );
    const sourceTasks = getColumnTasks(sourceColumnId);
    const destinationTasks =
      sourceColumnId === columnId
        ? sourceTasks
        : getColumnTasks(columnId);

    const buildStageUpdates = () => ({
      status: getTaskStatusFromVisualColumn(columnId),
      completed: getTaskStatusFromVisualColumn(columnId) === 'done',
    });

    const insertIntoManualQueue = (
      manualIds: string[],
      movedTaskId: string,
      targetId?: string,
      targetIsManual?: boolean,
      currentPlacement: KanbanDropPlacement = 'after'
    ) => {
      const next = manualIds.filter((id) => id !== movedTaskId);

      if (!targetId || !targetIsManual) {
        next.unshift(movedTaskId);
        return next;
      }

      const targetIndex = next.indexOf(targetId);
      if (targetIndex === -1) {
        next.push(movedTaskId);
        return next;
      }

      const insertionIndex = currentPlacement === 'before' ? targetIndex : targetIndex + 1;
      next.splice(insertionIndex, 0, movedTaskId);
      return next;
    };

    const sourcePartition = partitionTasksByOperationalPriority(sourceTasks);
    const destinationPartition = partitionTasksByOperationalPriority(destinationTasks);
    const targetTask = targetTaskId
      ? destinationTasks.find((task) => task.id === targetTaskId)
      : undefined;
    const targetIsManual = targetTask ? !targetTask.isOperationallyPrioritized : false;

    if (sourceColumnId === columnId) {
      if (draggedTask.isOperationallyPrioritized) {
        return;
      }

      const reorderedManualIds = targetTaskId
        ? insertIntoManualQueue(
            sourcePartition.manual.map((task) => task.id),
            taskId,
            targetTaskId,
            targetIsManual,
            placement
          )
        : sourcePartition.manual.map((task) => task.id);

      reorderedManualIds.forEach((id, index) => {
        const currentTask = tasksWithPriority.find((task) => task.id === id);
        if (!currentTask || (currentTask.order || 0) === index) return;
        updateTask(id, { order: index });
      });
      return;
    }

    const nextSourceManualIds = sourcePartition.manual
      .map((task) => task.id)
      .filter((id) => id !== taskId);
    const nextDestinationManualIds = insertIntoManualQueue(
      destinationPartition.manual.map((task) => task.id),
      taskId,
      targetTaskId,
      targetIsManual,
      placement
    );

    nextSourceManualIds.forEach((id, index) => {
      const currentTask = tasksWithPriority.find((task) => task.id === id);
      if (!currentTask || (currentTask.order || 0) === index) return;
      updateTask(id, { order: index });
    });

    nextDestinationManualIds.forEach((id, index) => {
      const currentTask = tasksWithPriority.find((task) => task.id === id);
      if (!currentTask) return;

      updateTask(id, {
        order: index,
        ...(id === taskId ? buildStageUpdates(currentTask) : {}),
      });
    });
  }, [
    currentUser?.id,
    getTaskStageForCurrentUser,
    myAssignedTasks,
    myTasksWithOperationalPriority,
    operationalPriorityEntries,
    scope,
    updateTask,
  ]);

  const handleColumnDrop = useCallback((draggedColumnId: string, targetColumnId: string) => {
    const draggedIndex = columns.findIndex(c => c.id === draggedColumnId);
    const targetIndex = columns.findIndex(c => c.id === targetColumnId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newColumns = [...columns];
    const [draggedColumn] = newColumns.splice(draggedIndex, 1);
    newColumns.splice(targetIndex, 0, draggedColumn);
    
    reorderColumns(newColumns);
  }, [columns, reorderColumns]);

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;
    
    addColumn({
      name: newColumnName,
      color: 'bg-gray-100 border-gray-300',
    });
    
    setNewColumnName('');
    setIsAddingColumn(false);
  };

  const handleEditColumn = (column: KanbanColumn) => {
    setEditingColumn(column);
    setNewColumnName(column.name);
  };

  const handleSaveColumnEdit = () => {
    if (!editingColumn || !newColumnName.trim()) return;
    
    updateColumn(editingColumn.id, { name: newColumnName });
    setEditingColumn(null);
    setNewColumnName('');
  };

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, EnrichedTask[]> = {};
    const validColumnIds = new Set(columns.map((column) => column.id));
    const fallbackColumnId = columns[0]?.id;

    columns.forEach((column) => {
      grouped[column.id] = [];
    });

    filteredTasks.forEach((task) => {
      const targetColumnId = getTaskStageForCurrentUser(task);
      const columnId =
        targetColumnId && validColumnIds.has(targetColumnId)
          ? targetColumnId
          : fallbackColumnId;

      if (!columnId) return;
      grouped[columnId].push(task);
    });

    Object.keys(grouped).forEach((columnId) => {
      grouped[columnId] = sortTasksForExecutionQueue(grouped[columnId]);
    });

    return grouped;
  }, [filteredTasks, columns, getTaskStageForCurrentUser]);

  const hasActiveFilters =
    filters.projectIds.length > 0 ||
    filters.teams.length > 0 ||
    filters.clients.length > 0 ||
    filters.products.length > 0 ||
    filters.assignees.length > 0 ||
    filters.priorities.length > 0 ||
    filters.statuses.length > 0 ||
    filters.projectStatuses.length > 0 ||
    filters.origins.length > 0 ||
    dynamicConditions.length > 0;

  const activeFilterChips = [
    ...filters.projectIds.map((value) => ({
      key: `project-${value}`,
      label: `Projeto: ${projectOptions.find((item) => item.value === value)?.label || value}`,
    })),
    ...filters.teams.map((value) => ({
      key: `team-${value}`,
      label: `Equipe: ${teamOptions.find((item) => item.value === value)?.label || value}`,
    })),
    ...filters.clients.map((value) => ({ key: `client-${value}`, label: `Cliente: ${value}` })),
    ...filters.products.map((value) => ({ key: `product-${value}`, label: `Produto: ${value}` })),
    ...filters.assignees.map((value) => ({ key: `assignee-${value}`, label: `Responsável: ${value}` })),
    ...filters.priorities.map((value) => ({
      key: `priority-${value}`,
      label: `Prioridade: ${priorityOptions.find((item) => item.value === value)?.label || value}`,
    })),
    ...filters.statuses.map((value) => ({
      key: `status-${value}`,
      label: `Etapa: ${statusOptions.find((item) => item.value === value)?.label || value}`,
    })),
    ...filters.projectStatuses.map((value) => ({
      key: `project-status-${value}`,
      label: `Status projeto: ${OFFICIAL_STATUS_LABELS[value] || value}`,
    })),
    ...filters.origins.map((value) => ({
      key: `origin-${value}`,
      label: `Origem: ${originOptions.find((item) => item.value === value)?.label || value}`,
    })),
    ...(dynamicConditions.length > 0
      ? [{ key: 'dynamic-rules', label: `${dynamicConditions.length} regra${dynamicConditions.length > 1 ? 's' : ''} dinâmica${dynamicConditions.length > 1 ? 's' : ''}` }]
      : []),
  ];

  const clearAllFilters = () => {
    setFilters(DEFAULT_TASK_FILTERS);
  };

  const isTaskDetailOpen = isDetailPanelOpen && !!selectedTask;

  const handleCloseTaskDetail = () => {
    setIsDetailPanelOpen(false);
    setSelectedTask(null);
    if (searchParams.get('task')) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('task');
      setSearchParams(nextParams, { replace: true });
    }
  };

  const toggleAutoComplete = useCallback(
    (task: EnrichedTask) => {
      updateTask(task.id, {
        autoCompleteFromChildren: !task.autoCompleteFromChildren,
      });
    },
    [updateTask]
  );

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 font-medium">🔴 Alta</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700 font-medium">🟡 Média</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">🟢 Baixa</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 font-medium">—</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (normalizeTaskStatus(status)) {
      case 'done':
        return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">✅ Concluído</span>;
      case 'blocked':
        return <span className="px-2 py-0.5 rounded text-xs bg-rose-100 text-rose-700 font-medium">⛔ Bloqueada</span>;
      case 'in_progress':
        return <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 font-medium">▶️ Em Andamento</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 font-medium">⏸️ Backlog</span>;
    }
  };

  return (
    <div className="page-shell space-y-6">
      <KanbanPageHeader
        eyebrow="Execução pessoal"
        title="Minhas Tarefas"
        description={
          workspace === 'reminders'
            ? 'Lembretes pessoais para organizar compromissos e acompanhamentos do dia'
            : workspace === 'notes'
              ? 'Bloco pessoal de notas rápidas, ideias e rascunhos'
              : scope === 'history'
                  ? 'Histórico e acompanhamento de tarefas que já passaram por você'
                  : viewMode === 'dashboard'
                    ? 'Visão consolidada das tarefas sob sua responsabilidade atual'
                    : viewMode === 'list'
                      ? 'Lista operacional sincronizada com o Kanban para leitura e edição rápida'
                        : 'Fila principal baseada no responsável atual da tarefa'
        }
        actions={
          workspace === 'tasks' ? (
            <>
            </>
          ) : null
        }
      />

      <section className="section-card">
        <div className="inline-flex rounded-2xl border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setWorkspace('tasks')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              workspace === 'tasks' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tarefas
          </button>
          <button
            type="button"
            onClick={() => setWorkspace('reminders')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              workspace === 'reminders' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Lembretes
          </button>
          <button
            type="button"
            onClick={() => setWorkspace('notes')}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              workspace === 'notes' ? 'bg-slate-900 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Notas
          </button>
        </div>
      </section>

      {workspace === 'tasks' ? (
          <>
            <AppErrorBoundary
              area="my-tasks-filters"
              title="Os filtros de Minhas Tarefas falharam"
              message="A fila principal continua disponivel mesmo se o bloco de filtros apresentar erro."
            >
              <UnifiedFilterPanel
                title="Filtros da fila"
                subtitle="Busque, refine e reaplique recortes da sua rotina sem quebrar o fluxo visual da tela."
                expanded={showFilters}
                onToggleExpanded={() => setShowFilters((prev) => !prev)}
                activeFiltersCount={activeFilterChips.length}
                activeFiltersSlot={
                  activeFilterChips.length > 0 ? (
                    <>
                      {activeFilterChips.map((chip) => (
                        <span
                          key={chip.key}
                          className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          {chip.label}
                        </span>
                      ))}
                    </>
                  ) : null
                }
                compactHelperText="Abra os filtros apenas quando precisar refinar a fila operacional."
                compactByDefault
                actionsSlot={
                  <>
                    <button
                      type="button"
                      onClick={() => handleSaveDynamicView(activeSavedViewId || undefined)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Save className="h-4 w-4" />
                      {activeSavedViewId ? 'Atualizar visualização' : 'Salvar visualização'}
                    </button>
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <X className="h-4 w-4" />
                      Limpar filtros
                    </button>
                  </>
                }
                filtersSlot={
                  showFilters ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-9">
                    <AdvancedFilter
                      label="Projetos"
                      options={projectOptions}
                      selected={filters.projectIds}
                      onChange={(values) =>
                        setFilters((prev) => ({ ...prev, projectIds: values }))
                      }
                      placeholder="Todos"
                    />

                    <AdvancedFilter
                      label="Equipe"
                      options={teamOptions}
                      selected={filters.teams}
                      onChange={(values) =>
                        setFilters((prev) => ({ ...prev, teams: values }))
                      }
                      placeholder="Todas"
                    />

                    <AdvancedFilter
                      label="Cliente"
                      options={clientOptions}
                      selected={filters.clients}
                      onChange={(values) =>
                        setFilters((prev) => ({ ...prev, clients: values }))
                      }
                      placeholder="Todos"
                    />

                    <AdvancedFilter
                      label="Produto"
                      options={productOptions}
                      selected={filters.products}
                      onChange={(values) =>
                        setFilters((prev) => ({ ...prev, products: values }))
                      }
                      placeholder="Todos"
                    />

                    <AdvancedFilter
                      label="Responsável"
                      options={assigneeOptions}
                      selected={filters.assignees}
                      onChange={(values) =>
                        setFilters((prev) => ({ ...prev, assignees: values }))
                      }
                      placeholder="Todos"
                    />

                    <AdvancedFilter
                      label="Prioridade"
                      options={priorityOptions}
                      selected={filters.priorities}
                      onChange={(values) =>
                        setFilters((prev) => ({ ...prev, priorities: values }))
                      }
                      placeholder="Todas"
                    />

                    <AdvancedFilter
                      label="Status"
                      options={statusOptions}
                      selected={filters.statuses}
                      onChange={(values) =>
                        setFilters((prev) => ({ ...prev, statuses: values }))
                      }
                      placeholder="Todos"
                    />

                    <AdvancedFilter
                      label="Status do projeto"
                      options={projectStatusOptions}
                      selected={filters.projectStatuses}
                      onChange={(values) =>
                        setFilters((prev) => ({ ...prev, projectStatuses: values }))
                      }
                      placeholder="Todos"
                    />

                    <AdvancedFilter
                      label="Origem"
                      options={originOptions}
                      selected={filters.origins}
                      onChange={(values) =>
                        setFilters((prev) => ({
                          ...prev,
                          origins: values as typeof prev.origins,
                        }))
                      }
                      placeholder="Todas"
                    />
                    </div>
                  ) : null
                }
                savedViewsSlot={
                  <DynamicFiltersPanel
                    embedded
                    showHeader={false}
                    showActions={false}
                    fields={dynamicTaskFields}
                    conditions={dynamicConditions}
                    onConditionsChange={setDynamicConditions}
                    savedViews={views}
                    activeViewId={activeSavedViewId}
                    pinnedViewId={pinnedView?.id || null}
                    activeViewLabel={
                      activeSavedViewId
                        ? views.find((view) => view.id === activeSavedViewId)?.name
                        : dynamicConditions.length > 0
                          ? 'Temporária'
                          : 'Sem filtros'
                    }
                    onApplyView={handleApplySavedView}
                    onSaveView={handleSaveDynamicView}
                    onDeleteView={(viewId) => {
                      if (activeSavedViewId === viewId) setActiveSavedViewId(null);
                      deleteView(viewId);
                    }}
                    onPinView={pinView}
                    onClearPinned={clearPinnedView}
                    onClearFilters={() => {
                      setDynamicConditions([]);
                      setActiveSavedViewId(null);
                    }}
                  />
                }
                footerSlot={
                  hasActiveFilters ? (
                    <div className="flex items-center justify-between border-t border-gray-200 pt-3">
                      <span className="text-sm font-medium text-gray-600">
                        {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? 's' : ''} encontrada{filteredTasks.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={clearAllFilters}
                        className="flex items-center gap-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
                      >
                        <X className="w-4 h-4" />
                        Limpar filtros
                      </button>
                    </div>
                  ) : null
                }
              />
            </AppErrorBoundary>

            <KanbanToolbar
              title="Visualização da fila"
              description={
                scope === 'history'
                    ? 'Histórico permanece em lista para acompanhamento, com os mesmos dados e filtros da fila atual'
                    : viewMode === 'dashboard'
                      ? 'Dashboard usa apenas tarefas em que você é o responsável atual'
                      : viewMode === 'list'
                        ? 'Kanban e lista compartilham exatamente a mesma fonte de dados, filtros e modal de tarefa'
                        : 'Leitura visual da fila sem sobrescrever a ordem manual'
              }
              controls={
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setScope('assigned');
                        setViewMode('kanban');
                      }}
                      className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        scope === 'assigned' && viewMode === 'kanban'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                      }`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                      Kanban
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScope('assigned');
                        setViewMode('list');
                      }}
                      className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        scope === 'assigned' && viewMode === 'list'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                      }`}
                    >
                      <List className="h-4 w-4" />
                      Lista
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setScope('history');
                      setViewMode('list');
                    }}
                    className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 border ${
                      scope === 'history'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-slate-50'
                    }`}
                    title="Histórico de tarefas"
                  >
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Histórico</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScope('assigned');
                      setViewMode('dashboard');
                    }}
                    className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 border ${
                      scope === 'assigned' && viewMode === 'dashboard'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-gray-600 hover:text-gray-900 hover:bg-slate-50'
                    }`}
                    title="Dashboard operacional"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span className="text-sm font-medium">Dashboard</span>
                  </button>
                </div>
              }
            />

            {/* Content by View Mode */}
            {viewMode === 'kanban' && scope === 'assigned' && (
        <DndProvider backend={HTML5Backend}>
          <KanbanBoardViewport>
            {columns
              .sort((a, b) => a.order - b.order)
              .map((column, index) => (
                <DraggableColumn
                  key={column.id}
                  column={column}
                  tasks={tasksByColumn[column.id] || []}
                  index={index}
                  onTaskClick={handleTaskClick}
                  onTaskDrop={handleTaskDrop}
                  onColumnDrop={handleColumnDrop}
                  onEditColumn={handleEditColumn}
                  onDeleteColumn={deleteColumn}
                  onToggleAutoComplete={toggleAutoComplete}
                />
              ))}
            
            <KanbanAddColumnButton
              label="Criar uma nova etapa"
              onClick={() => setIsAddingColumn(true)}
            />
          </KanbanBoardViewport>
        </DndProvider>
            )}

            {viewMode === 'dashboard' && scope === 'assigned' && (
        <MyTasksDashboard data={dashboardData} />
            )}

            {(viewMode === 'list' || scope === 'history') && viewMode !== 'dashboard' && (
        <MyTasksHierarchyView
          tasks={listTasks}
          onTaskClick={handleTaskClick}
          onUpdatePersonalStage={updatePersonalTaskStage}
          onAddSubtask={addSubtask}
          columns={columns}
          sortKey={listSortKey}
          sortDirection={listSortDirection}
          onSortKeyChange={setListSortKey}
          onSortDirectionChange={setListSortDirection}
        />
            )}

          </>
        ) : workspace === 'reminders' ? (
          <RemindersPanel />
        ) : (
          <NotesBoard />
        )}

      {workspace === 'tasks' ? (
        <button
          type="button"
          onClick={() => setIsCreatingTask(true)}
          className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-3 rounded-full bg-slate-900 px-5 py-4 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(15,23,42,0.24)] transition-all hover:bg-slate-800"
        >
          <Plus className="h-5 w-5" />
          <span>Nova tarefa</span>
        </button>
      ) : null}

      {/* Add/Edit Column Modal */}
      {(isAddingColumn || editingColumn) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingColumn ? 'Renomear Coluna' : 'Nova Coluna'}
            </h3>
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="Nome da coluna"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsAddingColumn(false);
                  setEditingColumn(null);
                  setNewColumnName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={editingColumn ? handleSaveColumnEdit : handleAddColumn}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingColumn ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Panel */}
      <TaskModal
        isOpen={isTaskDetailOpen}
        onClose={handleCloseTaskDetail}
        editingTask={selectedTask || undefined}
        projectId={selectedTask?.projectId}
        phaseId={selectedTask?.phaseId}
        milestoneId={selectedTask?.milestoneId}
      />

      {/* Create Task Modal */}
      <TaskModal
        isOpen={isCreatingTask}
        onClose={() => setIsCreatingTask(false)}
      />
    </div>
  );
}

function getDueDateMeta(dueDate?: string) {
  if (!dueDate) {
    return {
      label: 'Sem prazo',
      className: 'bg-gray-100 text-gray-600',
      sortWeight: 4,
    };
  }

  const target = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: 'Vencido',
      className: 'bg-rose-100 text-rose-700',
      sortWeight: 0,
    };
  }

  if (diffDays === 0) {
    return {
      label: 'Vence hoje',
      className: 'bg-amber-100 text-amber-800',
      sortWeight: 1,
    };
  }

  if (diffDays === 1) {
    return {
      label: 'Vence amanhã',
      className: 'bg-orange-100 text-orange-700',
      sortWeight: 2,
    };
  }

  return {
    label: target.toLocaleDateString('pt-BR'),
    className: 'bg-blue-50 text-blue-700',
    sortWeight: 3,
  };
}

function compareText(a?: string, b?: string) {
  return (a || '').localeCompare(b || '', 'pt-BR');
}

function comparePriority(a?: string, b?: string) {
  const weight = (value?: string) => {
    if (value === 'high') return 0;
    if (value === 'medium') return 1;
    if (value === 'low') return 2;
    return 3;
  };

  return weight(a) - weight(b);
}

function sortTasksForListView(
  tasks: EnrichedTask[],
  sortKey: ListSortKey,
  sortDirection: ListSortDirection
) {
  const direction = sortDirection === 'asc' ? 1 : -1;

  return tasks.slice().sort((a, b) => {
    let comparison = 0;

    switch (sortKey) {
      case 'title':
        comparison = compareText(a.title, b.title);
        break;
      case 'project':
        comparison = compareText(a.projectName, b.projectName);
        break;
      case 'phase':
        comparison = compareText(a.phaseName, b.phaseName);
        break;
      case 'team':
        comparison = compareText(a.projectGroup, b.projectGroup);
        break;
      case 'assignee':
        comparison = compareText(a.assignee, b.assignee);
        break;
      case 'status':
        comparison = compareText(
          getTaskVisualColumn(a.status, a.completed),
          getTaskVisualColumn(b.status, b.completed)
        );
        break;
      case 'priority':
        comparison = comparePriority(a.priority, b.priority);
        break;
      case 'type':
        comparison = compareText(a.itemTypeLabel, b.itemTypeLabel);
        break;
      case 'dueDate':
      default: {
        const aMeta = getDueDateMeta(a.dueDate);
        const bMeta = getDueDateMeta(b.dueDate);
        comparison = aMeta.sortWeight - bMeta.sortWeight;

        if (comparison === 0) {
          const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
          const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
          comparison = aTime - bTime;
        }
        break;
      }
    }

    if (comparison === 0) {
      comparison = compareText(a.title, b.title);
    }

    return comparison * direction;
  });
}

function getPriorityLabel(priority?: string) {
  if (priority === 'high') return 'Alta';
  if (priority === 'medium') return 'Média';
  if (priority === 'low') return 'Baixa';
  return '—';
}

function getPriorityClassName(priority?: string) {
  if (priority === 'high') return 'bg-rose-100 text-rose-700';
  if (priority === 'medium') return 'bg-amber-100 text-amber-700';
  if (priority === 'low') return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-500';
}

function getStatusLabel(task: EnrichedTask, columns: KanbanColumn[]) {
  const currentColumnId = getTaskVisualColumn(task.status, task.completed);
  return columns.find((column) => column.id === currentColumnId)?.name || 'Sem status';
}

interface TaskHierarchySection {
  id: string;
  projectLabel: string;
  phaseLabel: string;
  milestoneLabel: string;
  subtitle: string;
  tasks: EnrichedTask[];
}

function buildTaskHierarchySections(
  tasks: EnrichedTask[],
  sortKey: ListSortKey,
  sortDirection: ListSortDirection
) {
  const taskIds = new Set(tasks.map((task) => task.id));
  const topLevelTasks = sortTasksForListView(
    tasks.filter((task) => !task.parentTaskId || !taskIds.has(task.parentTaskId)),
    sortKey,
    sortDirection
  );
  const sections = new Map<string, TaskHierarchySection>();

  topLevelTasks.forEach((task) => {
    const projectLabel = task.projectName || 'Operacional independente';
    const phaseLabel = task.phaseName || (task.projectName ? 'Sem fase vinculada' : 'Fila operacional');
    const milestoneLabel = task.milestoneName || (task.projectName ? 'Sem marco' : 'Sem marco');
    const subtitle = task.projectGroup || task.flowLabel || 'Fluxo pessoal';
    const key = [projectLabel, phaseLabel, milestoneLabel].join('::');
    const currentSection = sections.get(key) || {
      id: key,
      projectLabel,
      phaseLabel,
      milestoneLabel,
      subtitle,
      tasks: [],
    };

    currentSection.tasks.push(task);
    sections.set(key, currentSection);
  });

  return Array.from(sections.values()).sort((a, b) => {
    const byProject = compareText(a.projectLabel, b.projectLabel);
    if (byProject !== 0) return byProject;
    const byPhase = compareText(a.phaseLabel, b.phaseLabel);
    if (byPhase !== 0) return byPhase;
    return compareText(a.milestoneLabel, b.milestoneLabel);
  });
}

function MyTasksHierarchyView({
  tasks,
  columns,
  onTaskClick,
  onUpdatePersonalStage,
  onAddSubtask,
  sortKey,
  sortDirection,
  onSortKeyChange,
  onSortDirectionChange,
}: {
  tasks: EnrichedTask[];
  columns: KanbanColumn[];
  onTaskClick: (task: EnrichedTask) => void;
  onUpdatePersonalStage: (taskId: string, stageId: string) => void;
  onAddSubtask: (taskId: string, title: string, parentSubtaskId?: string, assignee?: string) => void;
  sortKey: ListSortKey;
  sortDirection: ListSortDirection;
  onSortKeyChange: (key: ListSortKey) => void;
  onSortDirectionChange: (direction: ListSortDirection) => void;
}) {
  const { currentUser } = useAdmin();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draftParentId, setDraftParentId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftAssignee, setDraftAssignee] = useState('');
  const seenExpandableIdsRef = useRef<Set<string>>(new Set());

  const tasksById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const childrenByParentId = useMemo(() => {
    const grouped = new Map<string, EnrichedTask[]>();
    tasks.forEach((task) => {
      if (!task.parentTaskId || !tasksById.has(task.parentTaskId)) return;
      const children = grouped.get(task.parentTaskId) || [];
      children.push(task);
      grouped.set(task.parentTaskId, sortTasksForListView(children, sortKey, sortDirection));
    });
    return grouped;
  }, [sortDirection, sortKey, tasks, tasksById]);
  const sections = useMemo(
    () => buildTaskHierarchySections(tasks, sortKey, sortDirection),
    [sortDirection, sortKey, tasks]
  );
  const expandableIds = useMemo(() => {
    const ids = new Set<string>();
    sections.forEach((section) => {
      ids.add(section.id);
    });
    childrenByParentId.forEach((_children, taskId) => {
      ids.add(taskId);
    });
    return Array.from(ids);
  }, [childrenByParentId, sections]);

  useEffect(() => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      expandableIds.forEach((id) => {
        if (!seenExpandableIdsRef.current.has(id)) {
          seenExpandableIdsRef.current.add(id);
          next.add(id);
        }
      });
      return next;
    });
  }, [expandableIds]);

  const toggleExpand = (id: string) => {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const startDraft = (task: EnrichedTask) => {
    setDraftParentId(task.id);
    setDraftTitle('');
    setDraftAssignee(task.assignee || currentUser?.name || '');
    if (childrenByParentId.has(task.id)) {
      setExpandedIds((previous) => new Set(previous).add(task.id));
    }
  };

  const submitDraft = (task: EnrichedTask) => {
    if (!draftTitle.trim()) return;
    onAddSubtask(
      task.rootTaskId || task.id,
      draftTitle.trim(),
      task.rootTaskId && task.rootTaskId !== task.id ? task.id : undefined,
      draftAssignee || task.assignee || currentUser?.name
    );
    setDraftParentId(null);
    setDraftTitle('');
    setDraftAssignee('');
  };

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-500">
        Nenhuma tarefa encontrada para esta visualização. Ajuste os filtros ou crie uma nova tarefa para voltar a preencher a fila.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-slate-200 bg-white/90 px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Lista hierárquica operacional</p>
            <p className="mt-1 text-sm text-slate-500">
              A mesma base do Kanban, agora organizada por projeto, fase, marco e árvore de execução.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sortKey}
              onChange={(event) => onSortKeyChange(event.target.value as ListSortKey)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="dueDate">Ordenar por prazo</option>
              <option value="title">Ordenar por título</option>
              <option value="project">Ordenar por projeto</option>
              <option value="phase">Ordenar por fase</option>
              <option value="team">Ordenar por equipe</option>
              <option value="assignee">Ordenar por responsável</option>
              <option value="status">Ordenar por status</option>
              <option value="priority">Ordenar por prioridade</option>
              <option value="type">Ordenar por tipo</option>
            </select>
            <select
              value={sortDirection}
              onChange={(event) => onSortDirectionChange(event.target.value as ListSortDirection)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="asc">Crescente</option>
              <option value="desc">Decrescente</option>
            </select>
          </div>
        </div>
      </div>

      {sections.map((section) => {
        const isSectionExpanded = expandedIds.has(section.id);

        return (
          <section key={section.id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <button
              type="button"
              onClick={() => toggleExpand(section.id)}
              className="flex w-full items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-4 text-left"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 rounded-full bg-white p-1 text-slate-500 shadow-sm">
                  {isSectionExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{section.projectLabel}</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      {section.phaseLabel}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                      {section.milestoneLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{section.subtitle}</p>
                </div>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm">
                {section.tasks.length}
              </span>
            </button>

            {isSectionExpanded ? (
              <div className="divide-y divide-slate-200/70">
                {section.tasks.map((task) => (
                  <TaskHierarchyRow
                    key={task.id}
                    task={task}
                    level={0}
                    columns={columns}
                    childrenByParentId={childrenByParentId}
                    expandedIds={expandedIds}
                    onToggleExpand={toggleExpand}
                    onTaskClick={onTaskClick}
                    onUpdatePersonalStage={onUpdatePersonalStage}
                    onStartDraft={startDraft}
                    draftParentId={draftParentId}
                    draftTitle={draftTitle}
                    draftAssignee={draftAssignee}
                    onDraftTitleChange={setDraftTitle}
                    onDraftAssigneeChange={setDraftAssignee}
                    onDraftSubmit={submitDraft}
                    onDraftCancel={() => {
                      setDraftParentId(null);
                      setDraftTitle('');
                      setDraftAssignee('');
                    }}
                  />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function TaskHierarchyRow({
  task,
  level,
  columns,
  childrenByParentId,
  expandedIds,
  onToggleExpand,
  onTaskClick,
  onUpdatePersonalStage,
  onStartDraft,
  draftParentId,
  draftTitle,
  draftAssignee,
  onDraftTitleChange,
  onDraftAssigneeChange,
  onDraftSubmit,
  onDraftCancel,
}: {
  task: EnrichedTask;
  level: number;
  columns: KanbanColumn[];
  childrenByParentId: Map<string, EnrichedTask[]>;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onTaskClick: (task: EnrichedTask) => void;
  onUpdatePersonalStage: (taskId: string, stageId: string) => void;
  onStartDraft: (task: EnrichedTask) => void;
  draftParentId: string | null;
  draftTitle: string;
  draftAssignee: string;
  onDraftTitleChange: (value: string) => void;
  onDraftAssigneeChange: (value: string) => void;
  onDraftSubmit: (task: EnrichedTask) => void;
  onDraftCancel: () => void;
}) {
  const { currentUser, users } = useAdmin();
  const childTasks = childrenByParentId.get(task.id) || [];
  const isExpanded = expandedIds.has(task.id);
  const dueDateMeta = getDueDateMeta(task.dueDate);
  const currentColumnId = columns.some((column) => column.id === getTaskVisualColumn(task.status, task.completed))
    ? getTaskVisualColumn(task.status, task.completed)
    : columns[0]?.id || '';
  const indentation = 18 + level * 28;
  const hasChildren = childTasks.length > 0;
  const isFocus = Boolean(task.isWeeklyFocus);
  const assigneeOptions = Array.from(
    new Set(
      [task.assignee, currentUser?.name, ...users.map((user) => user.name)].filter(Boolean)
    )
  ) as string[];

  return (
    <>
      <div
        className={`relative flex flex-col gap-3 px-4 py-4 transition-colors lg:flex-row lg:items-start lg:justify-between ${
          isFocus ? 'bg-sky-50/70' : 'bg-white'
        }`}
        style={{
          boxShadow: isFocus ? 'inset 4px 0 0 #38bdf8' : undefined,
        }}
      >
        <div className="min-w-0 flex-1" style={{ paddingLeft: `${indentation}px` }}>
          <div className="relative">
            {level > 0 ? (
              <span
                className="absolute left-[-16px] top-0 h-full w-px bg-slate-200"
                aria-hidden="true"
              />
            ) : null}
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex items-center gap-1">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => onToggleExpand(task.id)}
                    className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                  >
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                ) : (
                  <span className="block h-6 w-6 rounded-md bg-slate-100/80" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      ITEM_TYPE_STYLES[task.itemTypeLabel || 'Tarefa'] || ITEM_TYPE_STYLES.Tarefa
                    }`}
                  >
                    {task.itemTypeLabel || 'Tarefa'}
                  </span>
                  {isFocus ? (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
                      Foco
                    </span>
                  ) : null}
                  {task.isDependencyBlocked ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      <AlertTriangle className="h-3 w-3" />
                      Bloqueada
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => onTaskClick(task)}
                  className="text-left text-sm font-semibold text-slate-900 transition-colors hover:text-blue-700"
                >
                  {task.title}
                </button>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{task.projectName || 'Operacional independente'}</span>
                  {task.phaseName ? <span>• {task.phaseName}</span> : null}
                  {task.milestoneName ? <span>• {task.milestoneName}</span> : null}
                  {task.parentTaskId ? <span>• Pai: {task.hierarchyBreadcrumb || 'Subnível da tarefa'}</span> : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 lg:min-w-[440px] lg:grid-cols-[140px_120px_120px_auto]">
          <select
            value={currentColumnId}
            onChange={(event) => onUpdatePersonalStage(task.id, event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </select>

          <div className="flex flex-col justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${dueDateMeta.className}`}>
              {dueDateMeta.label}
            </span>
            <span className="mt-1 text-xs text-slate-500">{task.assignee || 'Sem responsável'}</span>
          </div>

          <div className="flex flex-col justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityClassName(task.priority)}`}>
              {getPriorityLabel(task.priority)}
            </span>
            <span className="mt-1 text-xs text-slate-500">{getStatusLabel(task, columns)}</span>
          </div>

          <button
            type="button"
            onClick={() => onStartDraft(task)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Subtarefa
          </button>
        </div>
      </div>

      {draftParentId === task.id ? (
        <div className="border-t border-slate-200 bg-sky-50/50 px-4 py-4" style={{ paddingLeft: `${48 + level * 28}px` }}>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto_auto]">
            <input
              value={draftTitle}
              onChange={(event) => onDraftTitleChange(event.target.value)}
              placeholder="Nome da subtarefa"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            />
            <select
              value={draftAssignee}
              onChange={(event) => onDraftAssigneeChange(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="">{task.assignee || currentUser?.name ? `Responsável padrão: ${task.assignee || currentUser?.name}` : 'Selecionar responsável'}</option>
              {assigneeOptions.map((assignee) => (
                <option key={assignee} value={assignee}>
                  {assignee}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onDraftSubmit(task)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Criar
            </button>
            <button
              type="button"
              onClick={onDraftCancel}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {hasChildren && isExpanded ? (
        childTasks.map((childTask) => (
          <TaskHierarchyRow
            key={childTask.id}
            task={childTask}
            level={level + 1}
            columns={columns}
            childrenByParentId={childrenByParentId}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            onTaskClick={onTaskClick}
            onUpdatePersonalStage={onUpdatePersonalStage}
            onStartDraft={onStartDraft}
            draftParentId={draftParentId}
            draftTitle={draftTitle}
            draftAssignee={draftAssignee}
            onDraftTitleChange={onDraftTitleChange}
            onDraftAssigneeChange={onDraftAssigneeChange}
            onDraftSubmit={onDraftSubmit}
            onDraftCancel={onDraftCancel}
          />
        ))
      ) : null}
    </>
  );
}
