'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Camera, FileText, GripVertical, ImagePlus, Plus, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { studio, mediaSrc, useSignedUrls, type Media, type SceneRow, type Shot, type ShotNote, type ShotPatch } from '@/lib/studio';
import { ANGLES, MOVEMENTS, SHOT_SIZES, describeCamera, sizeOf } from '@/lib/studio/framing';
import { useStudio } from '../StudioContext';
import { MediaPicker } from '../media/MediaPicker';
import { cx } from '../ui';
import { FramingDiagram } from './FramingDiagram';
import s from '../studio.module.css';
import d from './shots.module.css';

const STATUSES: NonNullable<Shot['status']>[] = ['planned', 'shot', 'omitted'];
const LENSES = ['18mm', '24mm', '35mm', '50mm', '85mm', '135mm'];

const byOrder = (a: Shot, b: Shot) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.shot_number.localeCompare(b.shot_number, undefined, { numeric: true });

/**
 * A scene's shots as a storyboard: each shot drawn by its framing (or its
 * storyboard frame from the library), with the camera set on a visual
 * picker. Drag cards — or use the arrows — to reorder. Shots made from a
 * "Shot" margin note show the script line they came from.
 */
export function ShotDesigner({ scene, notes }: { scene: SceneRow; notes: Map<string, ShotNote> }) {
  const { project, userId, shots, media, mediaById } = useStudio();
  const { toast } = useToast();
  const list = useMemo(() => shots.rows.filter((x) => x.scene_id === scene.id).sort(byOrder), [shots.rows, scene.id]);
  const [adding, setAdding] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [framing, setFraming] = useState<Shot | null>(null);

  const frames = list.map((x) => (x.frame_media_id ? mediaById.get(x.frame_media_id) : undefined));
  const signed = useSignedUrls(frames.map((m) => (m && m.kind === 'image' ? m.storage_path : null)));

  const add = async () => {
    setAdding(true);
    try { shots.upsertLocal(await studio.addShot(project.id, scene.id, list)); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not add the shot', 'error'); }
    finally { setAdding(false); }
  };

  const reorder = async (ids: string[]) => {
    const next = ids.map((id) => list.find((x) => x.id === id)!).filter(Boolean);
    const before = list;
    next.forEach((x, i) => shots.upsertLocal({ ...x, order_index: i }));
    // Each shot with the index it had, so only the ones that move are written.
    try { await studio.reorderShots(next.map((x) => ({ id: x.id, order_index: x.order_index }))); }
    catch (e) { before.forEach((x) => shots.upsertLocal(x)); toast(e instanceof Error ? e.message : 'Could not reorder', 'error'); }
  };
  const move = (id: string, by: number) => {
    const ids = list.map((x) => x.id);
    const i = ids.indexOf(id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    void reorder(ids);
  };

  return (
    <div className={d.wrap} aria-label={`Shots for scene ${scene.scene_number}`}>
      <div className={s.shotsHead}>
        <span className={s.hint}>Shots · {list.length}</span>
        <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => void add()} disabled={adding}>
          <Plus size={11} aria-hidden /> Shot
        </button>
      </div>
      {list.length > 0 && (
        <ol className={d.board}>
          {list.map((shot, i) => (
            <li
              key={shot.id}
              className={cx(d.cardWrap, dragId === shot.id && d.dragging)}
              draggable
              onDragStart={(e) => { setDragId(shot.id); e.dataTransfer.effectAllowed = 'move'; }}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => { if (dragId && dragId !== shot.id) e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                if (!dragId || dragId === shot.id) return;
                const ids = list.map((x) => x.id).filter((id) => id !== dragId);
                ids.splice(ids.indexOf(shot.id), 0, dragId);
                setDragId(null);
                void reorder(ids);
              }}
            >
              <ShotCard
                shot={shot}
                sceneNumber={scene.scene_number}
                frame={frames[i]}
                frameSrc={frames[i] ? mediaSrc(frames[i]!, signed) : null}
                note={notes.get(shot.id) ?? null}
                scene={scene}
                first={i === 0}
                last={i === list.length - 1}
                onMove={(by) => move(shot.id, by)}
                onPickFrame={() => setFraming(shot)}
              />
            </li>
          ))}
        </ol>
      )}
      {framing && (
        <MediaPicker
          title={`Storyboard frame for shot ${scene.scene_number}.${framing.shot_number}`}
          projectId={project.id}
          userId={userId}
          media={{ ...media, rows: media.rows.filter((m) => m.kind === 'image') }}
          confirmLabel="Use as frame"
          onPick={async (ids) => {
            const id = ids[0];
            if (!id) return;
            try { shots.upsertLocal(await studio.updateShot(framing.id, { frame_media_id: id })); }
            catch (e) { toast(e instanceof Error ? e.message : 'Could not set the frame', 'error'); }
          }}
          onClose={() => setFraming(null)}
        />
      )}
    </div>
  );
}

