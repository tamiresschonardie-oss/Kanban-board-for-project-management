import { ChevronDown, ChevronRight, Edit2 } from 'lucide-react';
import { useDrop } from 'react-dnd';
import { Phase, WBSTask } from '../types';
import { useTasks } from '../context/TaskContext';
import { getPhaseStatusBadge, PhaseStatus } from '../utils/phaseStatusCalculator';
import { MilestoneCard } from './MilestoneCard';
import { TaskCardWithDropZone } from './TaskCardWithDropZone';

interface PhaseCardProps {
  projectId?: string;
  phase: Phase;
  tasks: WBSTask[];
  phaseProgress?: number;
  phaseStatus?: PhaseStatus;
  isExpanded: boolean;
  onToggle: () => void;
  expandedMilestones: Set<string>;
  onToggleMilestone: (milestoneId: string) => void;
  onEditTask?: (task: any) => void;
  onEditPhase?: () => void;
}

export function PhaseCard({
  projectId,
  phase,
  tasks,
  phaseProgress = 0,
  phaseStatus = 'não-iniciado',
  isExpanded,
  onToggle,
  expandedMilestones,
  onToggleMilestone,
  onEditTask,
  onEditPhase,
}: PhaseCardProps) {
  const { moveTaskInGroup } = useTasks();

  // Tasks sem marco específico
  const tasksWithoutMilestone = tasks.filter(t => !t.milestoneId).sort((a, b) => (a.order || 0) - (b.order || 0));
  const statusBadge = getPhaseStatusBadge(phaseStatus);

  // Drop zone para reordenar tasks
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'REORDER_TASK',
    drop: (item: { taskId: string }, monitor) => {
      if (!projectId) return;
      // O drop é tratado no TaskCard drop target específico (por índice)
      return { phaseId: phase.id, milestoneId: undefined };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [projectId, phase.id]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors text-left cursor-pointer"
      >
        <div className="mt-0.5 text-gray-400 flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-semibold text-gray-900">{phase.name}</h3>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
              {onEditPhase && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEditPhase();
                  }}
                  className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                  title="Editar cronograma da fase"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-medium">
              {tasks.length} tarefas
            </span>
            <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">
              {tasks.filter(t => t.status === 'done').length}✓
            </span>
            <span className="text-xs font-medium whitespace-nowrap">
              {statusBadge.emoji} {statusBadge.label}
            </span>
            <span className="text-sm font-medium text-gray-700 ml-auto">{phaseProgress}%</span>
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
          </div>
        </div>
      </div>

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
            <div ref={drop} className={`border border-gray-200 rounded p-3 ${isOver ? 'bg-blue-50' : ''}`}>
              <div className="text-sm font-medium text-gray-700 mb-2">Tarefas da Fase (sem marco específico)</div>
              <div className="space-y-1">
                {tasksWithoutMilestone.map((task, index) => (
                  <TaskCardWithDropZone
                    key={task.id}
                    task={task}
                    index={index}
                    totalTasks={tasksWithoutMilestone.length}
                    projectId={projectId}
                    phaseId={phase.id}
                    milestoneId={undefined}
                    allTasks={tasksWithoutMilestone}
                    onUpdateOrder={() => {}} // Trigger re-render via TaskContext
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
