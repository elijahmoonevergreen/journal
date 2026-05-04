'use client';

import { useRef, useState } from 'react';

type Props = {
  onEdit: () => void;
  onRequestDelete: () => void;
  children: React.ReactNode;
  disabled?: boolean;
};

const REVEAL = 160;
const TRIGGER = 96;
const LOCK_THRESHOLD = 8;

const EditIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 20 L 4 16 L 16 4 L 20 8 L 8 20 Z" />
    <path d="M14 6 L 18 10" />
  </svg>
);

const TrashIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 7 H 19" />
    <path d="M9 7 V 4 H 15 V 7" />
    <path d="M7 7 L 8 20 H 16 L 17 7" />
    <path d="M10 11 V 17" />
    <path d="M14 11 V 17" />
  </svg>
);

export default function SwipeRow({ onEdit, onRequestDelete, children, disabled }: Props) {
  const [offset, setOffset] = useState(0);
  const [snapping, setSnapping] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lockedRef = useRef<'horiz' | 'vert' | null>(null);
  const activeRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

  function reset() {
    setSnapping(true);
    setOffset(0);
    setTimeout(() => setSnapping(false), 200);
  }

  function trigger(direction: 'left' | 'right') {
    setSnapping(true);
    setOffset(direction === 'left' ? -REVEAL : REVEAL);
    setTimeout(() => {
      if (direction === 'left') onEdit();
      else onRequestDelete();
      setOffset(0);
      setTimeout(() => setSnapping(false), 200);
    }, 140);
  }

  function onPointerDown(ev: React.PointerEvent) {
    if (disabled) return;
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    activeRef.current = true;
    lockedRef.current = null;
    pointerIdRef.current = ev.pointerId;
    startXRef.current = ev.clientX;
    startYRef.current = ev.clientY;
    setSnapping(false);
  }

  function onPointerMove(ev: React.PointerEvent) {
    if (!activeRef.current) return;
    const dx = ev.clientX - startXRef.current;
    const dy = ev.clientY - startYRef.current;

    if (lockedRef.current === null) {
      if (Math.abs(dx) < LOCK_THRESHOLD && Math.abs(dy) < LOCK_THRESHOLD) return;
      lockedRef.current = Math.abs(dx) > Math.abs(dy) ? 'horiz' : 'vert';
      if (lockedRef.current === 'horiz') {
        try { (ev.currentTarget as HTMLDivElement).setPointerCapture(ev.pointerId); } catch {}
      }
    }

    if (lockedRef.current !== 'horiz') return;

    ev.preventDefault();
    let next = dx;
    if (next > REVEAL) next = REVEAL + (next - REVEAL) * 0.25;
    if (next < -REVEAL) next = -REVEAL + (next + REVEAL) * 0.25;
    setOffset(next);
  }

  function onPointerEnd(ev: React.PointerEvent) {
    if (!activeRef.current) return;
    activeRef.current = false;
    if (lockedRef.current === 'horiz') {
      try { (ev.currentTarget as HTMLDivElement).releasePointerCapture(ev.pointerId); } catch {}
      if (offset <= -TRIGGER) trigger('left');
      else if (offset >= TRIGGER) trigger('right');
      else reset();
    }
    lockedRef.current = null;
    pointerIdRef.current = null;
  }

  const showEdit = offset < 0;
  const showDelete = offset > 0;
  const editProgress = Math.min(1, Math.max(0, -offset / TRIGGER));
  const deleteProgress = Math.min(1, Math.max(0, offset / TRIGGER));

  return (
    <div className="jrn-swipe">
      <div
        className="jrn-swipe-action jrn-swipe-edit"
        aria-hidden="true"
        style={{ opacity: showEdit ? Math.max(0.35, editProgress) : 0 }}
      >
        <span className="jrn-swipe-icon" style={{ transform: `scale(${0.8 + editProgress * 0.2})` }}>
          <EditIcon />
        </span>
      </div>
      <div
        className="jrn-swipe-action jrn-swipe-delete"
        aria-hidden="true"
        style={{ opacity: showDelete ? Math.max(0.35, deleteProgress) : 0 }}
      >
        <span className="jrn-swipe-icon" style={{ transform: `scale(${0.8 + deleteProgress * 0.2})` }}>
          <TrashIcon />
        </span>
      </div>
      <div
        className="jrn-swipe-card"
        style={{
          transform: `translateX(${offset}px)`,
          transition: snapping ? 'transform 200ms ease' : 'none',
          touchAction: 'pan-y',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {children}
      </div>
    </div>
  );
}
