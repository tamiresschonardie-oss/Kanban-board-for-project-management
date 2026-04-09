import { ReactNode, useMemo, useState } from 'react';
import { AlertTriangle, CalendarRange, CheckCircle2, Clock3, Edit2, Plus, Trash2, X } from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { Phase, Project } from '../../types';
import {
  PhaseExecutiveScheduleRow,
  formatDate,
  getPhaseExecutiveSchedule,
  isValidDateRange,
} from '../../utils/ganttCalculator';
import {
  getProjectExecutionManualTimelineEntries,
  getProjectExecutionPhases,
} from '../../utils/projectSelectors';

interface ProjectScheduleSummaryProps {
  project: Project;
}

interface TimelineEditorState {
  mode: 'create' | 'edit';
  sourceType: 'eap_phase' | 'manual_timeline';
  rowId?: string;
  linkedPhaseId?: string;
  title: string;
  plannedStartDate: string;
  actualStartDate: string;
  plannedEndDate: string;
  actualEndDate: string;
  order: string;
  color: string;
}

const PHASE_ACCENT_CLASSES = [
  'bg-slate-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
];

const EMPTY_EDITOR: TimelineEditorState = {
  mode: 'create',
  sourceType: 'manual_timeline',
  title: '',
  plannedStartDate: '',
  actualStartDate: '',
  plannedEndDate: '',
  actualEndDate: '',
  order: '0',
  color: '#94A3B8',
};

const STATUS_STYLES: Record<
  PhaseExecutiveScheduleRow['statusTone'],
  { chip: string; icon: typeof Clock3 }
> = {
  neutral: {
    chip: 'border-slate-200 bg-slate-50 text-slate-700',
    icon: Clock3,
  },
  positive: {
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    icon: CheckCircle2,
  },
  warning: {
    chip: 'border-amber-200 bg-amber-50 text-amber-700',
    icon: AlertTriangle,
  },
  danger: {
    chip: 'border-rose-200 bg-rose-50 text-rose-700',
    icon: AlertTriangle,
  },
};

