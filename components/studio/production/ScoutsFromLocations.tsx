'use client';

import React, { useMemo, useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { locationKey, locationRows, useProjectLocations } from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';

export type ScoutEntry = { id: string; locationName: string; date: string; scout: string; photos: string; notes: string; status: 'scouted' | 'approved' | 'rejected' };

/**
 * The places the script uses that nobody has logged a scout for yet, from the Locations tool and the headings; exteriors first.
 * Adding logs a scout entry for the place (status scouted, no date yet); nothing changes in Locations.
 */
export function ScoutsFromLocations({ items, save }: { items: ScoutEntry[]; save: (next: ScoutEntry[]) => Promise<boolean> }) {
  const { project, scenes } = useStudio();
  const records = useProjectLocations(project.id);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const suggestions = useMemo(() => {
    const logged = new Set(items.map((i) => locationKey(i.locationName)));
    return locationRows(scenes.rows, records.rows)
      .filter((r) => r.scenes.length > 0 && !logged.has(locationKey(r.name)))
      .sort((a, b) => Number(b.exterior) - Number(a.exterior));
  }, [scenes.rows, records.rows, items]);

  const add = async (names: string[]) => {
    if (busy || names.length === 0) return;
    setBusy(true);
    try {
      const next = suggestions.filter((r) => names.includes(r.name)).map((r): ScoutEntry => ({
        id: `sc-${crypto.randomUUID()}`, locationName: r.name, date: '', scout: '', photos: '', notes: '', status: 'scouted',
      }));
      if (await save([...items, ...next])) toast(next.length === 1 ? 'Added to scouts' : `${next.length} locations added to scouts`, 'success');
    } finally { setBusy(false); }
  };

  if (suggestions.length === 0) return null;
  return (
    <details className={s.panel} style={{ padding: 12 }} open={items.length === 0 || undefined}>
      <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, minHeight: 32 }}>
        <MapPin size={14} aria-hidden />
        <strong>From your locations</strong>
        <span className={s.hint}>{suggestions.length} not scouted yet</span>
      </summary>
      <div className={s.row} style={{ margin: '8px 0' }}>
        <button type="button" className={s.btnPrimary} disabled={busy} onClick={() => void add(suggestions.map((r) => r.name))}><Plus size={12} /> Add all {suggestions.length}</button>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {suggestions.map((r) => (
          <li key={r.name} className={cx(s.row)} style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name} <span className={s.hint}>· {r.scenes.length} scene{r.scenes.length === 1 ? '' : 's'}{r.exterior ? ' · exterior' : ''}{r.night ? ' · night' : ''}</span></div>
            </div>
            <button type="button" className={cx(s.btn, s.small)} disabled={busy} onClick={() => void add([r.name])}><Plus size={11} /> Add</button>
          </li>
        ))}
      </ul>
    </details>
  );
}
