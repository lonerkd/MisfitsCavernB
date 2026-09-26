'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Clapperboard, PenLine, Plus, RefreshCw, X } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { CARD_COLORS } from '@/lib/scriptos/sceneVisuals';
import { studio, useSignedUrls, mediaSrc, type Media, type SceneRow } from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { SectionHeader, StatusPill, ErrorBar, cx } from '../ui';
import { MediaThumbVisual } from '../media/MediaThumb';
import { MediaDetail } from '../media/MediaDetail';
import { MediaPicker } from '../media/MediaPicker';
import s from '../studio.module.css';

/**
 * The screenplay's scenes, each with its visual references, note and colour.
 * The list follows the script automatically; references and notes stay with a
 * scene through rewrites.
 */
export function ScenesTab() {
  const { project, userId, scripts, scriptsStatus, scriptId, setScriptId, scenes, sceneSync, media, mediaById, mediaByScene, links } = useStudio();
  const [pickFor, setPickFor] = useState<SceneRow | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const referenced = useMemo(() => {
    const ids = new Set<string>();
    mediaByScene.forEach((list) => list.forEach((id) => ids.add(id)));
    return Array.from(ids).map((id) => mediaById.get(id)).filter(Boolean) as Media[];
  }, [mediaByScene, mediaById]);
  const signed = useSignedUrls(referenced.map((m) => (m.kind === 'image' || m.kind === 'video' ? m.storage_path : null)));

  const pill = sceneSync.state === 'syncing'
    ? <StatusPill tone="busy">Reading the script…</StatusPill>
    : sceneSync.state === 'error'
      ? <StatusPill tone="error" title={sceneSync.error ?? undefined}>Couldn’t read the script</StatusPill>
      : sceneSync.state === 'synced'
        ? <StatusPill tone="ok">In step with the script · {scenes.rows.length} scene{scenes.rows.length === 1 ? '' : 's'}</StatusPill>
        : null;

  if (scriptsStatus === 'ready' && scripts.length === 0) {
    return (
      <section>
        <SectionHeader eyebrow="Scenes" title="Scene References" />
        <EmptyState
          icon={<Clapperboard size={28} />}
          title="No screenplay in this project yet"
          subtitle="Write it in ScriptOS — every scene heading appears here automatically, ready for reference photos, clips and notes."
          action={<Link href="/editor" className={s.btnPrimary}><PenLine size={12} /> Open ScriptOS</Link>}
        />
      </section>
    );
  }

  return (
    <section aria-labelledby="scenes-title">
      <SectionHeader
        id="scenes-title"
        eyebrow="Scenes"
        title="Scene References"
        subtitle="Every scene in the screenplay, with the images, clips and notes that explain it. Rewrite freely — references stay with their scene."
        actions={
          <>
            {scripts.length > 1 && (
              <label className={s.row} style={{ gap: 6 }}>
                <span className={s.srOnly}>Script</span>
                <select className={s.select} style={{ height: 34, paddingTop: 0, paddingBottom: 0 }} value={scriptId ?? ''} onChange={(e) => setScriptId(e.target.value)}>
                  {scripts.map((sc) => <option key={sc.id} value={sc.id}>{sc.title}</option>)}
                </select>
              </label>
            )}
            {scriptId && <Link href={`/editor?script=${scriptId}`} className={s.btn}><PenLine size={12} /> Open in ScriptOS</Link>}
          </>
        }
      />

      <div className={s.toolbar}>
        <div className={s.row}>
          {pill}
          <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => void sceneSync.run()} disabled={sceneSync.state === 'syncing'}>
            <RefreshCw size={11} /> Re-read
          </button>
        </div>
      </div>

      {sceneSync.state === 'error' && <ErrorBar message={sceneSync.error ?? 'Could not read the script'} onRetry={() => void sceneSync.run()} />}
      {scenes.status === 'error' && <ErrorBar message={scenes.error ?? 'Could not load scenes'} onRetry={() => void scenes.reload()} />}

      {scenes.status === 'loading' || (scenes.rows.length === 0 && sceneSync.state === 'syncing') ? (
        <div className={s.sceneList} aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14 }} />)}
        </div>
      ) : scenes.rows.length === 0 ? (
        <EmptyState
          icon={<Clapperboard size={28} />}
          title="This script has no scene headings yet"
          subtitle="Scenes start with INT. or EXT. — add one in ScriptOS and it shows up here."
        />
      ) : (
        <div className={s.sceneList}>
          {scenes.rows.map((sc) => (
            <SceneCard
              key={sc.id}
              scene={sc}
              refs={(mediaByScene.get(sc.id) ?? []).map((id) => mediaById.get(id)).filter(Boolean) as Media[]}
              signed={signed}
              onOpen={setOpenId}
              onAdd={() => setPickFor(sc)}
            />
          ))}
        </div>
      )}

      {pickFor && (
        <MediaPicker
          title={`References for ${pickFor.scene_number}. ${pickFor.heading ?? pickFor.title}`}
          projectId={project.id}
          userId={userId}
          media={media}
          excludeIds={new Set(mediaByScene.get(pickFor.id) ?? [])}
          onPick={async (ids) => {
            for (const id of ids) links.upsertLocal(await studio.linkMedia(project.id, userId, pickFor.id, id));
          }}
          onClose={() => setPickFor(null)}
        />
      )}
      {openId && <MediaDetail mediaId={openId} onClose={() => setOpenId(null)} />}
    </section>
  );
}

