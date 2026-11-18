'use client';

import React, { useMemo, useState } from 'react';
import { Plus, Wrench } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useSettingsList } from './useSettingsList';
import s from '../studio.module.css';

export interface GearEntry { id: string; item: string; category: string; owner: string; status: 'needed' | 'packed' | 'on-set' | 'returned' }

type Category = 'Camera' | 'Lens' | 'Filter' | 'Sound';
interface Candidate { item: string; category: Category; reports: number }

const keyOf = (v: string) => v.trim().toLowerCase();
/** Values that are placeholders in a report, not equipment. */
const NOT_EQUIPMENT = new Set(['', '-', 'n/a']);

/**
 * The cameras, lenses and filters the camera reports name, and the recorders or mics the sound reports name, that the gear list
 * does not have yet. Adding writes a gear item (status needed); nothing changes in the reports.
 */
export function GearFromReports({ items, save }: { items: GearEntry[]; save: (next: GearEntry[]) => Promise<boolean> }) {
  const cameraReports = useSettingsList('cameraReports', { find: false });
  const soundReports = useSettingsList('soundReports', { find: false });
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const suggestions = useMemo(() => {
    const tracked = new Set(items.map((g) => keyOf(g.item || '')));
    const found = new Map<string, Candidate>();
    const take = (raw: string, category: Category) => {
      const name = (raw || '').trim();
      if (NOT_EQUIPMENT.has(keyOf(name))) return;
      const k = keyOf(name);
      if (tracked.has(k)) return;
      const hit = found.get(k);
      if (hit) hit.reports += 1;
      else found.set(k, { item: name, category, reports: 1 });
    };
    for (const r of cameraReports.items) {
      take(r.camera, 'Camera');
      take(r.lens, 'Lens');
      take(r.filter, 'Filter');
    }
    for (const r of soundReports.items) take(r.mic, 'Sound');
    return [...found.values()];
  }, [cameraReports.items, soundReports.items, items]);

  const add = async (list: Candidate[]) => {
    if (busy || list.length === 0) return;
    setBusy(true);
    try {
      const next = list.map((c): GearEntry => ({ id: `g-${crypto.randomUUID()}`, item: c.item, category: c.category, owner: '', status: 'needed' }));
      if (await save([...items, ...next])) toast(next.length === 1 ? 'Added to gear' : `${next.length} items added to gear`, 'success');
    } finally { setBusy(false); }
  };

  if (suggestions.length === 0) return null;
  return (
    <details className={s.panel} style={{ padding: 12 }} open={items.length === 0 || undefined}>
      <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, minHeight: 32 }}>
        <Wrench size={14} aria-hidden />
        <strong>From the camera and sound reports</strong>
        <span className={s.hint}>{suggestions.length} not in gear yet</span>
      </summary>
      <div className={s.row} style={{ margin: '8px 0' }}>
        <button type="button" className={s.btnPrimary} disabled={busy} onClick={() => void add(suggestions)}><Plus size={12} /> Add all {suggestions.length}</button>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {suggestions.map((c) => (
          <li key={keyOf(c.item)} className={s.row} style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{c.item} <span className={s.chip}>{c.category}</span></div>
              <div className={s.hint} style={{ fontSize: 12 }}>Named in {c.reports} report{c.reports === 1 ? '' : 's'}.</div>
            </div>
            <button type="button" className={s.btn} disabled={busy} onClick={() => void add([c])}><Plus size={11} /> Add</button>
          </li>
        ))}
      </ul>
    </details>
  );
}
