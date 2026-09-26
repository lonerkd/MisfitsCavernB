'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { studio, type SceneRow, type Shot, type ShotPatch } from '@/lib/studio';
import { useStudio } from './StudioContext';
import { cx } from './ui';
import s from './studio.module.css';

const SIZES = ['WS', 'MS', 'MCU', 'CU', 'ECU', 'OTS', 'POV', 'INS'];
const STATUSES: Shot['status'][] = ['planned', 'shot', 'omitted'];

/** A scene's shot list. Shots also arrive from "Shot" margin notes in ScriptOS. */
export function ShotList({ scene }: { scene: SceneRow }) {
  const { project, shots } = useStudio();
  const { toast } = useToast();
  const list = shots.rows.filter((x) => x.scene_id === scene.id);
  const [adding, setAdding] = useState(false);

  const add = async () => {
    setAdding(true);
    try { shots.upsertLocal(await studio.addShot(project.id, scene.id, list)); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not add the shot', 'error'); }
    finally { setAdding(false); }
  };

  return (
    <div className={s.shots} aria-label={`Shot list for scene ${scene.scene_number}`}>
      <div className={s.shotsHead}>
        <span className={s.hint}>Shots · {list.length}</span>
        <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => void add()} disabled={adding}>
          <Plus size={11} /> Shot
        </button>
      </div>
      {list.map((shot) => <ShotRow key={shot.id} shot={shot} sceneNumber={scene.scene_number} />)}
    </div>
  );
}

function ShotRow({ shot, sceneNumber }: { shot: Shot; sceneNumber: number }) {
  const { shots } = useStudio();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [desc, setDesc] = useState(shot.description ?? '');
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

  const status = (shot.status ?? 'planned') as NonNullable<Shot['status']>;
  const nextStatus = STATUSES[(STATUSES.indexOf(status) + 1) % STATUSES.length]!;
  return (
    <div className={cx(s.shotRow, status === 'omitted' && s.shotOmitted)}>
      <span className={s.shotNum}>{sceneNumber}.{shot.shot_number}</span>
      <label>
        <span className={s.srOnly}>Shot size</span>
        <select className={cx(s.select, s.shotSize)} value={shot.shot_size ?? ''} onChange={(e) => void save({ shot_size: e.target.value || null })}>
          <option value="">Size</option>
          {SIZES.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
      </label>
      <label className={s.shotDesc}>
        <span className={s.srOnly}>Shot description</span>
        <input
          className={s.input}
          value={desc}
          maxLength={2000}
          placeholder="What the shot sees"
          onFocus={() => { editing.current = true; }}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={() => { editing.current = false; if ((desc.trim() || null) !== (shot.description || null)) void save({ description: desc.trim() || null }); }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        />
      </label>
      <button
        type="button"
        className={cx(s.shotStatus, s[`shot_${status}`])}
        onClick={() => void save({ status: nextStatus })}
        title={`Mark as ${nextStatus}`}
      >
        {status}
      </button>
      <button type="button" className={s.refRemoveInline} onClick={() => void remove()} aria-label={`Delete shot ${sceneNumber}.${shot.shot_number}`}><X size={11} /></button>
    </div>
  );
}
