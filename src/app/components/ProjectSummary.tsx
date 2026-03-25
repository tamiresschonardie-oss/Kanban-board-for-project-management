import {
  TrendingUp,
  AlertCircle,
  Clock,
  Activity,
  Target,
  Calendar,
} from 'lucide-react';
import { Project, Phase, ActivityLog } from '../types';

interface ProjectSummaryProps {
  project: Project;
  phases: Phase[];
}

export function ProjectSummary({ project, phases }: ProjectSummaryProps) {
  // Calculate current phase
  const getCurrentPhase = () => {
    for (const phase of phases) {
      const hasIncompleteMilestones = phase.milestones.some(
        m => m.status !== 'completed'
      );
      if (hasIncompleteMilestones) {
        return phase;
      }
    }
    return phases[phases.length - 1]; // Last phase if all completed
  };

  const currentPhase = phases.length > 0 ? getCurrentPhase() : null;

  // Calculate time spent per phase (mock data for now)
  const getPhaseTimeSpent = (phase: Phase) => {
    // In a real scenario, this would be calculated from actual time tracking
    const totalTasks = phase.milestones.reduce((sum, m) => sum + m.tasks.length, 0);
    const completedTasks = phase.milestones.reduce(
      (sum, m) => sum + m.tasks.filter(t => t.status === 'done').length,
      0
    );
    return Math.round((completedTasks / (totalTasks || 1)) * 100);
  };

  // Calculate risk indicator
  const getRiskIndicator = () => {
    if (project.riskLevel) {
      return {
        level: project.riskLevel,
        color: project.riskLevel === 'high' ? 'text-red-600 bg-red-50 border-red-200' :
               project.riskLevel === 'medium' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
               'text-green-600 bg-green-50 border-green-200',
        label: project.riskLevel === 'high' ? 'Alto Risco' :
               project.riskLevel === 'medium' ? 'Médio Risco' :
               'Baixo Risco',
      };
    }

    // Calculate based on progress and timeline
    if (project.progress < 30 && project.hoursRemaining > 120) {
      return { level: 'high', color: 'text-red-600 bg-red-50 border-red-200', label: 'Alto Risco' };
    } else if (project.progress < 60 && project.hoursRemaining > 80) {
      return { level: 'medium', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', label: 'Médio Risco' };
    }
    return { level: 'low', color: 'text-green-600 bg-green-50 border-green-200', label: 'Baixo Risco' };
  };

  const risk = getRiskIndicator();

  // Mock activity history (in real scenario, this would come from project.activities)
  const recentActivities: ActivityLog[] = project.activities || [
    {
      id: '1',
      timestamp: new Date().toISOString(),
      user: project.responsible,
      action: 'Projeto criado',
      details: 'Projeto iniciado com sucesso',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Resumo do Projeto</h3>
      </div>

      <div className="p-6 space-y-6">
        {/* Current Phase */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-gray-900">Fase Atual</h4>
          </div>
          {currentPhase ? (
            <div className="ml-7">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: currentPhase.color }}
                />
                <span className="font-medium text-gray-900">{currentPhase.name}</span>
              </div>
              {currentPhase.description && (
                <p className="text-sm text-gray-600 mt-1">{currentPhase.description}</p>
              )}
              <div className="mt-2 text-sm text-gray-600">
                <span className="font-medium">
                  {currentPhase.milestones.filter(m => m.status === 'completed').length}
                </span>
                {' de '}
                <span className="font-medium">{currentPhase.milestones.length}</span>
                {' marcos concluídos'}
              </div>
            </div>
          ) : (
            <p className="ml-7 text-sm text-gray-500">Nenhuma fase cadastrada</p>
          )}
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-gray-900">Progresso Geral</h4>
          </div>
          <div className="ml-7">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-blue-600">{project.progress}%</span>
              <span className="text-sm text-gray-600">
                {project.tasksCompleted} de {project.tasksTotal} tarefas
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Time Spent per Phase */}
        {phases.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-gray-900">Tempo por Fase</h4>
            </div>
            <div className="ml-7 space-y-3">
              {phases.map((phase) => {
                const timeSpent = getPhaseTimeSpent(phase);
                return (
                  <div key={phase.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: phase.color }}
                        />
                        <span className="text-sm text-gray-700">{phase.name}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {timeSpent}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${timeSpent}%`,
                          backgroundColor: phase.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Risk Indicator */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-gray-900">Indicador de Risco</h4>
          </div>
          <div className="ml-7">
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border font-medium ${risk.color}`}
            >
              <div className={`w-2 h-2 rounded-full ${risk.level === 'high' ? 'bg-red-500' : risk.level === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}`} />
              {risk.label}
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {risk.level === 'high' &&
                'Atenção necessária: projeto pode estar atrasado ou com problemas.'}
              {risk.level === 'medium' &&
                'Monitoramento recomendado: alguns indicadores requerem atenção.'}
              {risk.level === 'low' &&
                'Projeto dentro do esperado: todos os indicadores estão saudáveis.'}
            </p>
          </div>
        </div>

        {/* Activity History */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-gray-900">Histórico de Atividades</h4>
          </div>
          <div className="ml-7 space-y-3">
            {recentActivities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user}</span> {activity.action}
                    </p>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {new Date(activity.timestamp).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">{activity.details}</p>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <p className="text-sm text-gray-500">Nenhuma atividade registrada</p>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {project.startDate && (
              <div>
                <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span>Data de Início</span>
                </div>
                <p className="font-medium text-gray-900">
                  {new Date(project.startDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
            {project.deadline && (
              <div>
                <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span>Data de Término</span>
                </div>
                <p className="font-medium text-gray-900">
                  {new Date(project.deadline).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                <Clock className="w-4 h-4" />
                <span>Horas Restantes</span>
              </div>
              <p className="font-medium text-gray-900">{project.hoursRemaining}h</p>
            </div>
            {project.budget && (
              <div>
                <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                  <Target className="w-4 h-4" />
                  <span>Orçamento</span>
                </div>
                <p className="font-medium text-gray-900">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(project.budget)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
