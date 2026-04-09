import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Note, Reminder } from '../types';
import { useAdmin } from './AdminContext';
import { useIntegration } from './IntegrationContext';
import { createNotification } from '../utils/notifications';
import { useFeedback } from './FeedbackContext';

interface PersonalProductivityContextType {
  reminders: Reminder[];
  notes: Note[];
  browserNotificationPermission: NotificationPermission | 'unsupported';
  requestBrowserNotificationPermission: () => Promise<NotificationPermission | 'unsupported'>;
  addReminder: (
    input: Omit<
      Reminder,
      | 'id'
      | 'userId'
      | 'createdAt'
      | 'updatedAt'
      | 'completed'
      | 'status'
      | 'notifiedAt'
      | 'lastNotificationChannel'
    > & { completed?: boolean }
  ) => Reminder | null;
  updateReminder: (
    id: string,
    updates: Partial<
      Omit<
        Reminder,
        'id' | 'userId' | 'createdAt' | 'status' | 'completed' | 'notifiedAt' | 'lastNotificationChannel'
      >
    >
  ) => Reminder | null;
  toggleReminderCompleted: (id: string) => void;
  deleteReminder: (id: string) => void;
  addNote: (input: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Note | null;
  updateNote: (id: string, updates: Partial<Omit<Note, 'id' | 'userId' | 'createdAt'>>) => Note | null;
  deleteNote: (id: string) => void;
  toggleNotePinned: (id: string) => void;
}

const STORAGE_KEY = 'crisdu_personal_productivity';
const REMINDER_POLL_MS = 30_000;

interface StorageShape {
  reminders: Reminder[];
  notes: Note[];
}

const PersonalProductivityContext = createContext<PersonalProductivityContextType | undefined>(
  undefined
);

function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }

  return Notification.permission;
}

function normalizeReminder(raw: Reminder | Record<string, unknown>): Reminder | null {
  const candidate = raw as Partial<Reminder> & { dateTime?: string; notify?: boolean };
  if (!candidate || typeof candidate !== 'object') return null;
  if (typeof candidate.id !== 'string' || typeof candidate.userId !== 'string') return null;
  if (typeof candidate.title !== 'string') return null;

  const remindAt =
    typeof candidate.remindAt === 'string'
      ? candidate.remindAt
      : typeof candidate.dateTime === 'string'
        ? candidate.dateTime
        : null;

  if (!remindAt) return null;

  const completed = candidate.completed === true;
  const notifyEnabled =
    typeof candidate.notifyEnabled === 'boolean'
      ? candidate.notifyEnabled
      : candidate.notify === true;

  return {
    id: candidate.id,
    userId: candidate.userId,
    title: candidate.title,
    description: typeof candidate.description === 'string' ? candidate.description : undefined,
    remindAt,
    dateTime: remindAt,
    notifyEnabled,
    notify: notifyEnabled,
    timezone:
      typeof candidate.timezone === 'string'
        ? candidate.timezone
        : Intl.DateTimeFormat().resolvedOptions().timeZone,
    status:
      candidate.status === 'completed' || completed
        ? 'completed'
        : 'pending',
    notifiedAt: typeof candidate.notifiedAt === 'string' ? candidate.notifiedAt : undefined,
    lastNotificationChannel:
      candidate.lastNotificationChannel === 'browser' || candidate.lastNotificationChannel === 'in_app'
        ? candidate.lastNotificationChannel
        : undefined,
    createdAt:
      typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
    updatedAt:
      typeof candidate.updatedAt === 'string' ? candidate.updatedAt : new Date().toISOString(),
    completed,
  };
}

function readStorage(): StorageShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { reminders: [], notes: [] };
    const parsed = JSON.parse(raw) as Partial<StorageShape>;
    return {
      reminders: Array.isArray(parsed.reminders)
        ? parsed.reminders
            .map((item) => normalizeReminder(item))
            .filter((item): item is Reminder => item !== null)
        : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
    };
  } catch {
    return { reminders: [], notes: [] };
  }
}

