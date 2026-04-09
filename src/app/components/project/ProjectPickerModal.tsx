import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Project } from '../../types';

interface ProjectPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  selectedWorkspaceId?: string;
  selectedProjectId?: string;
  onSelect: (project: Project) => void;
}

export function ProjectPickerModal({
  isOpen,
  onClose,
  projects,
  selectedWorkspaceId,
  selectedProjectId,
  onSelect,
}: ProjectPickerModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR');

    return projects
      .filter((project) =>
        selectedWorkspaceId ? project.group === selectedWorkspaceId : true
      )
      .filter((project) => {
        if (!normalizedSearch) return true;
        return [
          project.name,
          project.client,
          project.responsible,
          project.group,
          project.requestedBy,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLocaleLowerCase('pt-BR').includes(normalizedSearch)
          );
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [projects, searchTerm, selectedWorkspaceId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-[28px] border border-white/70 bg-white/95 shadow-[0_28px_70px_rgba(15,23,42,0.2)]">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Vincular projeto</h3>
            <p className="mt-1 text-sm text-slate-500">
              {selectedWorkspaceId
                ? `Projetos da equipe ${selectedWorkspaceId}`
                : 'Selecione uma equipe para listar os projetos'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-slate-200 px-6 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por nome, cliente, responsável ou equipe"
              className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {!selectedWorkspaceId ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Escolha uma equipe antes de buscar e vincular um projeto.
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Nenhum projeto encontrado para esse filtro.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project) => {
                const isSelected = project.id === selectedProjectId;
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      onSelect(project);
                      onClose();
                    }}
                    className={`w-full rounded-3xl border px-5 py-4 text-left transition-all ${
                      isSelected
                        ? 'border-blue-200 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-base font-semibold text-slate-900">
                            {project.name}
                          </h4>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                            {project.group}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                          <span>Cliente: {project.client || 'Nao informado'}</span>
                          <span>Responsável: {project.responsible || 'Nao informado'}</span>
                          <span>Status: {project.governance?.currentPhaseId || project.status}</span>
                        </div>
                      </div>
                      {isSelected ? (
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          Selecionado
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
