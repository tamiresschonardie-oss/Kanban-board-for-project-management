import { NavLink } from 'react-router';
import { Plus, LayoutDashboard, Users, Zap, ChevronDown, ChevronRight, Building2, Settings, Home as HomeIcon, CheckSquare } from 'lucide-react';
import { useState } from 'react';

export function Sidebar({ onCreateProject }: { onCreateProject: () => void }) {
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [workspacesExpanded, setWorkspacesExpanded] = useState(false);
  const [sprintsExpanded, setSprintsExpanded] = useState(false);

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <div className="text-white font-bold text-xl">P</div>
          </div>
          <span className="font-semibold text-xl">PMO</span>
        </div>
      </div>

      {/* Create Project Button */}
      <div className="p-4">
        <button
          onClick={onCreateProject}
          className="w-full bg-blue-50 text-blue-600 rounded-lg py-2.5 px-4 font-medium flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Criar Projeto
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        {/* Início */}
        <NavLink
          to="/"
          end
          className={({ isActive }) => 
            `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <HomeIcon className="w-5 h-5" />
          <span className="flex-1 text-left font-medium">Início</span>
        </NavLink>

        {/* Minhas Tarefas */}
        <NavLink
          to="/my-tasks"
          className={({ isActive }) => 
            `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <CheckSquare className="w-5 h-5" />
          <span className="flex-1 text-left font-medium">Minhas Tarefas</span>
        </NavLink>

        {/* Governança */}
        <NavLink
          to="/governance"
          className={({ isActive }) => 
            `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <Building2 className="w-5 h-5" />
          <span className="flex-1 text-left font-medium">Governança</span>
        </NavLink>

        {/* Workspaces */}
        <div>
          <button 
            onClick={() => setWorkspacesExpanded(!workspacesExpanded)}
            className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Users className="w-5 h-5" />
            <span className="flex-1 text-left font-medium">Workspaces</span>
            {workspacesExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {workspacesExpanded && (
            <div className="ml-6 mt-1 space-y-0.5">
              <NavLink
                to="/workspace/Fábrica"
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>Fábrica</span>
              </NavLink>

              <NavLink
                to="/workspace/AIO"
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'text-purple-600 bg-purple-50' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span>AIO</span>
              </NavLink>

              <NavLink
                to="/workspace/Infra"
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'text-green-600 bg-green-50' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Infra</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Visualizações */}
        <div>
          <button 
            onClick={() => setProjectsExpanded(!projectsExpanded)}
            className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="flex-1 text-left font-medium">Visualizações</span>
            {projectsExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {projectsExpanded && (
            <div className="ml-6 mt-1 space-y-0.5">
              <NavLink
                to="/dashboards"
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'text-purple-600 bg-purple-50' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span>Dashboards</span>
              </NavLink>

              <NavLink
                to="/gantt"
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'text-cyan-600 bg-cyan-50' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <div className="w-2 h-2 bg-cyan-500 rounded-full" />
                <span>Gantt</span>
              </NavLink>

              <NavLink
                to="/by-client"
                className={({ isActive }) => 
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'text-pink-600 bg-pink-50' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <div className="w-2 h-2 bg-pink-500 rounded-full" />
                <span>Por Cliente</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Sprints */}
        <div>
          <button 
            onClick={() => setSprintsExpanded(!sprintsExpanded)}
            className="w-full flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Zap className="w-5 h-5" />
            <span className="flex-1 text-left">Sprints</span>
            {sprintsExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="py-2">
          <div className="border-t border-gray-200" />
        </div>

        {/* Admin */}
        <NavLink
          to="/admin"
          className={({ isActive }) => 
            `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              isActive ? 'text-purple-600 bg-purple-50' : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <Settings className="w-5 h-5" />
          <span className="flex-1 text-left font-medium">Administração</span>
        </NavLink>
      </nav>
    </aside>
  );
}