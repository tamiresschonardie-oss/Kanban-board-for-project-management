import { Building2, FolderKanban, Search, X } from 'lucide-react';
import { Project } from '../../types';
import { ProjectPickerModal } from '../project/ProjectPickerModal';

interface TaskProjectBindingFieldProps {
  workspaces: string[];
  selectedWorkspaceId: string;
  selectedProject: Project | null;
  availableProjects: Project[];
  onWorkspaceChange: (workspaceId: string) => void;
  onProjectSelect: (project: Project) => void;
  onClearProject: () => void;
  pickerOpen: boolean;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  disabled?: boolean;
  helperText?: string;
}

const INPUT_CLASS =
  'w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30';

export function TaskProjectBindingField({
  workspaces,
  selectedWorkspaceId,
  selectedProject,
  availableProjects,
  onWorkspaceChange,
  onProjectSelect,
  onClearProject,
  pickerOpen,
  onOpenPicker,
  onClosePicker,
  disabled = false,
  helperText,
}: TaskProjectBindingFieldProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
      <div>
        <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
          <Building2 className="h-4 w-4 text-slate-400" />
          Equipe / Workspace
        </label>
        <select
          value={selectedWorkspaceId}
          onChange={(event) => onWorkspaceChange(event.target.value)}
          className={INPUT_CLASS}
          disabled={disabled}
        >
          <option value="">Selecione</option>
          {workspaces.map((workspace) => (
            <option key={workspace} value={workspace}>
              {workspace}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-gray-700">
          <FolderKanban className="h-4 w-4 text-slate-400" />
          Projeto vinculado
        </label>
        <div className="rounded-[24px] border border-slate-200 bg-white/90 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          {selectedProject ? (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {selectedProject.name}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedProject.client || 'Sem cliente'} • {selectedProject.responsible || 'Sem responsável'} •{' '}
                  {selectedProject.group}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenPicker}
                  disabled={disabled}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Search className="h-4 w-4" />
                  Trocar
                </button>
                <button
                  type="button"
                  onClick={onClearProject}
                  disabled={disabled}
                  className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <X className="h-4 w-4" />
                  Remover
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">Tarefa sem projeto</p>
                <p className="mt-1 text-sm text-slate-500">
                  Use a busca estruturada para vincular a tarefa a um projeto da equipe selecionada.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenPicker}
                disabled={disabled || !selectedWorkspaceId || availableProjects.length === 0}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search className="h-4 w-4" />
                Vincular projeto
              </button>
            </div>
          )}

          {helperText ? <p className="mt-3 text-xs text-slate-500">{helperText}</p> : null}
        </div>

        <ProjectPickerModal
          isOpen={pickerOpen}
          onClose={onClosePicker}
          projects={availableProjects}
          selectedWorkspaceId={selectedWorkspaceId}
          selectedProjectId={selectedProject?.id}
          onSelect={onProjectSelect}
        />
      </div>
    </div>
  );
}
