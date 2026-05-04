import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { sanitizeHtml, isHtmlEmpty } from '@/lib/sanitize';
import { StoredAttachment, isStoredAttachment } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = { id: string };

export async function PATCH(req: Request, { params }: { params: Promise<Params> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const { text, attachments } = body as Record<string, unknown>;

  const update: { text?: string; attachments?: StoredAttachment[] } = {};

  if (text !== undefined) {
    if (typeof text !== 'string' || text.length > 50_000) {
      return NextResponse.json({ error: 'invalid text' }, { status: 400 });
    }
    update.text = sanitizeHtml(text);
  }
  if (attachments !== undefined) {
    if (!Array.isArray(attachments) || attachments.length > 12) {
      return NextResponse.json({ error: 'invalid attachments' }, { status: 400 });
    }
    if (!attachments.every(isStoredAttachment)) {
      return NextResponse.json({ error: 'invalid attachments' }, { status: 400 });
    }
    update.attachments = attachments;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  }
  if (
    update.text !== undefined &&
    isHtmlEmpty(update.text) &&
    (update.attachments?.length ?? -1) === 0
  ) {
    return NextResponse.json({ error: 'empty entry' }, { status: 400 });
  }

  const sb = supabaseAdmin();

  const { data: existing, error: readErr } = await sb
    .from('entries')
    .select('user_name, attachments')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: 'db error' }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (existing.user_name !== user) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  if (update.attachments !== undefined) {
    const oldPaths = new Set<string>(
      (existing.attachments as StoredAttachment[] | null ?? []).map(a => a.path),
    );
    const newPaths = new Set(update.attachments.map(a => a.path));
    const removed = [...oldPaths].filter(p => !newPaths.has(p));
    if (removed.length > 0) {
      await sb.storage.from('attachments').remove(removed);
    }
  }

  const { error: updateErr } = await sb
    .from('entries')
    .update(update)
    .eq('id', id)
    .eq('user_name', user);
  if (updateErr) return NextResponse.json({ error: 'db error' }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<Params> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: existing, error: readErr } = await sb
    .from('entries')
    .select('user_name, attachments')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: 'db error' }, { status: 500 });
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (existing.user_name !== user) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const { error: delErr } = await sb
    .from('entries')
    .delete()
    .eq('id', id)
    .eq('user_name', user);
  if (delErr) return NextResponse.json({ error: 'db error' }, { status: 500 });

  const paths = (existing.attachments as StoredAttachment[] | null ?? []).map(a => a.path);
  if (paths.length > 0) {
    await sb.storage.from('attachments').remove(paths);
  }

  return NextResponse.json({ ok: true });
}
