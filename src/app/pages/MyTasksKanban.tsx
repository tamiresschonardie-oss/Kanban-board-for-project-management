import { useState, useMemo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Plus,
  Filter,
  Clock,
  CheckSquare,
  Flag,
  Calendar,
  Tag,
  BarChart3,
  List,
  LayoutGrid,
  User,
  AlertCircle,
  TrendingUp,
  Play,
  Pause
} from 'lucide-react';
import { useTasks, EnrichedTask } from '../context/TaskContext';
import { TaskDetailPanelAdvanced } from '../components/TaskDetailPanelAdvanced';
import { TaskModal } from '../components/TaskModal';
import { TaskStatus } from '../types';

type ViewMode = 'kanban' | 'list' | 'dashboard';

const KANBAN_COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'Backlog', color: 'bg-gray-100 border-gray-300' },
  { id: 'doing', label: 'Em Progresso', color: 'bg-blue-100 border-blue-300' },
  { id: 'done', label: 'Concluído', color: 'bg-green-100 border-green-300' },
];

interface DraggableTaskCardProps {
  task: EnrichedTask;
  onClick: () => void;
}

function DraggableTaskCard({ task, onClick }: DraggableTaskCardProps) {
  const { updateTask, startTimeTracking, stopTimeTracking } = useTasks();
  
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TASK',
    item: { id: task.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const totalSubtasks = task.subtasks.length;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-green-500 bg-green-50';
      default:
        return 'border-l-gray-300 bg-white';
    }
  };

  const isLate = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  const handleTimeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.isTracking) {
      stopTimeTracking(task.id);
    } else {
      startTimeTracking(task.id);
    }
  };

  return (
    <div
      ref={drag}
      onClick={onClick}
      className={`border-l-4 rounded-lg p-4 mb-3 cursor-pointer hover:shadow-md transition-all ${getPriorityColor(task.priority)} ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-gray-900 text-sm flex-1 pr-2">{task.title}</h4>
        {task.priority && (
          <Flag className={`w-4 h-4 flex-shrink-0 ${
            task.priority === 'high' ? 'text-red-500' :
            task.priority === 'medium' ? 'text-yellow-500' :
            'text-green-500'
          }`} />
        )}
      </div>

      {/* Project Reference */}
      {task.projectName && (
        <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{task.projectName}</span>
          {task.milestoneName && (
            <span className="text-gray-500">• {task.milestoneName}</span>
          )}
        </div>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.map((tag, idx) => (
            <span key={idx} className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Progress Bar */}
      {totalSubtasks > 0 && (
        <div className="mb-2">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {completedSubtasks}/{totalSubtasks} subtarefas
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div className="flex items-center gap-3 text-xs text-gray-600">
          {task.dueDate && (
            <div className={`flex items-center gap-1 ${isLate ? 'text-red-600 font-medium' : ''}`}>
              <Calendar className="w-3 h-3" />
              <span>{new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>
            </div>
          )}
          {(task.estimatedHours || task.actualHours) && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{task.actualHours || 0}h/{task.estimatedHours || 0}h</span>
            </div>
          )}
        </div>

        {/* Time Tracking Button */}
        <button
          onClick={handleTimeToggle}
          className={`p-1.5 rounded transition-colors ${
            task.isTracking
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }`}
          title={task.isTracking ? 'Pausar cronômetro' : 'Iniciar cronômetro'}
        >
          {task.isTracking ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </button>
      </div>

      {/* Late indicator */}
      {isLate && (
        <div className="mt-2 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="w-3 h-3" />
          <span>Atrasada</span>
        </div>
      )}
    </div>
  );
}

interface KanbanColumnProps {
  column: { id: TaskStatus; label: string; color: string };
  tasks: EnrichedTask[];
  onTaskClick: (task: EnrichedTask) => void;
  onDrop: (taskId: string, newStatus: TaskStatus) => void;
}

function KanbanColumn({ column, tasks, onTaskClick, onDrop }: KanbanColumnProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'TASK',
    drop: (item: { id: string }) => {
      onDrop(item.id, column.id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }));

  return (
    <div className="flex-shrink-0 w-80">
      <div className={`rounded-lg px-4 py-2 mb-4 border-2 ${column.color}`}>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-900">{column.label}</span>
          <span className="bg-white px-2 py-0.5 rounded text-sm font-medium">{tasks.length}</span>
        </div>
      </div>
      <div
        ref={drop}
        className={`min-h-[500px] ${isOver ? 'bg-blue-50 rounded-lg p-2' : ''}`}
      >
        {tasks.map((task) => (
          <DraggableTaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            Nenhuma tarefa
          </div>
        )}
      </div>
    </div>
  );
}

export function MyTasksKanban() {
  const { allTasks, updateTask, addIndependentTask } = useTasks();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedTask, setSelectedTask] = useState<EnrichedTask | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // Filters
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');

  // Get current user tasks (mock - would use actual auth)
  const myTasks = allTasks.filter(
    (task) => task.assignee === 'Guilherme Drehmer' || task.assignee === 'João Silva'
  );

  // Apply filters
  const filteredTasks = useMemo(() => {
    return myTasks.filter((task) => {
      if (filterProject !== 'all' && task.projectName !== filterProject) return false;
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
      if (filterStatus !== 'all' && task.status !== filterStatus) return false;
      if (filterTag !== 'all' && !task.tags?.includes(filterTag)) return false;
      return true;
    });
  }, [myTasks, filterProject, filterPriority, filterStatus, filterTag]);

  // Get unique values for filters
  const uniqueProjects = Array.from(new Set(myTasks.map(t => t.projectName).filter(Boolean))) as string[];
  const uniqueTags = Array.from(new Set(myTasks.flatMap(t => t.tags || [])));

  // Stats
  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const todo = filteredTasks.filter(t => t.status === 'todo').length;
    const doing = filteredTasks.filter(t => t.status === 'doing').length;
    const done = filteredTasks.filter(t => t.status === 'done').length;
    const late = filteredTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    ).length;
    const totalTime = filteredTasks.reduce((acc, t) => acc + (t.actualHours || 0), 0);

    return { total, todo, doing, done, late, totalTime };
  }, [filteredTasks]);

  const handleTaskClick = (task: EnrichedTask) => {
    setSelectedTask(task);
    setIsDetailPanelOpen(true);
  };

  const handleDrop = (taskId: string, newStatus: TaskStatus) => {
    updateTask(taskId, { status: newStatus });
  };

  const tasksByStatus = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    doing: filteredTasks.filter(t => t.status === 'doing'),
    done: filteredTasks.filter(t => t.status === 'done'),
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Minhas Tarefas</h1>
          <p className="text-gray-600">Gerencie seu fluxo de trabalho pessoal</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('dashboard')}
              className={`px-3 py-1.5 rounded transition-colors ${
                viewMode === 'dashboard'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setIsCreatingTask(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Tarefa
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
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
              <p className="text-sm text-gray-600 mb-1">Backlog</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todo}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Em Progresso</p>
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
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Atrasadas</p>
              <p className="text-2xl font-bold text-red-600">{stats.late}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Tempo Total</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalTime}h</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Filter className="w-5 h-5 text-gray-500" />
          
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos os projetos</option>
            {uniqueProjects.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas as prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>

          {viewMode !== 'kanban' && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os status</option>
              <option value="todo">Backlog</option>
              <option value="doing">Em Progresso</option>
              <option value="done">Concluído</option>
            </select>
          )}

          {uniqueTags.length > 0 && (
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas as tags</option>
              {uniqueTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Content by View Mode */}
      {viewMode === 'kanban' && (
        <DndProvider backend={HTML5Backend}>
          <div className="flex gap-6 overflow-x-auto pb-8">
            {KANBAN_COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={tasksByStatus[column.id]}
                onTaskClick={handleTaskClick}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </DndProvider>
      )}

      {viewMode === 'list' && (
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
              const isLate = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

              return (
                <div
                  key={task.id}
                  onClick={() => handleTaskClick(task)}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{task.title}</h3>
                        {task.priority && (
                          <Flag className={`w-4 h-4 ${
                            task.priority === 'high' ? 'text-red-500' :
                            task.priority === 'medium' ? 'text-yellow-500' :
                            'text-green-500'
                          }`} />
                        )}
                        {isLate && (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                            Atrasada
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                      )}
                      {task.projectName && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="font-medium text-blue-600">{task.projectName}</span>
                          {task.milestoneName && (
                            <>
                              <span>•</span>
                              <span>{task.milestoneName}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        task.status === 'done'
                          ? 'bg-green-100 text-green-700'
                          : task.status === 'doing'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {task.status === 'todo' && 'Backlog'}
                      {task.status === 'doing' && 'Em Progresso'}
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
                          <span>{task.actualHours || 0}h/{task.estimatedHours}h</span>
                        </div>
                      )}
                      {totalSubtasks > 0 && (
                        <div className="flex items-center gap-1.5">
                          <CheckSquare className="w-4 h-4" />
                          <span>{completedSubtasks}/{totalSubtasks} subtarefas</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {viewMode === 'dashboard' && (
        <TaskDashboard tasks={filteredTasks} />
      )}

      {/* Task Detail Panel */}
      <TaskDetailPanelAdvanced
        isOpen={isDetailPanelOpen}
        onClose={() => setIsDetailPanelOpen(false)}
        task={selectedTask}
      />

      {/* Create Task Modal */}
      {isCreatingTask && (
        <TaskModal
          isOpen={isCreatingTask}
          onClose={() => setIsCreatingTask(false)}
        />
      )}
    </div>
  );
}

// Dashboard Component
function TaskDashboard({ tasks }: { tasks: EnrichedTask[] }) {
  const statsByStatus = {
    todo: tasks.filter(t => t.status === 'todo').length,
    doing: tasks.filter(t => t.status === 'doing').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  const statsByPriority = {
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length,
  };

  const tasksByProject = tasks.reduce((acc, task) => {
    const projectName = task.projectName || 'Independente';
    acc[projectName] = (acc[projectName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const lateTasks = tasks.filter(
    t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Tasks by Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Tarefas por Status
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Backlog</span>
            <div className="flex items-center gap-3">
              <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-600"
                  style={{ width: `${(statsByStatus.todo / tasks.length) * 100}%` }}
                />
              </div>
              <span className="font-semibold text-gray-900 w-8 text-right">{statsByStatus.todo}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Em Progresso</span>
            <div className="flex items-center gap-3">
              <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${(statsByStatus.doing / tasks.length) * 100}%` }}
                />
              </div>
              <span className="font-semibold text-blue-600 w-8 text-right">{statsByStatus.doing}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Concluído</span>
            <div className="flex items-center gap-3">
              <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600"
                  style={{ width: `${(statsByStatus.done / tasks.length) * 100}%` }}
                />
              </div>
              <span className="font-semibold text-green-600 w-8 text-right">{statsByStatus.done}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks by Priority */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Flag className="w-5 h-5" />
          Tarefas por Prioridade
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Alta</span>
            <div className="flex items-center gap-3">
              <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600"
                  style={{ width: `${(statsByPriority.high / tasks.length) * 100}%` }}
                />
              </div>
              <span className="font-semibold text-red-600 w-8 text-right">{statsByPriority.high}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Média</span>
            <div className="flex items-center gap-3">
              <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-600"
                  style={{ width: `${(statsByPriority.medium / tasks.length) * 100}%` }}
                />
              </div>
              <span className="font-semibold text-yellow-600 w-8 text-right">{statsByPriority.medium}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Baixa</span>
            <div className="flex items-center gap-3">
              <div className="w-48 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600"
                  style={{ width: `${(statsByPriority.low / tasks.length) * 100}%` }}
                />
              </div>
              <span className="font-semibold text-green-600 w-8 text-right">{statsByPriority.low}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks by Project */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Tarefas por Projeto
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {Object.entries(tasksByProject)
            .sort(([, a], [, b]) => b - a)
            .map(([project, count]) => (
              <div key={project} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600 truncate flex-1">{project}</span>
                <span className="font-semibold text-gray-900 ml-4">{count}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Late Tasks */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          Tarefas Atrasadas ({lateTasks.length})
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {lateTasks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Nenhuma tarefa atrasada! 🎉
            </p>
          ) : (
            lateTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                  <p className="text-xs text-gray-500">{task.projectName || 'Independente'}</p>
                </div>
                <div className="text-xs text-red-600 ml-4">
                  {task.dueDate && new Date(task.dueDate).toLocaleDateString('pt-BR')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}