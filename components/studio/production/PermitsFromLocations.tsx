'use client';

import React, { useMemo, useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { locationKey, locationRows, useProjectLocations } from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';

export interface PermitEntry { id: string; location: string; permitType: string; issuedBy: string; expiry: string; status: 'pending' | 'approved' | 'expired' }

const WHY: Record<string, string> = {
  needed: 'Marked as needing a permit in Locations.',
  applied: 'Applied for in Locations; track it here until it is granted.',
  granted: 'Granted in Locations; record who issued it and when it ends.',
  unknown: 'An exterior no one has checked for a permit yet.',
};

/**
 * The places the script uses that need a permit and are not tracked here yet, from the Locations tool and the headings:
 * one permit state, two tools that agree. Adding writes a permit record for the place; nothing changes in Locations.
 */
export function PermitsFromLocations({ items, save }: { items: PermitEntry[]; save: (next: PermitEntry[]) => Promise<boolean> }) {
  const { project, scenes } = useStudio();
  const records = useProjectLocations(project.id);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const suggestions = useMemo(() => {
    const tracked = new Set(items.map((i) => locationKey(i.location)));
    return locationRows(scenes.rows, records.rows).filter((r) => {
      if (!r.scenes.length || tracked.has(locationKey(r.name))) return false;
      const p = r.record?.permit ?? 'unknown';
      return p === 'needed' || p === 'applied' || p === 'granted' || (p === 'unknown' && r.exterior);
    });
  }, [scenes.rows, records.rows, items]);

  const add = async (names: string[]) => {
    if (busy || names.length === 0) return;
    setBusy(true);
    try {
      const rows = locationRows(scenes.rows, records.rows).filter((r) => names.includes(r.name));
      const next = rows.map((r): PermitEntry => ({
        id: `pm-${crypto.randomUUID()}`, location: r.name, permitType: 'Location filming permit', issuedBy: '', expiry: '',
        status: r.record?.permit === 'granted' ? 'approved' : 'pending',
      }));
      if (await save([...items, ...next])) toast(next.length === 1 ? 'Added to permits' : `${next.length} locations added to permits`, 'success');
    } finally { setBusy(false); }
  };

  if (suggestions.length === 0) return null;
  return (
    <details className={s.panel} style={{ padding: 12 }} open={items.length === 0 || undefined}>
      <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, minHeight: 32 }}>
        <MapPin size={14} aria-hidden />
        <strong>From your locations</strong>
        <span className={s.hint}>{suggestions.length} not tracked here yet</span>
      </summary>
      <div className={s.row} style={{ margin: '8px 0' }}>
        <button type="button" className={s.btnPrimary} disabled={busy} onClick={() => void add(suggestions.map((r) => r.name))}><Plus size={12} /> Add all {suggestions.length}</button>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {suggestions.map((r) => (
          <li key={r.name} className={cx(s.row)} style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name} <span className={s.hint}>· {r.scenes.length} scene{r.scenes.length === 1 ? '' : 's'}{r.exterior ? ' · exterior' : ''}{r.night ? ' · night' : ''}</span></div>
              <div className={s.hint} style={{ fontSize: 12 }}>{WHY[r.record?.permit ?? 'unknown'] ?? WHY.unknown}</div>
            </div>
            <button type="button" className={cx(s.btn, s.small)} disabled={busy} onClick={() => void add([r.name])}><Plus size={11} /> Add</button>
          </li>
        ))}
      </ul>
    </details>
  );
}
