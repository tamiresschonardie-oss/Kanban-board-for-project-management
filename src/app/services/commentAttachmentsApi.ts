import { ProjectAttachment } from '../types';
import { readFileAsDataUrl } from '../components/shared/AttachmentUploader';

const ACCEPTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const COMMENT_IMAGE_ACCEPT = '.png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp';

export function validateCommentImageFile(file: File) {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    throw new Error('Formato inválido. Envie PNG, JPG, JPEG ou WEBP.');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Arquivo muito grande. O limite por imagem é de 5MB.');
  }
}

export async function uploadCommentImage(file: File): Promise<ProjectAttachment> {
  validateCommentImageFile(file);

  return {
    id: `comment-attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    fileName: file.name,
    url: await readFileAsDataUrl(file),
    uploadedAt: new Date().toISOString(),
    type: file.type,
    mimeType: file.type,
    size: file.size,
  };
}

export async function uploadCommentImages(files: File[]) {
  return Promise.all(files.map(uploadCommentImage));
}

export function isImageAttachment(attachment: ProjectAttachment) {
  const mimeType = attachment.mimeType || attachment.type || '';
  return mimeType.startsWith('image/');
}
