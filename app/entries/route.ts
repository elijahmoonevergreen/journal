import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { sanitizeHtml, isHtmlEmpty } from '@/lib/sanitize';
import {
  AttachmentWithUrl,
  StoredAttachment,
  isStoredAttachment,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

const SIGNED_URL_TTL = 60 * 60;

type IncomingEntry = {
  id: string;
  date: string;
  time: string;
  text: string;
  ts: number;
  attachments?: StoredAttachment[];
};

function isValidIncoming(e: unknown): e is IncomingEntry {
  if (!e || typeof e !== 'object') return false;
  const x = e as Record<string, unknown>;
  if (!(typeof x.id === 'string' && x.id.length > 0 && x.id.length <= 64)) return false;
  if (!(typeof x.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date))) return false;
  if (!(typeof x.time === 'string' && /^\d{2}:\d{2}$/.test(x.time))) return false;
  if (!(typeof x.text === 'string' && x.text.length <= 50_000)) return false;
  if (!(typeof x.ts === 'number' && Number.isFinite(x.ts))) return false;
  if (x.attachments !== undefined) {
    if (!Array.isArray(x.attachments)) return false;
    if (x.attachments.length > 12) return false;
    if (!x.attachments.every(isStoredAttachment)) return false;
  }
  return true;
}

async function withSignedUrls(
  rows: Array<{
    id: string;
    date: string;
    time: string;
    text: string;
    ts: number;
    attachments: StoredAttachment[] | null;
  }>,
): Promise<Array<{
  id: string;
  date: string;
  time: string;
  text: string;
  ts: number;
  attachments: AttachmentWithUrl[];
}>> {
  const sb = supabaseAdmin();
  const allPaths: string[] = [];
  for (const r of rows) {
    if (Array.isArray(r.attachments)) {
      for (const a of r.attachments) allPaths.push(a.path);
    }
  }
  const urlByPath = new Map<string, string>();
  if (allPaths.length > 0) {
    const { data, error } = await sb.storage
      .from('attachments')
      .createSignedUrls(allPaths, SIGNED_URL_TTL);
    if (!error && data) {
      for (const item of data) {
        if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl);
      }
    }
  }
  return rows.map(r => ({
    ...r,
    attachments: (r.attachments ?? []).map(a => ({
      ...a,
      url: urlByPath.get(a.path) ?? '',
    })),
  }));
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('entries')
    .select('id, date, time, text, ts, attachments')
    .eq('user_name', user)
    .order('ts', { ascending: true });

  if (error) {
    console.error('GET /entries select error:', error);
    return NextResponse.json({ error: 'db error' }, { status: 500 });
  }
  let enriched;
  try {
    enriched = await withSignedUrls(data ?? []);
  } catch (e) {
    console.error('GET /entries withSignedUrls error:', e);
    return NextResponse.json({ error: 'signed url error' }, { status: 500 });
  }
  return NextResponse.json(enriched, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!isValidIncoming(body)) {
    return NextResponse.json({ error: 'invalid entry' }, { status: 400 });
  }

  const cleanText = sanitizeHtml(body.text);
  const attachments = body.attachments ?? [];
  if (isHtmlEmpty(cleanText) && attachments.length === 0) {
    return NextResponse.json({ error: 'empty entry' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { error } = await sb.from('entries').insert({
    id: body.id,
    user_name: user,
    date: body.date,
    time: body.time,
    text: cleanText,
    ts: body.ts,
    attachments,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'duplicate id' }, { status: 409 });
    }
    return NextResponse.json({ error: 'db error' }, { status: 500 });
  }

  const [enriched] = await withSignedUrls([
    {
      id: body.id,
      date: body.date,
      time: body.time,
      text: cleanText,
      ts: body.ts,
      attachments,
    },
  ]);
  return NextResponse.json(enriched, { status: 201 });
}
