'use client';

import { useEffect } from 'react';

type Props = {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div
      className="jrn-confirm-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
    >
      <div className="jrn-confirm" onClick={ev => ev.stopPropagation()}>
        <h2 className="jrn-confirm-title">{title}</h2>
        {body && <p className="jrn-confirm-body">{body}</p>}
        <div className="jrn-confirm-actions">
          <button
            type="button"
            className="jrn-confirm-btn jrn-confirm-cancel jrn-label"
            onClick={onCancel}
            autoFocus
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`jrn-confirm-btn jrn-label ${destructive ? 'jrn-confirm-destroy' : 'jrn-confirm-go'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
