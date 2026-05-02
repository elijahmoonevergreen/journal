import { NextResponse } from 'next/server';
import { checkPassword, isUserName, setSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { name, password } = (body ?? {}) as { name?: unknown; password?: unknown };
  if (!isUserName(name) || typeof password !== 'string' || password.length === 0) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (!checkPassword(name, password)) {
    return NextResponse.json({ error: 'wrong password' }, { status: 401 });
  }
  await setSessionCookie(name);
  return NextResponse.json({ ok: true });
}
