import { CalendarEvent, MeetingRoom } from '../types';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00`);
}

export function getEventStart(event: Pick<CalendarEvent, 'date' | 'startTime'>): Date {
  return new Date(`${event.date}T${event.startTime}:00`);
}

export function getEventEnd(event: Pick<CalendarEvent, 'date' | 'endTime'>): Date {
  return new Date(`${event.date}T${event.endTime}:00`);
}

export function hasInvalidTimeRange(event: Pick<CalendarEvent, 'date' | 'startTime' | 'endTime'>): boolean {
  return getEventEnd(event) <= getEventStart(event);
}

export function hasRoomConflict(
  events: CalendarEvent[],
  candidate: Pick<CalendarEvent, 'id' | 'date' | 'startTime' | 'endTime' | 'roomId' | 'status'>
): boolean {
  if (!candidate.roomId || candidate.status === 'cancelled' || hasInvalidTimeRange(candidate)) {
    return false;
  }

  const candidateStart = getEventStart(candidate);
  const candidateEnd = getEventEnd(candidate);

  return events.some((event) => {
    if (event.id === candidate.id) return false;
    if (event.status === 'cancelled') return false;
    if (event.roomId !== candidate.roomId) return false;
    if (event.date !== candidate.date) return false;

    const eventStart = getEventStart(event);
    const eventEnd = getEventEnd(event);

    return candidateStart < eventEnd && candidateEnd > eventStart;
  });
}

export function checkRoomConflict(
  events: CalendarEvent[],
  candidate: Pick<CalendarEvent, 'id' | 'date' | 'startTime' | 'endTime' | 'roomId' | 'status'>
): CalendarEvent[] {
  if (!candidate.roomId || candidate.status === 'cancelled' || hasInvalidTimeRange(candidate)) {
    return [];
  }

  const candidateStart = getEventStart(candidate);
  const candidateEnd = getEventEnd(candidate);

  return events.filter((event) => {
    if (event.id === candidate.id) return false;
    if (event.status === 'cancelled') return false;
    if (event.type !== 'meeting') return false;
    if (event.roomId !== candidate.roomId) return false;
    if (event.date !== candidate.date) return false;

    const eventStart = getEventStart(event);
    const eventEnd = getEventEnd(event);

    return candidateStart < eventEnd && candidateEnd > eventStart;
  });
}

export function getMeetingsByRoomAndPeriod(
  events: CalendarEvent[],
  params: { roomId?: string; startDate: string; endDate: string }
): CalendarEvent[] {
  const { roomId, startDate, endDate } = params;
  return sortEventsByStart(
    events.filter((event) => {
      if (event.type !== 'meeting' || event.status === 'cancelled') return false;
      if (roomId && event.roomId !== roomId) return false;
      return event.date >= startDate && event.date <= endDate;
    })
  );
}

export function getRoomAvailability(
  rooms: MeetingRoom[],
  events: CalendarEvent[],
  params: { date: string; startTime: string; endTime: string }
) {
  return rooms.map((room) => ({
    room,
    conflicts: checkRoomConflict(events, {
      id: `availability-${room.id}`,
      date: params.date,
      startTime: params.startTime,
      endTime: params.endTime,
      roomId: room.id,
      status: 'active',
    }),
    isAvailable:
      checkRoomConflict(events, {
        id: `availability-${room.id}`,
        date: params.date,
        startTime: params.startTime,
        endTime: params.endTime,
        roomId: room.id,
        status: 'active',
      }).length === 0,
  }));
}

export function getRoomName(rooms: MeetingRoom[], roomId?: string): string {
  if (!roomId) return 'Sem sala';
  return rooms.find((room) => room.id === roomId)?.name || 'Sala removida';
}

export function getUserDisplayNames(userIds: string[], users: Array<{ id: string; name: string }>): string[] {
  return userIds
    .map((userId) => users.find((user) => user.id === userId)?.name)
    .filter((name): name is string => Boolean(name));
}

export function formatMonthLabel(date: Date): string {
  return capitalize(new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date));
}

export function formatMonthShortLabel(date: Date): string {
  return capitalize(new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
  }).format(date));
}

export function formatWeekdayShort(index: number): string {
  const base = new Date(Date.UTC(2026, 0, 4 + index));
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
    .format(base)
    .replace('.', '');
}

export function sortEventsByStart(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
}

export function isSameDay(left: string, right: string): boolean {
  return left === right;
}

export function buildMonthGrid(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const firstVisible = new Date(start);
  firstVisible.setDate(start.getDate() - start.getDay());
  const lastVisible = new Date(end);
  lastVisible.setDate(end.getDate() + (6 - end.getDay()));

  const days: Array<{ date: Date; dateKey: string; day: number; monthOffset: -1 | 0 | 1 }> = [];
  for (let cursor = new Date(firstVisible); cursor <= lastVisible; cursor.setDate(cursor.getDate() + 1)) {
    const cursorDate = new Date(cursor);
    days.push({
      date: cursorDate,
      dateKey: toDateKey(cursorDate),
      day: cursorDate.getDate(),
      monthOffset: cursorDate.getMonth() < month.getMonth()
        || cursorDate.getFullYear() < month.getFullYear()
        ? -1
        : cursorDate.getMonth() > month.getMonth() || cursorDate.getFullYear() > month.getFullYear()
          ? 1
          : 0,
    });
  }

  return days;
}

export function getEventDisplayTime(event: Pick<CalendarEvent, 'startTime' | 'endTime'>): string {
  return `${event.startTime} - ${event.endTime}`;
}

export function getWeekRange(anchor: Date) {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function buildWeekDays(anchor: Date) {
  const { start } = getWeekRange(anchor);

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start.getTime() + index * ONE_DAY_MS);
    return {
      date,
      dateKey: toDateKey(date),
      day: date.getDate(),
    };
  });
}

export function formatWeekRangeLabel(anchor: Date): string {
  const { start, end } = getWeekRange(anchor);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    return formatMonthLabel(start);
  }

  if (sameYear) {
    return `${formatMonthShortLabel(start)} - ${formatMonthShortLabel(end)} ${start.getFullYear()}`;
  }

  return `${formatMonthShortLabel(start)} ${start.getFullYear()} - ${formatMonthShortLabel(end)} ${end.getFullYear()}`;
}

export function getMinutesFromTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function getWeekEventLayout(events: CalendarEvent[]) {
  const sortedEvents = sortEventsByStart(events);
  const placements: Array<{
    event: CalendarEvent;
    column: number;
    columns: number;
  }> = [];

  let group: CalendarEvent[] = [];
  let currentGroupEnd = -1;

  const flushGroup = () => {
    if (group.length === 0) return;

    const columnEndTimes: number[] = [];
    const localPlacements: Array<{ event: CalendarEvent; column: number }> = [];

    for (const event of group) {
      const start = getMinutesFromTime(event.startTime);
      const end = getMinutesFromTime(event.endTime);
      let column = columnEndTimes.findIndex((columnEnd) => start >= columnEnd);

      if (column === -1) {
        column = columnEndTimes.length;
        columnEndTimes.push(end);
      } else {
        columnEndTimes[column] = end;
      }

      localPlacements.push({ event, column });
    }

    const columns = Math.max(columnEndTimes.length, 1);
    localPlacements.forEach((placement) => {
      placements.push({ ...placement, columns });
    });
    group = [];
    currentGroupEnd = -1;
  };

  for (const event of sortedEvents) {
    const start = getMinutesFromTime(event.startTime);
    const end = getMinutesFromTime(event.endTime);

    if (group.length === 0 || start < currentGroupEnd) {
      group.push(event);
      currentGroupEnd = Math.max(currentGroupEnd, end);
      continue;
    }

    flushGroup();
    group.push(event);
    currentGroupEnd = end;
  }

  flushGroup();

  return placements;
}
