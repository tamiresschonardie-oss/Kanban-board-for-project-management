import { TaskScopeStatus } from '../types';

export const TASK_SCOPE_LABELS: Record<TaskScopeStatus, string> = {
  active: 'Ativa',
  not_applicable: 'Não aplicável',
  out_of_scope: 'Fora de escopo',
  discarded: 'Descartada',
  deleted: 'Excluída do projeto',
};

export const TASK_SCOPE_BADGE_CLASSNAMES: Record<TaskScopeStatus, string> = {
  active: 'bg-slate-100 text-slate-700',
  not_applicable: 'bg-sky-100 text-sky-700',
  out_of_scope: 'bg-amber-100 text-amber-800',
  discarded: 'bg-rose-100 text-rose-700',
  deleted: 'bg-slate-200 text-slate-700',
};
