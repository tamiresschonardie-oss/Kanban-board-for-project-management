import { CalendarEvent, MeetingRoom } from '../../types';
import {
  buildWeekDays,
  formatWeekdayShort,
  getEventDisplayTime,
  getMinutesFromTime,
  getRoomName,
  getWeekEventLayout,
  isSameDay,
  toDateKey,
} from '../../utils/scheduleUtils';

interface CalendarWeekViewProps {
  anchorDate: Date;
  events: CalendarEvent[];
  rooms: MeetingRoom[];
  selectedDate?: string | null;
  onSelectDate: (date: string) => void;
  onCreateSlot: (date: string, startTime: string, endTime: string) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_ROW_HEIGHT = 64;
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_ROW_HEIGHT;

function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function CalendarWeekView({
  anchorDate,
  events,
  rooms,
  selectedDate,
  onSelectDate,
  onCreateSlot,
  onEventClick,
}: CalendarWeekViewProps) {
  const days = buildWeekDays(anchorDate);
  const totalMinutes = (END_HOUR - START_HOUR) * 60;
  const nowKey = toDateKey(new Date());

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="grid grid-cols-[72px_repeat(7,minmax(140px,1fr))] border-b border-gray-200 bg-gray-50">
        <div className="border-r border-gray-200 px-3 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">
          Hora
        </div>
        {days.map((day) => {
          const isSelected = selectedDate === day.dateKey;
          const isToday = day.dateKey === nowKey;

          return (
            <button
              key={day.dateKey}
              type="button"
              onClick={() => onSelectDate(day.dateKey)}
              className={`border-r border-gray-200 px-3 py-3 text-left transition-colors last:border-r-0 ${
                isSelected ? 'bg-blue-50/80' : 'hover:bg-blue-50/40'
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                {formatWeekdayShort(day.date.getDay())}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold ${
                    isToday ? 'bg-blue-600 text-white' : 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
                  }`}
                >
                  {day.day}
                </span>
                {isToday && <span className="text-xs font-medium text-blue-700">Hoje</span>}
              </div>
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid min-w-[1040px] grid-cols-[72px_repeat(7,minmax(140px,1fr))]"
          style={{ minHeight: TOTAL_HEIGHT }}
        >
          <div className="border-r border-gray-200 bg-white">
            {Array.from({ length: END_HOUR - START_HOUR }).map((_, index) => {
              const hour = START_HOUR + index;
              return (
                <div
                  key={hour}
                  className="relative border-b border-gray-100 px-3 text-xs font-medium text-gray-400"
                  style={{ height: HOUR_ROW_HEIGHT }}
                >
                  <span className="-translate-y-1/2 absolute top-0 left-3 bg-white pr-2">
                    {formatHourLabel(hour)}
                  </span>
                </div>
              );
            })}
          </div>

          {days.map((day) => {
            const dayEvents = events.filter((event) => isSameDay(event.date, day.dateKey));
            const placements = getWeekEventLayout(dayEvents);
            const isSelected = selectedDate === day.dateKey;
            const isToday = day.dateKey === nowKey;

            return (
              <div
                key={day.dateKey}
                className={`relative border-r border-gray-200 last:border-r-0 ${
                  isSelected ? 'bg-blue-50/30' : 'bg-white'
                }`}
                style={{ height: TOTAL_HEIGHT }}
              >
                {Array.from({ length: END_HOUR - START_HOUR }).map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      const startTime = formatHourLabel(START_HOUR + index);
                      const endTime = formatHourLabel(Math.min(END_HOUR, START_HOUR + index + 1));
                      onCreateSlot(day.dateKey, startTime, endTime);
                    }}
                    className="block w-full border-b border-gray-100 transition-colors hover:bg-blue-50/50"
                    style={{ height: HOUR_ROW_HEIGHT }}
                    aria-label={`Criar compromisso em ${day.dateKey} às ${formatHourLabel(START_HOUR + index)}`}
                  />
                ))}

                {isToday && (
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-1 rounded-r-full bg-blue-500/80" />
                )}

                {placements.map(({ event, column, columns }) => {
                  const startMinutes = getMinutesFromTime(event.startTime);
                  const endMinutes = getMinutesFromTime(event.endTime);
                  const top = clamp(((startMinutes - START_HOUR * 60) / 60) * HOUR_ROW_HEIGHT, 0, TOTAL_HEIGHT);
                  const height = Math.max(((endMinutes - startMinutes) / 60) * HOUR_ROW_HEIGHT, 36);
                  const width = 100 / columns;
                  const left = column * width;
                  const isMeeting = event.type === 'meeting';

                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onEventClick(event)}
                      className={`absolute z-10 overflow-hidden rounded-2xl border px-3 py-2 text-left shadow-sm transition-all hover:shadow-md ${
                        isMeeting
                          ? 'border-purple-200 bg-purple-50 text-purple-950'
                          : 'border-blue-200 bg-blue-50 text-blue-950'
                      } ${event.status === 'cancelled' ? 'opacity-60 line-through' : ''}`}
                      style={{
                        top,
                        left: `calc(${left}% + 4px)`,
                        width: `calc(${width}% - 8px)`,
                        height,
                      }}
                    >
                      <div className="truncate text-xs font-semibold">{event.title}</div>
                      <div className="mt-1 text-[11px] font-medium opacity-80">{getEventDisplayTime(event)}</div>
                      {event.roomId && (
                        <div className="mt-1 truncate text-[11px] opacity-70">
                          {getRoomName(rooms, event.roomId)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
