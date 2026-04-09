import { Notification, User } from '../types';

type NotificationTarget = {
  userId: string;
  type: Notification['type'];
  title: string;
  description: string;
  entityType?: Notification['entityType'];
  entityId?: string;
  linkTo?: string;
};

export function normalizeNotification(raw: Notification | Record<string, unknown>): Notification {
  const candidate = raw as Notification & {
    message?: string;
    read?: boolean;
    timestamp?: string;
  };

  return {
    id: candidate.id,
    userId: candidate.userId,
    type: candidate.type || 'automation_triggered',
    title: candidate.title || 'Notificação',
    description: candidate.description || candidate.message || '',
    entityType: candidate.entityType,
    entityId: candidate.entityId,
    isRead: candidate.isRead ?? candidate.read ?? false,
    createdAt: candidate.createdAt || candidate.timestamp || new Date().toISOString(),
    linkTo: candidate.linkTo,
  };
}

export function createNotification(target: NotificationTarget): Notification {
  return normalizeNotification({
    id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...target,
    isRead: false,
    createdAt: new Date().toISOString(),
  });
}

export function sortNotificationsByDate(notifications: Notification[]) {
  return [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function isDuplicateNotification(
  existing: Notification,
  incoming: Notification,
  timeWindowMs = 15_000
) {
  if (existing.userId !== incoming.userId) return false;
  if (existing.type !== incoming.type) return false;
  if ((existing.entityId || '') !== (incoming.entityId || '')) return false;
  if (existing.title !== incoming.title) return false;
  if (existing.description !== incoming.description) return false;

  return (
    Math.abs(new Date(existing.createdAt).getTime() - new Date(incoming.createdAt).getTime()) <=
    timeWindowMs
  );
}

export function extractMentionedUsers(content: string, users: User[], authorId?: string) {
  const normalizedContent = content.toLocaleLowerCase('pt-BR');

  return users.filter((user) => {
    if (authorId && user.id === authorId) return false;
    return normalizedContent.includes(`@${user.name.toLocaleLowerCase('pt-BR')}`);
  });
}

export function buildNotificationLink(notification: Notification) {
  if (notification.linkTo) return notification.linkTo;

  if (notification.entityType === 'task' && notification.entityId) {
    return `/my-tasks?task=${notification.entityId}`;
  }

  if (notification.entityType === 'project' && notification.entityId) {
    return `/governance?project=${notification.entityId}`;
  }

  if (notification.entityType === 'meeting') {
    return '/agenda';
  }

  if (notification.entityType === 'reminder') {
    return '/my-tasks';
  }

  return undefined;
}
