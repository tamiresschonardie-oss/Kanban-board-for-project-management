import { ChangeEvent } from 'react';
import { Download, Paperclip, Trash2 } from 'lucide-react';
import { ProjectAttachment } from '../../types';

const DEFAULT_ACCEPT =
  'image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.zip,.rar';

export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Falha ao ler ${file.name}`));
    reader.readAsDataURL(file);
  });

export const buildAttachmentFromFile = async (file: File): Promise<ProjectAttachment> => ({
  id: `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: file.name,
  fileName: file.name,
  url: await readFileAsDataUrl(file),
  uploadedAt: new Date().toISOString(),
  type: file.type || getFileExtensionLabel(file.name),
  mimeType: file.type || undefined,
  size: file.size,
});

function getFileExtensionLabel(name: string) {
  const extension = name.split('.').pop()?.trim().toUpperCase();
  return extension || 'ARQUIVO';
}

function getAttachmentTypeLabel(attachment: ProjectAttachment) {
  if (attachment.type?.includes('/')) {
    const [, subtype] = attachment.type.split('/');
    return subtype?.toUpperCase() || getFileExtensionLabel(attachment.name);
  }

  return attachment.type?.toUpperCase() || getFileExtensionLabel(attachment.name);
}

interface AttachmentUploaderProps {
  attachments: ProjectAttachment[];
  onAddAttachments: (attachments: ProjectAttachment[]) => void;
  onRemove: (attachmentId: string) => void;
  disabled?: boolean;
  title?: string;
  description?: string;
  emptyMessage?: string;
  accept?: string;
  multiple?: boolean;
}

export function AttachmentUploader({
  attachments,
  onAddAttachments,
  onRemove,
  disabled = false,
  title = 'Anexos',
  description = 'Anexe imagens, PDFs, planilhas e documentos.',
  emptyMessage = 'Nenhum arquivo anexado.',
  accept = DEFAULT_ACCEPT,
  multiple = true,
}: AttachmentUploaderProps) {
  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    try {
      const nextAttachments = await Promise.all(files.map(buildAttachmentFromFile));
      onAddAttachments(nextAttachments);
    } finally {
      event.target.value = '';
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-gray-400" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <label
          className={`flex items-center justify-between gap-4 rounded-lg bg-white px-4 py-3 text-sm text-gray-700 ${
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'
          }`}
        >
          <span>Selecionar arquivos do computador</span>
          <span className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700">
            Adicionar anexo
          </span>
          <input
            type="file"
            multiple={multiple}
            className="hidden"
            accept={accept}
            onChange={handleFilesSelected}
            disabled={disabled}
          />
        </label>
      </div>

      <div className="mt-4 space-y-3">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-gray-900">{attachment.name}</p>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                  {getAttachmentTypeLabel(attachment)}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {new Date(attachment.uploadedAt).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={attachment.url}
                download={attachment.name}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
                title="Abrir ou baixar anexo"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => onRemove(attachment.id)}
                disabled={disabled}
                className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                title="Remover anexo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {attachments.length === 0 && (
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
}
