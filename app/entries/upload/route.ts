import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import {
  AttachmentType,
  IMAGE_MIMES,
  DOCUMENT_MIMES,
  VOICE_MIMES,
  SIZE_LIMITS,
  isAttachmentType,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

const MIME_BY_TYPE: Record<AttachmentType, readonly string[]> = {
  image: IMAGE_MIMES,
  document: DOCUMENT_MIMES,
  voice: VOICE_MIMES,
};

function extFromName(name: string): string {
  const m = /\.([a-zA-Z0-9]{1,8})$/.exec(name);
  return m ? m[1].toLowerCase() : 'bin';
}

function mimeMatches(mime: string, allowed: readonly string[]): boolean {
  const lower = mime.toLowerCase();
  return allowed.some(a => lower === a.toLowerCase() || lower.startsWith(a.toLowerCase() + ';'));
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid form' }, { status: 400 });
  }

  const typeRaw = form.get('type');
  const file = form.get('file');
  const durationRaw = form.get('duration');

  if (!isAttachmentType(typeRaw)) {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no file' }, { status: 400 });
  }
  const type = typeRaw;

  const allowed = MIME_BY_TYPE[type];
  if (!mimeMatches(file.type, allowed)) {
    return NextResponse.json({ error: 'mime not allowed' }, { status: 400 });
  }
  if (file.size <= 0 || file.size > SIZE_LIMITS[type]) {
    return NextResponse.json({ error: 'file too large' }, { status: 400 });
  }

  let duration: number | undefined;
  if (type === 'voice' && typeof durationRaw === 'string') {
    const n = Number(durationRaw);
    if (Number.isFinite(n) && n > 0 && n <= 60 * 60) duration = n;
  }

  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const ext = extFromName(file.name || (type === 'voice' ? 'voice.webm' : 'file'));
  const id = randomBytes(8).toString('hex');
  const path = `${user}/${yyyy}/${mm}/${id}.${ext}`;

  const sb = supabaseAdmin();
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await sb.storage.from('attachments').upload(path, buf, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    return NextResponse.json({ error: 'upload failed', detail: error.message }, { status: 500 });
  }

  const displayName = file.name && file.name.length > 0
    ? file.name
    : type === 'voice'
      ? 'Voice note'
      : 'attachment';

  const { data: signed } = await sb.storage
    .from('attachments')
    .createSignedUrl(path, 60 * 60);

  return NextResponse.json({
    type,
    path,
    name: displayName,
    size: file.size,
    mime: file.type,
    duration,
    url: signed?.signedUrl ?? '',
  });
}
