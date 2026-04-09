import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Milestone } from '../types';
import { TaskCard } from './TaskCard';

interface MilestoneCardProps {
  milestone: Milestone;
  tasks?: any[];
  isExpanded?: boolean;
  onToggle?: () => void;
  showTasks?: boolean;
  onEditTask?: (task: any) => void;
  onCreateTask?: () => void;
}

const getMilestoneTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    business: 'Negócio',
    technical: 'Técnico',
    regulatory: 'Regulatório',
    delivery: 'Entrega',
  };
  return labels[type] || type;
};

const getMilestoneTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    business: 'bg-blue-100 text-blue-700',
    technical: 'bg-orange-100 text-orange-700',
    regulatory: 'bg-red-100 text-red-700',
    delivery: 'bg-green-100 text-green-700',
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
};

const getMilestoneStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'not-started': 'Não iniciado',
    'in-progress': 'Em progresso',
    completed: 'Concluído',
    delayed: 'Atrasado',
  };
  return labels[status] || status;
};

const getMilestoneStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'not-started': 'bg-gray-100 text-gray-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    delayed: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

export function MilestoneCard({
  milestone,
  tasks = [],
  isExpanded = false,
  onToggle,
  showTasks = false,
  onEditTask,
  onCreateTask,
}: MilestoneCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded overflow-hidden">
      <div className="w-full flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors text-left">
        <button
          type="button"
          onClick={onToggle}
          className="mt-0.5 text-gray-400 flex-shrink-0"
        >
          {showTasks && isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <button type="button" onClick={onToggle} className="block text-left w-full">
            <h4 className="font-medium text-gray-900">{milestone.name}</h4>
            {milestone.description && (
              <p className="text-xs text-gray-600 mt-1">{milestone.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMilestoneTypeColor(milestone.type)}`}>
                {getMilestoneTypeLabel(milestone.type)}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMilestoneStatusColor(milestone.status)}`}>
                {getMilestoneStatusLabel(milestone.status)}
              </span>
              {milestone.sla && (
                <span>SLA: {milestone.sla} dias</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {tasks.length} tarefa{tasks.length !== 1 ? 's' : ''}
            </p>
          </button>
        </div>

        {onCreateTask && (
          <button
            type="button"
            onClick={onCreateTask}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar tarefa
          </button>
        )}
      </div>

      {showTasks && isExpanded && (
        <div className="bg-gray-50 border-t border-gray-200 p-3 space-y-3">
          {tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} onEdit={onEditTask} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-4 text-sm text-gray-500">
              Este marco ainda não possui tarefas. Use <span className="font-medium text-gray-700">Adicionar tarefa</span> para iniciar a execução.
            </div>
          )}

          {onCreateTask && tasks.length > 0 && (
            <button
              type="button"
              onClick={onCreateTask}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              Nova tarefa neste marco
            </button>
          )}
        </div>
      )}
    </div>
  );
}
