'use client';

import React, { useMemo, useState } from 'react';
import { HardDrive, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useSettingsList } from './useSettingsList';
import s from '../studio.module.css';

export interface OffloadEntry { id: string; card: string; camera: string; size: string; checksum: string; destination: string; status: 'pending' | 'verified' | 'archived' }

interface Candidate { card: string; camera: string; reports: number }

const keyOf = (v: string) => v.trim().toLowerCase();

/**
 * The cards the camera reports name (the media field) that have no offload entry yet: one offload log, fed by the camera reports.
 * Adding writes a pending offload entry for the card; nothing changes in the camera reports.
 */
export function OffloadsFromReports({ items, save }: { items: OffloadEntry[]; save: (next: OffloadEntry[]) => Promise<boolean> }) {
  const cameraReports = useSettingsList('cameraReports');
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const suggestions = useMemo(() => {
    const tracked = new Set(items.map((i) => keyOf(i.card || '')));
    const found = new Map<string, Candidate>();
    for (const r of cameraReports.items) {
      const card = (r.media || '').trim();
      if (!card || tracked.has(keyOf(card))) continue;
      const camera = (r.camera || '').trim();
      const hit = found.get(keyOf(card));
      if (hit) {
        hit.reports += 1;
        if (!hit.camera && camera) hit.camera = camera;
      } else {
        found.set(keyOf(card), { card, camera, reports: 1 });
      }
    }
    return [...found.values()];
  }, [cameraReports.items, items]);

  const add = async (cards: Candidate[]) => {
    if (busy || cards.length === 0) return;
    setBusy(true);
    try {
      const next = cards.map((c): OffloadEntry => ({
        id: `mo-${crypto.randomUUID()}`, card: c.card, camera: c.camera, size: '', checksum: '', destination: '', status: 'pending',
      }));
      if (await save([...items, ...next])) toast(next.length === 1 ? 'Added to the offload log' : `${next.length} cards added to the offload log`, 'success');
    } finally { setBusy(false); }
  };

  if (suggestions.length === 0) return null;
  return (
    <details className={s.panel} style={{ padding: 12 }} open={items.length === 0 || undefined}>
      <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, minHeight: 32 }}>
        <HardDrive size={14} aria-hidden />
        <strong>From the camera reports</strong>
        <span className={s.hint}>{suggestions.length} card{suggestions.length === 1 ? '' : 's'} not logged yet</span>
      </summary>
      <div className={s.row} style={{ margin: '8px 0' }}>
        <button type="button" className={s.btnPrimary} disabled={busy} onClick={() => void add(suggestions)}><Plus size={12} /> Add all {suggestions.length}</button>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {suggestions.map((c) => (
          <li key={keyOf(c.card)} className={s.row} style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{c.card} {c.camera && <span className={s.hint}>· from {c.camera}</span>}</div>
              <div className={s.hint} style={{ fontSize: 12 }}>Named in {c.reports} camera report{c.reports === 1 ? '' : 's'}.</div>
            </div>
            <button type="button" className={s.btn} disabled={busy} onClick={() => void add([c])}><Plus size={11} /> Add</button>
          </li>
        ))}
      </ul>
    </details>
  );
}
