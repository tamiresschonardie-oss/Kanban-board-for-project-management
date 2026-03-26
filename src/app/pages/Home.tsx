import { useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, AlertCircle, Calendar, ArrowRight, Plus, FolderKanban, Bell, Filter, X, CheckSquare } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';
import { useAdmin } from '../context/AdminContext';
import { useLoadTestData } from '../hooks/useLoadTestData';
import { WBSTask } from '../types';
import { TaskDetailPanel } from '../components/TaskDetailPanel';
import { TaskModal } from '../components/TaskModal';

export function Home() {
  const navigate = useNavigate();
  const { projects } = useProjects();
  const { teams, notifications, markNotificationAsRead } = useAdmin();
  const { loadTestData } = useLoadTestData();
  
  const [selectedTask, setSelectedTask] = useState<(WBSTask & { projectName: string; phaseName: string; milestoneName: string }) | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [filterDate, setFilterDate] = useState<'all' | 'today' | 'week' | 'overdue'>('all');
  const [filterProject, setFilterProject] = useState<string>('all');

  // Mock current user - in real app, would come from auth
  const currentUser = {
    name: 'Guilherme Drehmer',
    firstName: 'Guilherme',
  };

  const today = new Date();
  const todayFormatted = today.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  // Flatten all tasks
  const allTasks: Array<WBSTask & { projectName: string; phaseName: string; milestoneName: string }> = [];
  projects.forEach((project) => {
    if (project.phases) {
      project.phases.forEach((phase) => {
        phase.milestones.forEach((milestone) => {
          milestone.tasks.forEach((task) => {
            if (task.assignee === currentUser.name) {
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
  const filteredTasks = allTasks.filter((task) => {
    // Filter by date
    if (filterDate === 'today') {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      if (
        dueDate.getDate() !== today.getDate() ||
        dueDate.getMonth() !== today.getMonth() ||
        dueDate.getFullYear() !== today.getFullYear()
      ) {
        return false;
      }
    } else if (filterDate === 'week') {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      if (dueDate < today || dueDate > weekFromNow) return false;
    } else if (filterDate === 'overdue') {
      if (!task.dueDate || task.status === 'done') return false;
      if (new Date(task.dueDate) >= today) return false;
    }

    // Filter by project
    if (filterProject !== 'all' && task.projectName !== filterProject) {
      return false;
    }

    return true;
  });

  // Calculate stats
  const stats = {
    completed: allTasks.filter((t) => t.status === 'done').length,
    overdue: allTasks.filter((t) => {
      if (!t.dueDate || t.status === 'done') return false;
      return new Date(t.dueDate) < today;
    }).length,
    today: allTasks.filter((t) => {
      if (!t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      return (
        dueDate.getDate() === today.getDate() &&
        dueDate.getMonth() === today.getMonth() &&
        dueDate.getFullYear() === today.getFullYear()
      );
    }).length,
    upcoming: allTasks.filter((t) => {
      if (!t.dueDate || t.status === 'done') return false;
      const dueDate = new Date(t.dueDate);
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return dueDate > today && dueDate <= weekFromNow;
    }).length,
  };

  const handleTaskClick = (task: typeof allTasks[0]) => {
    setSelectedTask(task);
    setIsDetailPanelOpen(true);
  };

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

  // Unique projects for filter
  const uniqueProjects = Array.from(new Set(allTasks.map((t) => t.projectName)));

  // Unread notifications count
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Olá, {currentUser.firstName}!
            </h1>
            <p className="text-gray-600 capitalize">{todayFormatted}</p>
          </div>
          
          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-3 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-6 h-6 text-gray-700" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Panel */}
            {showNotifications && (
              <div className="absolute right-0 top-14 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Notificações</h3>
                  <button onClick={() => setShowNotifications(false)}>
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p>Nenhuma notificação</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-gray-50 cursor-pointer ${
                            !notification.read ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => markNotificationAsRead(notification.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-2">
                                {new Date(notification.timestamp).toLocaleString('pt-BR')}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">EXECUTADAS</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.completed}</p>
            <p className="text-sm text-gray-500 mt-1">Esta semana</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">ATRASADAS</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.overdue}</p>
            <p className="text-sm text-gray-500 mt-1">Requer atenção</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">HOJE</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.today}</p>
            <p className="text-sm text-gray-500 mt-1">Para concluir</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-600">PRÓXIMAS</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.upcoming}</p>
            <p className="text-sm text-gray-500 mt-1">Esta semana</p>
          </div>
        </div>

        {/* Main Content: Tasks and Flows */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Minhas Tarefas - 2/3 width */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Minhas Tarefas</h2>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigate('/my-tasks')}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 font-medium"
                >
                  IR PARA LÁ
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsTaskModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Nova Tarefa
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Filter className="w-5 h-5 text-gray-500" />
                
                <select
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas as datas</option>
                  <option value="today">Hoje</option>
                  <option value="week">Esta semana</option>
                  <option value="overdue">Atrasadas</option>
                </select>

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

                {(filterDate !== 'all' || filterProject !== 'all') && (
                  <button
                    onClick={() => {
                      setFilterDate('all');
                      setFilterProject('all');
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Tasks List */}
            <div className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <CheckCircle2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nenhuma tarefa encontrada
                  </h3>
                  <p className="text-gray-500">
                    {filterDate !== 'all' || filterProject !== 'all'
                      ? 'Ajuste os filtros para ver mais tarefas'
                      : 'Você não possui tarefas pendentes'}
                  </p>
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const completedSubtasks = task.subtasks.filter((st) => st.completed).length;
                  const totalSubtasks = task.subtasks.length;

                  return (
                    <div
                      key={task.id}
                      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{task.title}</h3>
                            {task.priority && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getPriorityColor(
                                  task.priority
                                )}`}
                              >
                                {task.priority === 'high' && 'Alta'}
                                {task.priority === 'medium' && 'Média'}
                                {task.priority === 'low' && 'Baixa'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="font-medium text-gray-700">{task.projectName}</span>
                            <span>•</span>
                            <span>{task.milestoneName}</span>
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            task.status
                          )}`}
                        >
                          {task.status === 'todo' && 'A Fazer'}
                          {task.status === 'doing' && 'Fazendo'}
                          {task.status === 'done' && 'Concluído'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {task.dueDate && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(task.dueDate).toLocaleDateString('pt-BR')}</span>
                          </div>
                        )}
                        {totalSubtasks > 0 && (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              {completedSubtasks}/{totalSubtasks}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Meus Fluxos - 1/3 width */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Meus Fluxos</h2>
            </div>

            <div className="space-y-3">
              {/* Workspaces */}
              {teams.slice(0, 3).map((team) => {
                const teamProjects = projects.filter((p) => p.group === team.name);
                return (
                  <div
                    key={team.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/workspace/${team.name}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: team.color }}
                      >
                        <FolderKanban className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{team.name} - Tarefas</p>
                        <p className="text-sm text-gray-500">{teamProjects.length} Cards</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Task Detail Panel */}
      <TaskDetailPanel
        isOpen={isDetailPanelOpen}
        onClose={() => setIsDetailPanelOpen(false)}
        task={selectedTask}
      />

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
      />

      {/* Test Data Button - Temporary (can be removed) */}
      <button
        onClick={loadTestData}
        className="fixed bottom-4 right-4 bg-yellow-400 hover:bg-yellow-500 text-black px-3 py-2 rounded text-xs font-medium shadow-lg transition-colors z-50"
        title="Carrega projeto de teste com Gantt e tasks para validação"
      >
        🧪 Carregar Dados Teste
      </button>
    </div>
  );
}