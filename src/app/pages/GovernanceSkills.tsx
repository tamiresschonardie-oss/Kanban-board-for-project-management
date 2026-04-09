import { BrainCircuit, ChevronRight, FolderKanban, ListTodo, Star, UserCircle2 } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAdmin } from '../context/AdminContext';
import { useProjects } from '../context/ProjectContext';
import { useTasks } from '../context/TaskContext';
import { canAccessGovernance } from '../utils/permissions';
import { getSkillMetrics } from '../utils/skillSelectors';

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  draft: 'Rascunho',
  paused: 'Pausada',
  archived: 'Arquivada',
};

export function GovernanceSkills() {
  const navigate = useNavigate();
  const { currentUser, skills, users, toggleFavoriteEntity, isFavoriteEntity } = useAdmin();
  const { projects } = useProjects();
  const { allTasks } = useTasks();

  const skillRows = useMemo(
    () =>
      skills
        .map((skill) => {
          const metrics = getSkillMetrics(skill, projects, allTasks);
          const ownerName =
            users.find((user) => user.id === skill.ownerId)?.name || 'Sem dono definido';

          return {
            skill,
            ownerName,
            metrics,
          };
        })
        .sort((a, b) => {
          if (b.metrics.totalProjects !== a.metrics.totalProjects) {
            return b.metrics.totalProjects - a.metrics.totalProjects;
          }
          return a.skill.name.localeCompare(b.skill.name, 'pt-BR');
        }),
    [skills, projects, allTasks, users]
  );

  if (!canAccessGovernance(currentUser)) {
    return (
      <div className="page-shell flex h-full items-center justify-center">
        <div className="section-card max-w-xl border-red-200 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Acesso restrito</h1>
          <p className="mt-2 text-slate-600">
            Seu perfil atual não possui permissão para acessar a visão de habilidades da governança.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-6">
      <div className="page-header gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Habilidades</h1>
          <p className="mt-2 text-sm text-slate-500">
            Habilidade é uma capacidade recorrente da empresa. Aqui você conecta essa capacidade aos projetos e às tarefas em andamento.
          </p>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Para que serve
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Use habilidades para mapear competências recorrentes, como análise de crédito, implantação ou comercial.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              O que acompanhar
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Veja quantos projetos e tarefas dependem dessa capacidade e onde existe sobrecarga ou gargalo.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Primeiro uso
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Cadastre a capacidade em Administração, vincule ao projeto e acompanhe o uso real por aqui.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          label="Habilidades ativas"
          value={skillRows.filter((item) => item.skill.status === 'active').length}
          icon={<BrainCircuit className="h-5 w-5 text-blue-600" />}
        />
        <MetricCard
          label="Projetos vinculados"
          value={skillRows.reduce((acc, item) => acc + item.metrics.totalProjects, 0)}
          icon={<FolderKanban className="h-5 w-5 text-emerald-600" />}
        />
        <MetricCard
          label="Tarefas vinculadas"
          value={skillRows.reduce((acc, item) => acc + item.metrics.totalTasks, 0)}
          icon={<ListTodo className="h-5 w-5 text-violet-600" />}
        />
        <MetricCard
          label="Em andamento"
          value={skillRows.reduce((acc, item) => acc + item.metrics.tasksInProgress, 0)}
          icon={<ListTodo className="h-5 w-5 text-amber-600" />}
        />
        <MetricCard
          label="Concluídas"
          value={skillRows.reduce((acc, item) => acc + item.metrics.tasksCompleted, 0)}
          icon={<ListTodo className="h-5 w-5 text-sky-600" />}
        />
      </section>

      <section className="section-card">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">Lista de habilidades</h2>
          <p className="mt-1 text-sm text-slate-500">
            Visualização estratégica da capacidade instalada, com foco em uso real e impacto operacional.
          </p>
        </div>

        <div className="space-y-3">
          {skillRows.length > 0 ? (
            skillRows.map(({ skill, ownerName, metrics }) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => navigate(`/governance/skills/${skill.id}`)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-4 text-left transition-colors hover:bg-white"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{skill.name}</p>
                    {isFavoriteEntity('skill', skill.id) && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                        Favorita
                      </span>
                    )}
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                      {STATUS_LABELS[skill.status] || skill.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {skill.area || 'Área não definida'} • Dono: {ownerName}
                  </p>
                </div>

                <div className="hidden items-center gap-3 md:flex">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleFavoriteEntity('skill', skill.id);
                    }}
                    className={`rounded-full p-2 transition-colors ${
                      isFavoriteEntity('skill', skill.id)
                        ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                        : 'bg-white text-slate-400 hover:bg-slate-100 hover:text-amber-500'
                    }`}
                    title={
                      isFavoriteEntity('skill', skill.id)
                        ? 'Remover dos favoritos'
                        : 'Adicionar aos favoritos'
                    }
                  >
                    <Star className={`h-4 w-4 ${isFavoriteEntity('skill', skill.id) ? 'fill-current' : ''}`} />
                  </button>
                  <MetricText label="Projetos" value={metrics.totalProjects} />
                  <MetricText label="Tarefas" value={metrics.totalTasks} />
                  <MetricText label="Em andamento" value={metrics.tasksInProgress} />
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
              <p className="text-sm font-medium text-slate-900">Nenhuma habilidade cadastrada ainda</p>
              <p className="mt-1 text-sm text-slate-500">
                Cadastre a primeira capacidade em Administração para depois acompanhar projetos, tarefas e responsáveis vinculados por aqui.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="metric-card">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-slate-50 p-2.5">{icon}</div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MetricText({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-right">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