function SceneCard({ scene, refs, signed, onOpen, onAdd }: { scene: SceneRow; refs: Media[]; signed: Record<string, string>; onOpen: (id: string) => void; onAdd: () => void }) {
  const { scenes, links } = useStudio();
  const { toast } = useToast();
  const [note, setNote] = useState(scene.note ?? '');
  const [noteState, setNoteState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const editing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Teammates' edits arrive live; don't overwrite what's being typed here.
  useEffect(() => { if (!editing.current) setNote(scene.note ?? ''); }, [scene.note]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const update = async (patch: Partial<Pick<SceneRow, 'note' | 'color'>>) => {
    try {
      scenes.upsertLocal(await studio.updateScene(scene.id, patch));
      return true;
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save', 'error');
      return false;
    }
  };

  const saveNote = async (value: string) => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if ((value.trim() || null) === (scene.note || null)) return;
    setNoteState('saving');
    const ok = await update({ note: value.trim() || null });
    setNoteState(ok ? 'saved' : 'idle');
  };

  const unlink = async (mediaId: string) => {
    try {
      await studio.unlinkMedia(scene.id, mediaId);
      links.removeLocal(`${scene.id}:${mediaId}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not unlink', 'error');
    }
  };

  const meta = [scene.time_of_day, scene.cast_list, scene.est_duration].filter(Boolean).join(' · ');
  return (
    <article className={s.scene} aria-label={`Scene ${scene.scene_number}: ${scene.heading ?? scene.title}`}>
      <div className={s.sceneBar} style={scene.color ? { background: scene.color } : undefined} />
      <div className={s.sceneNum}>{scene.scene_number}</div>
      <div className={s.sceneMain}>
        <div className={s.sceneHead}>
          <div style={{ minWidth: 0 }}>
            <div className={s.sceneHeading}>{scene.heading ?? scene.title}</div>
            {meta && <div className={s.sceneMeta}>{meta}</div>}
          </div>
          <div className={s.swatches} role="group" aria-label="Scene colour">
            {CARD_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={cx(s.swatch, scene.color === c && s.swatchOn)}
                style={{ background: c }}
                aria-label={`Colour ${c}`}
                aria-pressed={scene.color === c}
                onClick={() => void update({ color: scene.color === c ? null : c })}
              />
            ))}
          </div>
        </div>

        <div className={s.refs}>
          {refs.map((m) => (
            <div key={m.id} className={s.ref}>
              <button type="button" className={s.refOpen} onClick={() => onOpen(m.id)} aria-label={`Open ${m.title || 'reference'}`} title={m.title}>
                <MediaThumbVisual media={m} src={mediaSrc(m, signed)} />
              </button>
              <button type="button" className={s.refRemove} onClick={() => void unlink(m.id)} aria-label={`Unlink ${m.title || 'reference'}`}><X size={10} /></button>
            </div>
          ))}
          <button type="button" className={s.addRef} onClick={onAdd}>
            <Plus size={14} /> Reference
          </button>
        </div>

        <label>
          <span className={s.srOnly}>Scene note</span>
          <textarea
            className={cx(s.textarea, s.noteBox)}
            rows={1}
            maxLength={5000}
            placeholder="Note for this scene — intent, tone, what the references are for"
            value={note}
            onFocus={() => { editing.current = true; }}
            onChange={(e) => {
              const v = e.target.value;
              setNote(v);
              setNoteState('idle');
              if (timer.current) clearTimeout(timer.current);
              timer.current = setTimeout(() => void saveNote(v), 900);
            }}
            onBlur={(e) => { editing.current = false; void saveNote(e.target.value); }}
          />
        </label>
        {noteState !== 'idle' && <span className={s.hint} aria-live="polite">{noteState === 'saving' ? 'Saving…' : 'Saved'}</span>}
      </div>
    </article>
  );
}
