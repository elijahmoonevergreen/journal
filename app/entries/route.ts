import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Entry = {
  id: string;
  date: string;
  time: string;
  text: string;
  ts: number;
};

function isValid(e: unknown): e is Entry {
  if (!e || typeof e !== 'object') return false;
  const x = e as Record<string, unknown>;
  return (
    typeof x.id === 'string' && x.id.length > 0 && x.id.length <= 64 &&
    typeof x.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date) &&
    typeof x.time === 'string' && /^\d{2}:\d{2}$/.test(x.time) &&
    typeof x.text === 'string' && x.text.length > 0 && x.text.length <= 5000 &&
    typeof x.ts === 'number' && Number.isFinite(x.ts)
  );
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('entries')
    .select('id, date, time, text, ts')
    .eq('user_name', user)
    .order('ts', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'db error' }, { status: 500 });
  }
  return NextResponse.json(data ?? [], {
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
  if (!isValid(body)) {
    return NextResponse.json({ error: 'invalid entry' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { error } = await sb.from('entries').insert({
    id: body.id,
    user_name: user,
    date: body.date,
    time: body.time,
    text: body.text,
    ts: body.ts,
  });

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'duplicate id' }, { status: 409 });
    }
    return NextResponse.json({ error: 'db error' }, { status: 500 });
  }
  return NextResponse.json(body, { status: 201 });
}
