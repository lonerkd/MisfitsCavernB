'use client';

import React, { useCallback, useState } from 'react';
import { Link2 } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import type { LiveRows, Media } from '@/lib/studio';
import { Modal, ErrorBar } from '../ui';
import { MediaFilters, MediaGrid, GridSkeleton, useMediaFilters } from './MediaGrid';
import { AddLinkForm, UploadButton, UploadQueue } from './AddMedia';
import { useUploader } from './useUploader';
import s from '../studio.module.css';

/**
 * Choose library items (or add new ones on the spot) — used to attach
 * references to a scene from the Studio and from the editor. New uploads and
 * links are selected automatically.
 */
export function MediaPicker({
  title,
  projectId,
  userId,
  media,
  excludeIds,
  confirmLabel = 'Link',
  onPick,
  onClose,
}: {
  title: string;
  projectId: string;
  userId: string;
  media: LiveRows<Media>;
  excludeIds?: Set<string>;
  confirmLabel?: string;
  onPick: (ids: string[]) => Promise<void> | void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const available = media.rows.filter((m) => !excludeIds?.has(m.id));
  const f = useMediaFilters(available);

  const added = useCallback((m: Media) => {
    media.upsertLocal(m);
    setSelected((prev) => new Set(prev).add(m.id));
  }, [media]);
  const uploader = useUploader(projectId, userId, added);

  const toggle = (m: Media) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(m.id)) next.delete(m.id); else next.add(m.id);
    return next;
  });

  const confirm = async () => {
    if (!selected.size || busy) return;
    setBusy(true);
    try {
      await onPick(Array.from(selected));
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      actions={
        <>
          <UploadButton primary={false} onFiles={(files) => void uploader.add(files)} />
          <button type="button" className={s.btn} onClick={() => setAdding((a) => !a)}><Link2 size={12} /> Add link</button>
          <button type="button" className={s.btnPrimary} disabled={!selected.size || busy || uploader.busy} onClick={confirm}>
            {busy ? 'Linking…' : `${confirmLabel}${selected.size ? ` ${selected.size}` : ''}`}
          </button>
        </>
      }
    >
      {adding && <AddLinkForm projectId={projectId} userId={userId} onAdded={added} onCancel={() => setAdding(false)} />}
      <UploadQueue queue={uploader.queue} onRetry={uploader.retry} onDismiss={uploader.dismiss} />
      {media.status === 'error' && <ErrorBar message={media.error ?? 'Could not load the library'} onRetry={() => void media.reload()} />}
      {media.status === 'loading' ? (
        <GridSkeleton count={6} />
      ) : available.length === 0 ? (
        <EmptyState
          icon={<Link2 size={26} />}
          title={media.rows.length ? 'Everything in the library is already linked here' : 'The library is empty'}
          subtitle="Upload photos, clips, audio or PDFs, or paste a link — they land in the project library and get linked here."
        />
      ) : (
        <>
          <MediaFilters f={f} />
          <MediaGrid items={f.filtered} onOpen={toggle} selected={selected} />
        </>
      )}
    </Modal>
  );
}