export function ProjectScheduleSummary({ project }: ProjectScheduleSummaryProps) {
  const { updateProject } = useProjects();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editorState, setEditorState] = useState<TimelineEditorState | null>(null);
  const [validationError, setValidationError] = useState('');

  const executionPhases = useMemo(
    () =>
      getProjectExecutionPhases(project)
        .slice()
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    [project]
  );
  const manualEntries = getProjectExecutionManualTimelineEntries(project);
  const scheduleRows = useMemo(
    () => getPhaseExecutiveSchedule(executionPhases, manualEntries),
    [executionPhases, manualEntries]
  );
  const hasSchedule = scheduleRows.some(
    (row) => row.plannedStartDate || row.actualStartDate || row.plannedEndDate || row.actualEndDate
  );

  const openRowEditor = (rowId: string) => {
    const row = scheduleRows.find((candidate) => candidate.id === rowId);
    if (!row) return;

    setValidationError('');
    setEditorState({
      mode: 'edit',
      sourceType: row.sourceType,
      rowId: row.id,
      linkedPhaseId: row.linkedPhaseId,
      title: row.name,
      plannedStartDate: row.plannedStartDate || '',
      actualStartDate: row.actualStartDate || '',
      plannedEndDate: row.plannedEndDate || '',
      actualEndDate: row.actualEndDate || '',
      order: String(row.order ?? 0),
      color: row.color || '#94A3B8',
    });
  };

  const openManualCreate = () => {
    setValidationError('');
    setEditorState({
      ...EMPTY_EDITOR,
      mode: 'create',
      order: String(scheduleRows.length),
    });
  };

  const closeEditor = () => {
    setEditorState(null);
    setValidationError('');
  };

  const saveEditor = () => {
    if (!editorState) return;
    if (!editorState.title.trim()) {
      setValidationError('Informe um nome para a linha do cronograma.');
      return;
    }

    if (editorState.plannedEndDate && !editorState.plannedStartDate) {
      setValidationError('Preencha o início planejado antes de definir o final planejado.');
      return;
    }

    if (editorState.actualEndDate && !editorState.actualStartDate) {
      setValidationError('Preencha o início oficial antes de definir o final oficial.');
      return;
    }

    if (!isValidDateRange(editorState.plannedStartDate || undefined, editorState.plannedEndDate || undefined)) {
      setValidationError('A data final planejada não pode ser anterior à data inicial planejada.');
      return;
    }

    if (!isValidDateRange(editorState.actualStartDate || undefined, editorState.actualEndDate || undefined)) {
      setValidationError('A data final oficial não pode ser anterior à data inicial oficial.');
      return;
    }

    const nextOrder = Number(editorState.order);
    if (!Number.isFinite(nextOrder) || nextOrder < 0) {
      setValidationError('A ordem precisa ser um número maior ou igual a zero.');
      return;
    }

    if (editorState.sourceType === 'eap_phase' && editorState.linkedPhaseId) {
      const nextPhases = executionPhases.map((phase) =>
        phase.id === editorState.linkedPhaseId
          ? buildUpdatedPhaseFromTimelineEdit(phase, editorState, nextOrder)
          : phase
      );

      updateProject(project.id, {
        execution: {
          ...project.execution,
          phases: nextPhases,
        },
      });
      closeEditor();
      return;
    }

    const nextManualEntries =
      editorState.mode === 'create'
        ? [
            ...manualEntries,
            {
              id: `timeline-${Date.now()}`,
              projectId: project.id,
              title: editorState.title.trim(),
              startDate: editorState.plannedStartDate || undefined,
              endDate: editorState.plannedEndDate || undefined,
              plannedStartDate: editorState.plannedStartDate || undefined,
              actualStartDate: editorState.actualStartDate || undefined,
              plannedEndDate: editorState.plannedEndDate || undefined,
              actualEndDate: editorState.actualEndDate || undefined,
              sourceType: 'manual_timeline' as const,
              order: nextOrder,
              color: editorState.color || undefined,
            },
          ]
        : manualEntries.map((entry) =>
            entry.id === editorState.rowId
              ? {
                  ...entry,
                  title: editorState.title.trim(),
                  startDate: editorState.plannedStartDate || undefined,
                  endDate: editorState.plannedEndDate || undefined,
                  plannedStartDate: editorState.plannedStartDate || undefined,
                  actualStartDate: editorState.actualStartDate || undefined,
                  plannedEndDate: editorState.plannedEndDate || undefined,
                  actualEndDate: editorState.actualEndDate || undefined,
                  order: nextOrder,
                  color: editorState.color || undefined,
                }
              : entry
          );

    updateProject(project.id, {
      execution: {
        ...project.execution,
        manualTimelineEntries: nextManualEntries.sort((a, b) => (a.order || 0) - (b.order || 0)),
      },
    });
    closeEditor();
  };

  const deleteManualEntry = (rowId: string) => {
    updateProject(project.id, {
      execution: {
        ...project.execution,
        manualTimelineEntries: manualEntries.filter((entry) => entry.id !== rowId),
      },
    });
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Cronograma</h3>
          </div>
          <p className="text-sm text-gray-600">
            Controle separado entre planejamento e execução oficial, com leitura direta de atraso, duração real e desvio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {scheduleRows.length} linha{scheduleRows.length !== 1 ? 's' : ''}
          </div>
          <button
            type="button"
            onClick={() => setIsEditMode((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isEditMode
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Edit2 className="h-4 w-4" />
            Editar cronograma
          </button>
          <button
            type="button"
            onClick={openManualCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nova linha
          </button>
        </div>
      </div>

      {!hasSchedule ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-gray-900">
            Defina datas planejadas ou oficiais para visualizar o cronograma
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Linhas manuais também suportam início e fim planejados, além de início e fim oficiais.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="min-w-[1480px] table-fixed border-collapse">
            <colgroup>
              <col className="w-[240px]" />
              <col className="w-[90px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[96px]" />
              <col className="w-[96px]" />
              <col className="w-[92px]" />
              <col className="w-[220px]" />
              <col className="w-[140px]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <HeaderCell title="Fase / Linha" />
                <HeaderCell title="Tipo" />
                <HeaderCell title="Data inicial" subtitle="planejada" />
                <HeaderCell title="Data inicial" subtitle="oficial" />
                <HeaderCell title="Data final" subtitle="planejada" />
                <HeaderCell title="Data final" subtitle="oficial" />
                <HeaderCell title="Dias" subtitle="planejados" />
                <HeaderCell title="Dias" subtitle="reais" />
                <HeaderCell title="Desvio" />
                <HeaderCell title="Status de prazo" />
                <HeaderCell title="Ações" align="right" />
              </tr>
            </thead>
            <tbody>
              {scheduleRows.map((row) => {
                const statusStyle = STATUS_STYLES[row.statusTone];
                const StatusIcon = statusStyle.icon;
                return (
                  <tr key={row.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="px-4 py-4 align-top">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                            row.color
                              ? ''
                              : PHASE_ACCENT_CLASSES[row.colorIndex % PHASE_ACCENT_CLASSES.length]
                          }`}
                          style={row.color ? { backgroundColor: row.color } : undefined}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900">{row.name}</p>
                          <p className="mt-1 text-xs text-gray-500">Ordem {row.order}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          row.sourceType === 'eap_phase'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {row.sourceType === 'eap_phase' ? 'EAP' : 'Manual'}
                      </span>
                    </td>
                    <DateCell value={row.plannedStartDate} />
                    <DateCell value={row.actualStartDate} />
                    <DateCell value={row.plannedEndDate} />
                    <DateCell value={row.actualEndDate} />
                    <NumericCell value={row.plannedDurationDays} />
                    <NumericCell value={row.actualDurationDays} />
                    <td className="px-4 py-4 align-top text-sm">
                      <VarianceBadge row={row} />
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className={`rounded-2xl border px-3 py-3 ${statusStyle.chip}`}>
                        <div className="flex items-start gap-2">
                          <StatusIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold">{row.status}</p>
                            <p className="mt-1 text-xs leading-5">{row.statusReason}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openRowEditor(row.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Editar
                        </button>
                        {row.sourceType === 'manual_timeline' && (
                          <button
                            type="button"
                            onClick={() => deleteManualEntry(row.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isEditMode && (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Cada linha agora controla início e fim planejados separadamente do início e fim oficiais. Linhas da <strong>EAP</strong> continuam sincronizadas com a fase; linhas <strong>Manuais</strong> existem só neste cronograma.
        </div>
      )}

      {editorState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {editorState.mode === 'create' ? 'Nova linha do cronograma' : 'Editar linha do cronograma'}
                </h4>
                <p className="mt-1 text-sm text-gray-600">
                  {editorState.sourceType === 'eap_phase'
                    ? 'As alterações atualizam o controle de prazo da fase da EAP, preservando o histórico planejado x realizado.'
                    : 'Esta linha manual permite acompanhar o planejado e o realizado sem misturar as datas.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg p-2 hover:bg-gray-100"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nome">
                  <input
                    value={editorState.title}
                    onChange={(event) =>
                      setEditorState((prev) => (prev ? { ...prev, title: event.target.value } : prev))
                    }
                    className={INPUT_CLASS}
                    placeholder="Ex: Homologação externa"
                  />
                </Field>
                <Field label="Ordem">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editorState.order}
                    onChange={(event) =>
                      setEditorState((prev) => (prev ? { ...prev, order: event.target.value } : prev))
                    }
                    className={INPUT_CLASS}
                  />
                </Field>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Planejamento</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Datas-base usadas para compromisso de prazo.
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Início planejado">
                      <input
                        type="date"
                        value={editorState.plannedStartDate}
                        onChange={(event) =>
                          setEditorState((prev) =>
                            prev ? { ...prev, plannedStartDate: event.target.value } : prev
                          )
                        }
                        className={INPUT_CLASS}
                      />
                    </Field>
                    <Field label="Final planejado">
                      <input
                        type="date"
                        value={editorState.plannedEndDate}
                        onChange={(event) =>
                          setEditorState((prev) =>
                            prev ? { ...prev, plannedEndDate: event.target.value } : prev
                          )
                        }
                        className={INPUT_CLASS}
                      />
                    </Field>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Execução oficial</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Datas reais para medir início tardio, conclusão no prazo e atraso final.
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Início oficial">
                      <input
                        type="date"
                        value={editorState.actualStartDate}
                        onChange={(event) =>
                          setEditorState((prev) =>
                            prev ? { ...prev, actualStartDate: event.target.value } : prev
                          )
                        }
                        className={INPUT_CLASS}
                      />
                    </Field>
                    <Field label="Final oficial">
                      <input
                        type="date"
                        value={editorState.actualEndDate}
                        onChange={(event) =>
                          setEditorState((prev) =>
                            prev ? { ...prev, actualEndDate: event.target.value } : prev
                          )
                        }
                        className={INPUT_CLASS}
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <Field label="Cor">
                <input
                  type="color"
                  value={editorState.color}
                  onChange={(event) =>
                    setEditorState((prev) => (prev ? { ...prev, color: event.target.value } : prev))
                  }
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-2"
                />
              </Field>

              {validationError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {validationError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveEditor}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500';

function Field({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function HeaderCell({
  title,
  subtitle,
  align = 'left',
}: {
  title: string;
  subtitle?: string;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <span className="block leading-4">{title}</span>
      {subtitle ? <span className="block leading-4 text-[10px] text-gray-400">{subtitle}</span> : null}
    </th>
  );
}

function DateCell({ value }: { value?: string }) {
  return (
    <td className="px-4 py-4 align-top text-sm text-gray-700">
      {value ? formatDate(value) : <span className="text-gray-400">—</span>}
    </td>
  );
}

function NumericCell({ value }: { value?: number }) {
  return (
    <td className="px-4 py-4 align-top text-sm text-gray-700">
      {typeof value === 'number' ? `${value} dia(s)` : <span className="text-gray-400">—</span>}
    </td>
  );
}

function VarianceBadge({ row }: { row: PhaseExecutiveScheduleRow }) {
  if (typeof row.varianceDays !== 'number') {
    return <span className="text-gray-400">—</span>;
  }

  const tone =
    row.varianceDays > 0
      ? 'bg-rose-50 text-rose-700'
      : row.varianceDays < 0
        ? 'bg-emerald-50 text-emerald-700'
        : 'bg-slate-100 text-slate-700';

  const label =
    row.varianceDays === 0 ? '0 dia(s)' : `${row.varianceDays > 0 ? '+' : ''}${row.varianceDays} dia(s)`;

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{label}</span>;
}

function buildUpdatedPhaseFromTimelineEdit(
  phase: Phase,
  editorState: TimelineEditorState,
  nextOrder: number
): Phase {
  return {
    ...phase,
    name: editorState.title.trim(),
    order: nextOrder,
    plannedStartDate: editorState.plannedStartDate || undefined,
    actualStartDate: editorState.actualStartDate || undefined,
    plannedEndDate: editorState.plannedEndDate || undefined,
    actualEndDate: editorState.actualEndDate || undefined,
  };
}
