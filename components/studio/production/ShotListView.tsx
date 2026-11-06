'use client';

import React, { useMemo, useState } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import { Camera, Check, Filter, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { studio, type SceneRow, type Shot } from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';

const STATUSES = ['planned', 'shot', 'omitted'] as const;

/**
 * A production's shot list: every shot across every scene, filterable by
 * status and scene, with inline status changes. The per-scene ShotDesigner
 * is where shots are planned; this is the master list the crew works from.
 */
export function ShotListView() {
  const { project, scenes, shots } = useStudio();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sceneFilter, setSceneFilter] = useState<string>('all');

  const sceneById = useMemo(() => new Map(scenes.rows.map((sc) => [sc.id, sc])), [scenes.rows]);

  const filtered = useMemo(() => {
    let list = [...shots.rows].sort((a, b) => {
      const sa = sceneById.get(a.scene_id)?.scene_number ?? 0;
      const sb = sceneById.get(b.scene_id)?.scene_number ?? 0;
      if (sa !== sb) return sa - sb;
      return (a.order_index ?? 0) - (b.order_index ?? 0) || a.shot_number.localeCompare(b.shot_number, undefined, { numeric: true });
    });
    if (statusFilter !== 'all') list = list.filter((sh) => sh.status === statusFilter);
    if (sceneFilter !== 'all') list = list.filter((sh) => sh.scene_id === sceneFilter);
    return list;
  }, [shots.rows, sceneById, statusFilter, sceneFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { planned: 0, shot: 0, omitted: 0 };
    for (const sh of shots.rows) c[sh.status ?? 'planned'] = (c[sh.status ?? 'planned'] ?? 0) + 1;
    return c;
  }, [shots.rows]);

  const setStatus = async (sh: Shot, next: 'planned' | 'shot' | 'omitted') => {
    shots.upsertLocal({ ...sh, status: next });
    try { await studio.updateShot(sh.id, { status: next }); }
    catch (e) { shots.upsertLocal(sh); toast(e instanceof Error ? e.message : 'Could not update', 'error'); }
  };

  if (shots.rows.length === 0) {
    return (
      <EmptyState icon={<Camera size={26} />} title="No shots yet"
        subtitle="Plan shots in the Scenes tab (open a scene, then its ShotDesigner). They collect here." />
    );
  }

  return (
    <div className={s.stack}>
      <div className={s.toolbar}>
        <div className={s.panelTitle}>Shot list</div>
        <span className={s.hint}>{shots.rows.length} shot{shots.rows.length === 1 ? '' : 's'} · {counts.shot} shot · {counts.planned} planned · {counts.omitted} omitted</span>
      </div>

      <div className={s.chips} role="tablist" aria-label="Filter by status">
        <button type="button" role="tab" aria-selected={statusFilter === 'all'} className={cx(s.chip, statusFilter === 'all' && s.chipOn)} onClick={() => setStatusFilter('all')}>All</button>
        {STATUSES.map((st) => (
          <button key={st} type="button" role="tab" aria-selected={statusFilter === st} className={cx(s.chip, statusFilter === st && s.chipOn)} onClick={() => setStatusFilter(st)}>
            {st} ({counts[st] ?? 0})
          </button>
        ))}
      </div>

      <label className={s.stack}>
        <span className={s.hint}>Scene</span>
        <select className={s.select} value={sceneFilter} onChange={(e) => setSceneFilter(e.target.value)}>
          <option value="all">All scenes</option>
          {scenes.rows.sort((a, b) => a.scene_number - b.scene_number).map((sc) => (
            <option key={sc.id} value={sc.id}>{sc.scene_number}. {sc.heading ?? sc.title}</option>
          ))}
        </select>
      </label>

      <div className={s.stack} style={{ gap: 6 }}>
        {filtered.map((sh) => {
          const sc = sceneById.get(sh.scene_id);
          return (
            <div key={sh.id} className={s.row} style={{ alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, minWidth: 40 }}>{sh.shot_number}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span className={s.hint}>Sc {sc?.scene_number ?? '?'}</span>
                  {sh.shot_size && <span className={s.hint}>{sh.shot_size}</span>}
                  {sh.angle && <span className={s.hint}>{sh.angle}</span>}
                  {sh.movement && sh.movement !== 'static' && <span className={s.hint}>{sh.movement}</span>}
                  {sh.lens && <span className={s.hint}>{sh.lens}</span>}
                </div>
                {sh.description && <div style={{ fontSize: 13, marginTop: 2 }}>{sh.description}</div>}
              </div>
              <div className={s.chips} role="group" aria-label={`Status for shot ${sh.shot_number}`}>
                {STATUSES.map((st) => (
                  <button key={st} type="button" aria-pressed={sh.status === st}
                    className={cx(s.chip, sh.status === st && s.chipOn, s.small)}
                    onClick={() => void setStatus(sh, st)}>
                    {st === 'shot' && <Check size={10} aria-hidden />} {st}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className={s.hint}>No shots match these filters.</p>}
      </div>
    </div>
  );
}