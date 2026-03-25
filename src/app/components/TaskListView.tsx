import { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Calendar,
  User,
  Flag,
  Tag,
  Plus,
  X,
  MoreHorizontal,
  Edit2,
  Trash2,
} from 'lucide-react';
import { EnrichedTask } from '../context/TaskContext';
import { KanbanColumn } from '../context/UserKanbanContext';

interface TaskListViewProps {
  tasks: EnrichedTask[];
  columns: KanbanColumn[];
  onTaskClick: (task: EnrichedTask) => void;
  onUpdateTask: (taskId: string, updates: any) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
}

interface SubtaskRowProps {
  subtask: any;
  level: number;
  taskId: string;
  columns: KanbanColumn[];
  onToggle: (subtaskId: string) => void;
  onUpdateSubtask: (subtaskId: string, updates: any) => void;
  onAddSubtask: (parentId: string, title: string) => void;
}

function SubtaskRow({ subtask, level, taskId, columns, onToggle, onUpdateSubtask, onAddSubtask }: SubtaskRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(subtask.title);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [newChildTitle, setNewChildTitle] = useState('');
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  
  const hasChildren = subtask.subtasks && subtask.subtasks.length > 0;

  const handleSaveEdit = () => {
    if (editTitle.trim()) {
      onUpdateSubtask(subtask.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleAddChild = () => {
    if (newChildTitle.trim()) {
      onAddSubtask(subtask.id, newChildTitle.trim());
      setNewChildTitle('');
      setIsAddingChild(false);
      setIsExpanded(true);
    }
  };

  const getStatusColor = () => {
    if (subtask.completed) return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <>
      <tr className="hover:bg-gray-50 border-b border-gray-100 group">
        <td className="px-6 py-3" style={{ paddingLeft: `${24 + level * 32}px` }}>
          <div className="flex items-center gap-2">
            {(hasChildren || isAddingChild) ? (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-0.5 hover:bg-gray-200 rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>
            ) : (
              <div className="w-5" />
            )}
            
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') {
                    setEditTitle(subtask.title);
                    setIsEditing(false);
                  }
                }}
                className="flex-1 text-sm px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <span 
                className="text-sm text-gray-700 cursor-text hover:bg-gray-100 px-2 py-1 rounded"
                onClick={() => setIsEditing(true)}
              >
                {subtask.title}
              </span>
            )}

            <button
              onClick={() => setIsAddingChild(true)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
              title="Adicionar subtarefa"
            >
              <Plus className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        </td>
        <td className="px-6 py-3 text-sm text-gray-600">—</td>
        <td className="px-6 py-3 text-sm text-gray-600">—</td>
        <td className="px-6 py-3">
          {subtask.priority && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              subtask.priority === 'high' ? 'bg-red-100 text-red-700' :
              subtask.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {subtask.priority === 'high' ? '🔴 Alta' :
               subtask.priority === 'medium' ? '🟡 Média' :
               '🟢 Baixa'}
            </span>
          )}
        </td>
        <td className="px-6 py-3">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor()}`}>
            {subtask.completed ? '✅ Concluído' : '⏸️ Pendente'}
          </span>
        </td>
        <td className="px-6 py-3">
          <div className="opacity-0 group-hover:opacity-100">
            <button className="p-1 hover:bg-gray-200 rounded">
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </td>
      </tr>
      
      {/* Add child subtask row */}
      {isAddingChild && isExpanded && (
        <tr className="bg-blue-50 border-b border-blue-200">
          <td colSpan={6} style={{ paddingLeft: `${24 + (level + 1) * 32}px` }}>
            <div className="flex items-center gap-2 py-2">
              <input
                type="text"
                value={newChildTitle}
                onChange={(e) => setNewChildTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddChild();
                  if (e.key === 'Escape') {
                    setNewChildTitle('');
                    setIsAddingChild(false);
                  }
                }}
                placeholder="Nome da subtarefa..."
                className="flex-1 text-sm px-3 py-1.5 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleAddChild}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Adicionar
              </button>
              <button
                onClick={() => {
                  setNewChildTitle('');
                  setIsAddingChild(false);
                }}
                className="p-1.5 hover:bg-gray-200 rounded"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </td>
        </tr>
      )}
      
      {isExpanded && hasChildren && subtask.subtasks.map((child: any) => (
        <SubtaskRow
          key={child.id}
          subtask={child}
          level={level + 1}
          taskId={taskId}
          columns={columns}
          onToggle={onToggle}
          onUpdateSubtask={onUpdateSubtask}
          onAddSubtask={onAddSubtask}
        />
      ))}
    </>
  );
}

function TaskRow({ 
  task, 
  columns,
  onTaskClick, 
  onUpdateTask,
  onAddSubtask,
  onDeleteTask
}: { 
  task: EnrichedTask; 
  columns: KanbanColumn[];
  onTaskClick: () => void; 
  onUpdateTask: (taskId: string, updates: any) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(task.title);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const isLate = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  // Group columns by category
  const groupedColumns = {
    'Não iniciado': columns.filter(col => 
      col.name.toLowerCase().includes('backlog') || 
      col.name.toLowerCase().includes('não iniciado')
    ),
    'Ativo': columns.filter(col => 
      !col.name.toLowerCase().includes('backlog') && 
      !col.name.toLowerCase().includes('não iniciado') &&
      !col.name.toLowerCase().includes('concluído') &&
      !col.name.toLowerCase().includes('done')
    ),
    'Fechado': columns.filter(col => 
      col.name.toLowerCase().includes('concluído') || 
      col.name.toLowerCase().includes('done')
    ),
  };

  // Get current column/status
  const currentColumn = columns.find(col => col.id === task.kanbanColumn) || 
                       columns.find(col => col.name.toLowerCase().includes(task.status || '')) ||
                       columns[0];

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    const updatedTags = [...(task.tags || []), newTag.trim()];
    onUpdateTask(task.id, { tags: updatedTags });
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = (task.tags || []).filter(tag => tag !== tagToRemove);
    onUpdateTask(task.id, { tags: updatedTags });
  };

  const handleStatusChange = (columnId: string) => {
    onUpdateTask(task.id, { 
      kanbanColumn: columnId,
      status: columns.find(c => c.id === columnId)?.name.toLowerCase().includes('concluído') ? 'done' : 'doing'
    });
    setShowStatusPopover(false);
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName !== task.title) {
      onUpdateTask(task.id, { title: editedName.trim() });
    }
    setIsEditingName(false);
  };

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      onAddSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      setIsAddingSubtask(false);
      setIsExpanded(true);
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 font-medium">🔴 Alta</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700 font-medium">🟡 Média</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">🟢 Baixa</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 font-medium">—</span>;
    }
  };

  return (
    <>
      <tr className="hover:bg-gray-50 border-b border-gray-200 group">
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            {hasSubtasks || isAddingSubtask ? (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-0.5 hover:bg-gray-200 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                )}
              </button>
            ) : (
              <div className="w-5" />
            )}
            
            <div className="flex flex-col gap-1 flex-1">
              {isEditingName ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') {
                      setEditedName(task.title);
                      setIsEditingName(false);
                    }
                  }}
                  className="text-sm font-medium px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setIsEditingName(true)}
                  className="text-sm font-medium text-gray-900 hover:text-blue-600 text-left px-2 py-1 rounded hover:bg-gray-100"
                >
                  {task.title}
                </button>
              )}
              
              <div className="flex items-center gap-2">
                {task.isLinkedToProject && task.projectName && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                    📁 {task.projectName}
                  </span>
                )}
                {hasSubtasks && (
                  <span className="text-xs text-gray-500">
                    {task.subtasks.filter((st: any) => st.completed).length}/{task.subtasks.length} subtarefas
                  </span>
                )}
                
                {/* Tags with inline editing */}
                <div className="flex items-center gap-1 flex-wrap">
                  {task.tags?.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded flex items-center gap-1 group/tag"
                    >
                      {tag}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTag(tag);
                        }}
                        className="opacity-0 group-hover/tag:opacity-100 hover:text-purple-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {showTagEditor ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddTag();
                          } else if (e.key === 'Escape') {
                            setShowTagEditor(false);
                            setNewTag('');
                          }
                        }}
                        onBlur={() => {
                          if (newTag.trim()) {
                            handleAddTag();
                          }
                          setShowTagEditor(false);
                        }}
                        placeholder="Nova tag"
                        className="text-xs px-2 py-0.5 border border-purple-300 rounded w-24 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTagEditor(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-xs px-2 py-0.5 border border-dashed border-gray-300 text-gray-500 rounded hover:border-purple-500 hover:text-purple-600 flex items-center gap-1"
                    >
                      <Tag className="w-3 h-3" />
                      Tag
                    </button>
                  )}
                </div>

                {/* Add Subtask Button */}
                <button
                  onClick={() => setIsAddingSubtask(true)}
                  className="opacity-0 group-hover:opacity-100 text-xs px-2 py-0.5 border border-dashed border-gray-300 text-gray-500 rounded hover:border-blue-500 hover:text-blue-600 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Subtarefa
                </button>
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User className="w-4 h-4 text-gray-400" />
            {task.assignee || '—'}
          </div>
        </td>
        <td className="px-6 py-4">
          {task.dueDate ? (
            <div className={`flex items-center gap-2 text-sm ${isLate ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
              <Calendar className="w-4 h-4" />
              {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              {isLate && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded">Atrasada</span>}
            </div>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </td>
        <td className="px-6 py-4">
          {getPriorityBadge(task.priority)}
        </td>
        <td className="px-6 py-4 relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowStatusPopover(!showStatusPopover);
            }}
            className="px-3 py-1.5 rounded text-xs font-medium bg-gray-100 hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <span>{currentColumn?.name || 'Sem status'}</span>
          </button>

          {/* Status Popover */}
          {showStatusPopover && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowStatusPopover(false)}
              />
              <div className="absolute left-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-20 min-w-[220px] overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-600">ALTERAR STATUS</span>
                </div>
                
                {Object.entries(groupedColumns).map(([category, cols]) => (
                  cols.length > 0 && (
                    <div key={category} className="py-1">
                      <div className="px-3 py-1">
                        <p className="text-xs text-gray-500 font-medium">{category}</p>
                      </div>
                      {cols.map((col) => (
                        <button
                          key={col.id}
                          onClick={() => handleStatusChange(col.id)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                            task.kanbanColumn === col.id ? 'bg-blue-50' : ''
                          }`}
                        >
                          <span>{col.name}</span>
                          {task.kanbanColumn === col.id && <span className="text-blue-600">✓</span>}
                        </button>
                      ))}
                    </div>
                  )
                ))}
              </div>
            </>
          )}
        </td>
        <td className="px-6 py-4 relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActionsMenu(!showActionsMenu);
            }}
            className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="w-4 h-4 text-gray-400" />
          </button>

          {/* Actions Menu */}
          {showActionsMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowActionsMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-20 min-w-[160px] overflow-hidden">
                <button
                  onClick={() => {
                    onTaskClick();
                    setShowActionsMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Abrir detalhes
                </button>
                <button
                  onClick={() => {
                    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                      onDeleteTask(task.id);
                    }
                    setShowActionsMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir
                </button>
              </div>
            </>
          )}
        </td>
      </tr>
      
      {/* Add Subtask Row */}
      {isAddingSubtask && isExpanded && (
        <tr className="bg-blue-50 border-b border-blue-200">
          <td colSpan={6} style={{ paddingLeft: '80px' }}>
            <div className="flex items-center gap-2 py-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubtask();
                  if (e.key === 'Escape') {
                    setNewSubtaskTitle('');
                    setIsAddingSubtask(false);
                  }
                }}
                placeholder="Nome da subtarefa..."
                className="flex-1 text-sm px-3 py-1.5 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleAddSubtask}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Adicionar
              </button>
              <button
                onClick={() => {
                  setNewSubtaskTitle('');
                  setIsAddingSubtask(false);
                }}
                className="p-1.5 hover:bg-gray-200 rounded"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </td>
        </tr>
      )}
      
      {/* Subtasks */}
      {isExpanded && hasSubtasks && task.subtasks.map((subtask: any) => (
        <SubtaskRow
          key={subtask.id}
          subtask={subtask}
          level={1}
          taskId={task.id}
          columns={columns}
          onToggle={(subtaskId) => {
            // Toggle subtask completion
            console.log('Toggle subtask:', subtaskId);
          }}
          onUpdateSubtask={(subtaskId, updates) => {
            // Handle subtask updates
            console.log('Update subtask:', subtaskId, updates);
          }}
          onAddSubtask={(parentId, title) => {
            // Handle nested subtask creation
            console.log('Add nested subtask:', parentId, title);
          }}
        />
      ))}
    </>
  );
}

export function TaskListView({ 
  tasks, 
  columns,
  onTaskClick, 
  onUpdateTask,
  onAddSubtask,
  onDeleteTask
}: TaskListViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Nenhuma tarefa encontrada
        </h3>
        <p className="text-gray-500">
          Crie uma nova tarefa ou ajuste os filtros
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nome
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Responsável
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Data de vencimento
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Prioridade
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
              
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              columns={columns}
              onTaskClick={() => onTaskClick(task)}
              onUpdateTask={onUpdateTask}
              onAddSubtask={onAddSubtask}
              onDeleteTask={onDeleteTask}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
