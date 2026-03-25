import { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  User,
  Flag,
  ChevronRight,
  CheckCircle2,
  MessageSquare,
  Paperclip,
  Clock,
  Play,
  Pause,
  Plus,
  Trash2,
  Edit2,
  Save,
  ChevronDown,
  Circle,
  Send,
} from 'lucide-react';
import { useTasks, EnrichedTask } from '../context/TaskContext';

interface TaskDetailPanelAdvancedProps {
  isOpen: boolean;
  onClose: () => void;
  task: EnrichedTask | null;
}

interface HierarchicalSubtask {
  id: string;
  title: string;
  completed: boolean;
  priority?: string;
  assignee?: string;
  subtasks: HierarchicalSubtask[];
  level: number;
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
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});

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
      subtasks: [],
    };

    updateTask(task.id, {
      subtasks: [...task.subtasks, newSubtask],
    });

    setNewSubtaskTitle('');
  };

  const toggleSubtaskExpanded = (subtaskId: string) => {
    setExpandedSubtasks(prev => ({
      ...prev,
      [subtaskId]: !prev[subtaskId],
    }));
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

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case 'high':
        return '🔴 Alta';
      case 'medium':
        return '🟡 Média';
      case 'low':
        return '🟢 Baixa';
      default:
        return '—';
    }
  };

  // Renderizar subtarefas hierarquicamente
  const SubtaskItem = ({ subtask, level = 0 }: { subtask: any; level?: number }) => {
    const hasChildren = subtask.subtasks && subtask.subtasks.length > 0;
    const isExpanded = expandedSubtasks[subtask.id];

    return (
      <div key={subtask.id}>
        <div
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-200 mb-2 group"
          style={{ marginLeft: `${level * 20}px` }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={() => toggleSubtaskExpanded(subtask.id)}
              className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
            >
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  isExpanded ? '' : '-rotate-90'
                }`}
              />
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* Status Checkbox */}
          <button
            onClick={() => toggleSubtaskCompletion(task.id, subtask.id)}
            className="flex-shrink-0 transition-colors hover:bg-gray-100 p-1 rounded"
          >
            {subtask.completed ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <Circle className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {/* Title */}
          <span
            className={`flex-1 text-sm font-medium ${
              subtask.completed ? 'text-gray-400 line-through' : 'text-gray-900'
            }`}
          >
            {subtask.title}
          </span>

          {/* Priority Badge */}
          {subtask.priority && (
            <span className={`text-xs px-2 py-1 rounded font-medium ${getPriorityColor(subtask.priority)}`}>
              {getPriorityLabel(subtask.priority)}
            </span>
          )}

          {/* Assignee */}
          {subtask.assignee && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {subtask.assignee}
            </span>
          )}

          {/* Delete Button */}
          <button
            onClick={() => {
              const updatedSubtasks = task.subtasks.filter(st => st.id !== subtask.id);
              updateTask(task.id, { subtasks: updatedSubtasks });
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all flex-shrink-0"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </div>

        {/* Child Subtasks */}
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {subtask.subtasks.map((child: any) => (
              <SubtaskItem key={child.id} subtask={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Main Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[1000px] bg-white shadow-2xl z-50 flex flex-col">
        {/* ==================== HEADER ==================== */}
        <div className="border-b border-gray-200 bg-white">
          {/* Breadcrumb / Contexto */}
          <div className="px-8 py-3 text-xs text-gray-500 border-b border-gray-100 flex items-center gap-2">
            {task.projectName && (
              <>
                <span className="font-medium text-blue-600">{task.projectName}</span>
                <ChevronRight className="w-3 h-3" />
              </>
            )}
            {task.phaseName && (
              <>
                <span>{task.phaseName}</span>
                <ChevronRight className="w-3 h-3" />
              </>
            )}
            <span className="text-gray-400">Tarefa</span>
          </div>

          {/* Title + Close */}
          <div className="px-8 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="flex-1 text-2xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleTitleSave}
                      className="p-2 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Save className="w-5 h-5 text-green-600" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
                    <button
                      onClick={() => {
                        setEditedTitle(task.title);
                        setIsEditingTitle(true);
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Attributes Bar */}
          <div className="px-8 py-4 border-t border-gray-100 bg-gray-50">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {/* Status */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">Status</label>
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value as any)}
                  className={`px-3 py-2 rounded-lg border-0 text-xs font-semibold cursor-pointer ${getStatusColor(task.status)}`}
                >
                  <option value="todo">BACKLOG</option>
                  <option value="doing">EM PROGRESSO</option>
                  <option value="done">CONCLUÍDO</option>
                </select>
              </div>

              {/* Responsável */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">Responsável</label>
                <div className="px-3 py-2 bg-white rounded-lg text-xs font-medium text-gray-900 border border-gray-200">
                  {task.assignee || 'Não atribuído'}
                </div>
              </div>

              {/* Vencimento */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">Vencimento</label>
                <div
                  className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                    isLate
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-white text-gray-900 border-gray-200'
                  }`}
                >
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                      })
                    : '—'}
                </div>
              </div>

              {/* Prioridade */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">Prioridade</label>
                <select
                  value={task.priority || 'medium'}
                  onChange={(e) => handlePriorityChange(e.target.value as any)}
                  className={`px-3 py-2 rounded-lg border-0 text-xs font-semibold cursor-pointer ${getPriorityColor(task.priority)}`}
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>

              {/* Tempo Rastreado */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">Tempo</label>
                <div className="px-3 py-2 bg-purple-50 rounded-lg text-xs font-semibold text-purple-900 border border-purple-200">
                  {totalTrackedHours}h {remainingMinutes}m
                </div>
              </div>

              {/* Time Tracking Button */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-500">&nbsp;</label>
                <button
                  onClick={handleTimeToggle}
                  className={`px-3 py-2 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1 ${
                    task.isTracking
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {task.isTracking ? (
                    <>
                      <Pause className="w-3 h-3" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      Iniciar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== MAIN CONTENT (2 COLUMNS) ==================== */}
        <div className="flex-1 overflow-hidden flex">
          {/* LEFT: Description + Subtasks */}
          <div className="flex-1 overflow-y-auto border-r border-gray-200">
            <div className="p-8 space-y-8">
              {/* Description Section */}
              <div>
                <h2 className="text-sm font-semibold text-gray-900 mb-3">Descrição</h2>
                {task.description ? (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {task.description}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Sem descrição</p>
                )}
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 mb-3">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtasks Section (ESSENCIAL) */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Subtarefas ({completedSubtasks}/{totalSubtasks})
                  </h2>
                  {totalSubtasks > 0 && (
                    <span className="text-xs text-gray-500">
                      {Math.round(progressPercentage)}% completo
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                {totalSubtasks > 0 && (
                  <div className="mb-4">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Subtasks List */}
                <div className="space-y-2 mb-4">
                  {task.subtasks.map((subtask) => (
                    <SubtaskItem key={subtask.id} subtask={subtask} level={0} />
                  ))}
                </div>

                {/* Add Subtask Input */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                    placeholder="Adicionar subtarefa..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddSubtask}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5 text-blue-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Sidebar - Comments & Activity */}
          <div className="w-80 overflow-y-auto bg-gray-50 border-l border-gray-200">
            <div className="p-6 space-y-6">
              {/* Comment Input */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Comentários</h3>
                <div className="space-y-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Escreva um comentário..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 hover:bg-white rounded transition-colors">
                      <Paperclip className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Comentar
                    </button>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-500 uppercase">Atividade</h4>
                {task.comments && task.comments.length > 0 ? (
                  <div className="space-y-3">
                    {task.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-col justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-900">
                              {comment.userName}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(comment.timestamp).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 break-words">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center py-4">
                    Nenhum comentário ainda
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
