import { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { Project, WBSTask } from '../types';
import { getPhaseStatus, getPhaseStatusBadge } from '../utils/phaseStatusCalculator';

interface ProjectTasksKanbanViewProps {
  project: Project;
  allTasks: WBSTask[];
  onEditTask?: (task: WBSTask) => void;
  onUpdateTask?: (taskId: string, updates: Partial<WBSTask>) => void;
}

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { label: string; color: string }> = {
    todo: { label: 'A Fazer', color: 'bg-gray-100 text-gray-700' },
    doing: { label: 'Fazendo', color: 'bg-blue-100 text-blue-700' },
    done: { label: 'Concluído', color: 'bg-green-100 text-green-700' },
  };

  const config = statusConfig[status] || statusConfig.todo;

  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
};

const getPriorityBadge = (priority?: string) => {
  if (!priority) return null;

  const priorityConfig: Record<string, { label: string; color: string }> = {
    low: { label: 'Baixa', color: 'bg-gray-100 text-gray-600' },
    medium: { label: 'Média', color: 'bg-yellow-100 text-yellow-700' },
    high: { label: 'Alta', color: 'bg-red-100 text-red-700' },
  };

  const config = priorityConfig[priority] || priorityConfig.low;

  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
};

export function ProjectTasksKanbanView({
  project,
  allTasks,
  onEditTask,
  onUpdateTask,
}: ProjectTasksKanbanViewProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activePhaseId, setActivePhaseId] = useState<string | null>(null);

  const handleDragStart = (task: WBSTask, e: React.DragEvent<HTMLDivElement>) => {
    setDraggedTaskId(task.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.setData('sourcePhaseId', task.phaseId || '');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (phaseId: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setActivePhaseId(phaseId);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target) {
      setActivePhaseId(null);
    }
  };

  const handleDrop = (targetPhaseId: string, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const sourcePhaseId = e.dataTransfer.getData('sourcePhaseId');

    if (sourcePhaseId !== targetPhaseId && onUpdateTask) {
      onUpdateTask(taskId, { phaseId: targetPhaseId });
    }

    setDraggedTaskId(null);
    setActivePhaseId(null);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setActivePhaseId(null);
  };

  if (!project.phases || project.phases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-gray-500 text-lg font-medium">Sem fases configuradas</p>
        <p className="text-gray-400 text-sm mt-1">
          Configure fases na estrutura do projeto para visualizar tarefas aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto overflow-y-hidden pb-6 h-full">
      <div className="flex gap-6 min-w-min h-full">
        {project.phases.map((phase) => {
          const phaseTasks = allTasks.filter(task => task.phaseId === phase.id);
          const completedTasks = phaseTasks.filter(t => t.status === 'done').length;
          const phaseProgress = phaseTasks.length > 0 ? Math.round((completedTasks / phaseTasks.length) * 100) : 0;
          const phaseStatus = getPhaseStatus(phase.id, allTasks);
          const statusBadge = getPhaseStatusBadge(phaseStatus);

          return (
            <div
              key={phase.id}
              className={`flex-shrink-0 w-96 flex flex-col bg-gray-50 rounded-lg border-2 overflow-hidden transition-all ${
                activePhaseId === phase.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
              onDragEnter={(e) => handleDragEnter(phase.id, e)}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(phase.id, e)}
            >
              {/* Phase Header */}
              <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 flex-shrink-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{phase.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {phaseTasks.length}
                    </span>
                    <span className="text-xs font-medium whitespace-nowrap">
                      {statusBadge.emoji}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  {completedTasks} de {phaseTasks.length} completas
                </p>
                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${phaseProgress}%` }}
                  />
                </div>
              </div>

              {/* Tasks Container */}
              <div className="flex-1 p-4 space-y-3 overflow-y-auto min-h-0">
                {phaseTasks.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <div>
                      <p className="text-gray-400 text-sm font-medium">Sem tarefas</p>
                      <p className="text-gray-300 text-xs mt-1">Arraste tarefas aqui</p>
                    </div>
                  </div>
                ) : (
                  phaseTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(task, e)}
                      onDragEnd={handleDragEnd}
                      className={`bg-white border border-gray-200 rounded-lg p-3 transition-all cursor-grab active:cursor-grabbing ${
                        draggedTaskId === task.id
                          ? 'opacity-50 border-gray-300'
                          : 'hover:shadow-md'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-3 pb-2 border-b border-gray-100">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-gray-900 line-clamp-2 break-words">
                            {task.title}
                          </h4>
                        </div>
                        {onEditTask && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onEditTask(task);
                            }}
                            className="text-gray-400 hover:text-blue-600 flex-shrink-0 p-1 hover:bg-blue-50 rounded transition-colors"
                            title="Editar tarefa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {getStatusBadge(task.status)}
                        {getPriorityBadge(task.priority)}
                      </div>

                      {/* Task Info */}
                      <div className="space-y-2 text-xs text-gray-600">
                        {task.assignee && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">👤</span>
                            <span className="truncate">{task.assignee}</span>
                          </div>
                        )}
                        {task.dueDate && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">📅</span>
                            <span>
                              {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        )}
                        {task.milestoneId && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">🎯</span>
                            <span className="truncate text-blue-600 font-medium">
                              {task.milestoneId}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
