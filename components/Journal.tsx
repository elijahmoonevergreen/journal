'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DAYS = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
const MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

type Entry = {
  id: string;
  date: string;
  time: string;
  text: string;
  ts: number;
};

const pad = (n: number) => String(n).padStart(2, '0');
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const shiftDate = (key: string, delta: number) => {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};
const shiftMonth = (mk: string, delta: number) => {
  const [y, m] = mk.split('-').map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`;
};
const formatDay = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DAYS[dt.getDay()]} ${d} ${MONTHS[dt.getMonth()]}`;
};
const formatMonth = (mk: string) => {
  const [y, m] = mk.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

const ChevronLeft = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 6 L 9 12 L 15 18" />
  </svg>
);
const ChevronRight = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6 L 15 12 L 9 18" />
  </svg>
);
const CalendarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15" />
    <path d="M3.5 10 H 20.5" />
    <path d="M8 3 V 7" />
    <path d="M16 3 V 7" />
  </svg>
);
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5 V 19" />
    <path d="M5 12 H 19" />
  </svg>
);
const CloseIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 6 L 18 18" />
    <path d="M18 6 L 6 18" />
  </svg>
);
const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2 V 4.5" /><path d="M12 19.5 V 22" />
    <path d="M2 12 H 4.5" /><path d="M19.5 12 H 22" />
    <path d="M5 5 L 6.7 6.7" /><path d="M17.3 17.3 L 19 19" />
    <path d="M19 5 L 17.3 6.7" /><path d="M6.7 17.3 L 5 19" />
  </svg>
);
const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.8 A 9 9 0 1 1 11.2 3 A 7 7 0 0 0 21 12.8 Z" />
  </svg>
);

type Props = {
  userLabel: string;
};

