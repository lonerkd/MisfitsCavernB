'use client';

import React, { useMemo, useState } from 'react';
import { AudioWaveform, Plus, Trash2 } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import { SceneLinkField, useRecordTargets } from './RecordLinks';
import { sceneChip } from '@/lib/studio/record-links';
import { SPOT_KINDS, SPOT_STATUSES, spotSummary, type Spot } from '@/lib/studio/spotting';
import { useStudio } from '../StudioContext';
import { ToolHeader } from '../ToolHeader';
import { cx } from '../ui';
import s from '../studio.module.css';

const BLANK: Omit<Spot, 'id'> = { scene: '', tc: '', kind: 'effect', note: '', source: '', status: 'to spot' };

/** The sound spotting list: what the sound department must create, find or fix, scene by scene, and how far along each item is. */
export function SpottingView() {
  const { project } = useStudio();
  const { items, shown, save, remove } = useSettingsList('spotting');
  const t = useRecordTargets();
  const [draft, setDraft] = useState<Omit<Spot, 'id'>>(BLANK);
  const [filter, setFilter] = useState<'all' | Spot['status']>('all');

  const sum = useMemo(() => spotSummary(items), [items]);
  const list = useMemo(() => (filter === 'all' ? shown : shown.filter((i) => i.status === filter)), [shown, filter]);

  const add = async () => {
    if (!draft.note.trim()) return;
    if (!(await save([...items, { ...draft, id: `spot-${Date.now()}` }]))) return;
    setDraft({ ...BLANK, kind: draft.kind, scene: draft.scene, scene_ids: draft.scene_ids });
  };
  const patch = async (id: string, p: Partial<Spot>) => { await save(items.map((i) => (i.id === id ? { ...i, ...p } : i))); };

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <ToolHeader icon={<AudioWaveform size={16} />} eyebrow="Departments" title="Sound spotting" accent={project.accent_color}
        purpose="What sound must create, find or fix, scene by scene."
        summary={<>{sum.total} items · {sum.done} done{sum.scenes ? ` · ${sum.scenes} scenes` : ''}{sum.byKind.length ? ` · ${sum.byKind.map(([k, n]) => `${n} ${k}`).join(', ')}` : ''}</>}
        progress={sum.total ? { value: sum.done, of: sum.total, label: 'approved' } : null} />

      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <SceneLinkField scenes={t.scenes} sceneById={t.sceneById} ids={draft.scene_ids ?? []} text={draft.scene} onChange={(n) => setDraft({ ...draft, scene: n.text, scene_ids: n.ids })} placeholder="12" />
          <label className={s.field} style={{ flex: '0 0 90px' }}><span className={s.label}>Time</span>
            <input className={s.input} value={draft.tc} onChange={(e) => setDraft({ ...draft, tc: e.target.value })} placeholder="0:42" /></label>
          <label className={s.field} style={{ flex: '0 0 140px' }}><span className={s.label}>Type</span>
            <select className={s.select} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Spot['kind'] })}>
              {SPOT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
          <label className={s.field} style={{ flex: '1 1 240px' }}><span className={s.label}>What is needed</span>
            <input className={s.input} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="Rain on a tin roof, building" /></label>
          <label className={s.field} style={{ flex: '1 1 140px' }}><span className={s.label}>Source</span>
            <input className={s.input} value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} placeholder="Library, record, Foley" /></label>
          <button className={s.btnPrimary} onClick={() => void add()} disabled={!draft.note.trim()}><Plus size={12} /> Add</button>
        </div>
      </div>

      {items.length > 0 && (
        <div className={s.chips} role="group" aria-label="Status">
          {(['all', ...SPOT_STATUSES] as const).map((st) => (
            <button key={st} type="button" className={cx(s.chip, filter === st && s.chipOn)} onClick={() => setFilter(st)}>{st}</button>
          ))}
        </div>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {list.map((i) => (
          <li key={i.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {sceneChip(i, t.sceneById) && <span className={s.chip}>Sc {sceneChip(i, t.sceneById)}</span>}
              {i.tc && <span className={s.hint}>{i.tc}</span>}
              <span className={s.chip}>{i.kind}</span>
              <span style={{ flex: '1 1 220px' }}>{i.note}</span>
              {i.source && <span className={s.hint}>{i.source}</span>}
              <select className={s.select} style={{ width: 120 }} aria-label={`Status of ${i.note}`} value={i.status} onChange={(e) => void patch(i.id, { status: e.target.value as Spot['status'] })}>
                {SPOT_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}</select>
              <button className={s.btn} onClick={() => remove(i.id)} aria-label={`Delete ${i.note}`}><Trash2 size={12} /></button>
            </div>
          </li>
        ))}
      </ul>
      {items.length > 0 && shown.length === 0 && <p className={s.hint}>No records match your search.</p>}
    </div>
  );
}
