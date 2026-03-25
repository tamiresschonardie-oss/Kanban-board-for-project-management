import { Flag, Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Milestone } from '../types';

interface MilestonePanelProps {
  milestones: Milestone[];
}

export function MilestonePanel({ milestones }: MilestonePanelProps) {
  const getMilestoneStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'delayed':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getMilestoneTypeColor = (type: string) => {
    switch (type) {
      case 'business':
        return 'bg-purple-100 text-purple-700';
      case 'technical':
        return 'bg-blue-100 text-blue-700';
      case 'regulatory':
        return 'bg-orange-100 text-orange-700';
      case 'delivery':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'in-progress':
        return 'Em andamento';
      case 'delayed':
        return 'Atrasado';
      default:
        return 'Não iniciado';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'business':
        return 'Negócio';
      case 'technical':
        return 'Técnico';
      case 'regulatory':
        return 'Regulatório';
      case 'delivery':
        return 'Entrega';
      default:
        return type;
    }
  };

  const calculateDelayDays = (milestone: Milestone) => {
    if (milestone.status === 'completed') return 0;
    
    const endDate = new Date(milestone.endDate);
    const today = new Date();
    const diffTime = today.getTime() - endDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  };

  const allMilestones = milestones.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Painel de Marcos (PMO)</h3>
        <p className="text-sm text-gray-500 mt-1">
          Acompanhamento de todos os marcos do projeto
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Marco
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Início
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Término
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                SLA
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Atraso
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Tarefas
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {allMilestones.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  <Flag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Nenhum marco cadastrado</p>
                </td>
              </tr>
            ) : (
              allMilestones.map((milestone) => {
                const delayDays = calculateDelayDays(milestone);
                const completedTasks = milestone.tasks.filter(t => t.status === 'done').length;
                const totalTasks = milestone.tasks.length;

                return (
                  <tr key={milestone.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900">{milestone.name}</p>
                          {milestone.description && (
                            <p className="text-sm text-gray-500 mt-0.5">
                              {milestone.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMilestoneTypeColor(
                          milestone.type
                        )}`}
                      >
                        {getTypeLabel(milestone.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getMilestoneStatusColor(
                          milestone.status
                        )}`}
                      >
                        {milestone.status === 'completed' && (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {milestone.status === 'delayed' && (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {getStatusLabel(milestone.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(milestone.startDate).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(milestone.endDate).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                        <Clock className="w-3.5 h-3.5" />
                        {milestone.sla} dias
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {delayDays > 0 ? (
                        <div className="flex items-center gap-1.5 text-sm text-red-600 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {delayDays} {delayDays === 1 ? 'dia' : 'dias'}
                        </div>
                      ) : (
                        <span className="text-sm text-green-600">No prazo</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">
                          {completedTasks}/{totalTasks}
                        </span>
                        <div className="mt-1 w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{
                              width: `${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {allMilestones.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-gray-600">
                  Concluídos: {allMilestones.filter(m => m.status === 'completed').length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-gray-600">
                  Em andamento: {allMilestones.filter(m => m.status === 'in-progress').length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-gray-600">
                  Atrasados: {allMilestones.filter(m => m.status === 'delayed').length}
                </span>
              </div>
            </div>
            <div className="text-gray-500">
              Total: {allMilestones.length} marcos
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
