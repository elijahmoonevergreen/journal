import { createHmac, timingSafeEqual, randomBytes } from 'crypto';
import { cookies } from 'next/headers';

export type UserName = 'eli' | 'jae';

export const USERS: { name: UserName; label: string }[] = [
  { name: 'eli', label: 'Eli' },
  { name: 'jae', label: 'Jae' },
];

const COOKIE_NAME = 'journal_session';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error('Missing SESSION_SECRET');
  return s;
}

function expectedPassword(name: UserName): string | undefined {
  if (name === 'eli') return process.env.ELI_PASSWORD;
  if (name === 'jae') return process.env.JAE_PASSWORD;
  return undefined;
}

export function isUserName(v: unknown): v is UserName {
  return v === 'eli' || v === 'jae';
}

export function checkPassword(name: UserName, attempt: string): boolean {
  const expected = expectedPassword(name);
  if (!expected) return false;
  const a = Buffer.from(attempt);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function makeToken(name: UserName): string {
  const issued = Date.now().toString(36);
  const nonce = randomBytes(8).toString('base64url');
  const payload = `${name}.${issued}.${nonce}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string | undefined): UserName | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [name, issued, nonce, sig] = parts;
  if (!isUserName(name)) return null;
  const expectedSig = sign(`${name}.${issued}.${nonce}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return name;
}

export async function getCurrentUser(): Promise<UserName | null> {
  const jar = await cookies();
  return verifyToken(jar.get(COOKIE_NAME)?.value);
}

export async function setSessionCookie(name: UserName): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, makeToken(name), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
