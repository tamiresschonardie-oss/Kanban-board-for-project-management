import { useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { CheckSquare, Clock, User, Filter } from 'lucide-react';
import { WBSTask, Phase, TaskStatus } from '../types';

interface TaskKanbanProps {
  phases: Phase[];
  onUpdateTask?: (taskId: string, updates: Partial<WBSTask>) => void;
}

interface KanbanColumn {
  id: TaskStatus;
  label: string;
  color: string;
}

const COLUMNS: KanbanColumn[] = [
  { id: 'todo', label: 'A Fazer', color: 'bg-gray-100' },
  { id: 'doing', label: 'Fazendo', color: 'bg-blue-100' },
  { id: 'done', label: 'Concluído', color: 'bg-green-100' },
];

interface TaskCardProps {
  task: WBSTask;
  phaseName: string;
  milestoneName: string;
  onUpdateTask?: (taskId: string, updates: Partial<WBSTask>) => void;
}

function TaskCard({ task, phaseName, milestoneName, onUpdateTask }: TaskCardProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TASK',
    item: { id: task.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-l-red-500';
      case 'medium':
        return 'border-l-4 border-l-yellow-500';
      case 'low':
        return 'border-l-4 border-l-green-500';
      default:
        return 'border-l-4 border-l-gray-300';
    }
  };

  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const totalSubtasks = task.subtasks.length;

  return (
    <div
      ref={drag}
      className={`bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${getPriorityColor(task.priority)}`}
    >
      <h4 className="font-medium text-gray-900 text-sm mb-2">{task.title}</h4>

      {task.description && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{task.description}</p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-2">
        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
          {phaseName}
        </span>
        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
          {milestoneName}
        </span>
      </div>

      {/* Subtasks Progress */}
      {totalSubtasks > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <CheckSquare className="w-3 h-3" />
              <span>
                {completedSubtasks}/{totalSubtasks}
              </span>
            </div>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full"
              style={{
                width: `${totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        {task.assignee ? (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{task.assignee}</span>
          </div>
        ) : (
          <div />
        )}
        {task.estimatedHours && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{task.estimatedHours}h</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface ColumnProps {
  column: KanbanColumn;
  tasks: Array<WBSTask & { phaseName: string; milestoneName: string }>;
  onDrop: (taskId: string, newStatus: TaskStatus) => void;
  onUpdateTask?: (taskId: string, updates: Partial<WBSTask>) => void;
}

function Column({ column, tasks, onDrop, onUpdateTask }: ColumnProps) {
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
    <div className="flex-1 min-w-[280px]">
      <div className={`${column.color} rounded-lg px-3 py-2 mb-3`}>
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900">{column.label}</span>
          <span className="bg-white px-2 py-0.5 rounded text-xs font-medium text-gray-700">
            {tasks.length}
          </span>
        </div>
      </div>
      <div
        ref={drop}
        className={`space-y-2 min-h-[400px] ${isOver ? 'bg-blue-50 rounded-lg p-2' : ''}`}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            phaseName={task.phaseName}
            milestoneName={task.milestoneName}
            onUpdateTask={onUpdateTask}
          />
        ))}
      </div>
    </div>
  );
}

export function TaskKanban({ phases, onUpdateTask }: TaskKanbanProps) {
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [milestoneFilter, setMilestoneFilter] = useState<string>('all');

  // Flatten all tasks from all phases and milestones
  const allTasks: Array<WBSTask & { phaseName: string; milestoneName: string; phaseId: string; milestoneId: string }> = [];
  
  phases.forEach(phase => {
    phase.milestones.forEach(milestone => {
      milestone.tasks.forEach(task => {
        allTasks.push({
          ...task,
          phaseName: phase.name,
          milestoneName: milestone.name,
          phaseId: phase.id,
          milestoneId: milestone.id,
        });
      });
    });
  });

  // Apply filters
  const filteredTasks = allTasks.filter(task => {
    if (phaseFilter !== 'all' && task.phaseId !== phaseFilter) return false;
    if (milestoneFilter !== 'all' && task.milestoneId !== milestoneFilter) return false;
    return true;
  });

  const handleDrop = (taskId: string, newStatus: TaskStatus) => {
    if (onUpdateTask) {
      onUpdateTask(taskId, { status: newStatus });
    }
  };

  // Get unique phases and milestones for filters
  const uniquePhases = Array.from(new Set(phases.map(p => ({ id: p.id, name: p.name }))));
  const uniqueMilestones = phases.flatMap(p => 
    p.milestones.map(m => ({ id: m.id, name: m.name, phaseId: p.id }))
  ).filter(m => phaseFilter === 'all' || m.phaseId === phaseFilter);

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Kanban de Tarefas</h3>
            <p className="text-sm text-gray-500 mt-1">
              Gerencie as tarefas do projeto
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CheckSquare className="w-4 h-4" />
            <span>
              {filteredTasks.filter(t => t.status === 'done').length}/{filteredTasks.length} concluídas
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={phaseFilter}
              onChange={(e) => {
                setPhaseFilter(e.target.value);
                setMilestoneFilter('all');
              }}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas as fases</option>
              {uniquePhases.map(phase => (
                <option key={phase.id} value={phase.id}>{phase.name}</option>
              ))}
            </select>
          </div>

          <select
            value={milestoneFilter}
            onChange={(e) => setMilestoneFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={phaseFilter === 'all' && uniqueMilestones.length === 0}
          >
            <option value="all">Todos os marcos</option>
            {uniqueMilestones.map(milestone => (
              <option key={milestone.id} value={milestone.id}>{milestone.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Nenhuma tarefa encontrada</p>
          </div>
        ) : (
          <DndProvider backend={HTML5Backend}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {COLUMNS.map((column) => {
                const columnTasks = filteredTasks.filter((t) => t.status === column.id);
                return (
                  <Column
                    key={column.id}
                    column={column}
                    tasks={columnTasks}
                    onDrop={handleDrop}
                    onUpdateTask={onUpdateTask}
                  />
                );
              })}
            </div>
          </DndProvider>
        )}
      </div>
    </div>
  );
}
