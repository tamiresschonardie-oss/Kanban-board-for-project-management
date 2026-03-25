import { ChevronDown, ChevronRight } from 'lucide-react';
import { Phase, WBSTask } from '../types';
import { MilestoneCard } from './MilestoneCard';

interface PhaseCardProps {
  phase: Phase;
  tasks: WBSTask[];
  phaseProgress?: number;
  isExpanded: boolean;
  onToggle: () => void;
  expandedMilestones: Set<string>;
  onToggleMilestone: (milestoneId: string) => void;
  onEditTask?: (task: any) => void;
}

export function PhaseCard({
  phase,
  tasks,
  phaseProgress = 0,
  isExpanded,
  onToggle,
  expandedMilestones,
  onToggleMilestone,
  onEditTask,
}: PhaseCardProps) {
  // Tasks sem marco específico
  const tasksWithoutMilestone = tasks.filter(t => !t.milestoneId);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="mt-0.5 text-gray-400 flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-900">{phase.name}</h3>
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{phaseProgress}%</span>
          </div>
          {phase.description && (
            <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
          )}
          <div className="mt-2 space-y-1">
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${phaseProgress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              {phase.milestones.length} marco{phase.milestones.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="bg-gray-50 border-t border-gray-200 p-4 space-y-2">
          {/* Milestones with tasks */}
          {phase.milestones.map((milestone) => {
            const milestoneTasks = tasks.filter(t => t.milestoneId === milestone.id);
            return (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                tasks={milestoneTasks}
                isExpanded={expandedMilestones.has(milestone.id)}
                onToggle={() => onToggleMilestone(milestone.id)}
                showTasks={true}
                onEditTask={onEditTask}
              />
            );
          })}

          {/* Tasks without milestone */}
          {tasksWithoutMilestone.length > 0 && (
            <div className="border border-gray-200 rounded p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">Tarefas da Fase (sem marco específico)</div>
              <div className="space-y-1">
                {tasksWithoutMilestone.map((task) => (
                  <div key={task.id} className="text-xs p-2 bg-white border border-gray-100 rounded flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{task.title}</p>
                      <p className="text-gray-500">{task.assignee}</p>
                    </div>
                    {onEditTask && (
                      <button
                        onClick={() => onEditTask(task)}
                        className="ml-2 text-gray-500 hover:text-blue-600 text-xs px-2 py-1"
                      >
                        ⚙️
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
