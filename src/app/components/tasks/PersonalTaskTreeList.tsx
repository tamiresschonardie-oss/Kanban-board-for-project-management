import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Edit2,
  Link2,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import { EnrichedTask } from '../../context/TaskContext';
import { KanbanColumn } from '../../context/UserKanbanContext';
import { compareTasksByOperationalPriority } from '../../utils/operationalPriority';

interface PersonalTaskTreeListProps {
  tasks: EnrichedTask[];
  columns: KanbanColumn[];
  onTaskClick: (task: EnrichedTask) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdatePersonalStage: (taskId: string, stageId: string) => void;
  onToggleAutoComplete: (task: EnrichedTask) => void;
}

interface TreeNode {
  task: EnrichedTask;
  children: TreeNode[];
}

const ITEM_TYPE_STYLES: Record<string, string> = {
  Tarefa: 'bg-slate-100 text-slate-700',
  Subtarefa: 'bg-blue-100 text-blue-700',
  Subnivel: 'bg-indigo-100 text-indigo-700',
};

const OFFICIAL_STATUS_LABELS: Record<string, string> = {
  not_started: 'Não iniciada',
  in_progress: 'Em andamento',
  blocked: 'Bloqueada',
  done: 'Concluído',
};

const getPriorityBadge = (priority?: string) => {
  switch (priority) {
    case 'high':
      return <span className="rounded px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100">Alta</span>;
    case 'medium':
      return <span className="rounded px-2 py-0.5 text-xs font-medium text-yellow-700 bg-yellow-100">Média</span>;
    case 'low':
      return <span className="rounded px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100">Baixa</span>;
    default:
      return <span className="rounded px-2 py-0.5 text-xs font-medium text-gray-700 bg-gray-100">—</span>;
  }
};

const buildTree = (tasks: EnrichedTask[]) => {
  const nodeMap = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  tasks.forEach((task) => {
    nodeMap.set(task.id, {
      task,
      children: [],
    });
  });

  tasks.forEach((task) => {
    const parentId = task.parentTaskId;
    const node = nodeMap.get(task.id);
    if (!node) return;

    if (parentId && nodeMap.has(parentId)) {
      nodeMap.get(parentId)?.children.push(node);
      return;
    }

    roots.push(node);
  });

  const sortNodes = (nodes: TreeNode[]) =>
    nodes
      .sort((a, b) => compareTasksByOperationalPriority(a.task, b.task))
      .map((node) => ({
        ...node,
        children: sortNodes(node.children),
      }));

  return sortNodes(roots);
};

