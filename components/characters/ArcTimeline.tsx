'use client';
import React from 'react';
import type { ArcBeat } from '@/lib/characters/depth';

export function ArcTimeline({ beats, onChange }: { beats: ArcBeat[]; onChange: (beats: ArcBeat[]) => void }) {
  const add = () => onChange([...beats, { at: beats.length, label: '', note: '' }]);
  const update = (i: number, patch: Partial<ArcBeat>) => onChange(beats.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const remove = (i: number) => onChange(beats.filter((_, j) => j !== i));
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {beats.length === 0 && <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>No arc beats yet.</p>}
      {beats.map((b, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="number" value={b.at} onChange={(e) => update(i, { at: Number(e.target.value) })} style={{ width: 60, background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }} aria-label="Position" />
          <input value={b.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Beat" style={{ flex: 1, background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }} />
          <input value={b.note} onChange={(e) => update(i, { note: e.target.value })} placeholder="Note" style={{ flex: 2, background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: 4 }} />
          <button type="button" onClick={() => remove(i)} aria-label="Remove beat" style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}>×</button>
        </div>
      ))}
      <button type="button" onClick={add} style={{ alignSelf: 'flex-start', padding: '4px 10px', borderRadius: 8, border: '1px dashed var(--border)', background: 'none', color: 'var(--fg)', cursor: 'pointer', fontSize: 12 }}>+ Beat</button>
    </div>
  );
}
