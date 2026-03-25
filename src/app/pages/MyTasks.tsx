import { useState } from 'react';
import { CheckSquare, Clock, Calendar, AlertCircle, Filter, Plus } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import { WBSTask } from '../types';
import { TaskDetailPanel } from '../components/TaskDetailPanel';

export function MyTasks() {
  const { projects } = useProjects();
  const [filterStatus, setFilterStatus] = useState<'all' | 'todo' | 'doing' | 'done'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedTask, setSelectedTask] = useState<(WBSTask & { projectName: string; phaseName: string; milestoneName: string }) | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);

  // Flatten all tasks from all projects
  const allTasks: Array<WBSTask & { projectName: string; phaseName: string; milestoneName: string }> = [];
  
  projects.forEach(project => {
    if (project.phases) {
      project.phases.forEach(phase => {
        phase.milestones.forEach(milestone => {
          milestone.tasks.forEach(task => {
            // Filter by current user (mock - would use actual auth)
            if (task.assignee === 'Guilherme Drehmer' || task.assignee === 'João Silva') {
              allTasks.push({
                ...task,
                projectName: project.name,
                phaseName: phase.name,
                milestoneName: milestone.name,
              });
            }
          });
        });
      });
    }
  });

  // Apply filters
  const filteredTasks = allTasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    return true;
  });

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-700';
      case 'doing':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleTaskClick = (task: typeof allTasks[0]) => {
    setSelectedTask(task);
    setIsDetailPanelOpen(true);
  };

  const stats = {
    total: allTasks.length,
    todo: allTasks.filter(t => t.status === 'todo').length,
    doing: allTasks.filter(t => t.status === 'doing').length,
    done: allTasks.filter(t => t.status === 'done').length,
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Minhas Tarefas</h1>
          <p className="text-gray-600">Gerencie todas as suas tarefas atribuídas</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" />
          Nova Tarefa
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <CheckSquare className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">A Fazer</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todo}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Fazendo</p>
              <p className="text-2xl font-bold text-blue-600">{stats.doing}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Concluídas</p>
              <p className="text-2xl font-bold text-green-600">{stats.done}</p>
            </div>
            <CheckSquare className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os status</option>
            <option value="todo">A Fazer</option>
            <option value="doing">Fazendo</option>
            <option value="done">Concluído</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as any)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas as prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <CheckSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma tarefa encontrada
            </h3>
            <p className="text-gray-500">
              Você não possui tarefas com os filtros selecionados
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const completedSubtasks = task.subtasks.filter(st => st.completed).length;
            const totalSubtasks = task.subtasks.length;

            return (
              <div
                key={task.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleTaskClick(task)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{task.title}</h3>
                      {task.priority && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority === 'high' && 'Alta'}
                          {task.priority === 'medium' && 'Média'}
                          {task.priority === 'low' && 'Baixa'}
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="font-medium text-gray-700">{task.projectName}</span>
                      <span>•</span>
                      <span>{task.phaseName}</span>
                      <span>•</span>
                      <span>{task.milestoneName}</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                    {task.status === 'todo' && 'A Fazer'}
                    {task.status === 'doing' && 'Fazendo'}
                    {task.status === 'done' && 'Concluído'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {task.dueDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>
                      </div>
                    )}
                    {task.estimatedHours && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>{task.estimatedHours}h</span>
                      </div>
                    )}
                    {totalSubtasks > 0 && (
                      <div className="flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4" />
                        <span>{completedSubtasks}/{totalSubtasks} subtarefas</span>
                      </div>
                    )}
                  </div>
                  <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium">
                    Ver Detalhes
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Task Detail Panel */}
      <TaskDetailPanel
        isOpen={isDetailPanelOpen}
        onClose={() => setIsDetailPanelOpen(false)}
        task={selectedTask}
      />
    </div>
  );
}