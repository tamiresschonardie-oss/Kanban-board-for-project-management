import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Milestone } from '../types';
import { TaskCard } from './TaskCard';

interface MilestoneCardProps {
  milestone: Milestone;
  isExpanded?: boolean;
  onToggle?: () => void;
  showTasks?: boolean;
  onEditTask?: (task: any) => void;
  phaseId?: string;
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

export function MilestoneCard({ milestone, isExpanded = false, onToggle, showTasks = false, onEditTask, phaseId }: MilestoneCardProps) {
  const tasksForThisMilestone = milestone.tasks.filter(
    task => !phaseId || task.phaseId === phaseId || (task.phaseId === undefined)
  );
  return (
    <div className="bg-white border border-gray-200 rounded overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
      >
        {showTasks && (
          <div className="mt-0.5 text-gray-400 flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900">{milestone.name}</h4>
          {milestone.description && (
            <p className="text-xs text-gray-600 mt-1">{milestone.description}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
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
          {showTasks && milestone.tasks.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              {milestone.tasks.length} tarefa{milestone.tasks.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </button>

      {showTasks && isExpanded && tasksForThisMilestone.length > 0 && (
        <div className="bg-gray-50 border-t border-gray-200 p-3 space-y-2">
          {tasksForThisMilestone.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEditTask} />
          ))}
        </div>
      )}
    </div>
  );
}
