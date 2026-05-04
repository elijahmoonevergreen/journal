'use client';

import { useEffect, useRef, useState } from 'react';
import { AttachmentWithUrl, VOICE_MAX_SECONDS } from '@/lib/types';

type Props = {
  onCancel: () => void;
  onRecorded: (a: AttachmentWithUrl) => void;
};

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return undefined;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VoiceRecorder({ onCancel, onRecorded }: Props) {
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'starting' | 'recording' | 'uploading'>('starting');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const finishedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError('Recording not supported in this browser.');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;

        const mime = pickMime();
        const rec = mime
          ? new MediaRecorder(stream, { mimeType: mime })
          : new MediaRecorder(stream);
        recorderRef.current = rec;

        rec.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
        };
        rec.onstop = () => { void handleStop(); };

        rec.start(1000);
        startedAtRef.current = Date.now();
        setPhase('recording');

        tickRef.current = setInterval(() => {
          const elapsed = (Date.now() - startedAtRef.current) / 1000;
          setSeconds(elapsed);
          if (elapsed >= VOICE_MAX_SECONDS) finish();
        }, 200);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Could not access microphone.';
        setError(msg.includes('Permission') || msg.includes('denied')
          ? 'Microphone access blocked. Allow it in your browser settings.'
          : 'Could not start recording.');
      }
    })();

    return () => {
      cancelled = true;
      if (tickRef.current) clearInterval(tickRef.current);
      const rec = recorderRef.current;
      if (rec && rec.state !== 'inactive') {
        try { rec.stop(); } catch {}
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try { rec.stop(); } catch {}
    }
  }

  async function handleStop() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    const mime = recorderRef.current?.mimeType || 'audio/webm';
    const blob = new Blob(chunksRef.current, { type: mime });
    chunksRef.current = [];
    const duration = (Date.now() - startedAtRef.current) / 1000;

    if (blob.size === 0) {
      setError('Empty recording. Try again.');
      return;
    }

    setPhase('uploading');

    try {
      const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
      const file = new File([blob], `Voice note.${ext}`, { type: mime });
      const fd = new FormData();
      fd.append('type', 'voice');
      fd.append('file', file);
      fd.append('duration', String(duration));
      const r = await fetch('/entries/upload', { method: 'POST', body: fd });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt || 'upload failed');
      }
      const json = (await r.json()) as AttachmentWithUrl;
      onRecorded(json);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed.';
      setError(msg);
    }
  }

  function cancel() {
    finishedRef.current = true;
    if (tickRef.current) clearInterval(tickRef.current);
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') {
      try { rec.ondataavailable = null as unknown as MediaRecorder['ondataavailable']; } catch {}
      try { rec.onstop = null; } catch {}
      try { rec.stop(); } catch {}
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    onCancel();
  }

  if (error) {
    return (
      <div className="jrn-rec">
        <div className="jrn-rec-err">{error}</div>
        <button type="button" onClick={cancel} className="jrn-rec-btn jrn-label">Close</button>
      </div>
    );
  }

  return (
    <div className="jrn-rec">
      <div className="jrn-rec-status">
        {phase === 'starting' && <span className="jrn-rec-label jrn-label">Starting…</span>}
        {phase === 'recording' && (
          <>
            <span className="jrn-rec-dot" aria-hidden="true" />
            <span className="jrn-rec-time">{fmt(seconds)}</span>
            <span className="jrn-rec-max jrn-label">/ {fmt(VOICE_MAX_SECONDS)}</span>
          </>
        )}
        {phase === 'uploading' && <span className="jrn-rec-label jrn-label">Saving…</span>}
      </div>
      <div className="jrn-rec-actions">
        <button
          type="button"
          onClick={cancel}
          className="jrn-rec-btn jrn-label"
          disabled={phase === 'uploading'}
        >
          Cancel
        </button>
        {phase === 'recording' && (
          <button
            type="button"
            onClick={finish}
            className="jrn-rec-btn jrn-rec-stop jrn-label"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
