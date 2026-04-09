import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useSchedule } from '../../context/ScheduleContext';
import { CalendarEvent, CalendarEventType } from '../../types';
import { checkRoomConflict, getEventDisplayTime, getRoomName } from '../../utils/scheduleUtils';

interface ScheduleEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  defaultType?: CalendarEventType;
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  initialRoomId?: string;
}

interface FormState {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  participantIds: string[];
  roomId: string;
  type: CalendarEventType;
}

const emptyForm: FormState = {
  title: '',
  description: '',
  date: new Date().toISOString().slice(0, 10),
  startTime: '09:00',
  endTime: '10:00',
  participantIds: [],
  roomId: '',
  type: 'personal',
};

export function ScheduleEventModal({
  isOpen,
  onClose,
  event,
  defaultType = 'personal',
  initialDate,
  initialStartTime,
  initialEndTime,
  initialRoomId,
}: ScheduleEventModalProps) {
  const { currentUser, users } = useAdmin();
  const { showFeedback } = useFeedback();
  const { rooms, events, addEvent, updateEvent } = useSchedule();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (event) {
      setForm({
        title: event.title,
        description: event.description || '',
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        participantIds: event.participantIds,
        roomId: event.roomId || '',
        type: event.type,
      });
    } else {
      setForm({
        ...emptyForm,
        type: defaultType,
        date: initialDate || emptyForm.date,
        startTime: initialStartTime || emptyForm.startTime,
        endTime: initialEndTime || emptyForm.endTime,
        roomId: initialRoomId || '',
      });
    }
    setError('');
  }, [defaultType, event, initialDate, initialEndTime, initialRoomId, initialStartTime, isOpen]);

  const selectableUsers = useMemo(
    () => users.filter((user) => user.status === 'active'),
    [users]
  );
  const activeRooms = useMemo(() => rooms.filter((room) => room.isActive), [rooms]);
  const roomConflicts = useMemo(
    () =>
      form.roomId
        ? checkRoomConflict(events, {
            id: event?.id || 'draft-event',
            date: form.date,
            startTime: form.startTime,
            endTime: form.endTime,
            roomId: form.roomId,
            status: event?.status || 'active',
          })
        : [],
    [events, event?.id, event?.status, form.date, form.endTime, form.roomId, form.startTime]
  );

  if (!isOpen || !currentUser) return null;

  const toggleParticipant = (userId: string) => {
    setForm((prev) => ({
      ...prev,
      participantIds: prev.participantIds.includes(userId)
        ? prev.participantIds.filter((id) => id !== userId)
        : [...prev.participantIds, userId],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const participantIds =
      form.type === 'meeting'
        ? Array.from(new Set([currentUser.id, ...form.participantIds]))
        : [];

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      creatorId: event?.creatorId || currentUser.id,
      participantIds,
      roomId: form.roomId || undefined,
      type: form.type,
      status: event?.status || 'active',
    } as const;

    let allowRoomConflict = false;
    if (form.type === 'meeting' && form.roomId && roomConflicts.length > 0) {
      const shouldContinue = window.confirm(
        `A sala já está ocupada por ${roomConflicts.length} reserva(s) no período selecionado. Deseja salvar mesmo assim?`
      );
      if (!shouldContinue) {
        setIsSubmitting(false);
        return;
      }
      allowRoomConflict = true;
    }

    const result = event
      ? updateEvent(event.id, payload, { allowRoomConflict })
      : addEvent(payload, { allowRoomConflict });

    if (!result.success) {
      setError(result.error || 'Não foi possível salvar o evento.');
      setIsSubmitting(false);
      return;
    }

    showFeedback({
      tone: 'success',
      title: event ? 'Compromisso atualizado' : 'Compromisso criado',
      message:
        form.type === 'meeting'
          ? 'A reunião foi salva e os participantes foram persistidos.'
          : 'O evento pessoal foi salvo com sucesso.',
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-white/70 bg-white/95 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between border-b border-slate-200/70 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              {event ? 'Editar compromisso' : 'Novo compromisso'}
            </h2>
            <p className="text-sm text-slate-500">
              {form.type === 'meeting' ? 'Reunião com participantes' : 'Evento pessoal'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full border border-slate-200 bg-white p-2 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Título</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Descrição</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as CalendarEventType }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="personal">Pessoal</option>
                <option value="meeting">Reunião</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Sala</label>
              <select
                value={form.roomId}
                onChange={(e) => setForm((prev) => ({ ...prev, roomId: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sem sala</option>
                {activeRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}{room.location ? ` • ${room.location}` : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Se a sala já estiver ocupada, o sistema vai alertar e pedir confirmação antes de salvar.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Data</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Hora inicial</label>
                <input
                  type="time"
                  required
                  value={form.startTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Hora final</label>
                <input
                  type="time"
                  required
                  value={form.endTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {form.type === 'meeting' && (
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">Participantes</label>
                <div className="max-h-44 space-y-2 overflow-y-auto rounded-lg border border-gray-300 p-3">
                  {selectableUsers.map((user) => (
                    <label key={user.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form.participantIds.includes(user.id) || user.id === currentUser.id}
                        disabled={user.id === currentUser.id}
                        onChange={() => toggleParticipant(user.id)}
                      />
                      <span>{user.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {form.type === 'meeting' && form.roomId && roomConflicts.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
              <p className="font-medium">Conflito de sala detectado</p>
              <p className="mt-1">
                Já existem reservas para {getRoomName(rooms, form.roomId)} neste horário.
              </p>
              <div className="mt-2 space-y-1">
                {roomConflicts.map((conflict) => (
                  <div key={conflict.id} className="text-xs text-amber-900">
                    {conflict.title} • {getEventDisplayTime(conflict)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
              {isSubmitting ? 'Salvando...' : event ? 'Salvar alterações' : 'Criar compromisso'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
}
