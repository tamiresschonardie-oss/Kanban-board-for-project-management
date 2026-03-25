import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { WBSTask, Subtask } from '../types';

interface ProjectTasksTableViewProps {
  tasks: WBSTask[];
  onCreateTask: () => void;
}

export function ProjectTasksTableView({ tasks, onCreateTask }: ProjectTasksTableViewProps) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
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
        return 'Concluído';
      case 'doing':
        return 'Em Progresso';
      default:
        return 'Backlog';
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

  // Função para renderizar linhas (tarefas e subtarefas)
  const renderRows = (items: Array<WBSTask | Subtask>, level: number = 0, parentId?: string) => {
    const rows: any[] = [];

    items.forEach((item, index) => {
      const itemId = item.id;
      const hasChildren = 'subtasks' in item && item.subtasks && item.subtasks.length > 0;
      const isExpanded = expandedItems[itemId];
      const isTask = 'status' in item;
      const isSubtask = !isTask;

      // Linha principal do item (tarefa ou subtarefa)
      rows.push(
        <tr
          key={itemId}
          className={`border-b border-gray-200 ${
            isTask ? 'hover:bg-blue-50 bg-white font-semibold' : 'hover:bg-gray-50 bg-gray-50'
          }`}
        >
          <td className="px-6 py-4">
            <div className="flex items-center gap-2" style={{ marginLeft: `${level * 24}px` }}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpanded(itemId)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                >
                  <ChevronDown
                    className={`w-4 h-4 text-gray-600 transition-transform ${
                      isExpanded ? '' : '-rotate-90'
                    }`}
                  />
                </button>
              ) : (
                <div className="w-6" />
              )}
              <span className={`text-sm ${isTask ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                {item.title}
              </span>
              {hasChildren && (
                <span className="ml-auto text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                  {isTask 
                    ? `${(item as WBSTask).subtasks?.filter(s => s.completed).length || 0}/${(item as WBSTask).subtasks?.length || 0}`
                    : `${(item as Subtask).subtasks?.filter(s => s.completed).length || 0}/${(item as Subtask).subtasks?.length || 0}`
                  }
                </span>
              )}
            </div>
          </td>
          <td className="px-6 py-4">
            <span className={`text-sm ${isTask ? 'font-medium text-gray-700' : 'text-gray-600'}`}>
              {item.assignee || '—'}
            </span>
          </td>
          <td className="px-6 py-4">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getPriorityColor(item.priority)}`}>
              {getPriorityLabel(item.priority)}
            </span>
          </td>
          <td className="px-6 py-4">
            {item.dueDate ? (
              <span className={`text-sm ${isTask ? 'font-medium text-gray-700' : 'text-gray-600'}`}>
                {new Date(item.dueDate).toLocaleDateString('pt-BR')}
              </span>
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </td>
          <td className="px-6 py-4">
            {isTask ? (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor((item as WBSTask).status)}`}>
                {getStatusLabel((item as WBSTask).status)}
              </span>
            ) : (
              <span className="text-sm text-gray-600">{(item as Subtask).completed ? '✓ Concluído' : '—'}</span>
            )}
          </td>
        </tr>
      );

      // Renderizar filhos se expandido
      if (hasChildren && isExpanded) {
        const childRows = renderRows(
          'subtasks' in item ? item.subtasks! : [],
          level + 1,
          itemId
        );
        rows.push(...childRows);
      }
    });

    return rows;
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Nenhuma tarefa criada para este projeto</p>
        <button
          onClick={onCreateTask}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm mx-auto"
        >
          <Plus className="w-4 h-4" />
          Criar Primeira Tarefa
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Tarefas do Projeto ({tasks.length})</h3>
        <button
          onClick={onCreateTask}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full">
          {/* Header */}
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Responsável</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Prioridade</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Vencimento</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {renderRows(tasks)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
