import { Phase, Milestone } from '../types';

interface ProjectTimelineProps {
  phases: Phase[];
}

export function ProjectTimeline({ phases }: ProjectTimelineProps) {
  // Calculate project timeline
  const allDates: Date[] = [];
  
  phases.forEach(phase => {
    phase.milestones.forEach(milestone => {
      allDates.push(new Date(milestone.startDate));
      allDates.push(new Date(milestone.endDate));
    });
  });

  if (allDates.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <h3 className="font-semibold text-gray-900 mb-4">Timeline / Gantt</h3>
        <div className="text-center py-12 text-gray-500">
          <p>Nenhuma fase ou marco com datas definidas</p>
        </div>
      </div>
    );
  }

  const projectStart = new Date(Math.min(...allDates.map(d => d.getTime())));
  const projectEnd = new Date(Math.max(...allDates.map(d => d.getTime())));
  
  const totalDays = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));

  const calculatePosition = (date: Date) => {
    const days = Math.ceil((date.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
    return (days / totalDays) * 100;
  };

  const calculateWidth = (startDate: Date, endDate: Date) => {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max((days / totalDays) * 100, 2);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Timeline / Gantt</h3>
        <p className="text-sm text-gray-500 mt-1">
          Visualização temporal de fases e marcos
        </p>
      </div>

      <div className="p-6">
        {/* Timeline Header */}
        <div className="mb-6 flex items-center justify-between text-sm text-gray-600">
          <div>
            <span className="font-medium">Início:</span> {formatDate(projectStart)}
          </div>
          <div>
            <span className="font-medium">Término:</span> {formatDate(projectEnd)}
          </div>
          <div>
            <span className="font-medium">Duração:</span> {totalDays} dias
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="space-y-4">
          {phases.map((phase) => (
            <div key={phase.id} className="space-y-2">
              {/* Phase Header */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: phase.color }}
                />
                <span className="font-medium text-gray-900">{phase.name}</span>
                <span className="text-sm text-gray-500">
                  ({phase.milestones.length} marcos)
                </span>
              </div>

              {/* Milestones */}
              <div className="ml-5 space-y-2">
                {phase.milestones.map((milestone) => {
                  const startDate = new Date(milestone.startDate);
                  const endDate = new Date(milestone.endDate);
                  const leftPosition = calculatePosition(startDate);
                  const barWidth = calculateWidth(startDate, endDate);

                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'completed':
                        return 'bg-green-500';
                      case 'in-progress':
                        return 'bg-blue-500';
                      case 'delayed':
                        return 'bg-red-500';
                      default:
                        return 'bg-gray-300';
                    }
                  };

                  return (
                    <div key={milestone.id} className="relative">
                      {/* Milestone Name */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm text-gray-700">{milestone.name}</span>
                        <span className="text-xs text-gray-500">
                          {formatDate(startDate)} - {formatDate(endDate)}
                        </span>
                      </div>

                      {/* Timeline Bar Background */}
                      <div className="relative h-8 bg-gray-50 rounded border border-gray-200">
                        {/* Milestone Bar */}
                        <div
                          className={`absolute top-1 bottom-1 rounded ${getStatusColor(
                            milestone.status
                          )} shadow-sm hover:shadow-md transition-shadow cursor-pointer group`}
                          style={{
                            left: `${leftPosition}%`,
                            width: `${barWidth}%`,
                          }}
                          title={`${milestone.name}: ${formatDate(startDate)} - ${formatDate(endDate)}`}
                        >
                          {/* Tooltip on hover */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
                            <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                              {milestone.name}
                              <br />
                              {formatDate(startDate)} - {formatDate(endDate)}
                            </div>
                          </div>
                        </div>

                        {/* Today Marker */}
                        {(() => {
                          const today = new Date();
                          if (today >= projectStart && today <= projectEnd) {
                            const todayPosition = calculatePosition(today);
                            return (
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-orange-500 z-10"
                                style={{ left: `${todayPosition}%` }}
                              >
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-orange-500 rounded-full" />
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 rounded" />
            <span className="text-gray-600">Não iniciado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span className="text-gray-600">Em andamento</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span className="text-gray-600">Concluído</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span className="text-gray-600">Atrasado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-4 bg-orange-500" />
            <span className="text-gray-600">Hoje</span>
          </div>
        </div>
      </div>
    </div>
  );
}
