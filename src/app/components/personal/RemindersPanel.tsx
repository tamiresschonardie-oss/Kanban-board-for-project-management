import { useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit2,
  Plus,
  Trash2,
} from 'lucide-react';
import { Reminder } from '../../types';
import { usePersonalProductivity } from '../../context/PersonalProductivityContext';
import { useFeedback } from '../../context/FeedbackContext';

interface ReminderDraft {
  title: string;
  description: string;
  remindAt: string;
  notifyEnabled: boolean;
}

const EMPTY_DRAFT: ReminderDraft = {
  title: '',
  description: '',
  remindAt: '',
  notifyEnabled: true,
};

export function RemindersPanel() {
  const {
    reminders,
    addReminder,
    updateReminder,
    toggleReminderCompleted,
    deleteReminder,
    browserNotificationPermission,
    requestBrowserNotificationPermission,
  } = usePersonalProductivity();
  const { showFeedback } = useFeedback();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [draft, setDraft] = useState<ReminderDraft>(EMPTY_DRAFT);

  const reminderStats = useMemo(() => {
    const open = reminders.filter((item) => !item.completed).length;
    const overdue = reminders.filter(
      (item) => !item.completed && new Date(item.remindAt).getTime() < Date.now()
    ).length;
    const pendingNotifications = reminders.filter(
      (item) =>
        !item.completed &&
        item.notifyEnabled &&
        !item.notifiedAt &&
        new Date(item.remindAt).getTime() <= Date.now()
    ).length;
    return { open, overdue, pendingNotifications };
  }, [reminders]);

  const openCreateModal = () => {
    setEditingReminder(null);
    setDraft({
      ...EMPTY_DRAFT,
      remindAt: buildRelativeDateTime('today'),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setDraft({
      title: reminder.title,
      description: reminder.description || '',
      remindAt: toDateTimeLocal(reminder.remindAt),
      notifyEnabled: reminder.notifyEnabled,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!draft.title.trim() || !draft.remindAt) return;

    let permissionResult = browserNotificationPermission;
    if (draft.notifyEnabled && browserNotificationPermission === 'default') {
      permissionResult = await requestBrowserNotificationPermission();
    }

    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      remindAt: new Date(draft.remindAt).toISOString(),
      notifyEnabled: draft.notifyEnabled,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    if (editingReminder) {
      updateReminder(editingReminder.id, payload);
    } else {
      addReminder(payload);
    }

    setIsModalOpen(false);
    setEditingReminder(null);
    setDraft(EMPTY_DRAFT);

    if (draft.notifyEnabled && permissionResult !== 'granted') {
      showFeedback({
        tone: 'info',
        title: 'Fallback de lembrete ativo',
        message:
          permissionResult === 'denied'
            ? 'O navegador bloqueou notificações. O lembrete será avisado na central e por toast dentro do sistema.'
            : 'A permissão do navegador não está ativa. O lembrete será avisado dentro do sistema.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Lembretes</h2>
            <p className="mt-1 text-sm text-gray-600">
              Organize compromissos pessoais sem misturar com tarefas de projeto.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Novo lembrete
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <SummaryCard label="Pendentes" value={String(reminderStats.open)} tone="slate" />
          <SummaryCard label="Vencidos" value={String(reminderStats.overdue)} tone="rose" />
          <SummaryCard
            label="Com notificação"
            value={String(reminders.filter((item) => item.notifyEnabled && !item.completed).length)}
            tone="blue"
          />
          <SummaryCard
            label="Pendentes de alerta"
            value={String(reminderStats.pendingNotifications)}
            tone="blue"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Minha lista
          </h3>
        </div>

        {reminders.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {reminders.map((reminder) => {
              const meta = getReminderMeta(reminder.remindAt, reminder.completed);

              return (
                <div
                  key={reminder.id}
                  className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="flex min-w-0 gap-3">
                    <button
                      type="button"
                      onClick={() => toggleReminderCompleted(reminder.id)}
                      className={`mt-0.5 rounded-full p-1 transition-colors ${
                        reminder.completed
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500 hover:bg-emerald-100 hover:text-emerald-700'
                      }`}
                      title={reminder.completed ? 'Marcar como pendente' : 'Concluir lembrete'}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4
                          className={`text-sm font-semibold ${
                            reminder.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                          }`}
                        >
                          {reminder.title}
                        </h4>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                        {reminder.notifyEnabled ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            <Bell className="h-3 w-3" />
                            Notificar-me
                          </span>
                        ) : null}
                        {reminder.notifiedAt ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            Notificado{' '}
                            {reminder.lastNotificationChannel === 'browser'
                              ? 'no navegador'
                              : 'no sistema'}
                          </span>
                        ) : null}
                      </div>
                      {reminder.description ? (
                        <p className="mt-2 text-sm text-gray-600">{reminder.description}</p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {new Date(reminder.remindAt).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {new Date(reminder.remindAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>{reminder.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(reminder)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Edit2 className="h-4 w-4" />
                        Editar
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteReminder(reminder.id)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-14 text-center">
            <p className="text-sm text-gray-500">Nenhum lembrete criado ainda.</p>
          </div>
        )}
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-5">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingReminder ? 'Editar lembrete' : 'Novo lembrete'}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Use lembretes pessoais para nao perder compromissos importantes.
              </p>
            </div>

            <div className="space-y-5 px-6 py-5">
              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700">Título</span>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Ex.: Revisar roteiro com o time"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700">Descrição</span>
                <textarea
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="Detalhes opcionais"
                  rows={3}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </label>

              <div className="space-y-2">
                <span className="text-sm font-medium text-gray-700">Data</span>
                <div className="flex flex-wrap gap-2">
                  <QuickDateButton
                    label="Hoje"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        remindAt: buildRelativeDateTime('today', prev.remindAt),
                      }))
                    }
                  />
                  <QuickDateButton
                    label="Amanhã"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        remindAt: buildRelativeDateTime('tomorrow', prev.remindAt),
                      }))
                    }
                  />
                  <span className="inline-flex items-center rounded-full border border-dashed border-gray-300 bg-gray-50 px-3 py-1.5 text-sm text-gray-500">
                    Ou escolha uma data manualmente
                  </span>
                </div>
                <input
                  type="datetime-local"
                  value={draft.remindAt}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, remindAt: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Destino
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">Para mim</p>
                </div>
                <label className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Alerta
                    </p>
                    <p className="mt-1 text-sm font-medium text-gray-900">Notificar-me</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.notifyEnabled}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        notifyEnabled: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {browserNotificationPermission === 'granted'
                  ? 'Notificações do navegador ativas. O lembrete também terá fallback na central do sistema.'
                  : browserNotificationPermission === 'denied'
                    ? 'Notificações do navegador bloqueadas. O lembrete usará fallback in-app.'
                    : browserNotificationPermission === 'unsupported'
                      ? 'Este navegador não suporta Notification API. O lembrete usará fallback in-app.'
                      : 'A permissão do navegador será solicitada ao salvar um lembrete com notificação ativa.'}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingReminder(null);
                  setDraft(EMPTY_DRAFT);
                }}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Salvar lembrete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'slate' | 'rose' | 'blue';
}) {
  const toneClass =
    tone === 'rose'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : tone === 'blue'
        ? 'border-blue-200 bg-blue-50 text-blue-800'
        : 'border-slate-200 bg-slate-50 text-slate-800';

  return (
    <div className={`rounded-2xl border px-4 py-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function QuickDateButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
    >
      {label}
    </button>
  );
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function buildRelativeDateTime(mode: 'today' | 'tomorrow', currentValue?: string) {
  const current = currentValue ? new Date(currentValue) : new Date();
  const next = new Date();
  next.setHours(Number.isFinite(current.getHours()) ? current.getHours() : 9);
  next.setMinutes(Number.isFinite(current.getMinutes()) ? current.getMinutes() : 0);
  next.setSeconds(0, 0);

  if (mode === 'tomorrow') {
    next.setDate(next.getDate() + 1);
  }

  const offset = next.getTimezoneOffset();
  const local = new Date(next.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function getReminderMeta(dateTime: string, completed: boolean) {
  if (completed) {
    return { label: 'Concluído', className: 'bg-emerald-100 text-emerald-700' };
  }

  const target = new Date(dateTime);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compare = new Date(target);
  compare.setHours(0, 0, 0, 0);
  const diffDays = Math.round((compare.getTime() - today.getTime()) / 86400000);

  if (target.getTime() < Date.now()) {
    return { label: 'Vencido', className: 'bg-rose-100 text-rose-700' };
  }

  if (diffDays === 0) {
    return { label: 'Hoje', className: 'bg-amber-100 text-amber-800' };
  }

  if (diffDays === 1) {
    return { label: 'Amanhã', className: 'bg-blue-100 text-blue-700' };
  }

  return { label: 'Agendado', className: 'bg-gray-100 text-gray-700' };
}
