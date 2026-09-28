'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Globe, Trash2, X } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { studio, useSignedUrls, mediaSrc, type Media } from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { Modal, Toggle, cx } from '../ui';
import { MediaViewer } from './MediaViewer';
import { kindLabel } from './MediaThumb';
import s from '../studio.module.css';

function formatBytes(n: number | null) {
  if (!n) return null;
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Everything about one library item: preview, details, scene links, publishing. */
export function MediaDetail({ mediaId, onClose }: { mediaId: string; onClose: () => void }) {
  const { project, userId, isOwner, media, links, scenes, mediaById, scenesByMedia } = useStudio();
  const { toast } = useToast();
  const confirm = useConfirm();
  const item = mediaById.get(mediaId);
  const signed = useSignedUrls([item?.storage_path]);

  const [title, setTitle] = useState(item?.title ?? '');
  const [board, setBoard] = useState(item?.board ?? '');
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [linkTo, setLinkTo] = useState('');

  // Follow live edits from teammates unless this field is being edited here.
  useEffect(() => { if (item && document.activeElement?.getAttribute('name') !== 'title') setTitle(item.title); }, [item?.title]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (item && document.activeElement?.getAttribute('name') !== 'board') setBoard(item.board ?? ''); }, [item?.board]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (item && document.activeElement?.getAttribute('name') !== 'notes') setNotes(item.notes ?? ''); }, [item?.notes]); // eslint-disable-line react-hooks/exhaustive-deps

  const boards = useMemo(() => Array.from(new Set(media.rows.map((m) => m.board).filter(Boolean) as string[])).sort(), [media.rows]);
  const linkedSceneIds = scenesByMedia.get(mediaId) ?? [];
  const sceneById = useMemo(() => new Map(scenes.rows.map((sc) => [sc.id, sc])), [scenes.rows]);
  const linkable = scenes.rows.filter((sc) => !linkedSceneIds.includes(sc.id));

  if (!item) {
    return (
      <Modal title="Item removed" onClose={onClose} narrow>
        <p className={s.hint}>This item was deleted — possibly by a teammate.</p>
      </Modal>
    );
  }

  const save = async (patch: Partial<Pick<Media, 'title' | 'notes' | 'board' | 'shared'>>) => {
    setSaving(true);
    try {
      media.upsertLocal(await studio.updateMedia(item.id, patch));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save', 'error');
      setTitle(item.title); setBoard(item.board ?? ''); setNotes(item.notes ?? '');
    } finally {
      setSaving(false);
    }
  };

  const link = async (sceneId: string) => {
    if (!sceneId) return;
    try {
      links.upsertLocal(await studio.linkMedia(project.id, userId, sceneId, item.id));
      setLinkTo('');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not link', 'error');
    }
  };

  const unlink = async (sceneId: string) => {
    try {
      await studio.unlinkMedia(sceneId, item.id);
      links.removeLocal(`${sceneId}:${item.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not unlink', 'error');
    }
  };

  const canDelete = isOwner || item.created_by === userId;
  const remove = async () => {
    const n = linkedSceneIds.length;
    const ok = await confirm({
      title: 'Delete from library?',
      message: n ? `“${item.title || 'Untitled'}” is linked to ${n} scene${n === 1 ? '' : 's'}; those links go too. This can’t be undone.` : `“${item.title || 'Untitled'}” will be removed for everyone on the project. This can’t be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await studio.deleteMedia(item);
      media.removeLocal(item.id);
      toast('Deleted', 'success');
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete', 'error');
    }
  };

  const src = mediaSrc(item, signed);
  const details = [kindLabel(item.kind), formatBytes(item.size_bytes), item.width && item.height ? `${item.width}×${item.height}` : null, item.duration_seconds ? `${Math.round(item.duration_seconds)}s` : null].filter(Boolean).join(' · ');

  return (
    <Modal
      title={item.title || 'Untitled'}
      onClose={onClose}
      actions={
        <>
          {saving && <span className={cx(s.hint)} aria-live="polite">Saving…</span>}
          {src && (
            <a className={cx(s.btn, s.small)} href={src} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={12} /> Open original
            </a>
          )}
        </>
      }
    >
      <div className={s.detail}>
        <div className={s.stack}>
          <MediaViewer media={item} src={src} />
          <div className={s.hint}>{details}</div>
        </div>

        <div className={s.stack}>
          <label className={s.field}>
            <span className={s.label}>Title</span>
            <input name="title" className={s.input} value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} onBlur={() => { if (title.trim() !== item.title) void save({ title }); }} />
          </label>
          <label className={s.field}>
            <span className={s.label}>Board</span>
            <input name="board" className={s.input} value={board} maxLength={60} placeholder="e.g. Lighting, Wardrobe, Locations" list="studio-boards" onChange={(e) => setBoard(e.target.value)} onBlur={() => { if ((board.trim() || null) !== item.board) void save({ board }); }} />
            <datalist id="studio-boards">{boards.map((b) => <option key={b} value={b} />)}</datalist>
          </label>
          <label className={s.field}>
            <span className={s.label}>Notes · team only</span>
            <textarea name="notes" className={s.textarea} value={notes} maxLength={5000} placeholder="Why this reference — what to take from it" onChange={(e) => setNotes(e.target.value)} onBlur={() => { if ((notes || null) !== (item.notes || null)) void save({ notes: notes || null }); }} />
          </label>

          <div className={s.divider} />

          <div>
            <span className={s.label}>Linked scenes</span>
            <div className={s.linkedList}>
              {linkedSceneIds.length === 0 && <span className={s.hint}>Not linked to any scene yet.</span>}
              {linkedSceneIds.map((sid) => {
                const sc = sceneById.get(sid);
                return (
                  <div key={sid} className={s.linkedItem}>
                    <span>{sc ? `${sc.scene_number}. ${sc.heading ?? sc.title}` : 'A scene in another script'}</span>
                    <button type="button" className={s.iconBtn} onClick={() => unlink(sid)} aria-label="Unlink from scene"><X size={13} /></button>
                  </div>
                );
              })}
            </div>
            {linkable.length > 0 && (
              <div className={s.row} style={{ marginTop: 8 }}>
                <select className={s.select} value={linkTo} onChange={(e) => { setLinkTo(e.target.value); void link(e.target.value); }} aria-label="Link to a scene">
                  <option value="">Link to a scene…</option>
                  {linkable.map((sc) => <option key={sc.id} value={sc.id}>{sc.scene_number}. {sc.heading ?? sc.title}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className={s.divider} />

          <div className={s.row} style={{ justifyContent: 'space-between' }}>
            <div>
              <div className={s.optionName}><Globe size={13} /> Include in share link</div>
              <div className={s.hint}>{isOwner ? 'Viewers of your share link see this item (never the notes).' : 'Only the project owner decides what is shared.'}</div>
            </div>
            <Toggle on={item.shared} disabled={!isOwner} label="Include in share link" onChange={(next) => void save({ shared: next })} />
          </div>

          {canDelete && (
            <>
              <div className={s.divider} />
              <button type="button" className={s.btnDanger} onClick={remove}><Trash2 size={12} /> Delete from library</button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
