'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Link2, RotateCw, Upload, X } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { ACCEPTED_UPLOAD_TYPES, studio, type Media } from '@/lib/studio';
import { lookupLink } from '@/lib/integrations/lookup';
import type { Pin } from '@/lib/integrations/links';
import type { UploadItem } from './useUploader';
import { cx } from '../ui';
import s from '../studio.module.css';

/** "Upload" button backed by a hidden file input. */
export function UploadButton({ onFiles, primary = true, label = 'Upload' }: { onFiles: (files: File[]) => void; primary?: boolean; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className={primary ? s.btnPrimary : s.btn} onClick={() => input.current?.click()}>
        <Upload size={12} /> {label}
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPTED_UPLOAD_TYPES}
        hidden
        onChange={(e) => { if (e.target.files?.length) onFiles(Array.from(e.target.files)); e.target.value = ''; }}
      />
    </>
  );
}

/**
 * Paste a web address into the library. A YouTube or Vimeo video comes in
 * under its real title (and channel); a public Pinterest board offers to
 * bring in its pins; anything else (an image, a pin, a page) as it is.
 */
export function AddLinkForm({ projectId, userId, board, onAdded, onCancel }: { projectId: string; userId: string; board?: string | null; onAdded: (m: Media) => void; onCancel: () => void }) {
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinboard, setPinboard] = useState<{ board: string | null; pins: Pin[] } | null>(null);

  const done = (message: string) => {
    toast(message, 'success');
    setUrl('');
    setPinboard(null);
    onCancel();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const found = await lookupLink(url);
      if (found.type === 'board') {
        if (!found.pins.length) throw new Error(found.error ?? 'That board has no pins we can see — is it public?');
        setPinboard({ board: found.board, pins: found.pins });
        return;
      }
      const details = found.type === 'video' ? found.details : null;
      const m = await studio.addLink(projectId, userId, { url, board, title: details?.title, notes: details?.author ? `By ${details.author}` : null });
      onAdded(m);
      done('Added to the library');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the link');
    } finally {
      setBusy(false);
    }
  };

  const addPins = async () => {
    if (!pinboard || busy) return;
    setBusy(true);
    setError(null);
    try {
      const added = await studio.addPins(projectId, userId, pinboard.pins, board || pinboard.board);
      added.forEach(onAdded);
      done(`${added.length} pin${added.length === 1 ? '' : 's'} added`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the pins');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className={s.panel} style={{ marginBottom: 18, padding: 14 }}>
      <div className={s.row}>
        <Link2 size={14} className={s.dim} aria-hidden />
        <label className={s.srOnly} htmlFor="studio-add-link">Web address</label>
        <input id="studio-add-link" data-autofocus autoFocus className={s.input} type="url" inputMode="url" placeholder="Paste a link — YouTube, Vimeo, an image, a Pinterest board…" value={url} onChange={(e) => { setUrl(e.target.value); setPinboard(null); }} />
        <button type="submit" className={s.btnPrimary} disabled={busy || !url.trim() || !!pinboard}>{busy && !pinboard ? 'Adding…' : 'Add'}</button>
        <button type="button" className={s.btnGhost} onClick={onCancel}>Cancel</button>
      </div>
      {pinboard && (
        <div className={s.row} style={{ marginTop: 10, justifyContent: 'space-between', flexWrap: 'wrap' }} role="status">
          <span className={s.hint}>
            Pinterest board{pinboard.board ? ` “${pinboard.board}”` : ''} · its latest {pinboard.pins.length} pin{pinboard.pins.length === 1 ? '' : 's'}, onto the board “{board || pinboard.board || 'Pinterest'}”.
          </span>
          <button type="button" className={s.btnPrimary} disabled={busy} onClick={addPins}>{busy ? 'Adding…' : `Add ${pinboard.pins.length} pin${pinboard.pins.length === 1 ? '' : 's'}`}</button>
        </div>
      )}
      {error && <div className={cx(s.hint, s.queueError)} style={{ marginTop: 8 }} role="alert">{error}</div>}
    </form>
  );
}

export function UploadQueue({ queue, onRetry, onDismiss }: { queue: UploadItem[]; onRetry: (key: string) => void; onDismiss: (key: string) => void }) {
  if (!queue.length) return null;
  return (
    <div className={s.queue} aria-live="polite">
      {queue.map((item) => (
        <div key={item.key} className={s.queueRow}>
          {item.state === 'uploading' ? <span className={s.spinner} aria-hidden /> : <AlertCircle size={14} className={s.queueError} aria-hidden />}
          <span className={s.queueName}>{item.name}</span>
          {item.state === 'uploading' ? (
            <span>Uploading…</span>
          ) : (
            <>
              <span className={s.queueError}>{item.error}</span>
              <button type="button" className={s.iconBtn} onClick={() => onRetry(item.key)} aria-label={`Retry ${item.name}`}><RotateCw size={13} /></button>
              <button type="button" className={s.iconBtn} onClick={() => onDismiss(item.key)} aria-label={`Dismiss ${item.name}`}><X size={13} /></button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/** Full-window drop target while files are dragged over the page. */
export function useFileDrop(onFiles: (files: File[]) => void, enabled = true) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const cb = useRef(onFiles);
  cb.current = onFiles;
  useEffect(() => {
    if (!enabled) return;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const enter = (e: DragEvent) => { if (!hasFiles(e)) return; e.preventDefault(); depth.current++; setOver(true); };
    const leave = (e: DragEvent) => { if (!hasFiles(e)) return; depth.current = Math.max(0, depth.current - 1); if (!depth.current) setOver(false); };
    const overFn = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current = 0;
      setOver(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length) cb.current(files);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', overFn);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', overFn);
      window.removeEventListener('drop', drop);
    };
  }, [enabled]);
  return over;
}

export function DropOverlay({ label }: { label: string }) {
  return (
    <div className={s.dropOverlay} aria-hidden>
      <div className={s.dropInner}><Upload size={22} style={{ marginBottom: 10 }} /><div>{label}</div></div>
    </div>
  );
}
