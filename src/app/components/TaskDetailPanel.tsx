import { useState } from 'react';
import { X, Calendar, User, Flag, ChevronRight, ChevronDown, Circle, CheckCircle2, MessageSquare, Paperclip } from 'lucide-react';
import { WBSTask, Subtask } from '../types';

interface TaskDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  task: WBSTask & { projectName?: string; phaseName?: string; milestoneName?: string } | null;
}

export function TaskDetailPanel({ isOpen, onClose, task }: TaskDetailPanelProps) {
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState('');

  if (!isOpen || !task) return null;

  const toggleSubtask = (id: string) => {
    const newExpanded = new Set(expandedSubtasks);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSubtasks(newExpanded);
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'done':
        return 'CONCLUÍDO';
      case 'doing':
        return 'EM PROGRESSO';
      default:
        return 'BACKLOG';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-yellow-100 text-yellow-700';
      case 'medium':
        return 'bg-orange-100 text-orange-700';
      case 'low':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Média';
      case 'low':
        return 'Baixa';
      default:
        return 'Não definida';
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[600px] bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 flex items-start justify-between">
          <div className="flex-1 pr-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{task.title}</h2>
            {task.projectName && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{task.projectName}</span>
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Properties */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Flag className="w-4 h-4" />
                  <span>Status</span>
                </div>
                <select
                  value={task.status}
                  className={`w-full px-3 py-2 rounded-lg border-0 font-medium ${getStatusColor(task.status)}`}
                >
                  <option value="todo">BACKLOG</option>
                  <option value="doing">EM PROGRESSO</option>
                  <option value="done">CONCLUÍDO</option>
                </select>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <User className="w-4 h-4" />
                  <span>Responsáveis</span>
                </div>
                <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium text-gray-900">
                  {task.assignee || 'Não atribuído'}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>Datas</span>
                </div>
                <div className="space-y-2">
                  {task.startDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Circle className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-600">Início: </span>
                      <span className="text-gray-900">
                        {new Date(task.startDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                  {task.dueDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <Circle className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-600">Vencimento: </span>
                      <span className="text-gray-900">
                        {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Flag className="w-4 h-4" />
                  <span>Prioridade</span>
                </div>
                <select
                  value={task.priority || 'low'}
                  className={`w-full px-3 py-2 rounded-lg border-0 font-medium ${getPriorityColor(task.priority)}`}
                >
                  <option value="high">Alta</option>
                  <option value="medium">Média</option>
                  <option value="low">Baixa</option>
                </select>
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Objetivo mensurável:</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{task.description}</p>
              </div>
            )}

            {/* Estimated Hours */}
            {task.estimatedHours && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Escopo:</h3>
                <p className="text-sm text-gray-700">
                  Estimativa: {task.estimatedHours} horas
                  {task.actualHours && ` | Realizado: ${task.actualHours} horas`}
                </p>
              </div>
            )}

            {/* Subtasks */}
            {task.subtasks && task.subtasks.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <span>Subtarefas</span>
                    <span className="text-xs font-normal text-gray-500">
                      {task.subtasks.filter(st => st.completed).length} de {task.subtasks.length}
                    </span>
                  </h3>
                  <div className="flex gap-2">
                    <button className="text-xs text-gray-600 hover:text-gray-900">
                      Classificar
                    </button>
                    <button className="text-xs text-gray-600 hover:text-gray-900">
                      Expandir tudo
                    </button>
                  </div>
                </div>

                <div className="space-y-1 border border-gray-200 rounded-lg">
                  <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600">
                    <span>Nome</span>
                    <span>Responsável</span>
                    <span>Prioridade</span>
                  </div>

                  {task.subtasks.map((subtask) => (
                    <div key={subtask.id} className="px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 border-gray-100">
                      <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-center">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {/* toggle completion */}}
                            className="flex-shrink-0"
                          >
                            {subtask.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                          <span className={`text-sm ${subtask.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {subtask.title}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {subtask.assignee || '-'}
                        </span>
                        <span className="w-16 text-center">
                          <span className="inline-block w-3 h-3 rounded-full bg-yellow-500" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="w-full mt-2 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                  + Adicionar subtarefa
                </button>
              </div>
            )}

            {/* Activity/Comments Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Activity</h3>
              
              {/* Comment Input */}
              <div className="mb-4">
                <div className="relative">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Escreva um comentário..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 hover:bg-gray-100 rounded">
                        <Paperclip className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    <button className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                      Comentar
                    </button>
                  </div>
                </div>
              </div>

              {/* Activity Feed */}
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {task.assignee || 'Sistema'}
                      </span>
                      <span className="text-xs text-gray-500">criou esta tarefa</span>
                      <span className="text-xs text-gray-400">
                        {task.startDate ? new Date(task.startDate).toLocaleDateString('pt-BR') : 'hoje'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
