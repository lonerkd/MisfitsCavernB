'use client';
import React, { useState } from 'react';
import { emptyDepth, type CharacterDepth, type ArcBeat } from '@/lib/characters/depth';
import { ArcTimeline } from '@/components/characters/ArcTimeline';

export function CharacterDepthPanel({ name }: { name: string }) {
  const [d, setD] = useState<CharacterDepth>(() => emptyDepth(name));
  const [beats, setBeats] = useState<ArcBeat[]>([]);
  const field = (key: keyof CharacterDepth, label: string) => (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 11, color: 'var(--fg-muted)', textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)' }}>{label}</span>
      <textarea value={d[key]} onChange={(e) => setD((x) => ({ ...x, [key]: e.target.value }))} rows={2} style={{ background: 'var(--bg-2)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: 8 }} />
    </label>
  );
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {field('goals', 'Goals')}
      {field('fears', 'Fears')}
      {field('flaws', 'Flaws')}
      {field('arc', 'Arc')}
      <div>
        <div style={{ fontSize: 11, color: 'var(--fg-muted)', textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', marginBottom: 4 }}>Arc timeline</div>
        <ArcTimeline beats={beats} onChange={setBeats} />
      </div>
      {field('notes', 'Notes')}
    </div>
  );
}
