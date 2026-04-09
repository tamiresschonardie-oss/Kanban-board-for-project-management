import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarEvent, MeetingRoom } from '../../types';
import {
  buildMonthGrid,
  formatWeekdayShort,
  getEventDisplayTime,
  getRoomName,
  isSameDay,
  sortEventsByStart,
  toDateKey,
} from '../../utils/scheduleUtils';

interface CalendarMonthViewProps {
  month: Date;
  events: CalendarEvent[];
  rooms: MeetingRoom[];
  selectedDate?: string | null;
  onSelectDate: (date: string) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function CalendarMonthView({
  month,
  events,
  rooms,
  selectedDate,
  onSelectDate,
  onEventClick,
}: CalendarMonthViewProps) {
  const days = buildMonthGrid(month);
  const todayKey = toDateKey(new Date());

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {formatWeekdayShort(index)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = sortEventsByStart(events.filter((event) => isSameDay(event.date, day.dateKey)));
          const isCurrentMonth = day.monthOffset === 0;
          const isSelected = selectedDate === day.dateKey;
          const isToday = isSameDay(day.dateKey, todayKey);

          return (
            <button
              key={day.dateKey}
              type="button"
              onClick={() => onSelectDate(day.dateKey)}
              className={`min-h-[144px] border-b border-r border-gray-100 px-3 py-3 text-left align-top transition-colors ${
                isCurrentMonth ? 'bg-white hover:bg-blue-50/40' : 'bg-gray-50/60 text-gray-400 hover:bg-gray-100'
              } ${isSelected ? 'ring-2 ring-inset ring-blue-500' : ''}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    isToday
                      ? 'bg-blue-600 text-white'
                      : isCurrentMonth
                        ? 'text-gray-900'
                        : 'text-gray-400'
                  }`}
                >
                  {day.day}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[11px] font-medium text-gray-500">
                    {dayEvents.length} evento{dayEvents.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {dayEvents.slice(0, 3).map((event) => {
                  const isMeeting = event.type === 'meeting';
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      className={`rounded-xl border px-2.5 py-2 text-xs shadow-sm transition-colors ${
                        isMeeting
                          ? 'border-purple-200 bg-purple-50 text-purple-900 hover:bg-purple-100'
                          : 'border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100'
                      } ${event.status === 'cancelled' ? 'opacity-50 line-through' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-semibold">{event.title}</span>
                        <span className="shrink-0 text-[10px] font-medium uppercase">
                          {isMeeting ? 'Reunião' : 'Pessoal'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                        <span>{getEventDisplayTime(event)}</span>
                        {event.roomId && <span className="truncate">{getRoomName(rooms, event.roomId)}</span>}
                      </div>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="px-1 text-xs font-medium text-gray-500">
                    +{dayEvents.length - 3} compromisso{dayEvents.length - 3 > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarRangeHeader({
  periodLabel,
  onPrevious,
  onNext,
  onToday,
  title,
  description,
  controls,
}: {
  periodLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  title: string;
  description: string;
  controls?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {controls}
        <button
          type="button"
          onClick={onToday}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Hoje
        </button>
        <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-2 py-2 shadow-sm">
          <button
            type="button"
            onClick={onPrevious}
            className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100"
            aria-label="Voltar período"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-[164px] px-3 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
              Período
            </div>
            <div className="text-base font-semibold text-gray-900">
              {periodLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={onNext}
            className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100"
            aria-label="Avançar período"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
