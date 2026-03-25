import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FolderKanban,
  Flag,
  CheckSquare,
  Square,
  GripVertical,
  Plus,
  MoreVertical,
  Circle,
} from 'lucide-react';
import { Phase, Milestone, WBSTask, Subtask } from '../types';

interface WBSTreeProps {
  phases: Phase[];
  projectId: string;
  onAddPhase?: () => void;
  onAddMilestone?: (phaseId: string) => void;
  onAddTask?: (milestoneId: string) => void;
  onAddSubtask?: (taskId: string) => void;
}

export function WBSTree({
  phases,
  projectId,
  onAddPhase,
  onAddMilestone,
  onAddTask,
  onAddSubtask,
}: WBSTreeProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const togglePhase = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const toggleMilestone = (milestoneId: string) => {
    const newExpanded = new Set(expandedMilestones);
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId);
    } else {
      newExpanded.add(milestoneId);
    }
    setExpandedMilestones(newExpanded);
  };

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'text-green-600 bg-green-50';
      case 'doing':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'in-progress':
        return 'text-blue-600';
      case 'delayed':
        return 'text-red-600';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Estrutura Analítica do Projeto (WBS)</h3>
        {onAddPhase && (
          <button
            onClick={onAddPhase}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar Fase
          </button>
        )}
      </div>

      <div className="p-4">
        {phases.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FolderKanban className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhuma fase cadastrada</p>
            <p className="text-sm mt-1">Clique em "Adicionar Fase" para começar</p>
          </div>
        ) : (
          <div className="space-y-1">
            {phases.map((phase) => (
              <div key={phase.id}>
                {/* Phase Level */}
                <div className="group">
                  <div className="flex items-center gap-2 py-2 px-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <button
                      onClick={() => togglePhase(phase.id)}
                      className="p-0.5 hover:bg-gray-200 rounded"
                    >
                      {expandedPhases.has(phase.id) ? (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    <GripVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: phase.color }}
                    />
                    <FolderKanban className="w-4 h-4 text-gray-600" />
                    <span className="flex-1 font-medium text-gray-900">{phase.name}</span>
                    <span className="text-xs text-gray-500">
                      {phase.milestones.length} marcos
                    </span>
                    {onAddMilestone && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddMilestone(phase.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
                      >
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                    )}
                    <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded">
                      <MoreVertical className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Milestones */}
                {expandedPhases.has(phase.id) && (
                  <div className="ml-6 border-l-2 border-gray-200">
                    {phase.milestones.map((milestone) => (
                      <div key={milestone.id}>
                        {/* Milestone Level */}
                        <div className="group">
                          <div className="flex items-center gap-2 py-2 px-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                            <button
                              onClick={() => toggleMilestone(milestone.id)}
                              className="p-0.5 hover:bg-gray-200 rounded"
                            >
                              {expandedMilestones.has(milestone.id) ? (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                              )}
                            </button>
                            <GripVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                            <Flag className={`w-4 h-4 ${getMilestoneStatusColor(milestone.status)}`} />
                            <span className="flex-1 text-gray-900">{milestone.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                              {milestone.type}
                            </span>
                            <span className="text-xs text-gray-500">
                              {milestone.tasks.length} tarefas
                            </span>
                            {onAddTask && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddTask(milestone.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
                              >
                                <Plus className="w-4 h-4 text-gray-600" />
                              </button>
                            )}
                            <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded">
                              <MoreVertical className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </div>

                        {/* Tasks */}
                        {expandedMilestones.has(milestone.id) && (
                          <div className="ml-6 border-l-2 border-gray-200">
                            {milestone.tasks.map((task) => (
                              <div key={task.id}>
                                {/* Task Level */}
                                <div className="group">
                                  <div className="flex items-center gap-2 py-2 px-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                    <button
                                      onClick={() => toggleTask(task.id)}
                                      className="p-0.5 hover:bg-gray-200 rounded"
                                    >
                                      {expandedTasks.has(task.id) ? (
                                        <ChevronDown className="w-4 h-4 text-gray-600" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-600" />
                                      )}
                                    </button>
                                    <GripVertical className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" />
                                    {task.status === 'done' ? (
                                      <CheckSquare className="w-4 h-4 text-green-600" />
                                    ) : (
                                      <Square className="w-4 h-4 text-gray-400" />
                                    )}
                                    <span className="flex-1 text-gray-800 text-sm">
                                      {task.title}
                                    </span>
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full ${getTaskStatusColor(
                                        task.status
                                      )}`}
                                    >
                                      {task.status === 'todo' && 'A fazer'}
                                      {task.status === 'doing' && 'Fazendo'}
                                      {task.status === 'done' && 'Concluído'}
                                    </span>
                                    {task.assignee && (
                                      <span className="text-xs text-gray-500">
                                        {task.assignee}
                                      </span>
                                    )}
                                    {onAddSubtask && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onAddSubtask(task.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
                                      >
                                        <Plus className="w-4 h-4 text-gray-600" />
                                      </button>
                                    )}
                                    <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded">
                                      <MoreVertical className="w-4 h-4 text-gray-600" />
                                    </button>
                                  </div>
                                </div>

                                {/* Subtasks */}
                                {expandedTasks.has(task.id) && task.subtasks.length > 0 && (
                                  <div className="ml-6 border-l-2 border-gray-100">
                                    {task.subtasks.map((subtask) => (
                                      <div key={subtask.id} className="group">
                                        <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                                          <GripVertical className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100" />
                                          <Circle
                                            className={`w-3 h-3 ${
                                              subtask.completed
                                                ? 'text-green-500 fill-green-500'
                                                : 'text-gray-300'
                                            }`}
                                          />
                                          <span
                                            className={`flex-1 text-sm ${
                                              subtask.completed
                                                ? 'text-gray-400 line-through'
                                                : 'text-gray-700'
                                            }`}
                                          >
                                            {subtask.title}
                                          </span>
                                          {subtask.assignee && (
                                            <span className="text-xs text-gray-400">
                                              {subtask.assignee}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
