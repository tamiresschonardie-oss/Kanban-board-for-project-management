import { TrendingUp, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { useProjects } from '../context/ProjectContext';

export function KPIHeader() {
  const { projects } = useProjects();

  // Calculate KPIs
  const inProgress = projects.filter(p => 
    p.status !== 'backlog' && p.progress < 100
  ).length;

  const delayed = projects.filter(p => 
    p.progress < 50 && p.hoursRemaining > 100
  ).length;

  const completed = projects.filter(p => 
    p.progress === 100
  ).length;

  const upcomingDeadlines = projects.filter(p => 
    p.deadline && p.progress < 100
  ).length;

  const kpis = [
    {
      label: 'Projetos em andamento',
      value: inProgress,
      icon: TrendingUp,
      color: 'blue',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      valueColor: 'text-blue-600',
    },
    {
      label: 'Projetos atrasados',
      value: delayed,
      icon: AlertCircle,
      color: 'red',
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      valueColor: 'text-red-600',
    },
    {
      label: 'Projetos concluídos',
      value: completed,
      icon: CheckCircle2,
      color: 'green',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      valueColor: 'text-green-600',
    },
    {
      label: 'Prazos próximos',
      value: upcomingDeadlines,
      icon: Calendar,
      color: 'orange',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
      valueColor: 'text-orange-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-8 py-6">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.label}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2">{kpi.label}</p>
                <p className={`text-3xl font-bold ${kpi.valueColor}`}>
                  {kpi.value}
                </p>
              </div>
              <div className={`p-3 ${kpi.bgColor} rounded-xl`}>
                <Icon className={`w-6 h-6 ${kpi.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
