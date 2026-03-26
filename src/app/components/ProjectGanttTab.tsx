import { Project, WBSTask } from '../types';
import { getPhaseProgress } from '../utils/progressCalculator';
import { getPhaseStatus, getPhaseStatusBadge } from '../utils/phaseStatusCalculator';
import {
  getProjectDateRange,
  getPhaseBarPosition,
  getPhaseDisplayDates,
  formatDate,
  calculateDuration,
} from '../utils/ganttCalculator';

interface ProjectGanttTabProps {
  project: Project;
  allTasks: WBSTask[];
}

export function ProjectGanttTab({ project, allTasks }: ProjectGanttTabProps) {
  if (!project.phases || project.phases.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-gray-500 text-lg font-medium">Nenhuma fase definida</p>
          <p className="text-gray-400 text-sm">
            Configure as fases da EAP para visualizar a timeline
          </p>
        </div>
      </div>
    );
  }

  const dateRange = getProjectDateRange(project.phases);

  if (!dateRange) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-gray-500 text-lg font-medium mb-2">Nenhuma fase possui datas definidas</p>
          <p className="text-gray-400 text-sm">
            Configure as datas de início e fim das fases para visualizar a timeline
          </p>
        </div>
      </div>
    );
  }

  const { projectStart, projectEnd, totalDays } = dateRange;

  // Calcular meses para o header
  const months: { date: Date; label: string }[] = [];
  const current = new Date(projectStart);
  while (current <= projectEnd) {
    months.push({
      date: new Date(current),
      label: current.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
    });
    current.setMonth(current.getMonth() + 1);
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full">
        {/* Header com timeline */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-48 flex-shrink-0"></div>
            <div className="flex-1 flex text-xs text-gray-500 font-medium">
              {months.map((month) => (
                <div
                  key={month.label}
                  className="flex-1 text-center border-l border-gray-200 px-2 py-1"
                >
                  {month.label}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-48 flex-shrink-0 text-xs text-gray-500">
              {formatDate(projectStart)} até {formatDate(projectEnd)}
            </div>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>
        </div>

        {/* Barras das fases */}
        <div className="space-y-4">
          {project.phases.map((phase) => {
            const progress = getPhaseProgress(phase.id, allTasks);
            const status = getPhaseStatus(phase.id, allTasks);
            const statusBadge = getPhaseStatusBadge(status);

            // Verificar se fase tem datas
            if (!phase.startDate || !phase.endDate) {
              return (
                <div key={phase.id} className="flex items-center gap-2">
                  <div className="w-48 flex-shrink-0">
                    <div className="font-medium text-sm text-gray-900">{phase.name}</div>
                    <div className="text-xs text-gray-500 mt-1">Sem prazo definido</div>
                  </div>
                  <div className="flex-1 flex items-center gap-3">
                    <div className="text-xs text-gray-400">{progress}%</div>
                    <div className="text-sm">{statusBadge.emoji}</div>
                  </div>
                </div>
              );
            }

            const position = getPhaseBarPosition(phase, projectStart, totalDays);
            const phaseDates = getPhaseDisplayDates(phase);
            const duration = calculateDuration(phaseDates.startDate, phaseDates.endDate);

            // Determinar cor da barra baseada no status
            const barColor =
              status === 'concluído'
                ? 'bg-green-500'
                : status === 'em-andamento'
                  ? 'bg-blue-500'
                  : status === 'em-risco'
                    ? 'bg-red-500'
                    : 'bg-gray-300';

            return (
              <div key={phase.id} className="flex items-center gap-2">
                {/* Info da fase */}
                <div className="w-48 flex-shrink-0">
                  <div className="font-medium text-sm text-gray-900">{phase.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatDate(phaseDates.startDate)} → {formatDate(phaseDates.endDate)} ({duration}d)
                  </div>
                </div>

                {/* Barra */}
                <div className="flex-1 relative h-8 bg-gray-100 rounded">
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 h-6 rounded transition-all ${barColor}`}
                    style={{
                      left: `${position.left}%`,
                      width: `${position.width}%`,
                      minWidth: '2px',
                    }}
                  >
                    {/* Percentual de progresso dentro da barra */}
                    {position.width > 8 && (
                      <div className="text-xs text-white font-medium pl-1 pt-1 truncate">
                        {progress}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-1 w-20 flex-shrink-0">
                  <span className="text-lg">{statusBadge.emoji}</span>
                  <span className="text-xs text-gray-600">{progress}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