function TreeRow({
  node,
  level,
  expandedIds,
  onToggleExpand,
  columns,
  onTaskClick,
  onDeleteTask,
  onUpdatePersonalStage,
  onToggleAutoComplete,
}: {
  node: TreeNode;
  level: number;
  expandedIds: Set<string>;
  onToggleExpand: (taskId: string) => void;
  columns: KanbanColumn[];
  onTaskClick: (task: EnrichedTask) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdatePersonalStage: (taskId: string, stageId: string) => void;
  onToggleAutoComplete: (task: EnrichedTask) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const { task, children } = node;
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(task.id);
  const dueLabel = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : '—';
  const operationalPriorityLabel =
    task.prioritySource === 'governance-project'
      ? 'Projeto priorizado'
      : 'Prioridade operacional';

  return (
    <>
      <tr className="group border-b border-gray-100 hover:bg-gray-50">
        <td className="px-6 py-3">
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: `${level * 18}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(task.id);
                }}
                className="rounded p-0.5 hover:bg-gray-200"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}

            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                ITEM_TYPE_STYLES[task.itemTypeLabel || 'Tarefa'] || ITEM_TYPE_STYLES.Tarefa
              }`}
            >
              {task.itemTypeLabel || 'Tarefa'}
            </span>
            {task.isOperationallyPrioritized && (
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                {task.operationalPriorityOrder !== undefined
                  ? `${operationalPriorityLabel} #${task.operationalPriorityOrder + 1}`
                  : operationalPriorityLabel}
              </span>
            )}
            {task.isWeeklyFocus && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                Foco da semana
              </span>
            )}
            {(task.predecessorDependencies?.length || task.successorDependencies?.length) ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                <Link2 className="h-3 w-3" />
                {`${task.predecessorDependencies?.length || 0}/${task.successorDependencies?.length || 0}`}
              </span>
            ) : null}
            {task.isDependencyBlocked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                <AlertTriangle className="h-3 w-3" />
                Bloqueada
              </span>
            )}

            <button
              type="button"
              onClick={() => onTaskClick(task)}
              className="truncate text-left text-sm font-medium text-gray-900 hover:text-blue-600"
            >
              {task.title}
            </button>
          </div>
          {task.tags && task.tags.length > 0 && (
            <div
              className="mt-2 flex flex-wrap gap-1"
              style={{ paddingLeft: `${level * 18 + (hasChildren ? 28 : 28)}px` }}
            >
              {task.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] text-purple-700"
                >
                  {tag}
                </span>
              ))}
              {task.tags.length > 3 && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                  +{task.tags.length - 3}
                </span>
              )}
            </div>
          )}
          {task.isDependencyBlocked && task.dependencyBlockedReason && (
            <p
              className="mt-2 text-xs text-amber-700"
              style={{ paddingLeft: `${level * 18 + (hasChildren ? 28 : 28)}px` }}
            >
              {task.dependencyBlockedReason}
            </p>
          )}
        </td>
        <td className="px-6 py-3 text-sm text-gray-600">{task.assignee || '—'}</td>
        <td className="px-6 py-3 text-sm text-gray-600">
          {task.dueDate ? (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{dueLabel}</span>
            </div>
          ) : (
            '—'
          )}
        </td>
        <td className="px-6 py-3">{getPriorityBadge(task.priority)}</td>
        <td className="px-6 py-3">
          <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
            {OFFICIAL_STATUS_LABELS[task.projectStatus || task.status] || task.projectStatus || task.status}
          </span>
        </td>
        <td className="px-6 py-3">
          <select
            value={
              columns.some((column) => column.id === task.personalStatus)
                ? task.personalStatus
                : columns[0]?.id || ''
            }
            onChange={(e) => onUpdatePersonalStage(task.id, e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </select>
        </td>
        <td className="relative px-6 py-3">
          <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onTaskClick(task)}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              Abrir
            </button>
            <button
              type="button"
              onClick={() => onToggleAutoComplete(task)}
              className={`rounded px-2 py-1 text-xs font-medium ${
                task.autoCompleteFromChildren
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="rounded p-1 hover:bg-gray-200"
            >
              <MoreHorizontal className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-6 top-full z-20 mt-2 min-w-[160px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
                <button
                  onClick={() => {
                    onTaskClick(task);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <Edit2 className="h-4 w-4" />
                  Abrir detalhes
                </button>
                <button
                  onClick={() => {
                    onDeleteTask(task.id);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </button>
              </div>
            </>
          )}
        </td>
      </tr>

      {hasChildren && isExpanded &&
        children.map((child) => (
          <TreeRow
            key={child.task.id}
            node={child}
            level={level + 1}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            columns={columns}
            onTaskClick={onTaskClick}
            onDeleteTask={onDeleteTask}
            onUpdatePersonalStage={onUpdatePersonalStage}
            onToggleAutoComplete={onToggleAutoComplete}
          />
        ))}
    </>
  );
}

export function PersonalTaskTreeList({
  tasks,
  columns,
  onTaskClick,
  onDeleteTask,
  onUpdatePersonalStage,
  onToggleAutoComplete,
}: PersonalTaskTreeListProps) {
  const tree = useMemo(() => buildTree(tasks), [tasks]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const rootIds = tree.map((node) => node.task.id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      rootIds.forEach((id) => next.add(id));
      return next;
    });
  }, [tree]);

  const toggleExpand = (taskId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <Calendar className="mx-auto mb-4 h-16 w-16 text-gray-300" />
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          Nenhum item de execução encontrado
        </h3>
        <p className="text-gray-500">
          Ajuste os filtros ou atribua tarefas e subtarefas ao usuário para preencher esta visão
          pessoal.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Nome
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Responsável
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Data
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Prioridade
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Status do projeto
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Status pessoal
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {tree.map((node) => (
            <TreeRow
              key={node.task.id}
              node={node}
              level={0}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              columns={columns}
              onTaskClick={onTaskClick}
              onDeleteTask={onDeleteTask}
              onUpdatePersonalStage={onUpdatePersonalStage}
              onToggleAutoComplete={onToggleAutoComplete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
