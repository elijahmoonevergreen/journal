import Link from 'next/link';
import { USERS } from '@/lib/auth';

export default function HomePage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="picker">
        <div className="picker-shell">
          <p className="picker-eyebrow picker-label">Journal</p>
          <h1 className="picker-title">Who&apos;s writing?</h1>
          <div className="picker-grid">
            {USERS.map(u => (
              <Link key={u.name} href={`/${u.name}`} className="picker-card">
                <span className="picker-name">{u.label}</span>
                <span className="picker-arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

const STYLES = `
.picker {
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
  .picker { background: #181614; color: #E8E4DA; }
}
.picker-shell {
  width: 100%;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.picker-label {
  text-transform: uppercase;
  font-weight: 500;
  letter-spacing: 0.24em;
  font-size: 12px;
  color: #9b958a;
}
.picker-eyebrow { margin: 0; }
.picker-title {
  font-size: 56px;
  font-weight: 300;
  line-height: 1;
  margin: 0;
  letter-spacing: -0.01em;
}
.picker-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}
.picker-card {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 32px 28px;
  border: 1px solid rgba(17, 17, 17, 0.18);
  text-decoration: none;
  color: inherit;
  min-height: 180px;
  transition: background-color 160ms ease, color 160ms ease, border-color 160ms ease;
}
@media (prefers-color-scheme: dark) {
  .picker-card { border-color: rgba(232, 228, 218, 0.22); }
}
.picker-card:hover {
  background: #111;
  color: #F5F3EE;
  border-color: #111;
}
@media (prefers-color-scheme: dark) {
  .picker-card:hover { background: #E8E4DA; color: #181614; border-color: #E8E4DA; }
}
.picker-name {
  font-size: 36px;
  font-weight: 300;
  letter-spacing: -0.01em;
}
.picker-arrow {
  font-size: 24px;
  opacity: 0.4;
}
.picker-card:hover .picker-arrow { opacity: 1; }

@media (max-width: 640px) {
  .picker-title { font-size: 44px; }
  .picker-grid { grid-template-columns: 1fr; }
  .picker-card { padding: 24px; min-height: 140px; }
  .picker-name { font-size: 28px; }
}
`;
