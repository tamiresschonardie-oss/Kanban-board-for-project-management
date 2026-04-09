import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CalendarDays, CalendarRange, Clock3, LayoutGrid, MapPin, Plus, Rows3, Users, XCircle } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { useFeedback } from '../context/FeedbackContext';
import { useSchedule } from '../context/ScheduleContext';
import { CalendarRangeHeader, CalendarMonthView } from '../components/schedule/CalendarMonthView';
import { CalendarWeekView } from '../components/schedule/CalendarWeekView';
import { RoomScheduleView } from '../components/schedule/RoomScheduleView';
import { ScheduleEventModal } from '../components/schedule/ScheduleEventModal';
import { CalendarEvent, CalendarEventType } from '../types';
import {
  formatMonthLabel,
  formatWeekRangeLabel,
  getEventDisplayTime,
  getMeetingsByRoomAndPeriod,
  getRoomName,
  getUserDisplayNames,
  parseDateKey,
  sortEventsByStart,
  toDateKey,
} from '../utils/scheduleUtils';

type AgendaView = 'personal' | 'meetings';
type CalendarViewMode = 'month' | 'week';
type ScheduleLayoutMode = 'standard' | 'rooms';
type RoomViewMode = 'day' | 'week';

export function Schedule() {
  const { currentUser, users } = useAdmin();
  const { showFeedback } = useFeedback();
  const { rooms, events, getEventsForUser, getMeetings, deleteEvent, cancelEvent } = useSchedule();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<CalendarEventType>('personal');
  const [calendarView, setCalendarView] = useState<CalendarViewMode>('month');
  const [layoutMode, setLayoutMode] = useState<ScheduleLayoutMode>('standard');
  const [roomViewMode, setRoomViewMode] = useState<RoomViewMode>('day');
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));
  const [draftTimes, setDraftTimes] = useState<{ startTime?: string; endTime?: string }>({});
  const [draftRoomId, setDraftRoomId] = useState<string>('');
  const [roomFilterIds, setRoomFilterIds] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const view = (searchParams.get('view') === 'meetings' ? 'meetings' : 'personal') as AgendaView;
  const myAgenda = useMemo(
    () => sortEventsByStart(getEventsForUser(currentUser?.id)),
    [currentUser?.id, getEventsForUser]
  );
  const meetings = useMemo(() => sortEventsByStart(getMeetings()), [getMeetings]);
  const visibleEvents = view === 'meetings' ? meetings : myAgenda;
  const visibleRooms = useMemo(
    () =>
      roomFilterIds.length > 0
        ? rooms.filter((room) => roomFilterIds.includes(room.id))
        : rooms.filter((room) => room.isActive),
    [roomFilterIds, rooms]
  );
  const selectedDateEvents = useMemo(
    () => visibleEvents.filter((event) => event.date === selectedDate),
    [visibleEvents, selectedDate]
  );
  const currentMonth = useMemo(
    () => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1),
    [anchorDate]
  );
  const currentPeriodLabel = useMemo(
    () => {
      if (layoutMode === 'rooms') {
        return roomViewMode === 'day'
          ? parseDateKey(selectedDate).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })
          : formatWeekRangeLabel(anchorDate);
      }
      return calendarView === 'month' ? formatMonthLabel(currentMonth) : formatWeekRangeLabel(anchorDate);
    },
    [anchorDate, calendarView, currentMonth, layoutMode, roomViewMode, selectedDate]
  );
  const roomConflictsForSelectedDay = useMemo(
    () =>
      getMeetingsByRoomAndPeriod(meetings, {
        startDate: selectedDate,
        endDate: selectedDate,
      }),
    [meetings, selectedDate]
  );

  if (!currentUser) {
    return (
      <div className="px-8 py-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600">
          Nenhum usuário ativo selecionado para exibir a agenda.
        </div>
      </div>
    );
  }

  const setAgendaView = (nextView: AgendaView) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextView === 'meetings') {
      nextParams.set('view', 'meetings');
    } else {
      nextParams.delete('view');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const openCreate = (
    type: CalendarEventType,
    date = selectedDate,
    startTime?: string,
    endTime?: string,
    roomId?: string
  ) => {
    setSelectedEvent(null);
    setDefaultType(type);
    setSelectedDate(date);
    setAnchorDate(parseDateKey(date));
    setDraftTimes({ startTime, endTime });
    setDraftRoomId(roomId || '');
    setIsModalOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedDate(event.date);
    setAnchorDate(parseDateKey(event.date));
    setDefaultType(event.type);
    setDraftTimes({});
    setDraftRoomId(event.roomId || '');
    setIsModalOpen(true);
  };

  const shiftPeriod = (direction: -1 | 1) => {
    if (calendarView === 'month') {
      const selected = parseDateKey(selectedDate);
      const targetMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + direction, 1);
      const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
      const nextSelected = new Date(
        targetMonth.getFullYear(),
        targetMonth.getMonth(),
        Math.min(selected.getDate(), lastDay)
      );

      setAnchorDate(targetMonth);
      setSelectedDate(toDateKey(nextSelected));
      return;
    }

    const currentSelected = parseDateKey(selectedDate);
    const nextAnchor = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() + direction * 7);
    const nextSelected = new Date(
      currentSelected.getFullYear(),
      currentSelected.getMonth(),
      currentSelected.getDate() + direction * 7
    );

    setAnchorDate(nextAnchor);
    setSelectedDate(toDateKey(nextSelected));
  };

  return (
    <div className="space-y-6 px-8 py-6">
      <CalendarRangeHeader
        periodLabel={currentPeriodLabel}
        onPrevious={() => shiftPeriod(-1)}
        onNext={() => shiftPeriod(1)}
        onToday={() => {
          const now = new Date();
          setAnchorDate(now);
          setSelectedDate(toDateKey(now));
        }}
        title="Agenda"
        description={
          layoutMode === 'rooms'
            ? `Ocupação das salas em visão ${roomViewMode === 'day' ? 'diária' : 'semanal'} para facilitar reservas e evitar conflitos.`
            : view === 'meetings'
            ? `Visão ${calendarView === 'month' ? 'mensal' : 'semanal'} das reuniões, participantes e salas reservadas.`
            : `Visualização ${calendarView === 'month' ? 'mensal' : 'semanal'} dos compromissos pessoais e reuniões em que ${currentUser.name} participa.`
        }
        controls={(
          <div className="inline-flex rounded-xl bg-gray-100 p-1">
            {layoutMode === 'rooms' ? (
              <>
                <button
                  type="button"
                  onClick={() => setRoomViewMode('day')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    roomViewMode === 'day' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <CalendarDays className="h-4 w-4" />
                  Dia
                </button>
                <button
                  type="button"
                  onClick={() => setRoomViewMode('week')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    roomViewMode === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Rows3 className="h-4 w-4" />
                  Semana
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setCalendarView('month')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    calendarView === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                  Mês
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarView('week')}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    calendarView === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Rows3 className="h-4 w-4" />
                  Semana
                </button>
              </>
            )}
          </div>
        )}
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className={`rounded-xl p-3 ${view === 'meetings' ? 'bg-purple-50' : 'bg-blue-50'}`}>
            {view === 'meetings' ? (
              <CalendarRange className="h-6 w-6 text-purple-600" />
            ) : (
              <CalendarDays className="h-6 w-6 text-blue-600" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Calendário principal</h2>
            <p className="text-sm text-gray-500">
              Agenda é a visão única do módulo. Reunião continua existindo como tipo de compromisso dentro dela, agora com leitura mensal e semanal.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setAgendaView('personal')}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                view === 'personal' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Minha agenda
            </button>
            <button
              type="button"
              onClick={() => setAgendaView('meetings')}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                view === 'meetings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Reuniões
            </button>
          </div>

          <div className="inline-flex rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setLayoutMode('standard')}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                layoutMode === 'standard' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Agenda padrão
            </button>
            <button
              type="button"
              onClick={() => {
                setAgendaView('meetings');
                setLayoutMode('rooms');
              }}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                layoutMode === 'rooms' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Por sala
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => openCreate('personal')}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              Novo compromisso
            </button>
            <button
              onClick={() => openCreate('meeting')}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Nova reunião
            </button>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Agenda pessoal
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Registre compromissos do dia a dia e acompanhe tudo por mês ou semana.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Reuniões e salas
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Use reunião quando houver participantes ou reserva de sala. Isso reduz conflito e melhora a leitura do calendário.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Primeiro uso
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Crie um compromisso ou reunião para começar. Depois alterne entre agenda padrão e visão por sala conforme a necessidade.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_380px]">
        {layoutMode === 'rooms' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <label className="text-sm font-medium text-gray-700">Filtrar salas:</label>
              <div className="flex flex-wrap gap-2">
                {rooms.filter((room) => room.isActive).map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() =>
                      setRoomFilterIds((prev) =>
                        prev.includes(room.id)
                          ? prev.filter((id) => id !== room.id)
                          : [...prev, room.id]
                      )
                    }
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      roomFilterIds.length === 0 || roomFilterIds.includes(room.id)
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {room.name}
                  </button>
                ))}
              </div>
            </div>

            <RoomScheduleView
              rooms={visibleRooms}
              meetings={meetings}
              users={users}
              anchorDate={roomViewMode === 'day' ? parseDateKey(selectedDate) : anchorDate}
              mode={roomViewMode}
              selectedRoomIds={roomFilterIds}
              onEventClick={openEdit}
              onCreateSlot={({ date, startTime, endTime, roomId }) => {
                setSelectedDate(date);
                setAnchorDate(parseDateKey(date));
                openCreate('meeting', date, startTime, endTime, roomId);
              }}
            />
          </div>
        ) : (
          <>
            {calendarView === 'month' ? (
              <CalendarMonthView
                month={currentMonth}
                events={visibleEvents}
                rooms={rooms}
                selectedDate={selectedDate}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  setAnchorDate(parseDateKey(date));
                  openCreate(view === 'meetings' ? 'meeting' : 'personal', date);
                }}
                onEventClick={openEdit}
              />
            ) : (
              <CalendarWeekView
                anchorDate={anchorDate}
                events={visibleEvents}
                rooms={rooms}
                selectedDate={selectedDate}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  setAnchorDate(parseDateKey(date));
                }}
                onCreateSlot={(date, startTime, endTime) => {
                  openCreate(view === 'meetings' ? 'meeting' : 'personal', date, startTime, endTime);
                }}
                onEventClick={openEdit}
              />
            )}
          </>
        )}

        <aside className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
                <p className="text-sm text-gray-500">
                  {view === 'meetings' ? 'Reuniões deste dia' : 'Compromissos deste dia'}
                </p>
              </div>
              <button
                onClick={() => openCreate(view === 'meetings' ? 'meeting' : 'personal', selectedDate)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {view === 'meetings' ? 'Reservar sala' : 'Criar neste dia'}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {selectedDateEvents.length > 0 ? (
                selectedDateEvents.map((event) => {
                  const participantNames = getUserDisplayNames(event.participantIds, users);
                  const creatorName = users.find((user) => user.id === event.creatorId)?.name || 'Usuário';
                  const canManage = event.type === 'meeting'
                    ? currentUser.id === event.creatorId || currentUser.role !== 'user'
                    : currentUser.id === event.creatorId;

                  return (
                    <div
                      key={event.id}
                      className={`rounded-xl border px-4 py-4 ${
                        event.type === 'meeting'
                          ? 'border-purple-200 bg-purple-50/50'
                          : 'border-blue-200 bg-blue-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold text-gray-900">{event.title}</h4>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700">
                              {event.type === 'meeting' ? 'Reunião' : 'Pessoal'}
                            </span>
                            {event.status === 'cancelled' && (
                              <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-medium text-red-700">
                                Cancelado
                              </span>
                            )}
                          </div>
                          {event.type === 'meeting' && (
                            <p className="mt-1 text-xs text-gray-500">Criada por {creatorName}</p>
                          )}
                          {event.description && (
                            <p className="mt-2 text-sm text-gray-600">{event.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => openEdit(event)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-white"
                        >
                          Abrir
                        </button>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-gray-400" />
                          <span>{getEventDisplayTime(event)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{getRoomName(rooms, event.roomId)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>
                            {event.type === 'meeting' ? `${participantNames.length} participantes` : 'Compromisso pessoal'}
                          </span>
                        </div>
                      </div>

                      {event.type === 'meeting' && participantNames.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {participantNames.map((name) => (
                            <span key={name} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-purple-700">
                              {name}
                            </span>
                          ))}
                        </div>
                      )}

                      {canManage && (
                        <div className="mt-4 flex gap-2">
                          {event.status === 'active' && (
                            <button
                              onClick={() => {
                                const result = cancelEvent(event.id);
                                if (!result.success) {
                                  showFeedback({ tone: 'error', title: `Não foi possível cancelar`, message: result.error });
                                  return;
                                }
                                showFeedback({
                                  tone: 'success',
                                  title: event.type === 'meeting' ? 'Reunião cancelada' : 'Compromisso cancelado',
                                });
                              }}
                              className="rounded-lg border border-orange-300 px-3 py-2 text-sm text-orange-700 hover:bg-orange-50"
                            >
                              Cancelar
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (!window.confirm(`Tem certeza que deseja excluir este ${event.type === 'meeting' ? 'compromisso de reunião' : 'compromisso'}?`)) return;
                              deleteEvent(event.id);
                              showFeedback({
                                tone: 'success',
                                title: event.type === 'meeting' ? 'Reunião excluída' : 'Compromisso excluído',
                              });
                            }}
                            className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                  {view === 'meetings'
                    ? 'Nenhuma reunião agendada neste dia.'
                    : 'Nenhum compromisso neste dia.'}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-gray-400" />
              <h3 className="text-base font-semibold text-gray-900">Reserva de sala</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Reunião é um tipo de evento dentro da Agenda. Agora a visualização por sala mostra ocupação em grade e o conflito de sala vira alerta com confirmação manual.
            </p>
            {layoutMode === 'rooms' && (
              <div className="mt-4 space-y-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Ocupação do dia</p>
                {roomConflictsForSelectedDay.length > 0 ? roomConflictsForSelectedDay.slice(0, 4).map((event) => (
                  <button
                    key={event.id}
                    onClick={() => openEdit(event)}
                    className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-left hover:bg-gray-100"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{event.title}</p>
                      <p className="text-xs text-gray-500">{getRoomName(rooms, event.roomId)}</p>
                    </div>
                    <span className="text-xs text-gray-500">{getEventDisplayTime(event)}</span>
                  </button>
                )) : (
                  <p className="text-sm text-gray-500">Nenhuma reserva de sala neste dia.</p>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      <ScheduleEventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setDraftTimes({});
        }}
        event={selectedEvent}
        defaultType={selectedEvent?.type || defaultType}
        initialDate={!selectedEvent ? selectedDate : undefined}
        initialStartTime={!selectedEvent ? draftTimes.startTime : undefined}
        initialEndTime={!selectedEvent ? draftTimes.endTime : undefined}
        initialRoomId={!selectedEvent ? draftRoomId : undefined}
      />
    </div>
  );
}
