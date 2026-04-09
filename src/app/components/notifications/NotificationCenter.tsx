import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAdmin } from '../../context/AdminContext';
import { buildNotificationLink } from '../../utils/notifications';

interface NotificationCenterProps {
  compact?: boolean;
  className?: string;
}

export function NotificationCenter({
  compact = false,
  className = '',
}: NotificationCenterProps) {
  const navigate = useNavigate();
  const { currentUser, notifications, markNotificationAsRead } = useAdmin();
  const [isOpen, setIsOpen] = useState(false);

  const userNotifications = useMemo(
    () =>
      notifications.filter(
        (notification) => notification.userId === currentUser?.id
      ),
    [notifications, currentUser?.id]
  );
  const unreadCount = userNotifications.filter((notification) => !notification.isRead).length;

  const handleOpenNotification = (notificationId: string, link?: string) => {
    markNotificationAsRead(notificationId);
    setIsOpen(false);
    if (link) {
      navigate(link);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white p-2.5 text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        aria-label="Abrir notificações"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setIsOpen(false)}
            aria-label="Fechar notificações"
          />
          <div className="absolute right-0 z-40 mt-3 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">Notificações</p>
                <p className="text-xs text-gray-500">
                  {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {userNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  Nenhuma notificação para você no momento.
                </div>
              ) : (
                userNotifications.slice(0, compact ? 8 : userNotifications.length).map((notification) => {
                  const link = buildNotificationLink(notification);
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleOpenNotification(notification.id, link)}
                      className={`flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                        notification.isRead ? 'bg-white' : 'bg-blue-50/70'
                      }`}
                    >
                      <div
                        className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                          notification.isRead ? 'bg-gray-300' : 'bg-blue-500'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-900">
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                              Novo
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {notification.description}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="text-xs text-gray-400">
                            {new Date(notification.createdAt).toLocaleString('pt-BR')}
                          </span>
                          {link && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                              Abrir
                              <ExternalLink className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {!compact && unreadCount > 0 && (
              <div className="border-t border-gray-100 px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    userNotifications
                      .filter((notification) => !notification.isRead)
                      .forEach((notification) => markNotificationAsRead(notification.id));
                  }}
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <CheckCheck className="h-4 w-4" />
                  Marcar todas como lidas
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
