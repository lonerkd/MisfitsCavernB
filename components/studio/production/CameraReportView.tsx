'use client';

import React, { useMemo, useState } from 'react';
import { Camera, Plus, Trash2 } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { useStudio } from '../StudioContext';
import { patchProjectSettings } from '@/lib/supabase/progress';
import s from '../studio.module.css';

type CameraEntry = { id: string; scene: string; shot: string; lens: string; tStop: string; filter: string; camera: string; media: string; notes: string };

export function CameraReportView() {
  const { project } = useStudio();
  const items: CameraEntry[] = useMemo(() => (project.settings as any)?.cameraReports ?? [], [project.settings]);
  const [draft, setDraft] = useState<Omit<CameraEntry, 'id'>>({
    scene: '',
    shot: '',
    lens: '',
    tStop: '',
    filter: '',
    camera: '',
    media: '',
    notes: '',
  });

  const save = async (next: CameraEntry[]) => {
    await patchProjectSettings(project.id, { cameraReports: next } as any);
  };

  const add = async () => {
    if (!draft.shot.trim()) return;
    await save([...items, { ...draft, id: `cam-${Date.now()}` }]);
    setDraft({ scene: '', shot: '', lens: '', tStop: '', filter: '', camera: '', media: '', notes: '' });
  };

  const remove = async (id: string) => {
    await save(items.filter((i) => i.id !== id));
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Camera size={26} />}
        title="No camera reports"
        subtitle="Log per-shot lens, T-stop, filter, camera body, and media card."
      />
    );
  }

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <Camera size={14} /> Camera report
          <span className={s.hint}> · {items.length} shots logged</span>
        </div>
      </div>

      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className={s.field} style={{ flex: '0 0 80px' }}>
            <span className={s.label}>Scene</span>
            <input className={s.input} value={draft.scene} onChange={(e) => setDraft({ ...draft, scene: e.target.value })} placeholder="12" />
          </label>
          <label className={s.field} style={{ flex: '0 0 100px' }}>
            <span className={s.label}>Shot</span>
            <input className={s.input} value={draft.shot} onChange={(e) => setDraft({ ...draft, shot: e.target.value })} placeholder="A1" />
          </label>
          <label className={s.field} style={{ flex: '1 1 120px' }}>
            <span className={s.label}>Lens</span>
            <input className={s.input} value={draft.lens} onChange={(e) => setDraft({ ...draft, lens: e.target.value })} placeholder="35mm" />
          </label>
          <label className={s.field} style={{ flex: '0 0 80px' }}>
            <span className={s.label}>T-stop</span>
            <input className={s.input} value={draft.tStop} onChange={(e) => setDraft({ ...draft, tStop: e.target.value })} placeholder="2.8" />
          </label>
          <label className={s.field} style={{ flex: '0 0 100px' }}>
            <span className={s.label}>Filter</span>
            <input className={s.input} value={draft.filter} onChange={(e) => setDraft({ ...draft, filter: e.target.value })} placeholder="ND.6" />
          </label>
          <label className={s.field} style={{ flex: '0 0 120px' }}>
            <span className={s.label}>Camera</span>
            <input className={s.input} value={draft.camera} onChange={(e) => setDraft({ ...draft, camera: e.target.value })} placeholder="Alexa Mini" />
          </label>
          <label className={s.field} style={{ flex: '0 0 120px' }}>
            <span className={s.label}>Media card</span>
            <input className={s.input} value={draft.media} onChange={(e) => setDraft({ ...draft, media: e.target.value })} placeholder="Card 3" />
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.shot.trim()}>
            <Plus size={12} /> Log
          </button>
        </div>
        <label className={s.field} style={{ marginTop: 8 }}>
          <span className={s.label}>Notes</span>
          <textarea className={s.textarea} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} />
        </label>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((c) => (
          <li key={c.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {c.scene && <span className={s.chip}>Sc {c.scene}</span>}
              <span style={{ fontWeight: 600 }}>{c.shot}</span>
              {c.lens && <span className={s.hint}>{c.lens}</span>}
              {c.tStop && <span className={s.hint}>T{c.tStop}</span>}
              {c.filter && <span className={s.hint}>{c.filter}</span>}
              {c.camera && <span className={s.hint}>{c.camera}</span>}
              {c.media && <span className={s.chip}>{c.media}</span>}
              <button className={s.btn} onClick={() => remove(c.id)} title="Delete" style={{ marginLeft: 'auto' }}>
                <Trash2 size={12} />
              </button>
            </div>
            {c.notes && <p className={s.hint} style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{c.notes}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
