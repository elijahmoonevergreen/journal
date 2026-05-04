export type AttachmentType = 'image' | 'voice' | 'document';

export type StoredAttachment = {
  type: AttachmentType;
  path: string;
  name: string;
  size: number;
  mime: string;
  duration?: number;
};

export type AttachmentWithUrl = StoredAttachment & { url: string };

export type Entry = {
  id: string;
  date: string;
  time: string;
  text: string;
  ts: number;
  attachments: AttachmentWithUrl[];
};

export const IMAGE_MIMES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/heic',
] as const;

export const DOCUMENT_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
  'text/markdown',
  'text/csv',
] as const;

export const VOICE_MIMES = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/ogg;codecs=opus',
] as const;

export const SIZE_LIMITS: Record<AttachmentType, number> = {
  image: 10 * 1024 * 1024,
  document: 10 * 1024 * 1024,
  voice: 6 * 1024 * 1024,
};

export const VOICE_MAX_SECONDS = 5 * 60;

export function isAttachmentType(v: unknown): v is AttachmentType {
  return v === 'image' || v === 'voice' || v === 'document';
}

export function isStoredAttachment(v: unknown): v is StoredAttachment {
  if (!v || typeof v !== 'object') return false;
  const x = v as Record<string, unknown>;
  return (
    isAttachmentType(x.type) &&
    typeof x.path === 'string' && x.path.length > 0 && x.path.length <= 512 &&
    typeof x.name === 'string' && x.name.length > 0 && x.name.length <= 256 &&
    typeof x.size === 'number' && Number.isFinite(x.size) && x.size > 0 &&
    typeof x.mime === 'string' && x.mime.length > 0 && x.mime.length <= 128 &&
    (x.duration === undefined ||
      (typeof x.duration === 'number' && Number.isFinite(x.duration) && x.duration > 0))
  );
}
