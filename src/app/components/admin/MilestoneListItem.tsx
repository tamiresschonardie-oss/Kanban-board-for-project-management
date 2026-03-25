import { useState } from 'react';
import { ChevronUp, ChevronDown, Edit2, Trash2 } from 'lucide-react';
import { Milestone } from '../../types';

interface MilestoneListItemProps {
  milestone: Milestone;
  idx: number;
  totalCount: number;
  onUpdate: (milestone: Milestone) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function MilestoneListItem({
  milestone,
  idx,
  totalCount,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: MilestoneListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: milestone.name,
    description: milestone.description || '',
    type: milestone.type,
    sla: milestone.sla || 0,
  });

  const handleSave = () => {
    onUpdate({
      ...milestone,
      name: editData.name,
      description: editData.description,
      type: editData.type,
      sla: editData.sla,
    });
    setIsEditing(false);
  };

  const milestoneTypeLabels = {
    business: 'Negócio',
    technical: 'Técnico',
    regulatory: 'Regulatório',
    delivery: 'Entrega',
  };

  if (isEditing) {
    return (
      <div className="border border-purple-200 bg-purple-50 rounded-lg p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
          <input
            type="text"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label>
          <textarea
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            rows={2}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={editData.type}
              onChange={(e) => setEditData({ ...editData, type: e.target.value as any })}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="business">Negócio</option>
              <option value="technical">Técnico</option>
              <option value="regulatory">Regulatório</option>
              <option value="delivery">Entrega</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">SLA (dias)</label>
            <input
              type="number"
              value={editData.sla}
              onChange={(e) => setEditData({ ...editData, sla: parseInt(e.target.value) || 0 })}
              min="0"
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 px-3 py-1 bg-purple-600 text-white rounded text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            Salvar
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
            {milestoneTypeLabels[milestone.type]}
          </span>
          {milestone.sla > 0 && (
            <span className="text-xs text-gray-500">SLA: {milestone.sla}d</span>
          )}
        </div>
        <p className="font-medium text-gray-900 truncate">{milestone.name}</p>
        {milestone.description && (
          <p className="text-xs text-gray-500 truncate">{milestone.description}</p>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onMoveUp}
          disabled={idx === 0}
          className="p-1 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
          title="Mover para cima"
        >
          <ChevronUp className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={idx === totalCount - 1}
          className="p-1 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
          title="Mover para baixo"
        >
          <ChevronDown className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={() => setIsEditing(true)}
          className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-600"
          title="Editar marco"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 hover:bg-red-100 rounded transition-colors text-gray-600 hover:text-red-600"
          title="Deletar marco"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