function ShotCard({ shot, sceneNumber, frame, frameSrc, note, scene, first, last, onMove, onPickFrame }: {
  shot: Shot;
  sceneNumber: number;
  frame: Media | undefined;
  frameSrc: string | null;
  note: ShotNote | null;
  scene: SceneRow;
  first: boolean;
  last: boolean;
  onMove: (by: number) => void;
  onPickFrame: () => void;
}) {
  const { shots, openInScript } = useStudio();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [desc, setDesc] = useState(shot.description ?? '');
  const [camera, setCamera] = useState(false);
  const editing = useRef(false);
  useEffect(() => { if (!editing.current) setDesc(shot.description ?? ''); }, [shot.description]);

  const save = async (patch: ShotPatch) => {
    const before = shot;
    shots.upsertLocal({ ...shot, ...patch });
    try { shots.upsertLocal(await studio.updateShot(shot.id, patch)); }
    catch (e) { shots.upsertLocal(before); toast(e instanceof Error ? e.message : 'Could not save the shot', 'error'); }
  };
  const remove = async () => {
    if (!await confirm(`Delete shot ${sceneNumber}.${shot.shot_number}?`)) return;
    shots.removeLocal(shot.id);
    try { await studio.deleteShot(shot.id); }
    catch (e) { shots.upsertLocal(shot); toast(e instanceof Error ? e.message : 'Could not delete the shot', 'error'); }
  };

  const label = `${sceneNumber}.${shot.shot_number}`;
  const status = (shot.status ?? 'planned') as NonNullable<Shot['status']>;
  const nextStatus = STATUSES[(STATUSES.indexOf(status) + 1) % STATUSES.length]!;
  const cameraLine = describeCamera(shot);
  const size = sizeOf(shot.shot_size);

  return (
    <article className={cx(d.card, status === 'omitted' && d.omitted)} aria-label={`Shot ${label}`}>
      <div className={d.frame}>
        {frameSrc && frame
          // eslint-disable-next-line @next/next/no-img-element -- signed storage URLs of unknown dimensions
          ? <img src={frameSrc} alt={`Storyboard frame for shot ${label}${frame.title ? `: ${frame.title}` : ''}`} className={d.frameImg} />
          : <FramingDiagram size={shot.shot_size} angle={shot.angle} className={d.frameImg} title={size ? `${size.label} framing` : 'No framing chosen yet'} />}
        <span className={d.num}>{label}</span>
        <button type="button" className={cx(d.status, d[`status_${status}`])} onClick={() => void save({ status: nextStatus })} title={`Mark as ${nextStatus}`}>
          {status}<span className="sr-only"> — mark as {nextStatus}</span>
        </button>
        <span className={d.grip} aria-hidden><GripVertical size={12} /></span>
      </div>

      <button type="button" className={d.camera} onClick={() => setCamera(true)} aria-haspopup="dialog" aria-label={`Camera for shot ${label}: ${cameraLine || 'not set'}`}>
        <Camera size={11} aria-hidden /> {cameraLine || 'Set the camera'}
      </button>

      <label className={d.descLabel}>
        <span className="sr-only">What shot {label} sees</span>
        <textarea
          className={d.desc}
          rows={2}
          value={desc}
          maxLength={2000}
          placeholder="What the shot sees"
          onFocus={() => { editing.current = true; }}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={() => { editing.current = false; if ((desc.trim() || null) !== (shot.description || null)) void save({ description: desc.trim() || null }); }}
        />
      </label>

      {note && (
        <button type="button" className={d.fromScript} onClick={() => openInScript(scene)} title="Open this scene in the script">
          <FileText size={10} aria-hidden /> From the script: “{note.text.length > 60 ? `${note.text.slice(0, 60)}…` : note.text}”
        </button>
      )}

      <div className={d.actions}>
        <button type="button" className={d.icon} onClick={onPickFrame} aria-label={shot.frame_media_id ? `Change the frame of shot ${label}` : `Add a storyboard frame to shot ${label}`} title="Storyboard frame">
          <ImagePlus size={13} aria-hidden />
        </button>
        {shot.frame_media_id && (
          <button type="button" className={d.textBtn} onClick={() => void save({ frame_media_id: null })}>Use framing</button>
        )}
        <span className={d.spacer} />
        <button type="button" className={d.icon} onClick={() => onMove(-1)} disabled={first} aria-label={`Move shot ${label} earlier`}><ArrowLeft size={13} aria-hidden /></button>
        <button type="button" className={d.icon} onClick={() => onMove(1)} disabled={last} aria-label={`Move shot ${label} later`}><ArrowRight size={13} aria-hidden /></button>
        <button type="button" className={d.icon} onClick={() => void remove()} aria-label={`Delete shot ${label}`}><X size={13} aria-hidden /></button>
      </div>

      {camera && <CameraDialog shot={shot} label={label} onSave={save} onClose={() => setCamera(false)} />}
    </article>
  );
}