function createId(prefix: 'reminder' | 'note') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function PersonalProductivityProvider({ children }: { children: ReactNode }) {
  const { currentUser, addNotification } = useAdmin();
  const { publishDomainEvent } = useIntegration();
  const { showFeedback } = useFeedback();
  const [storage, setStorage] = useState<StorageShape>(() => readStorage());
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => getBrowserNotificationPermission());
  const lastFeedbackReminderIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  }, [storage]);

  useEffect(() => {
    setBrowserNotificationPermission(getBrowserNotificationPermission());
  }, []);

  const reminders = useMemo(
    () =>
      storage.reminders
        .filter((item) => item.userId === currentUser?.id)
        .sort((a, b) => {
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime();
        }),
    [storage.reminders, currentUser?.id]
  );

  const notes = useMemo(
    () =>
      storage.notes
        .filter((item) => item.userId === currentUser?.id)
        .sort((a, b) => {
          if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }),
    [storage.notes, currentUser?.id]
  );

  const requestBrowserNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      setBrowserNotificationPermission('unsupported');
      return 'unsupported';
    }

    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
      setBrowserNotificationPermission(Notification.permission);
      return Notification.permission;
    }

    const nextPermission = await Notification.requestPermission();
    setBrowserNotificationPermission(nextPermission);
    return nextPermission;
  }, []);

  const addReminder: PersonalProductivityContextType['addReminder'] = (input) => {
    if (!currentUser?.id) return null;
    const now = new Date().toISOString();
    const notifyEnabled =
      typeof input.notifyEnabled === 'boolean'
        ? input.notifyEnabled
        : input.notify === true;
    const remindAt =
      typeof input.remindAt === 'string'
        ? input.remindAt
        : typeof input.dateTime === 'string'
          ? input.dateTime
          : '';

    const reminder: Reminder = {
      id: createId('reminder'),
      userId: currentUser.id,
      title: input.title,
      description: input.description,
      remindAt,
      dateTime: remindAt,
      notifyEnabled,
      notify: notifyEnabled,
      timezone: input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: input.completed ? 'completed' : 'pending',
      completed: input.completed ?? false,
      createdAt: now,
      updatedAt: now,
      notifiedAt: undefined,
      lastNotificationChannel: undefined,
    };
    setStorage((prev) => ({ ...prev, reminders: [...prev.reminders, reminder] }));
    publishDomainEvent({
      name: 'reminder.created',
      entityType: 'reminder',
      entityId: reminder.id,
      payloadJson: {
        reminderId: reminder.id,
        userId: reminder.userId,
        title: reminder.title,
        remindAt: reminder.remindAt,
        notifyEnabled: reminder.notifyEnabled,
      },
    });
    return reminder;
  };

  const updateReminder: PersonalProductivityContextType['updateReminder'] = (id, updates) => {
    let updated: Reminder | null = null;
    setStorage((prev) => ({
      ...prev,
      reminders: prev.reminders.map((item) => {
        if (item.id !== id || item.userId !== currentUser?.id) return item;

        const nextRemindAt =
          typeof updates.remindAt === 'string'
            ? updates.remindAt
            : typeof updates.dateTime === 'string'
              ? updates.dateTime
              : item.remindAt;
        const nextNotifyEnabled =
          typeof updates.notifyEnabled === 'boolean'
            ? updates.notifyEnabled
            : typeof updates.notify === 'boolean'
              ? updates.notify
              : item.notifyEnabled;

        updated = {
          ...item,
          ...updates,
          remindAt: nextRemindAt,
          dateTime: nextRemindAt,
          notifyEnabled: nextNotifyEnabled,
          notify: nextNotifyEnabled,
          status: item.completed ? 'completed' : 'pending',
          updatedAt: new Date().toISOString(),
          notifiedAt:
            nextRemindAt !== item.remindAt || nextNotifyEnabled !== item.notifyEnabled
              ? undefined
              : item.notifiedAt,
          lastNotificationChannel:
            nextRemindAt !== item.remindAt || nextNotifyEnabled !== item.notifyEnabled
              ? undefined
              : item.lastNotificationChannel,
        };
        return updated;
      }),
    }));
    return updated;
  };

  const toggleReminderCompleted = (id: string) => {
    const current = storage.reminders.find(
      (item) => item.id === id && item.userId === currentUser?.id
    );
    if (!current) return;

    setStorage((prev) => ({
      ...prev,
      reminders: prev.reminders.map((item) =>
        item.id === id && item.userId === currentUser?.id
          ? {
              ...item,
              completed: !current.completed,
              status: !current.completed ? 'completed' : 'pending',
              updatedAt: new Date().toISOString(),
            }
          : item
      ),
    }));
  };

  const deleteReminder = (id: string) => {
    setStorage((prev) => ({
      ...prev,
      reminders: prev.reminders.filter(
        (item) => !(item.id === id && item.userId === currentUser?.id)
      ),
    }));
    lastFeedbackReminderIdsRef.current.delete(id);
  };

  const addNote: PersonalProductivityContextType['addNote'] = (input) => {
    if (!currentUser?.id) return null;
    const now = new Date().toISOString();
    const note: Note = {
      id: createId('note'),
      userId: currentUser.id,
      title: input.title,
      content: input.content,
      color: input.color || 'amber',
      isPinned: input.isPinned ?? false,
      createdAt: now,
      updatedAt: now,
    };
    setStorage((prev) => ({ ...prev, notes: [...prev.notes, note] }));
    return note;
  };

  const updateNote: PersonalProductivityContextType['updateNote'] = (id, updates) => {
    let updated: Note | null = null;
    setStorage((prev) => ({
      ...prev,
      notes: prev.notes.map((item) => {
        if (item.id !== id || item.userId !== currentUser?.id) return item;
        updated = { ...item, ...updates, updatedAt: new Date().toISOString() };
        return updated;
      }),
    }));
    return updated;
  };

  const deleteNote = (id: string) => {
    setStorage((prev) => ({
      ...prev,
      notes: prev.notes.filter((item) => !(item.id === id && item.userId === currentUser?.id)),
    }));
  };

  const toggleNotePinned = (id: string) => {
    const current = storage.notes.find(
      (item) => item.id === id && item.userId === currentUser?.id
    );
    if (!current) return;
    updateNote(id, { isPinned: !current.isPinned });
  };

  const processPendingReminders = useCallback(() => {
    if (!currentUser?.id) return;

    const now = Date.now();
    const dueReminders = storage.reminders.filter((reminder) => {
      if (reminder.userId !== currentUser.id) return false;
      if (reminder.completed || reminder.status === 'completed') return false;
      if (!reminder.notifyEnabled) return false;
      if (reminder.notifiedAt) return false;

      const remindAt = new Date(reminder.remindAt).getTime();
      if (Number.isNaN(remindAt)) return false;
      return remindAt <= now;
    });

    if (dueReminders.length === 0) return;

    const processedIds = new Set<string>();
    dueReminders.forEach((reminder) => {
      let channel: Reminder['lastNotificationChannel'] = 'in_app';

      if (
        browserNotificationPermission === 'granted' &&
        typeof window !== 'undefined' &&
        typeof Notification !== 'undefined'
      ) {
        new Notification(reminder.title, {
          body: reminder.description || 'Seu lembrete chegou ao horário agendado.',
          tag: reminder.id,
        });
        channel = 'browser';
      }

      addNotification(
        createNotification({
          userId: reminder.userId,
          type: 'reminder_due',
          title: `Lembrete: ${reminder.title}`,
          description:
            reminder.description ||
            `Lembrete agendado para ${new Date(reminder.remindAt).toLocaleString('pt-BR')}.`,
          entityType: 'reminder',
          entityId: reminder.id,
          linkTo: '/my-tasks',
        })
      );

      if (!lastFeedbackReminderIdsRef.current.has(reminder.id)) {
        showFeedback({
          tone: 'info',
          title: 'Lembrete vencido',
          message: `${reminder.title} chegou ao horário agendado.`,
        });
        lastFeedbackReminderIdsRef.current.add(reminder.id);
      }

      processedIds.add(reminder.id);
      setStorage((prev) => ({
        ...prev,
        reminders: prev.reminders.map((item) =>
          item.id === reminder.id
            ? {
                ...item,
                notifiedAt: new Date().toISOString(),
                lastNotificationChannel: channel,
                updatedAt: new Date().toISOString(),
              }
            : item
        ),
      }));
    });
  }, [
    currentUser?.id,
    storage.reminders,
    browserNotificationPermission,
    addNotification,
    showFeedback,
  ]);

  useEffect(() => {
    processPendingReminders();

    const intervalId = window.setInterval(processPendingReminders, REMINDER_POLL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        processPendingReminders();
        setBrowserNotificationPermission(getBrowserNotificationPermission());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [processPendingReminders]);

  const value = useMemo<PersonalProductivityContextType>(
    () => ({
      reminders,
      notes,
      browserNotificationPermission,
      requestBrowserNotificationPermission,
      addReminder,
      updateReminder,
      toggleReminderCompleted,
      deleteReminder,
      addNote,
      updateNote,
      deleteNote,
      toggleNotePinned,
    }),
    [
      reminders,
      notes,
      browserNotificationPermission,
      requestBrowserNotificationPermission,
      currentUser?.id,
      storage,
    ]
  );

  return (
    <PersonalProductivityContext.Provider value={value}>
      {children}
    </PersonalProductivityContext.Provider>
  );
}

export function usePersonalProductivity() {
  const context = useContext(PersonalProductivityContext);
  if (!context) {
    throw new Error(
      'usePersonalProductivity must be used within PersonalProductivityProvider'
    );
  }
  return context;
}
