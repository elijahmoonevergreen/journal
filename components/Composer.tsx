'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { useEffect, useRef, useState } from 'react';
import VoiceRecorder from './VoiceRecorder';
import { AttachmentWithUrl, AttachmentType } from '@/lib/types';

const EnterAsHardBreak = Extension.create({
  name: 'enterAsHardBreak',
  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.setHardBreak(),
    };
  },
});

type Props = {
  initialHtml?: string;
  initialAttachments?: AttachmentWithUrl[];
  placeholder?: string;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit: (html: string, attachments: AttachmentWithUrl[]) => Promise<void> | void;
  onCancel?: () => void;
  autoFocus?: boolean;
  variant?: 'composer' | 'edit';
};

const PaperclipIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 12 L 12 20 a 5 5 0 0 1 -7 -7 L 13 5 a 3.5 3.5 0 0 1 5 5 L 10 18 a 2 2 0 0 1 -3 -3 L 14 8" />
  </svg>
);
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" aria-hidden="true">
    <path d="M12 5 V 19" />
    <path d="M5 12 H 19" />
  </svg>
);
const ImageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="14" />
    <circle cx="9" cy="10.5" r="1.4" />
    <path d="M5 18 L 11 12 L 14 15 L 17 12 L 21 16" />
  </svg>
);
const MicIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="12" rx="3" />
    <path d="M5 11 a 7 7 0 0 0 14 0" />
    <path d="M12 18 V 21" />
  </svg>
);
const DocIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 3 H 14 L 18 7 V 21 H 7 Z" />
    <path d="M14 3 V 7 H 18" />
    <path d="M9 12 H 16" />
    <path d="M9 15 H 16" />
    <path d="M9 18 H 13" />
  </svg>
);
const LinkIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 14 a 4 4 0 0 0 5.7 0 L 19 10.7 a 4 4 0 0 0 -5.7 -5.7 L 12 6.3" />
    <path d="M14 10 a 4 4 0 0 0 -5.7 0 L 5 13.3 a 4 4 0 0 0 5.7 5.7 L 12 17.7" />
  </svg>
);
const CloseSmIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 6 L 18 18" />
    <path d="M18 6 L 6 18" />
  </svg>
);

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Composer({
  initialHtml = '',
  initialAttachments = [],
  placeholder = 'What is now? What is next?',
  submitLabel,
  cancelLabel = 'Cancel',
  onSubmit,
  onCancel,
  autoFocus = false,
  variant = 'composer',
}: Props) {
  const [attachments, setAttachments] = useState<AttachmentWithUrl[]>(initialAttachments);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<AttachmentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState(() => {
    const stripped = (initialHtml || '').replace(/<p>\s*<\/p>/g, '').trim();
    return stripped.length === 0;
  });

  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        code: false,
        strike: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https', 'mailto', 'tel'],
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      EnterAsHardBreak,
    ],
    content: initialHtml || '<p></p>',
    autofocus: autoFocus,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'jrn-prose',
        'aria-label': 'Entry',
        spellcheck: 'true',
      },
    },
    onCreate: ({ editor }) => setIsEmpty(editor.isEmpty),
    onUpdate: ({ editor }) => setIsEmpty(editor.isEmpty),
  });

  useEffect(() => {
    function onDocClick(ev: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(ev.target as Node)) {
        setAttachMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  async function uploadFile(file: File, type: AttachmentType) {
    setError(null);
    setPendingUpload(type);
    try {
      const fd = new FormData();
      fd.append('type', type);
      fd.append('file', file);
      const r = await fetch('/entries/upload', { method: 'POST', body: fd });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt || 'Upload failed');
      }
      const a = (await r.json()) as AttachmentWithUrl;
      setAttachments(prev => [...prev, a]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      setError(msg.length > 200 ? 'Upload failed' : msg);
    } finally {
      setPendingUpload(null);
    }
  }

  function removeAttachment(path: string) {
    setAttachments(prev => prev.filter(a => a.path !== path));
  }

  function applyLink() {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else {
      const safe = /^(https?:|mailto:|tel:)/i.test(url) ? url : `https://${url}`;
      editor.chain().focus().extendMarkRange('link').setLink({ href: safe }).run();
    }
    setLinkOpen(false);
    setLinkUrl('');
  }

  function openLinkPrompt() {
    if (!editor) return;
    const existing = editor.getAttributes('link').href as string | undefined;
    setLinkUrl(existing ?? '');
    setLinkOpen(true);
  }

  async function handleSubmit() {
    if (!editor || busy) return;
    const html = editor.getHTML();
    const stripped = html
      .replace(/<br\s*\/?>/gi, '')
      .replace(/<p>\s*<\/p>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();
    if (stripped.length === 0 && attachments.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(html, attachments);
      if (variant === 'composer') {
        editor.commands.clearContent();
        setAttachments([]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  const submitText = submitLabel ?? (variant === 'edit' ? 'Save' : '');
  const isLinkActive = !!editor?.isActive('link');

  return (
    <div className={`jrn-comp jrn-comp-${variant}`} ref={containerRef}>
      {attachments.length > 0 && (
        <div className="jrn-comp-chips">
          {attachments.map(a => (
            <div key={a.path} className="jrn-chip">
              {a.type === 'image' && a.url
                ? // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.url} alt="" className="jrn-chip-thumb" />
                : <span className="jrn-chip-icon">
                    {a.type === 'voice' ? <MicIcon /> : a.type === 'image' ? <ImageIcon /> : <DocIcon />}
                  </span>
              }
              <span className="jrn-chip-name" title={a.name}>{a.name}</span>
              <span className="jrn-chip-size">{formatBytes(a.size)}</span>
              <button
                type="button"
                className="jrn-chip-close"
                onClick={() => removeAttachment(a.path)}
                aria-label="Remove attachment"
              >
                <CloseSmIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      {recording && (
        <VoiceRecorder
          onCancel={() => setRecording(false)}
          onRecorded={(a) => {
            setAttachments(prev => [...prev, a]);
            setRecording(false);
          }}
        />
      )}

      {pendingUpload && !recording && (
        <div className="jrn-comp-pending jrn-label">Uploading…</div>
      )}

      {error && <div className="jrn-comp-error">{error}</div>}

      <div className="jrn-comp-toolbar">
        {linkOpen ? (
          <div className="jrn-comp-linkbar">
            <input
              type="url"
              autoFocus
              value={linkUrl}
              onChange={ev => setLinkUrl(ev.target.value)}
              placeholder="https://"
              onKeyDown={ev => {
                if (ev.key === 'Enter') { ev.preventDefault(); applyLink(); }
                if (ev.key === 'Escape') { ev.preventDefault(); setLinkOpen(false); }
              }}
            />
            <button type="button" className="jrn-comp-tbtn jrn-label" onClick={applyLink}>OK</button>
            <button type="button" className="jrn-comp-tbtn jrn-label" onClick={() => setLinkOpen(false)}>Cancel</button>
          </div>
        ) : (
          <>
            <button
              type="button"
              className={`jrn-comp-tbtn${editor?.isActive('bold') ? ' active' : ''}`}
              onClick={() => editor?.chain().focus().toggleBold().run()}
              aria-label="Bold"
              aria-pressed={!!editor?.isActive('bold')}
            >
              <span style={{ fontWeight: 700 }}>B</span>
            </button>
            <button
              type="button"
              className={`jrn-comp-tbtn${editor?.isActive('italic') ? ' active' : ''}`}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              aria-label="Italic"
              aria-pressed={!!editor?.isActive('italic')}
            >
              <span style={{ fontStyle: 'italic' }}>I</span>
            </button>
            <button
              type="button"
              className={`jrn-comp-tbtn${editor?.isActive('underline') ? ' active' : ''}`}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              aria-label="Underline"
              aria-pressed={!!editor?.isActive('underline')}
            >
              <span style={{ textDecoration: 'underline' }}>U</span>
            </button>
            <button
              type="button"
              className={`jrn-comp-tbtn${isLinkActive ? ' active' : ''}`}
              onClick={openLinkPrompt}
              aria-label="Link"
              aria-pressed={isLinkActive}
            >
              <LinkIcon />
            </button>
          </>
        )}
      </div>

      <div className="jrn-comp-body">
        {!editor ? (
          <div className="jrn-comp-skeleton" aria-hidden="true" />
        ) : (
          <>
            {isEmpty && (
              <div className="jrn-comp-placeholder" aria-hidden="true">{placeholder}</div>
            )}
            <EditorContent editor={editor} className="jrn-comp-edit" />
          </>
        )}
      </div>

      <div className="jrn-comp-actions">
        <div className="jrn-comp-attach-wrap">
          <button
            type="button"
            className="jrn-icon"
            aria-label="Attach"
            aria-expanded={attachMenuOpen}
            onClick={() => setAttachMenuOpen(o => !o)}
            disabled={busy}
          >
            <PaperclipIcon />
          </button>
          {attachMenuOpen && (
            <div className="jrn-comp-attach-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="jrn-comp-attach-opt jrn-label"
                onClick={() => { setAttachMenuOpen(false); imageInputRef.current?.click(); }}
              >
                <ImageIcon /><span>Image</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="jrn-comp-attach-opt jrn-label"
                onClick={() => { setAttachMenuOpen(false); setRecording(true); }}
              >
                <MicIcon /><span>Voice note</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="jrn-comp-attach-opt jrn-label"
                onClick={() => { setAttachMenuOpen(false); docInputRef.current?.click(); }}
              >
                <DocIcon /><span>Document</span>
              </button>
            </div>
          )}
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={ev => {
            const f = ev.target.files?.[0];
            if (f) uploadFile(f, 'image');
            ev.target.value = '';
          }}
        />
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,application/pdf"
          hidden
          onChange={ev => {
            const f = ev.target.files?.[0];
            if (f) uploadFile(f, 'document');
            ev.target.value = '';
          }}
        />

        {variant === 'edit' && onCancel && (
          <button
            type="button"
            className="jrn-comp-cancel jrn-label"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
        )}

        <button
          type="button"
          className="jrn-submit"
          aria-label={variant === 'edit' ? 'Save' : 'Add entry'}
          onClick={handleSubmit}
          disabled={busy}
        >
          {submitText
            ? <span className="jrn-label">{busy ? '…' : submitText}</span>
            : <PlusIcon />
          }
        </button>
      </div>
    </div>
  );
}