export default function Journal({ userLabel }: Props) {
  const today = useMemo(() => todayKey(), []);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [calOpen, setCalOpen] = useState(false);
  const [calMonth, setCalMonth] = useState<string>(today.slice(0, 7));
  const [input, setInput] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('journal.theme');
      if (stored === 'dark' || stored === 'light') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTheme(stored);
        return;
      }
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('journal.theme', theme); } catch {}
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/entries', { cache: 'no-store' });
        if (r.ok) {
          const data = await r.json();
          if (Array.isArray(data) && !cancelled) {
            setEntries(data);
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const addEntry = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const now = new Date();
    const entry: Entry = {
      id: now.getTime().toString(36) + Math.random().toString(36).slice(2, 8),
      date: selectedDate,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      text: trimmed,
      ts: now.getTime(),
    };
    setEntries(prev => [...prev, entry]);
    try {
      const r = await fetch('/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (!r.ok) {
        setEntries(prev => prev.filter(e => e.id !== entry.id));
        if (r.status === 401) window.location.reload();
      }
    } catch {
      setEntries(prev => prev.filter(e => e.id !== entry.id));
    }
  }, [selectedDate]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    addEntry(input);
    setInput('');
    inputRef.current?.focus();
  };

  const onSignOut = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/';
  };

  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && calOpen) { setCalOpen(false); return; }
      const tag = (ev.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (calOpen) return;
      if (ev.key === 'ArrowLeft')  setSelectedDate(d => shiftDate(d, -1));
      if (ev.key === 'ArrowRight') setSelectedDate(d => shiftDate(d, 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [calOpen]);

  const dayEntries = useMemo(() =>
    entries
      .filter(e => e.date === selectedDate)
      .sort((a, b) => (a.time === b.time ? a.ts - b.ts : a.time.localeCompare(b.time))),
    [entries, selectedDate]
  );

  const datesWithEntries = useMemo(() => new Set(entries.map(e => e.date)), [entries]);

  const calendarCells = useMemo(() => {
    const [yy, mm] = calMonth.split('-').map(Number);
    const firstDay = new Date(yy, mm - 1, 1);
    const startWeekday = firstDay.getDay();
    const offset = (startWeekday + 6) % 7;
    const daysInMonth = new Date(yy, mm, 0).getDate();
    const cells: ({ key: string; day: number } | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ key: `${yy}-${pad(mm)}-${pad(d)}`, day: d });
    }
    return cells;
  }, [calMonth]);

  const openCal = () => {
    setCalMonth(selectedDate.slice(0, 7));
    setCalOpen(true);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className={`journal-app${theme === 'dark' ? ' dark' : ''}`} data-theme={theme}>
        <div className="jrn-shell">
          <header className="jrn-daynav">
            <button className="jrn-icon" aria-label="Previous day" type="button" onClick={() => setSelectedDate(d => shiftDate(d, -1))}>
              <ChevronLeft />
            </button>
            <div className="jrn-date jrn-label">{formatDay(selectedDate)}</div>
            <button className="jrn-icon" aria-label="Next day" type="button" onClick={() => setSelectedDate(d => shiftDate(d, 1))}>
              <ChevronRight />
            </button>
            <button className="jrn-icon jrn-calbtn" aria-label="Open calendar" type="button" onClick={openCal}>
              <CalendarIcon />
            </button>
          </header>

          <main className="jrn-entries">
            {dayEntries.length === 0 ? (
              <div className="jrn-empty">
                {selectedDate === today ? 'Nothing yet today.' : 'No entries on this day.'}
              </div>
            ) : (
              dayEntries.map(e => (
                <article className="jrn-entry" key={e.id}>
                  <time>{e.time}</time>
                  <p>{e.text}</p>
                </article>
              ))
            )}
          </main>

          <form className="jrn-composer" onSubmit={onSubmit} autoComplete="off">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="What is now? What is next?"
              maxLength={2000}
            />
            <button type="submit" className="jrn-submit" aria-label="Add entry">
              <PlusIcon />
            </button>
          </form>
        </div>

        <div className={`jrn-calview${calOpen ? ' open' : ''}`} aria-hidden={!calOpen} role="dialog" aria-label="Calendar">
          <header className="jrn-calhead">
            <button className="jrn-icon" aria-label="Previous month" type="button" onClick={() => setCalMonth(m => shiftMonth(m, -1))}>
              <ChevronLeft />
            </button>
            <div className="jrn-month jrn-label">{formatMonth(calMonth)}</div>
            <button className="jrn-icon" aria-label="Next month" type="button" onClick={() => setCalMonth(m => shiftMonth(m, 1))}>
              <ChevronRight />
            </button>
            <button className="jrn-icon jrn-close" aria-label="Close calendar" type="button" onClick={() => setCalOpen(false)}>
              <CloseIcon />
            </button>
          </header>
          <div className="jrn-weekdays">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
              <div key={d} className="jrn-wd jrn-label">{d}</div>
            ))}
          </div>
          <div className="jrn-calgrid">
            {calendarCells.map((c, i) => {
              if (!c) return <div key={`e${i}`} className="jrn-cell empty" />;
              const isToday = c.key === today;
              const isSelected = c.key === selectedDate;
              const hasEntries = datesWithEntries.has(c.key);
              return (
                <div
                  key={c.key}
                  className={`jrn-cell${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={formatDay(c.key)}
                  onClick={() => { setSelectedDate(c.key); setCalOpen(false); }}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault();
                      setSelectedDate(c.key);
                      setCalOpen(false);
                    }
                  }}
                >
                  {c.day}
                  {hasEntries && <span className="jrn-dot" />}
                </div>
              );
            })}
          </div>
          <div className="jrn-calfoot">
            <div className="jrn-foot-user jrn-label">{userLabel}</div>
            <button
              type="button"
              className="jrn-theme-toggle jrn-label"
              onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <button
              type="button"
              className="jrn-signout jrn-label"
              onClick={onSignOut}
              aria-label="Sign out"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const STYLES = `
.journal-app {
  --bg: #F5F3EE;
  --fg: #111111;
  --muted: #9b958a;
  --rule: rgba(17, 17, 17, 0.14);
  --accent: #B14A2D;
  --accent-fg: #F5F3EE;

  position: fixed;
  inset: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-journal), -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
  font-weight: 300;
  font-size: 17px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 0;
  transition: background-color 200ms ease, color 200ms ease;
}
.journal-app.dark {
  --bg: #181614;
  --fg: #E8E4DA;
  --muted: #6b665c;
  --rule: rgba(232, 228, 218, 0.14);
  --accent: #D46A45;
  --accent-fg: #181614;
}

.journal-app * { box-sizing: border-box; }
.journal-app button {
  background: none; border: 0; color: inherit; font: inherit; cursor: pointer; padding: 0;
}
.journal-app input {
  background: none; border: 0; color: inherit; font: inherit; outline: none;
  -webkit-appearance: none; appearance: none; width: 100%;
  font-family: var(--font-journal), -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
  font-weight: 300;
}

.journal-app .jrn-label {
  text-transform: uppercase;
  font-weight: 500;
  letter-spacing: 0.22em;
  font-size: 12px;
  font-feature-settings: 'tnum' 1;
}

.journal-app .jrn-icon {
  width: 48px; height: 48px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--fg);
  transition: opacity 140ms ease;
}
.journal-app .jrn-icon:hover { opacity: 0.5; }
.journal-app .jrn-icon:active { opacity: 0.35; }
.journal-app .jrn-icon svg { display: block; }

.journal-app .jrn-shell {
  display: flex; flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.journal-app .jrn-daynav {
  display: grid;
  grid-template-columns: 48px 1fr 48px 48px;
  column-gap: 8px;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid var(--rule);
  flex: 0 0 auto;
}
.journal-app .jrn-date { text-align: center; padding: 0 8px; }
.journal-app .jrn-calbtn { justify-self: end; }

.journal-app .jrn-entries {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 32px;
}
.journal-app .jrn-empty {
  padding: 96px 16px;
  color: var(--muted);
  text-align: center;
  font-style: italic;
  font-size: 17px;
}
.journal-app .jrn-entry {
  display: grid;
  grid-template-columns: 64px 1fr;
  column-gap: 32px;
  padding: 24px 0;
  border-bottom: 1px solid var(--rule);
  align-items: baseline;
}
.journal-app .jrn-entry:last-child { border-bottom: 0; }
.journal-app .jrn-entry time {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  letter-spacing: 0.06em;
  padding-top: 4px;
}
.journal-app .jrn-entry p {
  font-size: 17px;
  line-height: 1.55;
  word-break: break-word;
  white-space: pre-wrap;
}

.journal-app .jrn-composer {
  border-top: 1px solid var(--rule);
  padding: 16px 32px;
  display: grid;
  grid-template-columns: 1fr 48px;
  column-gap: 16px;
  align-items: center;
  flex: 0 0 auto;
  background: var(--bg);
}
.journal-app .jrn-composer input {
  font-size: 17px;
  padding: 12px 0;
}
.journal-app .jrn-composer input::placeholder { color: var(--muted); font-style: italic; opacity: 1; }
.journal-app .jrn-submit {
  width: 48px; height: 48px;
  border: 1px solid var(--rule);
  color: var(--fg);
  display: inline-flex; align-items: center; justify-content: center;
  transition: background-color 140ms ease, color 140ms ease, border-color 140ms ease;
}
.journal-app .jrn-submit:hover { background: var(--fg); color: var(--bg); border-color: var(--fg); }

.journal-app .jrn-calview {
  position: fixed;
  inset: 0;
  background: var(--bg);
  z-index: 20;
  display: none;
  flex-direction: column;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.journal-app .jrn-calview.open { display: flex; }

.journal-app .jrn-calhead {
  display: grid;
  grid-template-columns: 48px 1fr 48px 48px;
  column-gap: 8px;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid var(--rule);
  flex: 0 0 auto;
  position: sticky;
  top: 0;
  background: var(--bg);
  z-index: 2;
}
.journal-app .jrn-month { text-align: center; padding: 0 8px; }
.journal-app .jrn-close { justify-self: end; }

.journal-app .jrn-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 24px 32px 8px;
  flex: 0 0 auto;
}
.journal-app .jrn-wd {
  text-align: center;
  color: var(--muted);
  padding: 8px 0;
  font-size: 11px;
  letter-spacing: 0.22em;
}

.journal-app .jrn-calgrid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 32px 32px;
  align-content: start;
  flex: 0 0 auto;
}
.journal-app .jrn-cell {
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--fg);
  font-size: 18px;
  font-weight: 300;
  position: relative;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 140ms ease;
  user-select: none;
}
.journal-app .jrn-cell.empty { cursor: default; }
.journal-app .jrn-cell:not(.empty):not(.today):hover { opacity: 0.5; }
.journal-app .jrn-cell.today {
  background: var(--accent);
  color: var(--accent-fg);
}
.journal-app .jrn-cell.selected:not(.today) {
  border-color: var(--fg);
}
.journal-app .jrn-dot {
  position: absolute;
  bottom: 18%;
  left: 50%;
  transform: translateX(-50%);
  width: 4px; height: 4px;
  border-radius: 50%;
  background: var(--fg);
}
.journal-app .jrn-cell.today .jrn-dot { background: var(--accent-fg); }

.journal-app .jrn-calfoot {
  border-top: 1px solid var(--rule);
  padding: 20px 32px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  flex: 0 0 auto;
  position: sticky;
  bottom: 0;
  background: var(--bg);
  margin-top: auto;
  z-index: 2;
}
.journal-app .jrn-foot-user {
  color: var(--muted);
  justify-self: start;
}
.journal-app .jrn-theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: var(--muted);
  padding: 8px 12px;
  transition: color 140ms ease;
  justify-self: center;
}
.journal-app .jrn-theme-toggle:hover { color: var(--fg); }
.journal-app .jrn-theme-toggle svg { display: block; }
.journal-app .jrn-signout {
  color: var(--muted);
  padding: 8px 12px;
  transition: color 140ms ease;
  justify-self: end;
}
.journal-app .jrn-signout:hover { color: var(--fg); }

@media (max-width: 640px) {
  .journal-app { font-size: 16px; }
  .journal-app .jrn-daynav {
    padding: 16px;
    column-gap: 4px;
    grid-template-columns: 40px 1fr 40px 40px;
  }
  .journal-app .jrn-icon { width: 40px; height: 40px; }
  .journal-app .jrn-label { font-size: 11px; letter-spacing: 0.2em; }
  .journal-app .jrn-entries { padding: 0 16px; }
  .journal-app .jrn-entry {
    grid-template-columns: 56px 1fr;
    column-gap: 16px;
    padding: 20px 0;
  }
  .journal-app .jrn-entry p { font-size: 16px; }
  .journal-app .jrn-composer {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    row-gap: 8px;
    padding: 16px;
    padding-bottom: max(16px, env(safe-area-inset-bottom));
  }
  .journal-app .jrn-composer input {
    border-bottom: 1px solid var(--rule);
    font-size: 16px;
  }
  .journal-app .jrn-submit { width: 100%; height: 56px; }
  .journal-app .jrn-calhead { padding: 16px; grid-template-columns: 40px 1fr 40px 40px; }
  .journal-app .jrn-weekdays,
  .journal-app .jrn-calgrid { padding-left: 8px; padding-right: 8px; }
  .journal-app .jrn-cell { font-size: 16px; }
  .journal-app .jrn-calfoot { padding: 16px; padding-bottom: max(16px, env(safe-area-inset-bottom)); }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .journal-app .jrn-daynav,
  .journal-app .jrn-composer,
  .journal-app .jrn-entries,
  .journal-app .jrn-calhead,
  .journal-app .jrn-weekdays,
  .journal-app .jrn-calgrid,
  .journal-app .jrn-calfoot {
    padding-left: 40px; padding-right: 40px;
  }
}

@media (min-width: 1025px) {
  .journal-app .jrn-shell {
    max-width: 880px;
    margin-left: auto;
    margin-right: auto;
    width: 100%;
    border-left: 1px solid var(--rule);
    border-right: 1px solid var(--rule);
  }
  .journal-app .jrn-calview > * {
    max-width: 880px;
    margin-left: auto;
    margin-right: auto;
    width: 100%;
  }
}
`;
