import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock3,
  FolderKanban,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '../ui/chart';
import type { DashboardMetric, MyTasksDashboardData } from '../../utils/myTasksDashboard';
import { formatTrackedTime } from '../../utils/myTasksDashboard';

interface MyTasksDashboardProps {
  data: MyTasksDashboardData;
}

const DONUT_COLORS = ['#2563eb', '#14b8a6', '#f97316', '#8b5cf6', '#ef4444', '#64748b'];
const BAR_COLORS = ['#2563eb', '#0f766e', '#ea580c', '#7c3aed', '#dc2626', '#475569'];

function MetricCard({
  label,
  value,
  icon,
  supportingText,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  supportingText?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-gray-900">{value}</p>
          {supportingText ? (
            <p className="mt-2 text-xs text-gray-500">{supportingText}</p>
          ) : null}
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-gray-700">{icon}</div>
      </div>
    </div>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
      {message}
    </div>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

function StatusBarChart({ items }: { items: DashboardMetric[] }) {
  if (items.length === 0) {
    return <EmptyChartState message="Nenhuma tarefa encontrada para o recorte atual." />;
  }

  return (
    <ChartContainer
      config={{ total: { label: 'Tarefas', color: '#2563eb' } }}
      className="h-[280px] w-full"
    >
      <BarChart data={items} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" name="total" radius={[10, 10, 0, 0]}>
          {items.map((item, index) => (
            <Cell key={item.label} fill={BAR_COLORS[index % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function DistributionDonutChart({ items }: { items: DashboardMetric[] }) {
  if (items.length === 0) {
    return <EmptyChartState message="Nenhuma tarefa encontrada para o recorte atual." />;
  }

  const total = items.reduce((accumulator, item) => accumulator + item.value, 0);

  return (
    <ChartContainer
      config={Object.fromEntries(
        items.map((item, index) => [
          item.label,
          { label: item.label, color: DONUT_COLORS[index % DONUT_COLORS.length] },
        ])
      )}
      className="h-[280px] w-full"
    >
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, _name, _item, _index, payload) => {
                const percentage = total > 0 ? Math.round(((Number(value) || 0) / total) * 100) : 0;
                return (
                  <div className="flex min-w-[140px] items-center justify-between gap-3">
                    <span className="text-gray-600">{payload.payload.label}</span>
                    <span className="font-medium text-gray-900">
                      {value} ({percentage}%)
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        <Pie
          data={items}
          dataKey="value"
          nameKey="label"
          innerRadius={64}
          outerRadius={92}
          paddingAngle={2}
        >
          {items.map((item, index) => (
            <Cell key={item.label} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="label" />} />
      </PieChart>
    </ChartContainer>
  );
}

function HorizontalBarChart({ items }: { items: DashboardMetric[] }) {
  if (items.length === 0) {
    return <EmptyChartState message="Nenhuma tarefa encontrada para o recorte atual." />;
  }

  return (
    <ChartContainer
      config={{ total: { label: 'Tarefas', color: '#0f766e' } }}
      className="h-[280px] w-full"
    >
      <BarChart data={items} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
        <YAxis
          dataKey="label"
          type="category"
          width={88}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" name="total" radius={[0, 10, 10, 0]}>
          {items.map((item, index) => (
            <Cell key={item.label} fill={BAR_COLORS[index % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function MyTasksDashboard({ data }: MyTasksDashboardProps) {
  const totalTimeFormatted = formatTrackedTime(data.summary.totalTrackedSeconds);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          label="Total de tarefas"
          value={data.summary.total}
          icon={<FolderKanban className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          label="Em andamento"
          value={data.summary.inProgress}
          icon={<PlayCircle className="h-5 w-5 text-sky-600" />}
        />
        <MetricCard
          label="Concluídas"
          value={data.summary.completed}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
        <MetricCard
          label="Bloqueadas"
          value={data.summary.blocked}
          icon={<PauseCircle className="h-5 w-5 text-amber-600" />}
          supportingText="Detectadas por tag ou texto com bloqueio/impedimento"
        />
        <MetricCard
          label="Tarefas atrasadas"
          value={data.summary.overdue}
          icon={<AlertCircle className="h-5 w-5 text-red-600" />}
        />
        <MetricCard
          label="Tempo total registrado"
          value={totalTimeFormatted}
          icon={<Clock3 className="h-5 w-5 text-violet-600" />}
          supportingText="Soma de lançamentos manuais e timer automático"
        />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Tempo consolidado</h2>
            <p className="mt-1 text-sm text-gray-500">
              Total do usuário no recorte filtrado, unificando apontamentos manuais e automáticos.
            </p>
          </div>
          <div className="rounded-2xl bg-violet-50 px-5 py-4 text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-violet-700">
              hh:mm:ss
            </p>
            <p className="mt-1 text-3xl font-semibold text-violet-950">{totalTimeFormatted}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard
          title="Tarefas por Status"
          description="Distribuição pela etapa pessoal da tarefa dentro de Minhas Tarefas."
        >
          <StatusBarChart items={data.byStatus} />
        </ChartCard>

        <ChartCard
          title="Tarefas por Projeto"
          description="Mostra a concentração entre projetos, itens pessoais e tarefas exclusivas de sprint."
        >
          <DistributionDonutChart items={data.byProject} />
        </ChartCard>

        <ChartCard
          title="Tarefas por Prioridade"
          description="Recorte de urgência das tarefas sob responsabilidade do usuário logado."
        >
          <HorizontalBarChart items={data.byPriority} />
        </ChartCard>

        <ChartCard
          title="Tarefas por Equipe"
          description="Agrupamento pela equipe do projeto. Itens pessoais aparecem em uma faixa própria."
        >
          <HorizontalBarChart items={data.byTeam} />
        </ChartCard>

        <ChartCard
          title="Tarefas por Fluxo"
          description="Ajuda a entender onde a carga operacional está concentrada."
        >
          <HorizontalBarChart items={data.byFlow} />
        </ChartCard>

        <ChartCard
          title="Tarefas por Habilidade"
          description="Mostra o peso operacional por capacidade de negócio."
        >
          <HorizontalBarChart items={data.bySkill} />
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <ChartCard
          title="Prioridade do dia"
          description="Combina vencimento, prioridade e bloqueio para destacar o que exige ação primeiro."
        >
          <div className="space-y-3">
            {data.priorityToday.length > 0 ? data.priorityToday.map((item) => (
              <div key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {[item.projectName, item.dueDate ? `Prazo ${new Date(item.dueDate).toLocaleDateString('pt-BR')}` : '', item.priority ? `Prioridade ${item.priority}` : '']
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
                    {item.reason}
                  </span>
                </div>
              </div>
            )) : <EmptyChartState message="Nenhuma prioridade destacada para hoje." />}
          </div>
        </ChartCard>

        <ChartCard
          title="Tarefas bloqueadas"
          description="Itens travados por dependência que exigem desbloqueio ou acompanhamento."
        >
          <div className="space-y-3">
            {data.blockedTasks.length > 0 ? data.blockedTasks.map((item) => (
              <div key={item.id} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-medium text-amber-950">{item.title}</p>
                <p className="mt-1 text-xs text-amber-800">
                  {[item.projectName, item.reason].filter(Boolean).join(' • ')}
                </p>
              </div>
            )) : <EmptyChartState message="Nenhuma tarefa bloqueada no recorte atual." />}
          </div>
        </ChartCard>
      </section>

      <ChartCard
        title="Distribuição semanal"
        description="Mostra a concentração de entregas ao longo da semana para antecipar sobrecarga."
      >
        <StatusBarChart items={data.weeklyLoad} />
      </ChartCard>
    </div>
  );
}
