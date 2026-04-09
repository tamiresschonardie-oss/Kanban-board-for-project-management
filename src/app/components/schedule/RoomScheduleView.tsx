import { CalendarEvent, MeetingRoom } from '../../types';
import { buildWeekDays, getEventDisplayTime, getMeetingsByRoomAndPeriod, getMinutesFromTime, toDateKey } from '../../utils/scheduleUtils';

type RoomCalendarMode = 'day' | 'week';

interface RoomScheduleViewProps {
  rooms: MeetingRoom[];
  meetings: CalendarEvent[];
  users: Array<{ id: string; name: string }>;
  anchorDate: Date;
  mode: RoomCalendarMode;
  selectedRoomIds?: string[];
  onEventClick: (event: CalendarEvent) => void;
  onCreateSlot: (input: { date: string; startTime: string; endTime: string; roomId: string }) => void;
}

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_HEIGHT = 64;

function buildTimeSlots() {
  return Array.from({ length: END_HOUR - START_HOUR }).map((_, index) => {
    const hour = START_HOUR + index;
    return `${String(hour).padStart(2, '0')}:00`;
  });
}

function buildColumns(anchorDate: Date, mode: RoomCalendarMode, rooms: MeetingRoom[]) {
  const activeRooms = rooms.filter((room) => room.isActive);
  if (mode === 'day') {
    const dateKey = toDateKey(anchorDate);
    return activeRooms.map((room) => ({
      id: `${dateKey}-${room.id}`,
      roomId: room.id,
      roomName: room.name,
      dateKey,
      label: room.name,
      sublabel: room.location || 'Sala',
    }));
  }

  return buildWeekDays(anchorDate).flatMap((day) =>
    activeRooms.map((room) => ({
      id: `${day.dateKey}-${room.id}`,
      roomId: room.id,
      roomName: room.name,
      dateKey: day.dateKey,
      label: `${room.name}`,
      sublabel: new Date(`${day.dateKey}T12:00:00`).toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
      }),
    }))
  );
}

export function RoomScheduleView({
  rooms,
  meetings,
  users,
  anchorDate,
  mode,
  selectedRoomIds,
  onEventClick,
  onCreateSlot,
}: RoomScheduleViewProps) {
  const visibleRooms = selectedRoomIds?.length
    ? rooms.filter((room) => selectedRoomIds.includes(room.id))
    : rooms;
  const columns = buildColumns(anchorDate, mode, visibleRooms);
  const timeSlots = buildTimeSlots();
  const periodRange =
    mode === 'day'
      ? { startDate: toDateKey(anchorDate), endDate: toDateKey(anchorDate) }
      : (() => {
          const weekDays = buildWeekDays(anchorDate);
          return {
            startDate: weekDays[0].dateKey,
            endDate: weekDays[weekDays.length - 1].dateKey,
          };
        })();

  const visibleMeetings = getMeetingsByRoomAndPeriod(meetings, {
    startDate: periodRange.startDate,
    endDate: periodRange.endDate,
  }).filter((meeting) =>
    columns.some((column) => column.roomId === meeting.roomId && column.dateKey === meeting.date)
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div
        className="grid min-w-[980px]"
        style={{ gridTemplateColumns: `88px repeat(${columns.length}, minmax(180px, 1fr))` }}
      >
        <div className="sticky left-0 z-20 border-b border-r border-gray-200 bg-gray-50 px-3 py-4 text-xs font-medium uppercase tracking-wide text-gray-500">
          Horário
        </div>
        {columns.map((column) => (
          <div
            key={column.id}
            className="border-b border-r border-gray-200 bg-gray-50 px-3 py-4"
          >
            <p className="text-sm font-semibold text-gray-900">{column.label}</p>
            <p className="mt-1 text-xs text-gray-500">{column.sublabel}</p>
          </div>
        ))}

        <div className="sticky left-0 z-10 border-r border-gray-200 bg-white">
          {timeSlots.map((slot) => (
            <div
              key={slot}
              className="border-b border-gray-100 px-3 pt-1 text-xs text-gray-500"
              style={{ height: HOUR_HEIGHT }}
            >
              {slot}
            </div>
          ))}
        </div>

        {columns.map((column) => {
          const columnMeetings = visibleMeetings.filter(
            (meeting) => meeting.roomId === column.roomId && meeting.date === column.dateKey
          );

          return (
            <div
              key={`body-${column.id}`}
              className="relative border-r border-gray-200 bg-white"
              style={{ height: timeSlots.length * HOUR_HEIGHT }}
            >
              {timeSlots.map((slot, index) => (
                <button
                  key={`${column.id}-${slot}`}
                  type="button"
                  onClick={() =>
                    onCreateSlot({
                      date: column.dateKey,
                      startTime: slot,
                      endTime: `${String(START_HOUR + index + 1).padStart(2, '0')}:00`,
                      roomId: column.roomId,
                    })
                  }
                  className="absolute left-0 right-0 border-b border-gray-100 hover:bg-blue-50/50"
                  style={{ top: index * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                />
              ))}

              {columnMeetings.map((meeting) => {
                const start = getMinutesFromTime(meeting.startTime);
                const end = getMinutesFromTime(meeting.endTime);
                const top = ((start - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                const height = Math.max(((end - start) / 60) * HOUR_HEIGHT, 36);

                return (
                  <button
                    key={meeting.id}
                    type="button"
                    onClick={() => onEventClick(meeting)}
                    className="absolute left-2 right-2 rounded-2xl border border-purple-200 bg-purple-100/90 px-3 py-2 text-left shadow-sm hover:bg-purple-100"
                    style={{ top, height }}
                  >
                    <p className="line-clamp-1 text-sm font-semibold text-purple-950">{meeting.title}</p>
                    <p className="mt-1 text-xs text-purple-800">{getEventDisplayTime(meeting)}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-purple-700">
                      Organizador: {users.find((user) => user.id === meeting.creatorId)?.name || 'Usuário'}
                    </p>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
