'use client';

import React, { useState } from 'react';
import { Mic, Plus, Trash2 } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import { SceneLinkField, useRecordTargets } from './RecordLinks';
import { sceneChip } from '@/lib/studio/record-links';
import s from '../studio.module.css';

type SoundEntry = { id: string; scene_ids?: string[]; character_id?: string | null; scene: string; take: string; mic: string; wildTrack: string; roomTone: string; notes: string };

export function SoundReportView() {
  const { items, save, remove } = useSettingsList('soundReports');
  const t = useRecordTargets();
  const [draft, setDraft] = useState<Omit<SoundEntry, 'id'>>({
    scene: '',
    take: '',
    mic: '',
    wildTrack: '',
    roomTone: '',
    notes: '',
  });

  const add = async () => {
    if (!draft.take.trim()) return;
    if (!(await save([...items, { ...draft, id: `snd-${Date.now()}` }]))) return;
    setDraft({ scene: '', take: '', mic: '', wildTrack: '', roomTone: '', notes: '' });
  };

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <Mic size={14} /> Sound report
          <span className={s.hint}> · {items.length} takes logged</span>
        </div>
      </div>

      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <SceneLinkField scenes={t.scenes} sceneById={t.sceneById} ids={draft.scene_ids ?? []} text={draft.scene} onChange={(n) => setDraft({ ...draft, scene: n.text, scene_ids: n.ids })} placeholder="12" />
          <label className={s.field} style={{ flex: '0 0 100px' }}>
            <span className={s.label}>Take</span>
            <input className={s.input} value={draft.take} onChange={(e) => setDraft({ ...draft, take: e.target.value })} placeholder="1A" />
          </label>
          <label className={s.field} style={{ flex: '1 1 160px' }}>
            <span className={s.label}>Mic / input</span>
            <input className={s.input} value={draft.mic} onChange={(e) => setDraft({ ...draft, mic: e.target.value })} placeholder="Boom + lav" />
          </label>
          <label className={s.field} style={{ flex: '1 1 160px' }}>
            <span className={s.label}>Wild track</span>
            <input className={s.input} value={draft.wildTrack} onChange={(e) => setDraft({ ...draft, wildTrack: e.target.value })} placeholder="Ambience" />
          </label>
          <label className={s.field} style={{ flex: '1 1 160px' }}>
            <span className={s.label}>Room tone</span>
            <input className={s.input} value={draft.roomTone} onChange={(e) => setDraft({ ...draft, roomTone: e.target.value })} placeholder="30s" />
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.take.trim()}>
            <Plus size={12} /> Log
          </button>
        </div>
        <label className={s.field} style={{ marginTop: 8 }}>
          <span className={s.label}>Notes</span>
          <textarea className={s.textarea} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} />
        </label>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((s2) => (
          <li key={s2.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {sceneChip(s2, t.sceneById) && <span className={s.chip}>Sc {sceneChip(s2, t.sceneById)}</span>}
              <span style={{ fontWeight: 600 }}>{s2.take}</span>
              {s2.mic && <span className={s.hint}>{s2.mic}</span>}
              {s2.wildTrack && <span className={s.hint}>Wild: {s2.wildTrack}</span>}
              {s2.roomTone && <span className={s.hint}>RT: {s2.roomTone}</span>}
              <button className={s.btn} onClick={() => remove(s2.id)} title="Delete" style={{ marginLeft: 'auto' }}>
                <Trash2 size={12} />
              </button>
            </div>
            {s2.notes && <p className={s.hint} style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{s2.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
