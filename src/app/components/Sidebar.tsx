import { NavLink, useNavigate } from 'react-router';
import { Plus, Users, ChevronDown, ChevronRight, Building2, Settings, Home as HomeIcon, CheckSquare, CalendarDays, LogOut, LayoutGrid, TrendingUp, BarChart3 } from 'lucide-react';
import { useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { canAccessGovernance, canUserPerform, getRoleLabel, isPmoUser } from '../utils/permissions';
import { getUserTeams } from '../utils/userTeams';

export function Sidebar({ onCreateProject }: { onCreateProject: () => void }) {
  const [workspacesExpanded, setWorkspacesExpanded] = useState(false);
  const navigate = useNavigate();
  const { currentUser, logout, teams, workspaces } = useAdmin();

  const canCreateProject = canUserPerform(currentUser, 'project:create');
  const canAccessAdmin = isPmoUser(currentUser);
  const canSeeGovernance = canAccessGovernance(currentUser);
  const visibleWorkspaces = (() => {
    const activeWorkspaces = workspaces
      .filter((workspace) => workspace.status === 'active' && !workspace.deletedAt)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    if (currentUser?.role !== 'user') {
      return activeWorkspaces;
    }

    const userTeams = new Set(getUserTeams(currentUser));
    const teamIds = teams.filter((team) => userTeams.has(team.name)).map((team) => team.id);
    return activeWorkspaces.filter((workspace) => workspace.teamIds.some((teamId) => teamIds.includes(teamId)));
  })();

  return (
    <aside className="flex h-screen w-68 flex-col border-r border-slate-200/70 bg-sidebar/90 backdrop-blur-xl">
      {/* Logo */}
      <div className="border-b border-slate-200/70 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 shadow-[0_12px_24px_rgba(15,23,42,0.16)]">
            <div className="text-lg font-semibold text-white">P</div>
          </div>
          <div>
            <span className="block text-lg font-semibold tracking-tight text-slate-900">PMO</span>
            <span className="block text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
              Workspace Hub
            </span>
          </div>
        </div>
      </div>

      {/* Create Project Button */}
      <div className="px-4 py-5">
        {canCreateProject && (
          <button
            onClick={onCreateProject}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Criar Projeto
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-4 pb-6">
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Navegação
          </p>
        {/* Início */}
        <NavLink
          to="/"
          end
          className={({ isActive }) => 
            `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all ${
              isActive ? 'bg-sidebar-accent text-slate-950 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.06)]' : 'text-slate-500 hover:bg-white/75 hover:text-slate-800'
            }`
          }
        >
          <HomeIcon className="h-4 w-4" />
          <span className="flex-1 text-left font-medium">Início</span>
        </NavLink>

        {/* Minhas Tarefas */}
        <NavLink
          to="/my-tasks"
          className={({ isActive }) => 
            `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all ${
              isActive ? 'bg-sidebar-accent text-slate-950 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.06)]' : 'text-slate-500 hover:bg-white/75 hover:text-slate-800'
            }`
          }
        >
          <CheckSquare className="h-4 w-4" />
          <span className="flex-1 text-left font-medium">Minhas Tarefas</span>
        </NavLink>

        <NavLink
          to="/agenda"
          className={({ isActive }) => 
            `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all ${
              isActive ? 'bg-sidebar-accent text-slate-950 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.06)]' : 'text-slate-500 hover:bg-white/75 hover:text-slate-800'
            }`
          }
        >
          <CalendarDays className="h-4 w-4" />
          <span className="flex-1 text-left font-medium">Agenda</span>
        </NavLink>

        {/* Governança */}
        {canSeeGovernance && (
          <div className="space-y-1">
            <NavLink
              to="/governance"
              className={({ isActive }) => 
                `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all ${
                  isActive ? 'bg-sidebar-accent text-slate-950 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.06)]' : 'text-slate-500 hover:bg-white/75 hover:text-slate-800'
                }`
              }
            >
              <Building2 className="h-4 w-4" />
              <span className="flex-1 text-left font-medium">Governança</span>
            </NavLink>
            <NavLink
              to="/results"
              className={({ isActive }) => 
                `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all ${
                  isActive ? 'bg-sidebar-accent text-slate-950 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.06)]' : 'text-slate-500 hover:bg-white/75 hover:text-slate-800'
                }`
              }
            >
              <TrendingUp className="h-4 w-4" />
              <span className="flex-1 text-left font-medium">Resultados</span>
            </NavLink>
            <NavLink
              to="/results/dashboard"
              className={({ isActive }) => 
                `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all ${
                  isActive ? 'bg-sidebar-accent text-slate-950 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.06)]' : 'text-slate-500 hover:bg-white/75 hover:text-slate-800'
                }`
              }
            >
              <BarChart3 className="h-4 w-4" />
              <span className="flex-1 text-left font-medium">Valor gerado</span>
            </NavLink>
          </div>
        )}
        </div>

        {/* Workspaces */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Operação
          </p>
          <NavLink
            to="/workspace"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all ${
                isActive ? 'bg-sidebar-accent text-slate-950 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.06)]' : 'text-slate-500 hover:bg-white/75 hover:text-slate-800'
              }`
            }
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="flex-1 text-left font-medium">Workspace Principal</span>
          </NavLink>
        </div>

        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Estrutura Recorrente
          </p>
          <button 
            onClick={() => setWorkspacesExpanded(!workspacesExpanded)}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-slate-500 transition-all hover:bg-white/75 hover:text-slate-800"
          >
            <Users className="h-4 w-4" />
            <span className="flex-1 text-left font-medium">Equipes</span>
            {workspacesExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {workspacesExpanded && (
            <div className="ml-4 mt-1 space-y-1 border-l border-slate-200/70 pl-4">
              {visibleWorkspaces.map((workspace) => {
                const accent = 'bg-white text-slate-900 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]';
                const dot =
                  workspace.name === 'Fábrica'
                    ? 'bg-blue-500'
                    : workspace.name === 'AIO'
                      ? 'bg-purple-500'
                      : 'bg-green-500';

                return (
                  <NavLink
                    key={workspace.id}
                    to={`/workspace/${workspace.id}`}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all ${
                        isActive ? accent : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
                      }`
                    }
                  >
                    <div className={`h-2 w-2 rounded-full ${dot}`} />
                    <span className="font-medium">{workspace.name}</span>
                  </NavLink>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="py-1">
          <div className="border-t border-slate-200/70" />
        </div>

        {/* Admin */}
        {canAccessAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) => 
              `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all ${
                isActive ? 'bg-sidebar-accent text-slate-950 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.06)]' : 'text-slate-500 hover:bg-white/75 hover:text-slate-800'
              }`
            }
          >
            <Settings className="h-4 w-4" />
            <span className="flex-1 text-left font-medium">Administração</span>
          </NavLink>
        )}
      </nav>

      <div className="border-t border-slate-200/70 p-4">
        <div className="rounded-3xl border border-white/70 bg-white/80 p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Sessão ativa</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{currentUser?.name || 'Sem usuário'}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {currentUser ? `${getRoleLabel(currentUser.role)} • ${currentUser.email}` : 'Sem perfil'}
          </p>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
