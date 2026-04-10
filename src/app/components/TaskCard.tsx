import { AlertTriangle, Edit2, GripVertical, Link2 } from 'lucide-react';
import { useDrag } from 'react-dnd';
import { WBSTask } from '../types';
import { TaskOrderControls } from './TaskOrderControls';
import { useTasks } from '../context/TaskContext';
import { normalizeTaskStatus, TASK_STATUS_SHORT_LABELS } from '../utils/taskStatus';
import { TASK_SCOPE_BADGE_CLASSNAMES, TASK_SCOPE_LABELS } from '../utils/taskScope';
import { VALUE_INTENT_LABELS } from '../utils/demandTriage';

interface TaskCardProps {
  task: WBSTask;
  onEdit?: (task: WBSTask) => void;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  showOrderControls?: boolean;
  isDraggable?: boolean;
}

const getTaskStatusLabel = (status: string): string => {
  return TASK_STATUS_SHORT_LABELS[normalizeTaskStatus(status)] || status;
};

const getTaskStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    not_started: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    blocked: 'bg-rose-100 text-rose-700',
    done: 'bg-green-100 text-green-700',
  };
  return colors[normalizeTaskStatus(status)] || 'bg-gray-100 text-gray-700';
};

const getPriorityColor = (priority?: string): string => {
  const colors: Record<string, string> = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600',
  };
  return colors[priority || 'medium'] || 'text-gray-600';
};

export function TaskCard({
  task,
  onEdit,
  isFirst = true,
  isLast = true,
  onMoveUp,
  onMoveDown,
  showOrderControls = false,
  isDraggable = false,
}: TaskCardProps) {
  const { getTaskById } = useTasks();
  const enrichedTask = getTaskById(task.id);
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'REORDER_TASK',
    item: { taskId: task.id },
    collect: (monitor) => ({
      isDragging: isDraggable ? monitor.isDragging() : false,
    }),
  }), [task.id, isDraggable]);

  const dragRef = (el: HTMLDivElement | null) => {
    if (isDraggable && drag) {
      drag(el);
    }
  };

  return (
    <div
      ref={dragRef}
      className={`kanban-card p-4 text-sm transition-all hover:-translate-y-0.5 ${
        isDragging ? 'opacity-50' : ''
      } ${
        enrichedTask?.isTemplateInstance
          ? 'border-l-4 border-l-sky-300'
          : ''
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {isDraggable && (
            <div className="cursor-grab flex-shrink-0 pt-0.5 text-slate-300 hover:text-slate-500 active:cursor-grabbing">
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${getTaskStatusColor(task.status)}`}>
            {getTaskStatusLabel(task.status)}
          </span>
          {enrichedTask?.isDependencyBlocked && (
            <span className="flex-shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">
              <span className="inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Bloqueada
              </span>
            </span>
          )}
          {!enrichedTask?.isDependencyBlocked &&
          ((enrichedTask?.predecessorDependencies?.length || 0) > 0 ||
            (enrichedTask?.successorDependencies?.length || 0) > 0) ? (
            <span className="flex-shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
              Dependente
            </span>
          ) : null}
          {!enrichedTask?.isDependencyBlocked &&
          (enrichedTask?.predecessorDependencies?.length || 0) === 0 &&
          (enrichedTask?.successorDependencies?.length || 0) === 0 ? (
            <span className="flex-shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              Livre
            </span>
          ) : null}
          {enrichedTask?.isTemplateInstance && (
            <span className="flex-shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-medium text-sky-700">
              Do template
            </span>
          )}
          {enrichedTask?.scopeStatus && enrichedTask.scopeStatus !== 'active' && (
            <span
              className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${TASK_SCOPE_BADGE_CLASSNAMES[enrichedTask.scopeStatus]}`}
            >
              {TASK_SCOPE_LABELS[enrichedTask.scopeStatus]}
            </span>
          )}
          <h4 className="truncate text-sm font-semibold text-slate-900">{task.title}</h4>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {task.priority && (
            <span className={`text-xs font-bold ${getPriorityColor(task.priority)}`}>
              {task.priority === 'high' ? '!' : task.priority === 'medium' ? '•' : '○'}
            </span>
          )}
          {showOrderControls && (
            <TaskOrderControls
              task={task}
              isFirst={isFirst}
              isLast={isLast}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
            />
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="rounded-lg p-1.5 transition-colors hover:bg-slate-100"
              title="Editar tarefa"
            >
              <Edit2 className="h-3.5 w-3.5 text-slate-500 hover:text-slate-700" />
            </button>
          )}
        </div>
      </div>

      {task.description && (
        <p className="mb-3 line-clamp-2 text-xs leading-5 text-slate-500">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {(enrichedTask?.predecessorDependencies?.length || enrichedTask?.successorDependencies?.length) ? (
          <span className="rounded-full bg-slate-50 px-2.5 py-1 inline-flex items-center gap-1">
            <Link2 className="h-3 w-3" />
            {`${enrichedTask?.predecessorDependencies?.length || 0}/${enrichedTask?.successorDependencies?.length || 0}`}
          </span>
        ) : null}
        {(task.technicalOwnerName || task.assignee) && (
          <span className="rounded-full bg-slate-50 px-2.5 py-1 truncate">
            Técnico: {task.technicalOwnerName || task.assignee}
          </span>
        )}
        {(task.analystOwnerName || task.requestedBy) && (
          <span className="rounded-full bg-slate-50 px-2.5 py-1 truncate">
            Analista: {task.analystOwnerName || task.requestedBy}
          </span>
        )}
        {task.sprintId && typeof task.sprintOrder === 'number' ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 truncate text-amber-700">
            Sprint #{task.sprintOrder + 1}
          </span>
        ) : null}
        {task.demandType && (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 truncate text-blue-700">
            {task.demandType}
          </span>
        )}
        {task.originTicket && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 truncate text-amber-700">
            {task.originTicketReference || 'Ticket'}
          </span>
        )}
        {task.valueIntent && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 truncate text-emerald-700">
            {VALUE_INTENT_LABELS[task.valueIntent]}
          </span>
        )}
        {task.dueDate && (
          <span className="rounded-full bg-slate-50 px-2.5 py-1">📅 {new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>
        )}
        {task.estimatedHours && (
          <span className="rounded-full bg-slate-50 px-2.5 py-1">⏱️ {task.estimatedHours}h</span>
        )}
      </div>
      {enrichedTask?.isDependencyBlocked && enrichedTask?.dependencyBlockedReason && (
        <p className="mt-3 text-xs text-amber-700">{enrichedTask.dependencyBlockedReason}</p>
      )}
    </div>
  );
}
