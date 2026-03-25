import { Milestone } from '../types';

interface MilestoneCardProps {
  milestone: Milestone;
}

const getMilestoneTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    business: 'Negócio',
    technical: 'Técnico',
    regulatory: 'Regulatório',
    delivery: 'Entrega',
  };
  return labels[type] || type;
};

const getMilestoneTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    business: 'bg-blue-100 text-blue-700',
    technical: 'bg-orange-100 text-orange-700',
    regulatory: 'bg-red-100 text-red-700',
    delivery: 'bg-green-100 text-green-700',
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
};

const getMilestoneStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'not-started': 'Não iniciado',
    'in-progress': 'Em progresso',
    completed: 'Concluído',
    delayed: 'Atrasado',
  };
  return labels[status] || status;
};

const getMilestoneStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'not-started': 'bg-gray-100 text-gray-700',
    'in-progress': 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    delayed: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
};

export function MilestoneCard({ milestone }: MilestoneCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded p-3 text-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-gray-900">{milestone.name}</h4>
        <div className="flex gap-1 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMilestoneTypeColor(milestone.type)}`}>
            {getMilestoneTypeLabel(milestone.type)}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getMilestoneStatusColor(milestone.status)}`}>
            {getMilestoneStatusLabel(milestone.status)}
          </span>
        </div>
      </div>

      {milestone.description && (
        <p className="text-xs text-gray-600 mb-2">{milestone.description}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-gray-500">
        {milestone.sla && (
          <span>SLA: {milestone.sla} dias</span>
        )}
      </div>
    </div>
  );
}