function CameraDialog({ shot, label, onSave, onClose }: { shot: Shot; label: string; onSave: (p: ShotPatch) => Promise<void>; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState(shot.lens ?? '');
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('[aria-pressed="true"], button')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus(); };
  }, [onClose]);
  const size = sizeOf(shot.shot_size);
  const saveLens = (v: string) => { const next = v.trim() || null; if (next !== (shot.lens || null)) void onSave({ lens: next }); };

  // Portalled above the Studio header and the suite taskbar.
  return createPortal(
    <div className={d.scrim} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={d.dialog} role="dialog" aria-modal="true" aria-labelledby={`cam-${shot.id}`}>
        <div className={d.dialogHead}>
          <h3 id={`cam-${shot.id}`} className={d.dialogTitle}>Camera · shot {label}</h3>
          <button type="button" className={d.icon} onClick={onClose} aria-label="Close"><X size={14} aria-hidden /></button>
        </div>

        <div className={d.section}>
          <div className={d.sectionHead}>Framing{size ? ` — ${size.label}: ${size.hint.toLowerCase()}` : ''}</div>
          <div className={d.sizes}>
            {SHOT_SIZES.map((z) => {
              const on = size?.id === z.id;
              return (
                <button key={z.id} type="button" className={cx(d.size, on && d.sizeOn)} aria-pressed={on} title={z.hint}
                  onClick={() => void onSave({ shot_size: on ? null : z.id })}>
                  <FramingDiagram size={z.id} angle={shot.angle} className={d.sizeThumb} />
                  <span className={d.sizeId}>{z.id}</span>
                  <span className={d.sizeLabel}>{z.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={d.section}>
          <div className={d.sectionHead}>Angle</div>
          <div className={d.chips}>
            {ANGLES.map((a) => (
              <button key={a.id} type="button" className={cx(d.chip, shot.angle === a.id && d.chipOn)} aria-pressed={shot.angle === a.id}
                onClick={() => void onSave({ angle: shot.angle === a.id ? null : a.id })}>{a.label}</button>
            ))}
          </div>
        </div>

        <div className={d.section}>
          <div className={d.sectionHead}>Move</div>
          <div className={d.chips}>
            {MOVEMENTS.map((m) => (
              <button key={m.id} type="button" className={cx(d.chip, shot.movement === m.id && d.chipOn)} aria-pressed={shot.movement === m.id}
                onClick={() => void onSave({ movement: shot.movement === m.id ? null : m.id })}>{m.label}</button>
            ))}
          </div>
        </div>

        <div className={d.section}>
          <label className={d.sectionHead} htmlFor={`lens-${shot.id}`}>Lens</label>
          <div className={d.chips}>
            <input id={`lens-${shot.id}`} className={d.lens} value={lens} maxLength={40} placeholder="e.g. 35mm"
              onChange={(e) => setLens(e.target.value)} onBlur={(e) => saveLens(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveLens((e.target as HTMLInputElement).value); }} />
            {LENSES.map((l) => (
              <button key={l} type="button" className={cx(d.chip, shot.lens === l && d.chipOn)} aria-pressed={shot.lens === l}
                onClick={() => { const v = shot.lens === l ? '' : l; setLens(v); void onSave({ lens: v || null }); }}>{l}</button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
