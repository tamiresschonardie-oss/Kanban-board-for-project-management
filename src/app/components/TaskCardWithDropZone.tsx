import { useDrop } from 'react-dnd';
import { WBSTask } from '../types';
import { useTasks } from '../context/TaskContext';
import { TaskCard } from './TaskCard';

interface TaskCardWithDropZoneProps {
  task: WBSTask;
  index: number;
  totalTasks: number;
  projectId?: string;
  phaseId: string;
  milestoneId?: string;
  allTasks: WBSTask[];
  onEdit?: (task: WBSTask) => void;
  onUpdateOrder?: () => void;
}

export function TaskCardWithDropZone({
  task,
  index,
  totalTasks,
  projectId,
  phaseId,
  milestoneId,
  allTasks,
  onEdit,
  onUpdateOrder,
}: TaskCardWithDropZoneProps) {
  const { updateTask } = useTasks();

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'REORDER_TASK',
    drop: (item: { taskId: string }) => {
      if (!projectId || item.taskId === task.id) return;

      // Encontrar índice da task sendo arrastada
      const fromIndex = allTasks.findIndex(t => t.id === item.taskId);
      if (fromIndex === -1) return;

      const toIndex = index;

      // Reordenar apenas se for movimento para cima ou para baixo
      if (fromIndex !== toIndex) {
        const reorderedTasks = [...allTasks];
        const [movedTask] = reorderedTasks.splice(fromIndex, 1);
        reorderedTasks.splice(toIndex, 0, movedTask);

        // Renormalizar orders (0, 1, 2, 3...) - ATUALIZAR DIRETO NO CONTEXTO
        reorderedTasks.forEach((t, i) => {
          if ((t.order || 0) !== i) {
            // Chamar updateTask diretamente com a nova ordem
            updateTask(t.id, { order: i });
          }
        });

        onUpdateOrder?.();
      }

      return { phaseId, milestoneId };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [task.id, index, projectId, phaseId, milestoneId, allTasks, updateTask]);

  return (
    <div
      ref={drop}
      className={`${isOver ? 'bg-blue-100 rounded' : ''} transition-colors`}
    >
      <TaskCard
        task={task}
        onEdit={onEdit}
        isDraggable={true}
        showOrderControls={false}
        isFirst={index === 0}
        isLast={index === totalTasks - 1}
      />
    </div>
  );
}
