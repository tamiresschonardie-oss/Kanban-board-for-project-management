import { ReactNode } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CircleDot,
  GripHorizontal,
  Layers3,
  PauseCircle,
  Sparkles,
  Target,
  User,
  Users,
} from 'lucide-react';
import { Project } from '../../types';
import { useAdmin } from '../../context/AdminContext';
import {
  PROJECT_PURPOSES_LABELS,
  PROJECT_SITUATIONS_LABELS,
} from '../../constants/project';
import {
  getProjectCurrentExecutionPhaseLabel,
  getProjectGovernancePhaseId,
  getProjectGovernanceSituation,
  getProjectMetrics,
  getProjectRequester,
  getProjectSmartStatus,
  getProjectTaskCounts,
} from '../../utils/projectSelectors';

interface ProjectDetailHeaderProps {
  project: Project;
  governancePhaseLabel: string;
  situationControl?: ReactNode;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const GOVERNANCE_BADGE_STYLES: Record<string, string> = {
  backlog: 'bg-slate-100 text-slate-700',
  'pre-analysis': 'bg-blue-100 text-blue-700',
  construction: 'bg-emerald-100 text-emerald-700',
  'waiting-approval': 'bg-amber-100 text-amber-700',
  documentation: 'bg-violet-100 text-violet-700',
};

const SITUATION_BADGE_STYLES: Record<string, string> = {
  ativo: 'bg-green-100 text-green-700',
  pausado: 'bg-yellow-100 text-yellow-700',
  cancelado: 'bg-red-100 text-red-700',
};

const formatDate = (value?: string) => {
  if (!value) return 'Nao informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
};

export function ProjectDetailHeader({
  project,
  governancePhaseLabel,
  situationControl,
  collapsed = false,
  onToggleCollapsed,
}: ProjectDetailHeaderProps) {
  const { users } = useAdmin();
  const metrics = getProjectMetrics(project);
  const taskCounts = getProjectTaskCounts(project);
  const governancePhaseId = getProjectGovernancePhaseId(project);
  const situation = getProjectGovernanceSituation(project);
  const smartStatus = getProjectSmartStatus(project);
  const strategicSummary = project.objective || project.justification || project.weeklyUpdate;
  const strategicChips = [
    project.objective ? 'Objetivo definido' : null,
    project.justification ? 'Justificativa definida' : null,
    project.expectedBenefits?.length ? `${project.expectedBenefits.length} beneficio(s)` : null,
  ].filter(Boolean) as string[];
  const getUserLabel = (name?: string) => {
    if (!name) return 'Nao informado';
    const user = users.find((item) => item.name === name);
    return user?.cargo ? `${name} • ${user.cargo}` : name;
  };

  if (collapsed) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-sm"
              style={{ backgroundColor: project.logoColor }}
            >
              {project.logoText || project.name.slice(0, 2).toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {project.isWeeklyFocus ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    Foco
                  </span>
                ) : null}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    GOVERNANCE_BADGE_STYLES[governancePhaseId] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <CircleDot className="h-3.5 w-3.5" />
                  {governancePhaseLabel}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    SITUATION_BADGE_STYLES[situation] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {situation === 'pausado' ? <PauseCircle className="h-3.5 w-3.5" /> : null}
                  {PROJECT_SITUATIONS_LABELS[situation] || situation}
                </span>
              </div>
              <h1 className="mt-2 truncate text-xl font-semibold text-slate-950">{project.name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {getProjectCurrentExecutionPhaseLabel(project)} • {metrics.progress}% • {metrics.hoursRemaining}h restantes
              </p>
              {strategicSummary ? (
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                  {strategicSummary}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {situationControl ? <div className="hidden xl:block">{situationControl}</div> : null}
            {onToggleCollapsed ? (
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <ChevronDown className="h-4 w-4" />
                Expandir resumo
              </button>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm xl:px-8">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
        <div className="min-w-0">
          <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-sm"
            style={{ backgroundColor: project.logoColor }}
          >
            {project.logoText || project.name.slice(0, 2).toUpperCase()}
          </div>

            <div className="min-w-0 space-y-3">
            <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                {project.isWeeklyFocus ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <Sparkles className="h-3.5 w-3.5" />
                    Foco
                  </span>
                ) : null}
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                    GOVERNANCE_BADGE_STYLES[governancePhaseId] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <CircleDot className="w-3.5 h-3.5" />
                  Governanca: {governancePhaseLabel}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                    SITUATION_BADGE_STYLES[situation] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {situation === 'pausado' && <PauseCircle className="w-3.5 h-3.5" />}
                  Situacao: {PROJECT_SITUATIONS_LABELS[situation] || situation}
                </span>
              </div>

                <h1 className="truncate text-3xl font-bold text-gray-900">{project.name}</h1>
            </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusPill label="Status inteligente" value={smartStatus} />
                <StatusPill label="Fase atual" value={getProjectCurrentExecutionPhaseLabel(project)} />
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <ContextCard
                  title="Objetivo"
                  value={project.objective || 'Objetivo ainda não registrado.'}
                />
                <ContextCard
                  title="Justificativa"
                  value={project.justification || 'Justificativa ainda não registrada.'}
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <ContextCard
                  title="Atualização executiva"
                  value={project.weeklyUpdate || 'Sem atualização executiva registrada.'}
                />
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Benefícios esperados
                  </p>
                  {project.expectedBenefits && project.expectedBenefits.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {project.expectedBenefits.map((benefit, index) => (
                        <span
                          key={`${benefit}-${index}`}
                          className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          {benefit}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      Nenhum benefício esperado informado.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 md:grid-cols-2 xl:grid-cols-3">
                <MetaItem icon={<Target className="w-4 h-4" />} label="Cliente" value={project.client} />
                <MetaItem icon={<User className="w-4 h-4" />} label="Responsavel" value={getUserLabel(project.responsible)} />
              <MetaItem
                icon={<User className="w-4 h-4" />}
                label="Solicitante"
                value={getUserLabel(getProjectRequester(project))}
              />
              <MetaItem
                icon={<Layers3 className="w-4 h-4" />}
                label="Produto"
                value={project.product || 'Nao informado'}
              />
              <MetaItem
                icon={<Target className="w-4 h-4" />}
                label="Finalidade"
                value={
                  project.purpose ? PROJECT_PURPOSES_LABELS[project.purpose] || project.purpose : 'Nao informada'
                }
              />
              <MetaItem
                icon={<Users className="w-4 h-4" />}
                label="Equipe principal"
                value={project.group || 'Nao informada'}
              />
              </div>

              {strategicChips.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {strategicChips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              ) : null}

              {situationControl ? <div className="pt-1">{situationControl}</div> : null}
            </div>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-2">
          <StatCard label="Progresso" value={`${metrics.progress}%`} helper={`${taskCounts.completed}/${taskCounts.total} tarefas`} />
          <StatCard label="Horas restantes" value={`${metrics.hoursRemaining}h`} helper="Resumo operacional" />
          <StatCard
            label="Solicitado em"
            value={formatDate(project.requestDate)}
            helper="Data da solicitacao"
          />
          <StatCard
            label="Previsto para"
            value={formatDate(project.deadline)}
            helper={project.completionDate ? `Concluido em ${formatDate(project.completionDate)}` : 'Sem conclusao'}
          />
        </div>
      </div>

      {onToggleCollapsed ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <GripHorizontal className="h-4 w-4 text-slate-400" />
            Recolher resumo
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </section>
  );
}

function StatusPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium text-gray-800 truncate">{value}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-1 break-words">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{helper}</p>
    </div>
  );
}

function ContextCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700 whitespace-pre-wrap">
        {value}
      </p>
    </div>
  );
}
