'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Composer from './Composer';
import SwipeRow from './SwipeRow';
import ConfirmDialog from './ConfirmDialog';
import { Entry, AttachmentWithUrl, StoredAttachment } from '@/lib/types';

const stripUrl = (a: AttachmentWithUrl): StoredAttachment => {
  const { url, ...rest } = a;
  void url;
  return rest;
};

const DAYS = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
const MONTHS = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

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
const fmtDuration = (s?: number) => {
  if (!s || s <= 0) return '';
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
};
const fmtBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
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
const DocIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 3 H 14 L 18 7 V 21 H 7 Z" />
    <path d="M14 3 V 7 H 18" />
    <path d="M9 12 H 16" />
    <path d="M9 15 H 16" />
    <path d="M9 18 H 13" />
  </svg>
);

type Props = { userLabel: string };

export default function Journal({ userLabel }: Props) {
  const today = useMemo(() => todayKey(), []);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [calOpen, setCalOpen] = useState(false);
  const [calMonth, setCalMonth] = useState<string>(today.slice(0, 7));
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null);

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

  const loadEntries = useCallback(async () => {
    setLoadState('loading');
    try {
      const r = await fetch('/entries', { cache: 'no-store' });
      if (r.status === 401) { window.location.reload(); return; }
      if (!r.ok) { setLoadState('error'); return; }
      const data = await r.json();
      if (!Array.isArray(data)) { setLoadState('error'); return; }
      setEntries(data);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadEntries();
    })();
    return () => { cancelled = true; };
  }, [loadEntries]);

  const addEntry = useCallback(async (html: string, attachments: AttachmentWithUrl[]) => {
    const now = new Date();
    const entry: Entry = {
      id: now.getTime().toString(36) + Math.random().toString(36).slice(2, 8),
      date: selectedDate,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      text: html,
      ts: now.getTime(),
      attachments,
    };
    setEntries(prev => [...prev, entry]);
    const r = await fetch('/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: entry.id,
        date: entry.date,
        time: entry.time,
        text: entry.text,
        ts: entry.ts,
        attachments: attachments.map(stripUrl),
      }),
    });
    if (!r.ok) {
      setEntries(prev => prev.filter(e => e.id !== entry.id));
      if (r.status === 401) { window.location.reload(); return; }
      throw new Error('Save failed');
    }
    const saved = (await r.json()) as Entry;
    setEntries(prev => prev.map(e => e.id === saved.id ? saved : e));
  }, [selectedDate]);

  const saveEdit = useCallback(async (id: string, html: string, attachments: AttachmentWithUrl[]) => {
    const r = await fetch(`/entries/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: html,
        attachments: attachments.map(stripUrl),
      }),
    });
    if (!r.ok) {
      if (r.status === 401) { window.location.reload(); return; }
      throw new Error('Save failed');
    }
    setEntries(prev => prev.map(e => e.id === id
      ? { ...e, text: html, attachments }
      : e));
    setEditingId(null);
  }, []);

  const performDelete = useCallback(async (entry: Entry) => {
    setEntries(prev => prev.filter(e => e.id !== entry.id));
    setPendingDelete(null);
    const r = await fetch(`/entries/${encodeURIComponent(entry.id)}`, { method: 'DELETE' });
    if (!r.ok) {
      setEntries(prev => [...prev, entry].sort((a, b) => a.ts - b.ts));
      if (r.status === 401) window.location.reload();
    }
  }, []);

  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && calOpen) { setCalOpen(false); return; }
      const tag = (ev.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((ev.target as HTMLElement)?.isContentEditable) return;
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (calOpen || editingId || pendingDelete) return;
      if (ev.key === 'ArrowLeft')  setSelectedDate(d => shiftDate(d, -1));
      if (ev.key === 'ArrowRight') setSelectedDate(d => shiftDate(d, 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [calOpen, editingId, pendingDelete]);

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

  const onSignOut = async () => {
    try { await fetch('/api/logout', { method: 'POST' }); } catch {}
    window.location.href = '/';
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
            {loadState === 'loading' ? (
              <div className="jrn-empty">Loading…</div>
            ) : loadState === 'error' ? (
              <div className="jrn-empty">
                Couldn&apos;t load entries.
                <button type="button" className="jrn-retry jrn-label" onClick={() => loadEntries()}>Try again</button>
              </div>
            ) : dayEntries.length === 0 ? (
              <div className="jrn-empty">
                {selectedDate === today ? 'Nothing yet today.' : 'No entries on this day.'}
              </div>
            ) : (
              dayEntries.map(e => (
                <SwipeRow
                  key={e.id}
                  disabled={editingId === e.id}
                  onEdit={() => setEditingId(e.id)}
                  onRequestDelete={() => setPendingDelete(e)}
                >
                  <article className="jrn-entry">
                    <time>{e.time}</time>
                    <div className="jrn-entry-main">
                      {editingId === e.id ? (
                        <Composer
                          variant="edit"
                          initialHtml={e.text}
                          initialAttachments={e.attachments}
                          submitLabel="Save"
                          autoFocus
                          onSubmit={(html, atts) => saveEdit(e.id, html, atts)}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <>
                          {e.text && (
                            <div
                              className="jrn-entry-body jrn-prose"
                              dangerouslySetInnerHTML={{ __html: e.text }}
                            />
                          )}
                          {e.attachments && e.attachments.length > 0 && (
                            <div className="jrn-entry-atts">
                              {e.attachments.map(a => {
                                if (a.type === 'image') {
                                  return (
                                    <a key={a.path} href={a.url} target="_blank" rel="noopener noreferrer">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img className="jrn-att-img" src={a.url} alt={a.name} loading="lazy" />
                                    </a>
                                  );
                                }
                                if (a.type === 'voice') {
                                  return (
                                    <div key={a.path} className="jrn-att-voice">
                                      <audio controls preload="metadata" src={a.url} />
                                      {a.duration && <span className="jrn-att-meta jrn-label">{fmtDuration(a.duration)}</span>}
                                    </div>
                                  );
                                }
                                return (
                                  <a
                                    key={a.path}
                                    className="jrn-att-doc"
                                    href={a.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={a.name}
                                  >
                                    <span className="jrn-att-doc-icon"><DocIcon /></span>
                                    <span className="jrn-att-doc-meta">
                                      <span className="jrn-att-doc-name">{a.name}</span>
                                      <span className="jrn-att-doc-size jrn-label">{fmtBytes(a.size)}</span>
                                    </span>
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </article>
                </SwipeRow>
              ))
            )}
          </main>

          <Composer
            placeholder="What is now? What is next?"
            onSubmit={addEntry}
          />
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

        {pendingDelete && (
          <ConfirmDialog
            title="Delete this entry?"
            body="This can't be undone. Any attachments are removed too."
            confirmLabel="Delete"
            destructive
            onConfirm={() => performDelete(pendingDelete)}
            onCancel={() => setPendingDelete(null)}
          />
        )}
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
  --good: #3a8c5a;

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
  --good: #4ea372;
}

.journal-app * { box-sizing: border-box; }
.journal-app button {
  background: none; border: 0; color: inherit; font: inherit; cursor: pointer; padding: 0;
}
.journal-app input, .journal-app textarea {
  background: none; border: 0; color: inherit; font: inherit; outline: none;
  -webkit-appearance: none; appearance: none;
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
  flex: 0 0 auto;
}
.journal-app .jrn-icon:hover { opacity: 0.5; }
.journal-app .jrn-icon:active { opacity: 0.35; }
.journal-app .jrn-icon:disabled { opacity: 0.3; cursor: default; }
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
}
.journal-app .jrn-empty {
  padding: 96px 16px;
  color: var(--muted);
  text-align: center;
  font-style: italic;
  font-size: 17px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.journal-app .jrn-retry {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  border: 1px solid var(--rule);
  color: var(--fg);
  font-style: normal;
  transition: background-color 140ms ease, color 140ms ease;
}
.journal-app .jrn-retry:hover { background: var(--fg); color: var(--bg); }
.journal-app .jrn-entry {
  display: grid;
  grid-template-columns: 64px 1fr;
  column-gap: 32px;
  padding: 24px 32px;
  border-bottom: 1px solid var(--rule);
  align-items: baseline;
  background: var(--bg);
}
.journal-app .jrn-entry time {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  letter-spacing: 0.06em;
  padding-top: 4px;
}
.journal-app .jrn-entry-main { min-width: 0; }
.journal-app .jrn-entry-body {
  font-size: 17px;
  line-height: 1.55;
  word-break: break-word;
  white-space: pre-wrap;
}
.journal-app .jrn-prose p { margin: 0; padding: 0; }
.journal-app .jrn-prose p + p { margin-top: 0.5em; }
.journal-app .jrn-prose a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
.journal-app .jrn-prose a:hover { opacity: 0.7; }
.journal-app .jrn-prose strong, .journal-app .jrn-prose b { font-weight: 600; }
.journal-app .jrn-prose em, .journal-app .jrn-prose i { font-style: italic; }
.journal-app .jrn-prose u { text-decoration: underline; text-underline-offset: 3px; }

.journal-app .jrn-entry-atts {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}
.journal-app .jrn-att-img {
  display: block;
  max-width: 100%;
  max-height: 360px;
  width: auto;
  border-radius: 2px;
  border: 1px solid var(--rule);
}
.journal-app .jrn-att-voice {
  display: flex; align-items: center; gap: 12px;
}
.journal-app .jrn-att-voice audio {
  flex: 1 1 auto;
  height: 36px;
  width: 100%;
  max-width: 480px;
}
.journal-app .jrn-att-meta { color: var(--muted); }
.journal-app .jrn-att-doc {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--rule);
  text-decoration: none;
  color: inherit;
  max-width: 100%;
  transition: background-color 140ms ease;
}
.journal-app .jrn-att-doc:hover { background: rgba(0,0,0,0.03); }
.journal-app.dark .jrn-att-doc:hover { background: rgba(255,255,255,0.04); }
.journal-app .jrn-att-doc-icon { display: inline-flex; color: var(--muted); }
.journal-app .jrn-att-doc-meta { display: flex; flex-direction: column; min-width: 0; }
.journal-app .jrn-att-doc-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.journal-app .jrn-att-doc-size { color: var(--muted); margin-top: 2px; }

/* Swipe row */
.journal-app .jrn-swipe {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--rule);
}
.journal-app .jrn-swipe:last-child { border-bottom: 0; }
.journal-app .jrn-swipe .jrn-entry { border-bottom: 0; }
.journal-app .jrn-swipe-action {
  position: absolute;
  top: 0; bottom: 0;
  width: 50%;
  display: flex;
  align-items: center;
  pointer-events: none;
  transition: opacity 140ms ease;
}
.journal-app .jrn-swipe-edit {
  right: 0;
  background: var(--good);
  color: #fff;
  justify-content: flex-end;
  padding-right: 32px;
}
.journal-app .jrn-swipe-delete {
  left: 0;
  background: var(--accent);
  color: var(--accent-fg);
  justify-content: flex-start;
  padding-left: 32px;
}
.journal-app .jrn-swipe-icon { display: inline-flex; transition: transform 80ms ease; }
.journal-app .jrn-swipe-card { position: relative; will-change: transform; }

/* Composer */
.journal-app .jrn-comp {
  flex: 0 0 auto;
  background: var(--bg);
  border-top: 1px solid var(--rule);
  padding: 12px 32px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
}
.journal-app .jrn-comp-edit {
  border: 1px solid var(--rule);
  padding: 12px;
  border-top: 1px solid var(--rule);
  margin-top: 4px;
}

.journal-app .jrn-comp-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
}
.journal-app .jrn-comp-tbtn {
  width: 32px; height: 32px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--muted);
  border-radius: 2px;
  font-size: 15px;
  transition: color 140ms ease, background-color 140ms ease;
}
.journal-app .jrn-comp-tbtn:hover { color: var(--fg); }
.journal-app .jrn-comp-tbtn.active { color: var(--fg); background: rgba(0,0,0,0.05); }
.journal-app.dark .jrn-comp-tbtn.active { background: rgba(255,255,255,0.06); }

.journal-app .jrn-comp-linkbar {
  display: flex; align-items: center; gap: 8px; flex: 1;
}
.journal-app .jrn-comp-linkbar input {
  flex: 1 1 auto;
  font-size: 14px;
  padding: 6px 8px;
  border: 1px solid var(--rule);
  background: var(--bg);
  color: var(--fg);
}
.journal-app .jrn-comp-linkbar .jrn-comp-tbtn {
  width: auto;
  padding: 0 12px;
  height: 30px;
  border: 1px solid var(--rule);
}

.journal-app .jrn-comp-body {
  position: relative;
  min-height: 36px;
}
.journal-app .jrn-comp-placeholder {
  position: absolute;
  top: 12px; left: 0; right: 0;
  color: var(--muted);
  font-style: italic;
  pointer-events: none;
}
.journal-app .jrn-comp-skeleton { height: 36px; }
.journal-app .jrn-prose {
  font-size: 17px;
  line-height: 1.55;
}
.journal-app .ProseMirror {
  outline: none;
  padding: 12px 0;
  min-height: 24px;
  word-break: break-word;
  white-space: pre-wrap;
}
.journal-app .ProseMirror:focus { outline: none; }
.journal-app .ProseMirror p { margin: 0; }
.journal-app .ProseMirror p + p { margin-top: 0.5em; }
.journal-app .jrn-comp-edit .ProseMirror { padding: 0; }

.journal-app .jrn-comp-actions {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  column-gap: 8px;
}
.journal-app .jrn-comp-attach-wrap { position: relative; grid-column: 1; }
.journal-app .jrn-comp-attach-menu {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 0;
  background: var(--bg);
  border: 1px solid var(--rule);
  display: flex;
  flex-direction: column;
  z-index: 10;
  min-width: 180px;
}
.journal-app .jrn-comp-attach-opt {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px;
  color: var(--fg);
  white-space: nowrap;
  transition: background-color 140ms ease;
}
.journal-app .jrn-comp-attach-opt:hover { background: rgba(0,0,0,0.04); }
.journal-app.dark .jrn-comp-attach-opt:hover { background: rgba(255,255,255,0.05); }
.journal-app .jrn-comp-cancel {
  grid-column: 2;
  justify-self: end;
  padding: 8px 14px;
  color: var(--muted);
  transition: color 140ms ease;
}
.journal-app .jrn-comp-cancel:hover { color: var(--fg); }
.journal-app .jrn-submit {
  grid-column: 3;
  width: 48px; height: 48px;
  border: 1px solid var(--rule);
  color: var(--fg);
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0 16px;
  min-width: 48px;
  transition: background-color 140ms ease, color 140ms ease, border-color 140ms ease;
}
.journal-app .jrn-submit:disabled { opacity: 0.4; cursor: default; }
.journal-app .jrn-submit:not(:disabled):hover { background: var(--fg); color: var(--bg); border-color: var(--fg); }
.journal-app .jrn-submit .jrn-label { white-space: nowrap; }

.journal-app .jrn-comp-error {
  color: var(--accent);
  font-size: 13px;
}
.journal-app .jrn-comp-pending { color: var(--muted); }

/* Chips */
.journal-app .jrn-comp-chips {
  display: flex; flex-wrap: wrap; gap: 8px;
}
.journal-app .jrn-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 6px 8px;
  border: 1px solid var(--rule);
  max-width: 100%;
  font-size: 13px;
}
.journal-app .jrn-chip-thumb {
  width: 28px; height: 28px;
  object-fit: cover;
  border: 1px solid var(--rule);
}
.journal-app .jrn-chip-icon { display: inline-flex; color: var(--muted); }
.journal-app .jrn-chip-name {
  max-width: 200px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.journal-app .jrn-chip-size { color: var(--muted); font-size: 12px; }
.journal-app .jrn-chip-close {
  width: 22px; height: 22px;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--muted);
  transition: color 140ms ease;
}
.journal-app .jrn-chip-close:hover { color: var(--fg); }

/* Voice recorder */
.journal-app .jrn-rec {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 14px;
  border: 1px solid var(--rule);
  background: var(--bg);
}
.journal-app .jrn-rec-status {
  display: inline-flex; align-items: center; gap: 12px;
  font-variant-numeric: tabular-nums;
}
.journal-app .jrn-rec-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--accent);
  animation: jrn-pulse 1.2s ease-in-out infinite;
}
@keyframes jrn-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}
.journal-app .jrn-rec-time { font-size: 18px; }
.journal-app .jrn-rec-max { color: var(--muted); }
.journal-app .jrn-rec-label { color: var(--muted); }
.journal-app .jrn-rec-actions { display: inline-flex; gap: 4px; }
.journal-app .jrn-rec-btn {
  padding: 6px 14px;
  color: var(--muted);
  border: 1px solid transparent;
  transition: color 140ms ease, border-color 140ms ease;
}
.journal-app .jrn-rec-btn:hover { color: var(--fg); }
.journal-app .jrn-rec-btn:disabled { opacity: 0.5; cursor: default; }
.journal-app .jrn-rec-stop { color: var(--fg); border-color: var(--rule); }
.journal-app .jrn-rec-stop:hover { background: var(--fg); color: var(--bg); }
.journal-app .jrn-rec-err { color: var(--accent); flex: 1; }

/* Confirm dialog */
.journal-app .jrn-confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.journal-app .jrn-confirm {
  background: var(--bg);
  color: var(--fg);
  border: 1px solid var(--rule);
  max-width: 420px;
  width: 100%;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.journal-app .jrn-confirm-title {
  font-size: 22px;
  font-weight: 400;
  margin: 0;
  letter-spacing: -0.01em;
}
.journal-app .jrn-confirm-body {
  margin: 0;
  color: var(--muted);
  font-size: 15px;
}
.journal-app .jrn-confirm-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}
.journal-app .jrn-confirm-btn {
  padding: 10px 18px;
  border: 1px solid var(--rule);
  transition: background-color 140ms ease, color 140ms ease, border-color 140ms ease;
}
.journal-app .jrn-confirm-cancel { color: var(--fg); }
.journal-app .jrn-confirm-cancel:hover { background: rgba(0,0,0,0.04); }
.journal-app.dark .jrn-confirm-cancel:hover { background: rgba(255,255,255,0.05); }
.journal-app .jrn-confirm-go {
  background: var(--fg);
  color: var(--bg);
  border-color: var(--fg);
}
.journal-app .jrn-confirm-go:hover { opacity: 0.85; }
.journal-app .jrn-confirm-destroy {
  background: var(--accent);
  color: var(--accent-fg);
  border-color: var(--accent);
}
.journal-app .jrn-confirm-destroy:hover { opacity: 0.9; }

/* Calendar */
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
.journal-app .jrn-cell.today { background: var(--accent); color: var(--accent-fg); }
.journal-app .jrn-cell.selected:not(.today) { border-color: var(--fg); }
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
.journal-app .jrn-foot-user { color: var(--muted); justify-self: start; }
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
  .journal-app .jrn-daynav { padding: 16px; column-gap: 4px; grid-template-columns: 40px 1fr 40px 40px; }
  .journal-app .jrn-icon { width: 40px; height: 40px; }
  .journal-app .jrn-label { font-size: 11px; letter-spacing: 0.2em; }
  .journal-app .jrn-entry {
    grid-template-columns: 56px 1fr;
    column-gap: 16px;
    padding: 20px 16px;
  }
  .journal-app .jrn-entry-body { font-size: 16px; }
  .journal-app .jrn-comp { padding: 12px 16px; padding-bottom: max(16px, env(safe-area-inset-bottom)); }
  .journal-app .jrn-calhead { padding: 16px; grid-template-columns: 40px 1fr 40px 40px; }
  .journal-app .jrn-weekdays, .journal-app .jrn-calgrid { padding-left: 8px; padding-right: 8px; }
  .journal-app .jrn-cell { font-size: 16px; }
  .journal-app .jrn-calfoot { padding: 16px; padding-bottom: max(16px, env(safe-area-inset-bottom)); }
  .journal-app .jrn-att-img { max-height: 280px; }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .journal-app .jrn-daynav,
  .journal-app .jrn-comp,
  .journal-app .jrn-entry,
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
