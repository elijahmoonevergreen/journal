'use client';

import Link from 'next/link';
import { useState } from 'react';

type Props = {
  name: 'eli' | 'jae';
  label: string;
};

export default function PasswordGate({ name, label }: Props) {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      if (r.ok) {
        window.location.reload();
        return;
      }
      setErr('That password did not match.');
      setPassword('');
    } catch {
      setErr('Could not reach the server. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="gate">
        <div className="gate-shell">
          <Link href="/" className="gate-back gate-label">← Back</Link>
          <h1 className="gate-name">{label}</h1>
          <p className="gate-sub gate-label">Enter password</p>
          <form onSubmit={onSubmit} autoComplete="off">
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              disabled={busy}
              aria-label="Password"
            />
            {err && <div className="gate-err">{err}</div>}
            <button type="submit" disabled={busy || !password} className="gate-submit gate-label">
              {busy ? 'Checking…' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

const STYLES = `
.gate {
  position: fixed;
  inset: 0;
  background: #F5F3EE;
  color: #111;
  font-family: var(--font-journal), -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
  font-weight: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
@media (prefers-color-scheme: dark) {
  .gate { background: #181614; color: #E8E4DA; }
}
.gate-shell {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 20px;
  position: relative;
}
.gate-back {
  position: absolute;
  top: -48px;
  left: 0;
  color: #9b958a;
  text-decoration: none;
}
.gate-back:hover { color: inherit; }
.gate-label {
  text-transform: uppercase;
  font-weight: 500;
  letter-spacing: 0.22em;
  font-size: 12px;
}
.gate-name {
  font-size: 56px;
  font-weight: 300;
  line-height: 1;
  margin: 0;
  letter-spacing: -0.01em;
}
.gate-sub {
  color: #9b958a;
  margin: 0;
}
.gate input {
  background: none;
  border: 0;
  border-bottom: 1px solid rgba(17, 17, 17, 0.18);
  padding: 14px 0;
  font: inherit;
  font-size: 18px;
  color: inherit;
  width: 100%;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}
@media (prefers-color-scheme: dark) {
  .gate input { border-bottom-color: rgba(232, 228, 218, 0.22); }
}
.gate input:focus { border-bottom-color: currentColor; }
.gate-err {
  color: #B14A2D;
  font-size: 14px;
  margin-top: 12px;
}
.gate-submit {
  margin-top: 8px;
  background: #111;
  color: #F5F3EE;
  padding: 16px;
  border: 0;
  cursor: pointer;
  transition: opacity 140ms ease;
}
@media (prefers-color-scheme: dark) {
  .gate-submit { background: #E8E4DA; color: #181614; }
}
.gate-submit:disabled { opacity: 0.4; cursor: default; }
.gate-submit:not(:disabled):hover { opacity: 0.85; }
`;
