import { WBSTask } from '../types';

/**
 * Normaliza os valores de order em um grupo de tasks
 * Garante sequência contínua (0,1,2,3...) sem duplicatas
 * @param tasks Tasks a serem normalizadas
 * @returns Tasks com order normalizado
 */
export function normalizeTaskOrders(tasks: WBSTask[]): WBSTask[] {
  return tasks
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((task, index) => ({
      ...task,
      order: index,
    }));
}

/**
 * Move uma task para uma nova posição e renormaliza o grupo
 * @param tasks Tasks do grupo
 * @param taskId ID da task a mover
 * @param newPosition Nova posição (0-based)
 * @returns Tasks com nova ordem normalizada
 */
export function reorderTaskInGroup(
  tasks: WBSTask[],
  taskId: string,
  newPosition: number
): WBSTask[] {
  const sorted = [...tasks].sort((a, b) => (a.order || 0) - (b.order || 0));
  const taskIndex = sorted.findIndex(t => t.id === taskId);

  if (taskIndex === -1 || newPosition < 0 || newPosition >= sorted.length) {
    return sorted;
  }

  const [task] = sorted.splice(taskIndex, 1);
  sorted.splice(newPosition, 0, task);

  return sorted.map((t, index) => ({
    ...t,
    order: index,
  }));
}

/**
 * Move uma task uma posição para cima
 * @param tasks Tasks do grupo
 * @param taskId ID da task a mover
 * @returns Tasks com nova ordem normalizada
 */
export function moveTaskUp(tasks: WBSTask[], taskId: string): WBSTask[] {
  const sorted = [...tasks].sort((a, b) => (a.order || 0) - (b.order || 0));
  const taskIndex = sorted.findIndex(t => t.id === taskId);

  if (taskIndex <= 0) return sorted;

  return reorderTaskInGroup(sorted, taskId, taskIndex - 1);
}

/**
 * Move uma task uma posição para baixo
 * @param tasks Tasks do grupo
 * @param taskId ID da task a mover
 * @returns Tasks com nova ordem normalizada
 */
export function moveTaskDown(tasks: WBSTask[], taskId: string): WBSTask[] {
  const sorted = [...tasks].sort((a, b) => (a.order || 0) - (b.order || 0));
  const taskIndex = sorted.findIndex(t => t.id === taskId);

  if (taskIndex < 0 || taskIndex >= sorted.length - 1) return sorted;

  return reorderTaskInGroup(sorted, taskId, taskIndex + 1);
}
