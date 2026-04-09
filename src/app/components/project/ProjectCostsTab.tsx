import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Calculator, PiggyBank, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { Project } from '../../types';
import { useAdmin } from '../../context/AdminContext';
import { useProjects } from '../../context/ProjectContext';
import { buildPortfolioCostReports } from '../../utils/projectCosts';
import { getProjectCostsEndpointResponse } from '../../services/costsApi';
import { SearchableMultiSelect } from '../filters/SearchableMultiSelect';
import { Skeleton } from '../ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface ProjectCostsTabProps {
  project: Project;
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const hourFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function ProjectCostsTab({ project }: ProjectCostsTabProps) {
  const { users, teams, costSettings, currentUser } = useAdmin();
  const { projects } = useProjects();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedTeamNames, setSelectedTeamNames] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([project.id]);
  const [isRefreshing, setIsRefreshing] = useState(true);

  useEffect(() => {
    setSelectedProjectIds((current) => (current.length === 0 ? [project.id] : current));
  }, [project.id]);

  useEffect(() => {
    setIsRefreshing(true);
    const timeoutId = window.setTimeout(() => setIsRefreshing(false), 180);
    return () => window.clearTimeout(timeoutId);
  }, [project.id, startDate, endDate, selectedUserIds, selectedTeamNames, selectedProjectIds, costSettings.updatedAt]);

  const userOptions = useMemo(
    () => users.map((user) => ({ value: user.id, label: user.name })).sort((a, b) => a.label.localeCompare(b.label)),
    [users]
  );

  const teamOptions = useMemo(
    () => teams.map((team) => ({ value: team.name, label: team.name })).sort((a, b) => a.label.localeCompare(b.label)),
    [teams]
  );

  const projectOptions = useMemo(
    () => projects.map((item) => ({ value: item.id, label: item.name })).sort((a, b) => a.label.localeCompare(b.label)),
    [projects]
  );

  const sharedFilters = useMemo(
    () => ({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      userIds: selectedUserIds,
      teamNames: selectedTeamNames,
    }),
    [startDate, endDate, selectedUserIds, selectedTeamNames]
  );

  const projectCostsResponse = useMemo(
    () =>
      getProjectCostsEndpointResponse({
        projectId: project.id,
        currentUser,
        projects,
        users,
        settings: costSettings,
        filters: sharedFilters,
      }),
    [project.id, currentUser, projects, users, costSettings, sharedFilters]
  );

  const projectReport = projectCostsResponse.status === 200 ? projectCostsResponse.data : null;

  const portfolioReports = useMemo(
    () =>
      buildPortfolioCostReports(projects, users, costSettings, {
        ...sharedFilters,
        projectIds: selectedProjectIds,
      }),
    [projects, users, costSettings, sharedFilters, selectedProjectIds]
  );

  const totalPortfolioEconomy = useMemo(
    () => portfolioReports.reduce((sum, report) => sum + report.economy, 0),
    [portfolioReports]
  );

  if (projectCostsResponse.status === 403) {
    return <EmptyState message="Você não possui permissão para consultar os custos deste projeto." />;
  }

  if (!projectReport) {
    return <EmptyState message="Não foi possível carregar os custos deste projeto." />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Controle de Custos</h3>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Cálculo dinâmico a partir dos apontamentos de horas, custo real por colaborador e comparativos internos e terceirizados.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Parâmetros atuais: {currencyFormatter.format(costSettings.defaultInternalHourRate)}/h interno padrão e{' '}
            {currencyFormatter.format(costSettings.defaultExternalHourRate)}/h terceirizado
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FilterField label="Período inicial">
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </FilterField>
          <FilterField label="Período final">
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </FilterField>
          <FilterField label="Usuários">
            <SearchableMultiSelect
              value={selectedUserIds}
              onChange={setSelectedUserIds}
              options={userOptions}
              placeholder="Todos os usuários"
            />
          </FilterField>
          <FilterField label="Equipes">
            <SearchableMultiSelect
              value={selectedTeamNames}
              onChange={setSelectedTeamNames}
              options={teamOptions}
              placeholder="Todas as equipes"
            />
          </FilterField>
        </div>
      </section>

      {isRefreshing ? <CostsSkeleton /> : null}

      {!isRefreshing ? (
        <>
          <section className="space-y-4">
            <div>
              <h4 className="text-base font-semibold text-gray-900">Resumo do projeto</h4>
              <p className="text-sm text-gray-600">
                Visão consolidada de <strong>{project.name}</strong> com base nos filtros aplicados.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                title="Horas totais"
                value={`${hourFormatter.format(projectReport.total_hours)}h`}
                icon={<Users className="h-4 w-4" />}
              />
              <MetricCard
                title="Custo real"
                value={currencyFormatter.format(projectReport.total_cost_real)}
                icon={<PiggyBank className="h-4 w-4" />}
                tone={projectReport.total_cost_real > projectReport.total_cost_base ? 'danger' : 'default'}
              />
              <MetricCard
                title="Custo interno padrão"
                value={currencyFormatter.format(projectReport.total_cost_base)}
                icon={<Calculator className="h-4 w-4" />}
              />
              <MetricCard
                title="Custo terceirizado"
                value={currencyFormatter.format(projectReport.total_cost_external)}
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <MetricCard
                title="Economia"
                value={currencyFormatter.format(projectReport.economy)}
                icon={<TrendingDown className="h-4 w-4" />}
                tone={projectReport.economy >= 0 ? 'success' : 'danger'}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h4 className="text-base font-semibold text-gray-900">Detalhamento por usuário</h4>
              <p className="text-sm text-gray-600">
                Horas, custo/hora efetivo e custo total calculado dinamicamente por colaborador.
              </p>
            </div>

            {projectReport.breakdown_by_user.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Custo/Hora</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectReport.breakdown_by_user.map((entry) => (
                    <TableRow key={entry.user_id}>
                      <TableCell className="font-medium text-slate-900">{entry.user_name}</TableCell>
                      <TableCell>{hourFormatter.format(entry.hours)}h</TableCell>
                      <TableCell>{currencyFormatter.format(entry.cost_per_hour)}</TableCell>
                      <TableCell className="text-right font-semibold text-slate-900">
                        {currencyFormatter.format(entry.total_cost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState message="Nenhum apontamento encontrado para este projeto com os filtros atuais." />
            )}
          </section>

          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h4 className="text-base font-semibold text-gray-900">Tabela completa</h4>
                <p className="text-sm text-gray-600">
                  Visão avançada tipo planilha para comparar custos entre projetos.
                </p>
              </div>
              <div className="w-full max-w-md">
                <FilterField label="Projetos">
                  <SearchableMultiSelect
                    value={selectedProjectIds}
                    onChange={setSelectedProjectIds}
                    options={projectOptions}
                    placeholder="Projetos selecionados"
                  />
                </FilterField>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Economia acumulada na visão filtrada: {currencyFormatter.format(totalPortfolioEconomy)}
            </div>

            <div className="mt-5">
              {portfolioReports.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead>Custo Real</TableHead>
                      <TableHead>Custo Base</TableHead>
                      <TableHead>Custo Terceirizado</TableHead>
                      <TableHead className="text-right">Economia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {portfolioReports.map((report) => (
                      <TableRow key={report.project_id}>
                        <TableCell className="font-medium text-slate-900">{report.project_name}</TableCell>
                        <TableCell>{hourFormatter.format(report.total_hours)}h</TableCell>
                        <TableCell>{currencyFormatter.format(report.total_cost_real)}</TableCell>
                        <TableCell>{currencyFormatter.format(report.total_cost_base)}</TableCell>
                        <TableCell>{currencyFormatter.format(report.total_cost_external)}</TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            report.economy >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {currencyFormatter.format(report.economy)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState message="Nenhum projeto possui custo calculado com os filtros atuais." />
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function MetricCard({
  title,
  value,
  icon,
  tone = 'default',
}: {
  title: string;
  value: string;
  icon: ReactNode;
  tone?: 'default' | 'success' | 'danger';
}) {
  const toneClassName =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'danger'
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : 'border-slate-200 bg-white text-slate-700';

  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClassName}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{title}</span>
        <span>{icon}</span>
      </div>
      <div className="mt-4 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function CostsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-3xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-3xl" />
      <Skeleton className="h-80 rounded-3xl" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}
