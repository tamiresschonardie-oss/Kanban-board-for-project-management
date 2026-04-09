import { BrainCircuit, FolderKanban, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAdmin } from '../context/AdminContext';
import { useProjects } from '../context/ProjectContext';
import { useTasks } from '../context/TaskContext';
import { canAccessGovernance } from '../utils/permissions';

type SearchResult =
  | { id: string; type: 'project'; title: string; subtitle: string; href: string }
  | { id: string; type: 'task'; title: string; subtitle: string; href: string }
  | { id: string; type: 'skill'; title: string; subtitle: string; href: string };

export function GlobalSearch() {
  const navigate = useNavigate();
  const { currentUser, skills } = useAdmin();
  const { projects } = useProjects();
  const { allTasks } = useTasks();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo<SearchResult[]>(() => {
    if (!normalizedQuery) return [];

    const projectResults: SearchResult[] = projects
      .filter((project) =>
        [project.name, project.client, project.product, project.responsible]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery))
      )
      .slice(0, 6)
      .map((project) => ({
        id: project.id,
        type: 'project',
        title: project.name,
        subtitle: [project.client, project.product, project.group].filter(Boolean).join(' • '),
        href: `/project/${project.id}`,
      }));

    const taskResults: SearchResult[] = allTasks
      .filter((task) =>
        [task.title, task.description, task.projectName, task.assignee, task.skillName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery))
      )
      .slice(0, 8)
      .map((task) => ({
        id: task.id,
        type: 'task',
        title: task.title,
        subtitle: [task.projectName || 'Tarefa operacional', task.assignee, task.flowLabel || task.phaseName]
          .filter(Boolean)
          .join(' • '),
        href: `/my-tasks?task=${task.id}`,
      }));

    const skillResults: SearchResult[] = canAccessGovernance(currentUser)
      ? skills
          .filter((skill) =>
            [skill.name, skill.description, skill.area]
              .filter(Boolean)
              .some((value) => String(value).toLowerCase().includes(normalizedQuery))
          )
          .slice(0, 6)
          .map((skill) => ({
            id: skill.id,
            type: 'skill',
            title: skill.name,
            subtitle: [skill.area, skill.status].filter(Boolean).join(' • '),
            href: `/governance/skills/${skill.id}`,
          }))
      : [];

    return [...projectResults, ...taskResults, ...skillResults].slice(0, 12);
  }, [normalizedQuery, projects, allTasks, skills, currentUser]);

  const handleOpenResult = (href: string) => {
    setIsOpen(false);
    navigate(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2.5 text-left text-sm text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur-xl transition-colors hover:bg-white sm:min-w-[260px] lg:w-[min(34vw,420px)]"
      >
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="min-w-0 flex-1 truncate">Buscar projeto, tarefa ou habilidade</span>
        <span className="hidden rounded-lg border border-slate-200 px-2 py-0.5 text-xs text-slate-400 sm:inline-flex">⌘K</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/30 px-4 pt-24 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar tarefa, projeto ou habilidade..."
                className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-3">
              {normalizedQuery && results.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
                  <p className="text-sm font-medium text-slate-900">Nenhum resultado encontrado</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Tente buscar por nome, cliente, responsável, habilidade ou descrição.
                  </p>
                </div>
              ) : !normalizedQuery ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
                  <p className="text-sm font-medium text-slate-900">Busca global</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Encontre rapidamente projetos, tarefas e habilidades sem navegar por várias telas.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      type="button"
                      onClick={() => handleOpenResult(result.href)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left transition-colors hover:bg-white"
                    >
                      <div className="rounded-xl bg-white p-2 text-slate-700">
                        {result.type === 'project' ? (
                          <FolderKanban className="h-4 w-4" />
                        ) : result.type === 'skill' ? (
                          <BrainCircuit className="h-4 w-4" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{result.title}</p>
                        <p className="truncate text-sm text-slate-500">{result.subtitle}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        {result.type === 'project'
                          ? 'Projeto'
                          : result.type === 'task'
                            ? 'Tarefa'
                            : 'Habilidade'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
