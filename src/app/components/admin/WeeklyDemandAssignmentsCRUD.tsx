import { useMemo, useState } from 'react';
import { CalendarDays, Edit2, Plus, Trash2 } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { DemandType, WeeklyDemandAssignment } from '../../types';
import {
  DEMAND_TYPE_LABELS,
  getWeekRange,
  hasWeeklyAssignmentConflict,
  isWeeklyAssignmentActive,
} from '../../utils/weeklyDemandRouting';

type FormState = {
  demandType: DemandType;
  startDate: string;
  endDate: string;
  responsibleUserId: string;
  teamId: string;
  notes: string;
  isActive: boolean;
};

const defaultRange = getWeekRange(new Date());

const EMPTY_FORM: FormState = {
  demandType: 'suporte',
  startDate: defaultRange.startDate,
  endDate: defaultRange.endDate,
  responsibleUserId: '',
  teamId: '',
  notes: '',
  isActive: true,
};

export function WeeklyDemandAssignmentsCRUD() {
  const {
    weeklyDemandAssignments,
    addWeeklyDemandAssignment,
    updateWeeklyDemandAssignment,
    deleteWeeklyDemandAssignment,
    demandTypes,
    users,
    teams,
  } = useAdmin();
  const [editing, setEditing] = useState<WeeklyDemandAssignment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const activeUsers = useMemo(
    () => users.filter((user) => user.status === 'active').slice().sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [users]
  );

  const sortedAssignments = useMemo(
    () =>
      weeklyDemandAssignments
        .slice()
        .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.demandType.localeCompare(b.demandType)),
    [weeklyDemandAssignments]
  );

  const openCreate = () => {
    setEditing(null);
    setError('');
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (assignment: WeeklyDemandAssignment) => {
    setEditing(assignment);
    setError('');
    setForm({
      demandType: assignment.demandType,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      responsibleUserId: assignment.responsibleUserId,
      teamId: assignment.teamId || '',
      notes: assignment.notes || '',
      isActive: assignment.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditing(null);
    setError('');
    setForm(EMPTY_FORM);
    setIsModalOpen(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.responsibleUserId) {
      setError('Selecione um responsável técnico para a escala.');
      return;
    }
    if (form.endDate < form.startDate) {
      setError('A data final precisa ser igual ou posterior à data inicial.');
      return;
    }

    const candidate = {
      id: editing?.id || '',
      demandType: form.demandType,
      startDate: form.startDate,
      endDate: form.endDate,
      teamId: form.teamId || undefined,
    };

    if (hasWeeklyAssignmentConflict(weeklyDemandAssignments, candidate)) {
      setError('Já existe uma escala ativa sobrepondo esse período para o mesmo tipo e equipe.');
      return;
    }

    if (editing) {
      updateWeeklyDemandAssignment(editing.id, {
        demandType: form.demandType,
        startDate: form.startDate,
        endDate: form.endDate,
        responsibleUserId: form.responsibleUserId,
        teamId: form.teamId || undefined,
        notes: form.notes || undefined,
        isActive: form.isActive,
      });
    } else {
      addWeeklyDemandAssignment({
        demandType: form.demandType,
        startDate: form.startDate,
        endDate: form.endDate,
        responsibleUserId: form.responsibleUserId,
        teamId: form.teamId || undefined,
        notes: form.notes || undefined,
        isActive: form.isActive,
      });
    }

    closeModal();
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Escala semanal por demanda</h2>
          <p className="mt-1 text-sm text-gray-500">
            Define o desenvolvedor da semana por tipo de demanda, com override manual nas tarefas.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Nova escala
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {sortedAssignments.map((assignment) => {
          const owner = activeUsers.find((user) => user.id === assignment.responsibleUserId);
          const team = teams.find((item) => item.id === assignment.teamId);
          const activeNow = isWeeklyAssignmentActive(assignment, new Date());

          return (
            <div key={assignment.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {DEMAND_TYPE_LABELS[assignment.demandType]}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        activeNow ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {activeNow ? 'Ativa nesta semana' : assignment.isActive ? 'Programada' : 'Inativa'}
                    </span>
                  </div>
                  <p className="mt-3 text-base font-semibold text-gray-900">{owner?.name || 'Responsável não encontrado'}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {assignment.startDate} até {assignment.endDate}
                    {team ? ` • ${team.name}` : ' • Todas as equipes'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(assignment)} className="rounded-lg p-1.5 hover:bg-gray-100">
                    <Edit2 className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Excluir esta escala semanal?')) deleteWeeklyDemandAssignment(assignment.id);
                    }}
                    className="rounded-lg p-1.5 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </div>

              {assignment.notes ? <p className="mt-4 text-sm leading-6 text-gray-600">{assignment.notes}</p> : null}
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="border-b p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editing ? 'Editar escala semanal' : 'Nova escala semanal'}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    A sugestão automática só acontece quando a tarefa ainda não tem responsável técnico manual.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="block text-sm font-medium text-gray-700">Tipo de demanda</span>
                  <select
                    value={form.demandType}
                    onChange={(e) => setForm((prev) => ({ ...prev, demandType: e.target.value as DemandType }))}
                    className="w-full rounded-lg border px-3 py-2"
                  >
                    {demandTypes.map((item) => (
                      <option key={item.id} value={item.value}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block text-sm font-medium text-gray-700">Equipe</span>
                  <select
                    value={form.teamId}
                    onChange={(e) => setForm((prev) => ({ ...prev, teamId: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2"
                  >
                    <option value="">Todas as equipes</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="block text-sm font-medium text-gray-700">Início</span>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </label>

                <label className="space-y-1">
                  <span className="block text-sm font-medium text-gray-700">Fim</span>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </label>

                <label className="space-y-1 md:col-span-2">
                  <span className="block text-sm font-medium text-gray-700">Responsável técnico sugerido</span>
                  <select
                    value={form.responsibleUserId}
                    onChange={(e) => setForm((prev) => ({ ...prev, responsibleUserId: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2"
                  >
                    <option value="">Selecione</option>
                    {activeUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 md:col-span-2">
                  <span className="block text-sm font-medium text-gray-700">Observações</span>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  />
                  Escala ativa
                </label>
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="rounded-lg border px-4 py-2 text-gray-700">
                  Cancelar
                </button>
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                  {editing ? 'Salvar' : 'Criar escala'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
