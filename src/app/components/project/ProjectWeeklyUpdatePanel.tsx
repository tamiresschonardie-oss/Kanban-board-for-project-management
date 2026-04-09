import { useEffect, useState } from 'react';
import { MessageSquareQuote, Sparkles } from 'lucide-react';
import { Project } from '../../types';
import { useAdmin } from '../../context/AdminContext';
import { useProjects } from '../../context/ProjectContext';
import { canManageWeeklyFocus } from '../../utils/permissions';

interface ProjectWeeklyUpdatePanelProps {
  project: Project;
}

export function ProjectWeeklyUpdatePanel({ project }: ProjectWeeklyUpdatePanelProps) {
  const { currentUser } = useAdmin();
  const { updateProject } = useProjects();
  const [weeklyUpdateDraft, setWeeklyUpdateDraft] = useState(project.weeklyUpdate || '');
  const canManageFocus = canManageWeeklyFocus(currentUser);

  useEffect(() => {
    setWeeklyUpdateDraft(project.weeklyUpdate || '');
  }, [project.id, project.weeklyUpdate]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-950">Atualização da Semana</h3>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Resumo executivo do projeto para liderança e acompanhamento semanal.
          </p>
        </div>
        {project.isWeeklyFocus ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" />
            Foco da Semana
          </span>
        ) : null}
      </div>

      {canManageFocus ? (
        <>
          <textarea
            value={weeklyUpdateDraft}
            onChange={(event) => setWeeklyUpdateDraft(event.target.value)}
            rows={6}
            placeholder={'O que foi feito\nO que será feito\nBloqueios'}
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => updateProject(project.id, { weeklyUpdate: weeklyUpdateDraft.trim() })}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Salvar atualização
            </button>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {project.weeklyUpdate?.trim() || 'Sem atualização executiva registrada para esta semana.'}
          </p>
        </div>
      )}
    </section>
  );
}
