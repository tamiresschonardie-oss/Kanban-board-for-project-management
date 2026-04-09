import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS, STORAGE_VERSIONS } from '../constants/project';
import { CalendarEvent, MeetingRoom } from '../types';
import { hasInvalidTimeRange, hasRoomConflict } from '../utils/scheduleUtils';
import { useAdmin } from './AdminContext';

interface ScheduleContextType {
  events: CalendarEvent[];
  rooms: MeetingRoom[];
  addEvent: (
    event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>,
    options?: { allowRoomConflict?: boolean }
  ) => { success: boolean; error?: string };
  updateEvent: (
    id: string,
    updates: Partial<CalendarEvent>,
    options?: { allowRoomConflict?: boolean }
  ) => { success: boolean; error?: string };
  deleteEvent: (id: string) => void;
  cancelEvent: (id: string) => { success: boolean; error?: string };
  addRoom: (room: Omit<MeetingRoom, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRoom: (id: string, updates: Partial<MeetingRoom>) => { success: boolean; error?: string };
  deleteRoom: (id: string) => { success: boolean; error?: string };
  getEventsForUser: (userId?: string) => CalendarEvent[];
  getMeetings: () => CalendarEvent[];
}

interface StorageEnvelope<T> {
  version: number;
  data: T;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

const initialRooms: MeetingRoom[] = [
  {
    id: 'room-1',
    name: 'Sala Atlântico',
    location: '4º andar',
    capacity: 8,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'room-2',
    name: 'Sala Aurora',
    location: '3º andar',
    capacity: 4,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const initialEvents: CalendarEvent[] = [
  {
    id: 'event-1',
    title: 'Kickoff semanal',
    description: 'Alinhamento rápido das entregas da semana.',
    date: new Date().toISOString().slice(0, 10),
    startTime: '10:00',
    endTime: '10:30',
    creatorId: '2',
    participantIds: ['1', '2', '3'],
    roomId: 'room-1',
    type: 'meeting',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as StorageEnvelope<T> | T;
    if (parsed && typeof parsed === 'object' && 'data' in (parsed as StorageEnvelope<T>)) {
      return (parsed as StorageEnvelope<T>).data;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, version: number, data: T) {
  const payload: StorageEnvelope<T> = { version, data };
  localStorage.setItem(key, JSON.stringify(payload));
}

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const { currentUser, addNotification, users } = useAdmin();
  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    readStorage(STORAGE_KEYS.scheduleEvents, initialEvents)
  );
  const [rooms, setRooms] = useState<MeetingRoom[]>(() =>
    readStorage(STORAGE_KEYS.meetingRooms, initialRooms)
  );

  useEffect(() => {
    writeStorage(STORAGE_KEYS.scheduleEvents, STORAGE_VERSIONS.scheduleEvents, events);
  }, [events]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.meetingRooms, STORAGE_VERSIONS.meetingRooms, rooms);
  }, [rooms]);

  const validateEvent = (candidate: CalendarEvent, options?: { allowRoomConflict?: boolean }) => {
    if (hasInvalidTimeRange(candidate)) {
      return 'O horário final deve ser posterior ao horário inicial.';
    }

    if (!options?.allowRoomConflict && candidate.roomId && hasRoomConflict(events, candidate)) {
      return 'Já existe outra reserva para esta sala no mesmo horário.';
    }

    return undefined;
  };

  const addEvent: ScheduleContextType['addEvent'] = (event, options) => {
    const now = new Date().toISOString();
    const candidate: CalendarEvent = {
      ...event,
      id: `event-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };

    const error = validateEvent(candidate, options);
    if (error) return { success: false, error };

    setEvents((prev) => [...prev, candidate]);

    if (candidate.type === 'meeting') {
      candidate.participantIds
        .filter((participantId) => participantId !== candidate.creatorId)
        .forEach((participantId) => {
          addNotification({
            id: `notification-${Date.now()}-${participantId}`,
            userId: participantId,
            type: 'meeting_invite',
            title: 'Nova reunião agendada',
            description: `${currentUser?.name || 'Usuário'} convidou você para "${candidate.title}".`,
            entityType: 'meeting',
            entityId: candidate.id,
            isRead: false,
            createdAt: now,
            linkTo: '/meetings',
          });
        });
    }

    return { success: true };
  };

  const updateEvent: ScheduleContextType['updateEvent'] = (id, updates, options) => {
    const current = events.find((event) => event.id === id);
    if (!current) return { success: false, error: 'Evento não encontrado.' };

    const candidate: CalendarEvent = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const error = validateEvent(candidate, options);
    if (error) return { success: false, error };

    setEvents((prev) => prev.map((event) => (event.id === id ? candidate : event)));
    return { success: true };
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== id));
  };

  const cancelEvent: ScheduleContextType['cancelEvent'] = (id) =>
    updateEvent(id, { status: 'cancelled' });

  const addRoom: ScheduleContextType['addRoom'] = (room) => {
    const now = new Date().toISOString();
    setRooms((prev) => [
      ...prev,
      {
        ...room,
        id: `room-${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  };

  const updateRoom: ScheduleContextType['updateRoom'] = (id, updates) => {
    const current = rooms.find((room) => room.id === id);
    if (!current) return { success: false, error: 'Sala não encontrada.' };

    const nextRoom = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    setRooms((prev) => prev.map((room) => (room.id === id ? nextRoom : room)));
    return { success: true };
  };

  const deleteRoom: ScheduleContextType['deleteRoom'] = (id) => {
    const roomInUse = events.some((event) => event.roomId === id && event.status === 'active');
    if (roomInUse) {
      return { success: false, error: 'A sala possui reservas ativas e não pode ser removida.' };
    }

    setRooms((prev) => prev.filter((room) => room.id !== id));
    return { success: true };
  };

  const getEventsForUser = (userId?: string) => {
    if (!userId) return [];
    return events
      .filter(
        (event) => event.creatorId === userId || event.participantIds.includes(userId)
      )
      .sort((a, b) =>
        `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)
      );
  };

  const getMeetings = () =>
    events
      .filter((event) => event.type === 'meeting')
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));

  const value = useMemo<ScheduleContextType>(
    () => ({
      events,
      rooms,
      addEvent,
      updateEvent,
      deleteEvent,
      cancelEvent,
      addRoom,
      updateRoom,
      deleteRoom,
      getEventsForUser,
      getMeetings,
    }),
    [events, rooms, users]
  );

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}
