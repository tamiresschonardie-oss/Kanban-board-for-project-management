import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import {
  Edit2,
  MessageSquareText,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { ActivityLog, Project, ProjectAttachment, ProjectComment } from '../../types';
import { useProjects } from '../../context/ProjectContext';
import { useAdmin } from '../../context/AdminContext';
import { useFeedback } from '../../context/FeedbackContext';
import { uploadCommentImages } from '../../services/commentAttachmentsApi';
import { CommentAttachmentGallery, CommentAttachmentPicker } from '../shared/CommentAttachments';
import { ActivitySidebarShell } from '../shared/ActivitySidebarShell';
import { canManageWeeklyFocus } from '../../utils/permissions';

interface ProjectActivityPanelProps {
  project: Project;
  layout?: 'page' | 'sidebar';
}

type TimelineEntryType =
  | 'manual_comment'
  | 'manual_update'
  | 'manual_attachment'
  | 'status_change'
  | 'created'
  | 'edited'
  | 'task_change'
  | 'system_event';

interface ProjectTimelineEntry {
  id: string;
  type: TimelineEntryType;
  source: 'manual' | 'system';
  author: string;
  title: string;
  message: string;
  createdAt: string;
  comment?: ProjectComment;
}

const INITIAL_BATCH_SIZE = 20;
const LOAD_MORE_BATCH_SIZE = 20;

export function ProjectActivityPanel({
  project,
  layout = 'page',
}: ProjectActivityPanelProps) {
  const { addProjectComment, updateProjectComment, deleteProjectComment } = useProjects();
  const { currentUser } = useAdmin();
  const { showFeedback } = useFeedback();
  const canManageFocus = canManageWeeklyFocus(currentUser);
  const [entryText, setEntryText] = useState('');
  const [markAsWeeklyFocus, setMarkAsWeeklyFocus] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<ProjectAttachment[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [visibleTimelineCount, setVisibleTimelineCount] = useState(INITIAL_BATCH_SIZE);

  const comments = useMemo(
    () =>
      [...(project.comments || [])]
        .filter((comment) => !comment.deletedAt)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [project.comments]
  );

  const activities = useMemo(
    () =>
      [...(project.activities || [])].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [project.activities]
  );

  const timelineEntries = useMemo(
    () => buildProjectTimelineEntries(comments, activities),
    [comments, activities]
  );

  const visibleTimelineEntries = useMemo(
    () => timelineEntries.slice(0, visibleTimelineCount),
    [timelineEntries, visibleTimelineCount]
  );

  const hasMoreTimelineEntries = visibleTimelineEntries.length < timelineEntries.length;

  useEffect(() => {
    setVisibleTimelineCount(INITIAL_BATCH_SIZE);
  }, [project.id, timelineEntries.length]);

  useEffect(() => {
    setMarkAsWeeklyFocus(false);
  }, [project.id]);

  const handlePublishEntry = () => {
    const content = entryText.trim();
    if (!content && pendingAttachments.length === 0) {
      showFeedback({
        tone: 'error',
        title: 'Atualização vazia',
        message: 'Escreva uma atualização ou anexe uma imagem antes de publicar.',
      });
      return;
    }

    const saved = addProjectComment(project.id, {
      projectId: project.id,
      userId: currentUser?.id || 'system',
      userName: currentUser?.name || 'Sistema',
      content,
      subtype: content ? 'update' : 'attachment',
      highlightFocus: markAsWeeklyFocus,
      attachments: pendingAttachments,
    });

    if (!saved) {
      showFeedback({
        tone: 'error',
        title: 'Falha ao registrar atualização',
        message: 'Não foi possível salvar esta atualização na timeline do projeto.',
      });
      return;
    }

    setEntryText('');
    setPendingAttachments([]);
    setUploadError('');
    setMarkAsWeeklyFocus(false);
    showFeedback({
      tone: 'success',
      title: 'Atualização registrada',
      message: 'A atualização foi registrada no topo da timeline do projeto.',
    });
  };

  const handleEntryKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handlePublishEntry();
    }
  };

  const handleSelectAttachments = async (files: File[]) => {
    try {
      setIsUploading(true);
      setUploadError('');
      const attachments = await uploadCommentImages(files);
      setPendingAttachments((current) => [...current, ...attachments]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível enviar a imagem.';
      setUploadError(message);
      showFeedback({
        tone: 'error',
        title: 'Upload inválido',
        message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const canManageComment = (comment: ProjectComment) =>
    currentUser?.id === comment.userId ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'pmo';

  const startEditingComment = (comment: ProjectComment) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.content);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingText('');
  };

  const handleSaveEditedComment = (comment: ProjectComment) => {
    const content = editingText.trim();
    if (!content) {
      showFeedback({
        tone: 'error',
        title: 'Atualização vazia',
        message: 'Informe um texto antes de salvar a edição.',
      });
      return;
    }

    const updated = updateProjectComment(project.id, comment.id, content);
    if (!updated) {
      showFeedback({
        tone: 'error',
        title: 'Falha ao editar atualização',
        message: 'Não foi possível persistir a edição deste registro.',
      });
      return;
    }

    cancelEditingComment();
    showFeedback({
      tone: 'success',
      title: 'Atualização editada',
      message: 'A atualização foi editada e a timeline foi sincronizada.',
    });
  };

  const handleDeleteComment = (comment: ProjectComment) => {
    if (!window.confirm('Deseja realmente excluir este registro?')) return;

    const deleted = deleteProjectComment(project.id, comment.id);
    if (!deleted) {
      showFeedback({
        tone: 'error',
        title: 'Falha ao excluir atualização',
        message: 'Não foi possível remover este registro da timeline.',
      });
      return;
    }

    if (editingCommentId === comment.id) {
      cancelEditingComment();
    }

    showFeedback({
      tone: 'success',
      title: 'Registro excluído',
      message: 'O registro foi removido da timeline visível do projeto.',
    });
  };

  const composer = (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-4 w-4 text-slate-400" />
        <p className="text-sm font-semibold text-slate-900">Atualizar projeto</p>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        Use um único campo para publicar contexto, atualização, comentário e anexos diretamente na timeline.
      </p>
      <textarea
        value={entryText}
        onChange={(event) => setEntryText(event.target.value)}
        onKeyDown={handleEntryKeyDown}
        rows={layout === 'sidebar' ? 4 : 6}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        placeholder="Escreva uma nova atualização para o projeto..."
      />
      <CommentAttachmentPicker
        attachments={pendingAttachments}
        onFilesSelected={handleSelectAttachments}
        onRemove={(attachmentId) =>
          setPendingAttachments((current) => current.filter((item) => item.id !== attachmentId))
        }
        loading={isUploading}
        error={uploadError}
      />
      {canManageFocus ? (
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={markAsWeeklyFocus}
            onChange={(event) => setMarkAsWeeklyFocus(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-slate-400" />
            Marcar como foco da semana
          </span>
        </label>
      ) : null}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handlePublishEntry}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Send className="h-4 w-4" />
          Publicar
        </button>
      </div>
    </div>
  );

  const timelineList = (
    <div className="divide-y divide-slate-200">
      {timelineEntries.length > 0 ? (
        visibleTimelineEntries.map((entry) => {
          const appearance = getTimelineAppearance(entry.type);
          const comment = entry.comment;

          return (
            <article key={entry.id} className="px-5 py-4">
              <div className="group flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${appearance.badgeClassName}`}>
                      {appearance.label}
                    </span>
                    <p className="text-sm font-semibold text-slate-900">{entry.author}</p>
                    <span className="text-xs text-slate-400">{entry.source === 'manual' ? 'Manual' : 'Sistema'}</span>
                    {comment?.highlightFocus ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        Foco da semana
                      </span>
                    ) : null}
                    {comment?.updatedAt ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        Editado
                      </span>
                    ) : null}
                  </div>

                  {comment && editingCommentId === comment.id ? (
                    <div className="mt-3 space-y-3">
                      <textarea
                        value={editingText}
                        onChange={(event) => setEditingText(event.target.value)}
                        rows={4}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveEditedComment(comment)}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          <Send className="h-4 w-4" />
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditingComment}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <X className="h-4 w-4" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-2 text-sm font-medium text-slate-900">{entry.title}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {entry.message}
                      </p>
                      {comment?.attachments?.length ? (
                        <CommentAttachmentGallery attachments={comment.attachments} />
                      ) : null}
                    </>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <span className="whitespace-nowrap text-xs text-slate-400">
                    {new Date(entry.createdAt).toLocaleString('pt-BR')}
                  </span>
                  {comment && canManageComment(comment) ? (
                    <div className="flex items-center gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => startEditingComment(comment)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                        title="Editar registro"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                        title="Excluir registro"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })
      ) : (
        <EmptyPanel
          title="Nenhuma atualização registrada"
          description="Novas publicações manuais e eventos automáticos do projeto aparecerão juntos nesta timeline."
        />
      )}

      {hasMoreTimelineEntries ? (
        <LoadMoreFooter
          remainingCount={timelineEntries.length - visibleTimelineEntries.length}
          onClick={() => setVisibleTimelineCount((prev) => prev + LOAD_MORE_BATCH_SIZE)}
        />
      ) : null}
    </div>
  );

  if (layout === 'sidebar') {
    return (
      <ActivitySidebarShell
        title="Timeline do projeto"
        subtitle="Publicações manuais e eventos automáticos em uma única linha do tempo, com itens mais recentes primeiro."
        tabs={[
          { id: 'timeline', label: 'Timeline', count: timelineEntries.length },
        ]}
        activeTab="timeline"
        onTabChange={() => {}}
        listHeader={
          <div className="flex items-center justify-between gap-3">
            <span>{`${visibleTimelineEntries.length} de ${timelineEntries.length} registros`}</span>
            <span>Mais recentes primeiro</span>
          </div>
        }
        footer={composer}
      >
        {timelineList}
      </ActivitySidebarShell>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">Timeline do projeto</h3>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Atualizações manuais, comentários, anexos e eventos automáticos agora aparecem em uma única visão cronológica.
          </p>
        </div>
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
          {timelineEntries.length} registro{timelineEntries.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          {composer}
        </aside>

        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 text-sm text-gray-500">
            <span>
              Mostrando {visibleTimelineEntries.length} de {timelineEntries.length} registro{timelineEntries.length !== 1 ? 's' : ''}
            </span>
            <span>Mais recentes primeiro</span>
          </div>
          <div className="divide-y divide-gray-200">{timelineList}</div>
        </div>
      </div>
    </section>
  );
}

function buildProjectTimelineEntries(
  comments: ProjectComment[],
  activities: ActivityLog[]
): ProjectTimelineEntry[] {
  const commentEntries: ProjectTimelineEntry[] = comments.map((comment) => ({
    id: `comment-${comment.id}`,
    type: mapCommentSubtypeToTimelineType(comment),
    source: 'manual',
    author: comment.userName,
    title: getCommentTitle(comment),
    message: comment.content || (comment.attachments?.length ? 'Anexo publicado na timeline.' : 'Registro manual'),
    createdAt: comment.timestamp,
    comment,
  }));

  const activityEntries: ProjectTimelineEntry[] = activities
    .filter((activity) => !isShadowCommentActivity(activity))
    .map((activity) => ({
      id: `activity-${activity.id}`,
      type: classifyActivityType(activity),
      source: 'system',
      author: activity.user || 'Sistema',
      title: activity.action,
      message: activity.details || 'Evento registrado no projeto.',
      createdAt: activity.timestamp,
    }));

  return [...commentEntries, ...activityEntries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function mapCommentSubtypeToTimelineType(comment: ProjectComment): TimelineEntryType {
  if (comment.subtype === 'attachment') return 'manual_attachment';
  if (comment.subtype === 'update') return 'manual_update';
  return 'manual_comment';
}

function getCommentTitle(comment: ProjectComment): string {
  if (comment.subtype === 'attachment') {
    return comment.attachments?.length ? 'Anexo publicado' : 'Registro manual';
  }
  if (comment.subtype === 'update') {
    return 'Atualização manual';
  }
  return 'Comentário manual';
}

function isShadowCommentActivity(activity: ActivityLog) {
  return (
    activity.metadata?.recordType === 'comment_added' ||
    activity.action === 'adicionou um comentário'
  );
}

function classifyActivityType(activity: ActivityLog): TimelineEntryType {
  const action = activity.action.toLowerCase();

  if (action.includes('pausou o projeto') || action.includes('reativou o projeto')) {
    return 'status_change';
  }

  if (action.includes('criou') || action.includes('adicionou')) {
    if (action.includes('tarefa') || action.includes('subtarefa')) {
      return 'task_change';
    }
    return 'created';
  }

  if (action.includes('editou') || action.includes('atualizou') || action.includes('removeu')) {
    if (action.includes('tarefa') || action.includes('subtarefa')) {
      return 'task_change';
    }
    return 'edited';
  }

  if (activity.entityType === 'task') {
    return 'task_change';
  }

  return 'system_event';
}

function getTimelineAppearance(type: TimelineEntryType) {
  switch (type) {
    case 'manual_comment':
      return {
        label: 'Comentário',
        badgeClassName: 'bg-blue-100 text-blue-700',
      };
    case 'manual_update':
      return {
        label: 'Atualização',
        badgeClassName: 'bg-emerald-100 text-emerald-700',
      };
    case 'manual_attachment':
      return {
        label: 'Anexo',
        badgeClassName: 'bg-cyan-100 text-cyan-700',
      };
    case 'status_change':
      return {
        label: 'Status do projeto',
        badgeClassName: 'bg-amber-100 text-amber-800',
      };
    case 'created':
      return {
        label: 'Criação',
        badgeClassName: 'bg-sky-100 text-sky-700',
      };
    case 'edited':
      return {
        label: 'Edição',
        badgeClassName: 'bg-violet-100 text-violet-700',
      };
    case 'task_change':
      return {
        label: 'Execução',
        badgeClassName: 'bg-slate-200 text-slate-700',
      };
    default:
      return {
        label: 'Sistema',
        badgeClassName: 'bg-slate-100 text-slate-700',
      };
  }
}

function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function LoadMoreFooter({
  remainingCount,
  onClick,
}: {
  remainingCount: number;
  onClick: () => void;
}) {
  return (
    <div className="px-5 py-4">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Mostrar mais {remainingCount} registro{remainingCount !== 1 ? 's' : ''}
      </button>
    </div>
  );
}
