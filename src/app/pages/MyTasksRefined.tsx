import { useState, useMemo, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Plus,
  Clock,
  CheckSquare,
  Flag,
  Calendar,
  List,
  LayoutGrid,
  AlertCircle,
  Play,
  Pause,
  Search,
  Settings,
  Edit2,
  Trash2,
  GripVertical,
  X,
} from 'lucide-react';
import { useTasks, EnrichedTask } from '../context/TaskContext';
import { useUserKanban, KanbanColumn } from '../context/UserKanbanContext';
import { useAdmin } from '../context/AdminContext';
import { useProjects } from '../context/ProjectContext';
import { TaskDetailPanelAdvanced } from '../components/TaskDetailPanelAdvanced';
import { TaskModal } from '../components/TaskModal';
import { AdvancedFilter, FilterOption } from '../components/AdvancedFilter';
import { TaskListView } from '../components/TaskListView';

type ViewMode = 'kanban' | 'list';

interface DraggableTaskCardProps {
  task: EnrichedTask;
  onClick: () => void;
}

function DraggableTaskCard({ task, onClick }: DraggableTaskCardProps) {
  const { updateTask, startTimeTracking, stopTimeTracking } = useTasks();
  
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TASK',
    item: { taskId: task.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [task.id, updateTask]);

  const completedSubtasks = task.subtasks?.filter(st => st.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
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

  const dragRef = (el: HTMLDivElement | null) => {
    drag(el);
  };

  return (
    <div
      ref={dragRef}
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

      {/* Project Reference with Badge */}
      {task.isLinkedToProject && task.projectName && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
            📁 {task.projectName}
          </span>
          {task.milestoneName && (
            <span className="text-xs text-gray-500">→ {task.milestoneName}</span>
          )}
        </div>
      )}

      {!task.isLinkedToProject && (
        <div className="mb-2">
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
            🔓 Tarefa Independente
          </span>
        </div>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 2).map((tag, idx) => (
            <span key={idx} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
              {tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
              +{task.tags.length - 2}
            </span>
          )}
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
            {completedSubtasks}/{totalSubtasks} checklist
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div className="flex items-center gap-3 text-xs text-gray-600">
          {task.dueDate && (
            <div className={`flex items-center gap-1 ${isLate ? 'text-red-600 font-medium' : ''}`}>
              <Calendar className="w-3 h-3" />
              <span>{new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
            </div>
          )}
          {(task.estimatedHours || task.actualHours) && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{task.actualHours || 0}h</span>
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

      {/* Status Indicators */}
      <div className="flex items-center gap-2 mt-2">
        {isLate && (
          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Atrasada
          </span>
        )}
        {task.isTracking && (
          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
            Em execução
          </span>
        )}
      </div>
    </div>
  );
}

interface DraggableColumnProps {
  column: KanbanColumn;
  tasks: EnrichedTask[];
  index: number;
  onTaskClick: (task: EnrichedTask) => void;
  onTaskDrop: (taskId: string, columnId: string) => void;
  onColumnDrop: (draggedColumnId: string, targetColumnId: string) => void;
  onEditColumn: (column: KanbanColumn) => void;
  onDeleteColumn: (columnId: string) => void;
}

function DraggableColumn({
  column,
  tasks,
  index,
  onTaskClick,
  onTaskDrop,
  onColumnDrop,
  onEditColumn,
  onDeleteColumn,
}: DraggableColumnProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Drag source for column reordering
  const [{ isDraggingColumn }, dragColumn] = useDrag(() => ({
    type: 'COLUMN',
    item: { columnId: column.id, index },
    collect: (monitor) => ({
      isDraggingColumn: monitor.isDragging(),
    }),
  }), [column.id, index]);

  // Drop zone for column reordering
  const [{ isOverColumn }, dropColumn] = useDrop(() => ({
    accept: 'COLUMN',
    drop: (item: { columnId: string; index: number }) => {
      if (item.columnId !== column.id) {
        onColumnDrop(item.columnId, column.id);
      }
    },
    collect: (monitor) => ({
      isOverColumn: monitor.isOver(),
    }),
  }), [column.id, onColumnDrop]);

  // Drop zone for tasks
  const [{ isOverTask }, dropTask] = useDrop(() => ({
    accept: 'TASK',
    drop: (item: { taskId: string }) => {
      onTaskDrop(item.taskId, column.id);
    },
    collect: (monitor) => ({
      isOverTask: monitor.isOver(),
    }),
  }), [column.id, onTaskDrop]);

  // Combine refs for column (drag + drop for reordering)
  const combinedColumnRef = (el: HTMLDivElement | null) => {
    dragColumn(el);
    dropColumn(el);
  };

  // Combine refs for task drop zone
  const combinedTaskRef = (el: HTMLDivElement | null) => {
    dropTask(el);
  };

  return (
    <div
      ref={combinedColumnRef}
      className={`flex-shrink-0 w-80 ${isDraggingColumn ? 'opacity-40' : ''} ${
        isOverColumn ? 'scale-105' : ''
      } transition-all`}
    >
      <div className={`rounded-lg px-4 py-2 mb-4 border-2 ${column.color} relative group cursor-move`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-900">{column.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-white px-2 py-0.5 rounded text-sm font-medium">{tasks.length}</span>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-white/50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Settings className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Column Menu */}
        {showMenu && (
          <div className="absolute top-full right-4 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[160px]">
            <button
              onClick={() => {
                onEditColumn(column);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Renomear
            </button>
            <button
              onClick={() => {
                if (confirm('Tem certeza que deseja excluir esta coluna?')) {
                  onDeleteColumn(column.id);
                }
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        )}
      </div>
      
      <div
        ref={combinedTaskRef}
        className={`min-h-[500px] rounded-lg transition-all ${
          isOverTask ? 'bg-blue-50 ring-2 ring-blue-300 p-2' : ''
        }`}
      >
        {tasks.map((task) => (
          <DraggableTaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            Arraste tarefas para cá
          </div>
        )}
      </div>
    </div>
  );
}

export function MyTasksRefined() {
  const { allTasks, updateTask, addIndependentTask, moveIndependentTask } = useTasks();
  const { columns, addColumn, updateColumn, deleteColumn, reorderColumns } = useUserKanban();
  const { users, clients, products, teams } = useAdmin();
  const { projects } = useProjects();
  
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedTask, setSelectedTask] = useState<EnrichedTask | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [newColumnName, setNewColumnName] = useState('');

  // Advanced Filters with Multi-Select
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // Get current user tasks (mock - would use actual auth)
  const myTasks = allTasks.filter(
    (task) => task.assignee === 'Guilherme Drehmer' || task.assignee === 'João Silva'
  );

  // Handle adding subtask
  const handleAddSubtask = useCallback((taskId: string, title: string) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    const newSubtask = {
      id: `subtask-${Date.now()}`,
      title,
      completed: false,
      priority: 'medium' as const,
      subtasks: [],
    };

    const updatedSubtasks = [...(task.subtasks || []), newSubtask];
    updateTask(taskId, { subtasks: updatedSubtasks });
  }, [allTasks, updateTask]);

  // Handle deleting task
  const handleDeleteTask = useCallback((taskId: string) => {
    // This would call deleteTask from context
    console.log('Delete task:', taskId);
  }, []);

  // Generate filter options
  const projectOptions: FilterOption[] = useMemo(() => {
    const independentOption: FilterOption = { value: '__independent__', label: 'Tarefas Independentes' };
    const projectOpts = Array.from(new Set(myTasks.map(t => t.projectName).filter(Boolean))).map(name => ({
      value: name!,
      label: name!,
    }));
    return [independentOption, ...projectOpts];
  }, [myTasks]);

  const clientOptions: FilterOption[] = useMemo(() =>
    clients.map(c => ({ value: c.id, label: c.name })),
    [clients]
  );

  const productOptions: FilterOption[] = useMemo(() =>
    products.map(p => ({ value: p.id, label: p.name })),
    [products]
  );

  const assigneeOptions: FilterOption[] = useMemo(() =>
    users.map(u => ({ value: u.id, label: u.name })),
    [users]
  );

  const priorityOptions: FilterOption[] = [
    { value: 'high', label: 'Alta' },
    { value: 'medium', label: 'Média' },
    { value: 'low', label: 'Baixa' },
  ];

  const tagOptions: FilterOption[] = useMemo(() => {
    const allTags = new Set(myTasks.flatMap(t => t.tags || []));
    return Array.from(allTags).map(tag => ({ value: tag, label: tag }));
  }, [myTasks]);

  const statusOptions: FilterOption[] = [
    { value: 'todo', label: 'A Fazer' },
    { value: 'doing', label: 'Em Andamento' },
    { value: 'done', label: 'Concluído' },
  ];

  // Apply filters
  const filteredTasks = useMemo(() => {
    const filtered = myTasks.filter((task) => {
      // Search filter
      if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Project filter
      if (selectedProjects.length > 0) {
        const hasIndependent = selectedProjects.includes('__independent__');
        const hasProject = task.projectName && selectedProjects.includes(task.projectName);
        const isIndependent = !task.isLinkedToProject;
        
        if (!(hasIndependent && isIndependent) && !hasProject) {
          return false;
        }
      }
      
      // Assignee filter
      if (selectedAssignees.length > 0) {
        const assigneeUser = users.find(u => u.name === task.assignee);
        if (!assigneeUser || !selectedAssignees.includes(assigneeUser.id)) {
          return false;
        }
      }
      
      // Priority filter
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(task.priority || '')) {
        return false;
      }
      
      // Tag filter
      if (selectedTags.length > 0) {
        const hasAnyTag = task.tags?.some(tag => selectedTags.includes(tag));
        if (!hasAnyTag) return false;
      }
      
      // Status filter
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(task.status || '')) {
        return false;
      }
      
      return true;
    });
    
    // Sort by order
    return filtered.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [myTasks, searchTerm, selectedProjects, selectedAssignees, selectedPriorities, selectedTags, selectedStatuses, users]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const inProgress = filteredTasks.filter(t => t.status === 'doing').length;
    const done = filteredTasks.filter(t => t.status === 'done').length;
    const late = filteredTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    ).length;
    const totalTime = filteredTasks.reduce((acc, t) => acc + (t.actualHours || 0), 0);
    const blocked = 0;

    return { total, inProgress, done, late, totalTime, blocked };
  }, [filteredTasks]);

  const handleTaskClick = (task: EnrichedTask) => {
    setSelectedTask(task);
    setIsDetailPanelOpen(true);
  };

  const handleTaskDrop = useCallback((taskId: string, columnId: string) => {
    updateTask(taskId, { 
      status: columnId === 'done' ? 'done' : columnId === 'in-progress' ? 'doing' : 'todo'
    });
  }, [updateTask]);

  const handleColumnDrop = useCallback((draggedColumnId: string, targetColumnId: string) => {
    const draggedIndex = columns.findIndex(c => c.id === draggedColumnId);
    const targetIndex = columns.findIndex(c => c.id === targetColumnId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newColumns = [...columns];
    const [draggedColumn] = newColumns.splice(draggedIndex, 1);
    newColumns.splice(targetIndex, 0, draggedColumn);
    
    reorderColumns(newColumns);
  }, [columns, reorderColumns]);

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;
    
    addColumn({
      name: newColumnName,
      color: 'bg-gray-100 border-gray-300',
    });
    
    setNewColumnName('');
    setIsAddingColumn(false);
  };

  const handleEditColumn = (column: KanbanColumn) => {
    setEditingColumn(column);
    setNewColumnName(column.name);
  };

  const handleSaveColumnEdit = () => {
    if (!editingColumn || !newColumnName.trim()) return;
    
    updateColumn(editingColumn.id, { name: newColumnName });
    setEditingColumn(null);
    setNewColumnName('');
  };

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, EnrichedTask[]> = {};
    
    columns.forEach(col => {
      grouped[col.id] = filteredTasks.filter(t => t.kanbanColumn === col.id);
    });

    // Tasks without column go to first column
    const unassigned = filteredTasks.filter(t => !t.kanbanColumn);
    if (columns.length > 0 && unassigned.length > 0) {
      grouped[columns[0].id] = [...(grouped[columns[0].id] || []), ...unassigned];
    }

    return grouped;
  }, [filteredTasks, columns]);

  const hasActiveFilters = selectedProjects.length > 0 || selectedClients.length > 0 || 
    selectedProducts.length > 0 || selectedAssignees.length > 0 || 
    selectedPriorities.length > 0 || selectedTags.length > 0 || 
    selectedStatuses.length > 0 || searchTerm !== '';

  const clearAllFilters = () => {
    setSelectedProjects([]);
    setSelectedClients([]);
    setSelectedProducts([]);
    setSelectedAssignees([]);
    setSelectedPriorities([]);
    setSelectedTags([]);
    setSelectedStatuses([]);
    setSearchTerm('');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 font-medium">✅ Concluído</span>;
      case 'doing':
        return <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 font-medium">▶️ Em Andamento</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 font-medium">⏸️ Backlog</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Minhas Tarefas</h1>
            <p className="text-gray-500 mt-1">Central de execução - gerencie seu fluxo de trabalho</p>
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

      <div className="px-8 py-8">
        {/* Advanced Filters - Centralized */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="space-y-4">
            {/* Search Bar - Full Width */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar tarefas..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Advanced Filters Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <AdvancedFilter
                label="Projetos"
                options={projectOptions}
                selected={selectedProjects}
                onChange={setSelectedProjects}
                placeholder="Todos"
              />

              <AdvancedFilter
                label="Cliente"
                options={clientOptions}
                selected={selectedClients}
                onChange={setSelectedClients}
                placeholder="Todos"
              />

              <AdvancedFilter
                label="Produto"
                options={productOptions}
                selected={selectedProducts}
                onChange={setSelectedProducts}
                placeholder="Todos"
              />

              <AdvancedFilter
                label="Responsável"
                options={assigneeOptions}
                selected={selectedAssignees}
                onChange={setSelectedAssignees}
                placeholder="Todos"
              />

              <AdvancedFilter
                label="Prioridade"
                options={priorityOptions}
                selected={selectedPriorities}
                onChange={setSelectedPriorities}
                placeholder="Todas"
              />

              <AdvancedFilter
                label="Status"
                options={statusOptions}
                selected={selectedStatuses}
                onChange={setSelectedStatuses}
                placeholder="Todos"
              />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-600 font-medium">
                  {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? 's' : ''} encontrada{filteredTasks.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <X className="w-4 h-4" />
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 rounded transition-colors flex items-center gap-2 ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Visualização Kanban"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-sm font-medium">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded transition-colors flex items-center gap-2 ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Visualização em Lista"
            >
              <List className="w-4 h-4" />
              <span className="text-sm font-medium">Lista</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 ml-2">Ambas mostram os mesmos dados</p>
        </div>

      {/* Content by View Mode */}
      {viewMode === 'kanban' && (
        <DndProvider backend={HTML5Backend}>
          <div className="flex gap-6 overflow-x-auto pb-8">
            {columns
              .sort((a, b) => a.order - b.order)
              .map((column, index) => (
                <DraggableColumn
                  key={column.id}
                  column={column}
                  tasks={tasksByColumn[column.id] || []}
                  index={index}
                  onTaskClick={handleTaskClick}
                  onTaskDrop={handleTaskDrop}
                  onColumnDrop={handleColumnDrop}
                  onEditColumn={handleEditColumn}
                  onDeleteColumn={deleteColumn}
                />
              ))}
            
            {/* Add Column Button */}
            <div className="flex-shrink-0 w-80">
              <button
                onClick={() => setIsAddingColumn(true)}
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-blue-600"
              >
                <Plus className="w-8 h-8" />
                <span className="font-medium">Criar uma nova etapa</span>
              </button>
            </div>
          </div>
        </DndProvider>
      )}

      {viewMode === 'list' && (
        <TaskListView
          tasks={filteredTasks}
          columns={columns}
          onTaskClick={handleTaskClick}
          onUpdateTask={updateTask}
          onAddSubtask={handleAddSubtask}
          onDeleteTask={handleDeleteTask}
          onMoveTask={moveIndependentTask}
        />
      )}

      {/* Add/Edit Column Modal */}
      {(isAddingColumn || editingColumn) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingColumn ? 'Renomear Coluna' : 'Nova Coluna'}
            </h3>
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="Nome da coluna"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsAddingColumn(false);
                  setEditingColumn(null);
                  setNewColumnName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={editingColumn ? handleSaveColumnEdit : handleAddColumn}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingColumn ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
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
    </div>
  );
}