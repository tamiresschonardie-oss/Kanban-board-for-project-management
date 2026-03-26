import { Project, WBSTask } from '../types';

interface ProjectTasksKanbanViewProps {
  project: Project;
  allTasks: WBSTask[];
  onEditTask?: (task: WBSTask) => void;
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

export function ProjectTasksKanbanView({
  project,
  allTasks,
  onEditTask,
}: ProjectTasksKanbanViewProps) {
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
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 overflow-x-auto pb-6">
      {project.phases.map((phase) => {
        const phaseTasks = allTasks.filter(task => task.phaseId === phase.id);

        return (
          <div
            key={phase.id}
            className="flex flex-col bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
          >
            {/* Phase Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900">{phase.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {phaseTasks.length} tarefa{phaseTasks.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Tasks Container */}
            <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[600px]">
              {phaseTasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">Sem tarefas nesta fase</p>
                </div>
              ) : (
                phaseTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onEditTask?.(task)}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-sm text-gray-900 flex-1">
                        {task.title}
                      </h4>
                      {onEditTask && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTask(task);
                          }}
                          className="text-gray-400 hover:text-blue-600 text-xs px-1 py-1"
                        >
                          ⚙️
                        </button>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(task.status)}
                    </div>

                    {/* Task Info */}
                    <div className="text-xs text-gray-600 space-y-1">
                      {task.assignee && (
                        <p>
                          <span className="font-medium">Responsável:</span> {task.assignee}
                        </p>
                      )}
                      {task.dueDate && (
                        <p>
                          <span className="font-medium">Prazo:</span>{' '}
                          {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {task.priority && (
                        <p>
                          <span className="font-medium">Prioridade:</span>{' '}
                          <span className="capitalize">{task.priority}</span>
                        </p>
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
  );
}
