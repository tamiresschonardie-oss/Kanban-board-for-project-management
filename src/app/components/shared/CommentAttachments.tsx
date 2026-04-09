import { ChangeEvent, useMemo, useRef } from 'react';
import { Download, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { ProjectAttachment } from '../../types';
import { COMMENT_IMAGE_ACCEPT, isImageAttachment } from '../../services/commentAttachmentsApi';

export function CommentAttachmentPicker(props: {
  attachments: ProjectAttachment[];
  onFilesSelected: (files: File[]) => void;
  onRemove: (attachmentId: string) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      props.onFilesSelected(files);
    }
    event.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={props.disabled || props.loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {props.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          Anexar imagem
        </button>
        <span className="text-xs text-slate-500">PNG, JPG, JPEG ou WEBP até 5MB</span>
        <input
          ref={inputRef}
          type="file"
          accept={COMMENT_IMAGE_ACCEPT}
          multiple
          className="hidden"
          onChange={handleChange}
          disabled={props.disabled || props.loading}
        />
      </div>

      {props.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {props.error}
        </div>
      ) : null}

      {props.attachments.length > 0 ? (
        <CommentAttachmentPreviewGrid attachments={props.attachments} onRemove={props.onRemove} />
      ) : null}
    </div>
  );
}

export function CommentAttachmentPreviewGrid(props: {
  attachments: ProjectAttachment[];
  onRemove?: (attachmentId: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {props.attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
        >
          <ImageOrFilePreview attachment={attachment} />
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{attachment.fileName || attachment.name}</p>
              <p className="text-xs text-slate-500">{formatFileSize(attachment.size)}</p>
            </div>
            {props.onRemove ? (
              <button
                type="button"
                onClick={() => props.onRemove?.(attachment.id)}
                className="rounded-xl border border-rose-200 p-2 text-rose-600 transition-colors hover:bg-rose-50"
                title="Remover imagem"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CommentAttachmentGallery(props: { attachments: ProjectAttachment[] }) {
  const imageAttachments = useMemo(
    () => props.attachments.filter((attachment) => isImageAttachment(attachment)),
    [props.attachments]
  );

  if (imageAttachments.length === 0) return null;

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {imageAttachments.map((attachment) => (
        <a
          key={attachment.id}
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300"
        >
          <div className="aspect-[4/3] overflow-hidden bg-slate-100">
            <img
              src={attachment.url}
              alt={attachment.fileName || attachment.name}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{attachment.fileName || attachment.name}</p>
              <p className="text-xs text-slate-500">{formatFileSize(attachment.size)}</p>
            </div>
            <span className="rounded-xl border border-slate-200 p-2 text-slate-500">
              <Download className="h-4 w-4" />
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

function ImageOrFilePreview({ attachment }: { attachment: ProjectAttachment }) {
  if (isImageAttachment(attachment)) {
    return (
      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
        <img
          src={attachment.url}
          alt={attachment.fileName || attachment.name}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex aspect-[4/3] items-center justify-center bg-slate-100 px-4 text-sm text-slate-500">
      Preview indisponível
    </div>
  );
}

function formatFileSize(size?: number) {
  if (!size) return 'Arquivo';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
