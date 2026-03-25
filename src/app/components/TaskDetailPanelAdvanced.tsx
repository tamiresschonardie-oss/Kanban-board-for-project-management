import { useState } from 'react';
import {
  X,
  Calendar,
  User,
  Flag,
  ChevronRight,
  Circle,
  CheckCircle2,
  MessageSquare,
  Paperclip,
  Clock,
  Play,
  Pause,
  Plus,
  Trash2,
  History,
  Edit2,
  Save,
} from 'lucide-react';
import { useTasks, EnrichedTask } from '../context/TaskContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';

interface TaskDetailPanelAdvancedProps {
  isOpen: boolean;
  onClose: () => void;
  task: EnrichedTask | null;
}

export function TaskDetailPanelAdvanced({ isOpen, onClose, task }: TaskDetailPanelAdvancedProps) {
  const {
    updateTask,
    toggleSubtaskCompletion,
    addComment,
    startTimeTracking,
    stopTimeTracking,
  } = useTasks();

  const [commentText, setCommentText] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  if (!isOpen || !task) return null;

  const handleStatusChange = (newStatus: 'todo' | 'doing' | 'done') => {
    updateTask(task.id, { status: newStatus });
  };

  const handlePriorityChange = (newPriority: 'low' | 'medium' | 'high') => {
    updateTask(task.id, { priority: newPriority });
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;

    const newComment = {
      id: `comment-${Date.now()}`,
      userId: 'current-user',
      userName: task.assignee || 'Usuário',
      content: commentText,
      timestamp: new Date().toISOString(),
    };

    addComment(task.id, newComment);
    setCommentText('');
  };

  const handleTimeToggle = () => {
    if (task.isTracking) {
      stopTimeTracking(task.id);
    } else {
      startTimeTracking(task.id);
    }
  };

  const handleTitleSave = () => {
    if (editedTitle.trim()) {
      updateTask(task.id, { title: editedTitle });
      setIsEditingTitle(false);
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;

    const newSubtask = {
      id: `subtask-${Date.now()}`,
      title: newSubtaskTitle,
      completed: false,
      priority: 'medium' as const,
    };

    updateTask(task.id, {
      subtasks: [...task.subtasks, newSubtask],
    });

    setNewSubtaskTitle('');
  };

  const totalTrackedMinutes = task.timeTracking?.reduce((acc, entry) => acc + (entry.duration || 0), 0) || 0;
  const totalTrackedHours = Math.floor(totalTrackedMinutes / 60);
  const remainingMinutes = totalTrackedMinutes % 60;

  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const totalSubtasks = task.subtasks.length;
  const progressPercentage = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const isLate = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

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

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[700px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-start justify-between mb-3">
            {isEditingTitle ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="flex-1 text-xl font-semibold text-gray-900 border-b-2 border-blue-500 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleTitleSave}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                >
                  <Save className="w-5 h-5 text-green-600" />
                </button>
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            ) : (
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
                  <button
                    onClick={() => {
                      setEditedTitle(task.title);
                      setIsEditingTitle(true);
                    }}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                {task.projectName && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                    <span className="font-medium text-blue-600">{task.projectName}</span>
                    {task.phaseName && (
                      <>
                        <ChevronRight className="w-3 h-3" />
                        <span>{task.phaseName}</span>
                      </>
                    )}
                    {task.milestoneName && (
                      <>
                        <ChevronRight className="w-3 h-3" />
                        <span>{task.milestoneName}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleTimeToggle}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                task.isTracking
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {task.isTracking ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pausar Timer
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Iniciar Timer
                </>
              )}
            </button>
            {isLate && (
              <span className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                ⚠️ Atrasada
              </span>
            )}
          </div>
        </div>

        {/* Sidebar - Properties */}
        <div className="border-b border-gray-200 p-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Flag className="w-4 h-4" />
                Status
              </label>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value as any)}
                className={`w-full px-3 py-2 rounded-lg border-0 font-medium ${getStatusColor(task.status)}`}
              >
                <option value="todo">Backlog</option>
                <option value="doing">Em Progresso</option>
                <option value="done">Concluído</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Flag className="w-4 h-4" />
                Prioridade
              </label>
              <select
                value={task.priority || 'medium'}
                onChange={(e) => handlePriorityChange(e.target.value as any)}
                className={`w-full px-3 py-2 rounded-lg border-0 font-medium ${getPriorityColor(task.priority)}`}
              >
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <User className="w-4 h-4" />
                Responsável
              </label>
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-900">
                {task.assignee || 'Não atribuído'}
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Calendar className="w-4 h-4" />
                Vencimento
              </label>
              <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                isLate ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-900'
              }`}>
                {task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString('pt-BR')
                  : 'Sem prazo'}
              </div>
            </div>

            {/* Time Tracking */}
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Clock className="w-4 h-4" />
                Tempo Rastreado
              </label>
              <div className="flex items-center gap-4 px-3 py-2 bg-purple-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-purple-900">
                    {totalTrackedHours}h {remainingMinutes}m rastreados
                  </p>
                  {task.estimatedHours && (
                    <p className="text-xs text-purple-600">
                      de {task.estimatedHours}h estimadas
                    </p>
                  )}
                </div>
                {task.isTracking && (
                  <div className="flex items-center gap-2 text-sm text-purple-600">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
                    <span>Em andamento...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content - Tabs */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="description" className="h-full">
            <TabsList className="sticky top-0 bg-white z-10 border-b border-gray-200 px-6 pt-4">
              <div className="inline-flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <TabsTrigger
                  value="description"
                  className="px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
                >
                  Descrição
                </TabsTrigger>
                <TabsTrigger
                  value="checklist"
                  className="px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
                >
                  Checklist ({completedSubtasks}/{totalSubtasks})
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
                >
                  Atividade
                </TabsTrigger>
                <TabsTrigger
                  value="time"
                  className="px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-600 hover:text-gray-900"
                >
                  Tempo
                </TabsTrigger>
              </div>
            </TabsList>

            {/* Description Tab */}
            <TabsContent value="description" className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Descrição</h3>
                  {task.description ? (
                    <p className="text-sm text-gray-700 leading-relaxed">{task.description}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sem descrição</p>
                  )}
                </div>

                {task.tags && task.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {task.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Checklist Tab */}
            <TabsContent value="checklist" className="p-6">
              <div className="space-y-4">
                {/* Progress Bar */}
                {totalSubtasks > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progresso</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {Math.round(progressPercentage)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Subtasks List */}
                <div className="space-y-2">
                  {task.subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-200"
                    >
                      <button
                        onClick={() => toggleSubtaskCompletion(task.id, subtask.id)}
                        className="flex-shrink-0"
                      >
                        {subtask.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <span
                        className={`flex-1 text-sm ${
                          subtask.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                        }`}
                      >
                        {subtask.title}
                      </span>
                      {subtask.assignee && (
                        <span className="text-xs text-gray-500">{subtask.assignee}</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Subtask */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                    placeholder="Adicionar nova subtarefa..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddSubtask}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="p-6">
              <div className="space-y-4">
                {/* Comment Input */}
                <div>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Escreva um comentário..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <button className="p-1.5 hover:bg-gray-100 rounded">
                      <Paperclip className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={handleAddComment}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Comentar
                    </button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  {task.comments && task.comments.length > 0 ? (
                    task.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {comment.userName}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(comment.timestamp).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8">
                      Nenhum comentário ainda
                    </p>
                  )}

                  {/* System Activity */}
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <History className="w-4 h-4 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">Sistema</span>
                        <span className="text-xs text-gray-500">criou esta tarefa</span>
                        <span className="text-xs text-gray-400">
                          {task.startDate
                            ? new Date(task.startDate).toLocaleDateString('pt-BR')
                            : 'recentemente'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Time Tracking Tab */}
            <TabsContent value="time" className="p-6">
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-900">Tempo Total</span>
                    <span className="text-2xl font-bold text-purple-900">
                      {totalTrackedHours}h {remainingMinutes}m
                    </span>
                  </div>
                  {task.estimatedHours && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-600">Estimativa</span>
                      <span className="font-medium text-purple-700">{task.estimatedHours}h</span>
                    </div>
                  )}
                </div>

                {/* Time Entries */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Sessões de Trabalho</h3>
                  {task.timeTracking && task.timeTracking.length > 0 ? (
                    <div className="space-y-2">
                      {task.timeTracking.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(entry.startTime).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(entry.startTime).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {entry.endTime &&
                                ` - ${new Date(entry.endTime).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}`}
                            </p>
                          </div>
                          <div className="text-right">
                            {entry.duration ? (
                              <span className="text-sm font-semibold text-gray-900">
                                {Math.floor(entry.duration / 60)}h {entry.duration % 60}m
                              </span>
                            ) : (
                              <span className="text-xs text-blue-600 flex items-center gap-1">
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                                Em andamento
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8">
                      Nenhuma sessão de trabalho registrada
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
