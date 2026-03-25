import { ChevronRight, Edit2 } from 'lucide-react';
import { WBSTask } from '../types';

interface TaskCardProps {
  task: WBSTask;
  onEdit?: (task: WBSTask) => void;
}

const getTaskStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    todo: 'A fazer',
    doing: 'Fazendo',
    done: 'Feito',
  };
  return labels[status] || status;
};

const getTaskStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    todo: 'bg-gray-100 text-gray-700',
    doing: 'bg-blue-100 text-blue-700',
    done: 'bg-green-100 text-green-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

const getPriorityColor = (priority?: string): string => {
  const colors: Record<string, string> = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600',
  };
  return colors[priority || 'medium'] || 'text-gray-600';
};

export function TaskCard({ task, onEdit }: TaskCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded p-3 text-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${getTaskStatusColor(task.status)}`}>
            {getTaskStatusLabel(task.status)}
          </span>
          <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {task.priority && (
            <span className={`text-xs font-bold ${getPriorityColor(task.priority)}`}>
              {task.priority === 'high' ? '!' : task.priority === 'medium' ? '•' : '○'}
            </span>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Editar tarefa"
            >
              <Edit2 className="w-3.5 h-3.5 text-gray-500 hover:text-gray-700" />
            </button>
          )}
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
        {task.assignee && (
          <span className="truncate">👤 {task.assignee}</span>
        )}
        {task.dueDate && (
          <span>📅 {new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>
        )}
        {task.estimatedHours && (
          <span>⏱️ {task.estimatedHours}h</span>
        )}
      </div>
    </div>
  );
}
