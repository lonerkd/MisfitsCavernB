'use client';

import React, { useMemo, useState } from 'react';
import { Plus, ScrollText } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import { placeOfHeading, scanScene, type Hazard, type Severity } from '@/lib/studio/script-hazards';
import s from '../studio.module.css';

export interface PlannedHazard { id: string; hazard: string; location: string; severity: Severity; mitigation: string; owner: string; status: 'identified' | 'mitigated' | 'resolved'; scene_ids?: string[]; scene?: string }

interface Suggestion { sceneId: string; sceneNumber: number; heading: string; place: string; hazard: Hazard }

const SEV_COLOR: Record<Severity, string> = { low: 'var(--ok)', medium: 'var(--warn)', high: 'var(--danger)' };

/**
 * What the script says is risky, scene by scene, that the safety plan does not cover yet. It reads the scenes the Studio
 * already holds; a suggestion is added to the plan (linked to its scene, with a starting mitigation) or left alone.
 */
export function SafetyFromScript({ items, save }: { items: PlannedHazard[]; save: (next: PlannedHazard[]) => Promise<boolean> }) {
  const { scenes, sceneLines } = useStudio();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const suggestions = useMemo(() => {
    const out: Suggestion[] = [];
    for (const row of scenes.rows) {
      const lines = sceneLines.get(row.id);
      if (!lines) continue;
      for (const hazard of scanScene(lines)) {
        const covered = items.some((i) => (i.scene_ids ?? []).includes(row.id) && i.hazard === hazard.hazard);
        if (covered) continue;
        const heading = (row.heading || lines[0]?.text || row.title || '').trim();
        out.push({ sceneId: row.id, sceneNumber: row.scene_number, heading, place: placeOfHeading(heading), hazard });
      }
    }
    return out;
  }, [scenes.rows, sceneLines, items]);

  const toItem = (x: Suggestion): PlannedHazard => ({
    id: crypto.randomUUID(), hazard: x.hazard.hazard, location: x.place, severity: x.hazard.severity, mitigation: x.hazard.mitigation,
    owner: '', status: 'identified', scene_ids: [x.sceneId], scene: String(x.sceneNumber),
  });
  const add = async (list: Suggestion[]) => {
    if (busy || list.length === 0) return;
    setBusy(true);
    try {
      if (await save([...items, ...list.map(toItem)])) toast(list.length === 1 ? 'Added to the safety plan' : `${list.length} hazards added to the safety plan`, 'success');
    } finally { setBusy(false); }
  };

  if (suggestions.length === 0) return null;
  const high = suggestions.filter((x) => x.hazard.severity === 'high').length;
  return (
    <details className={s.panel} style={{ padding: 12 }} open={items.length === 0 || undefined}>
      <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, minHeight: 32 }}>
        <ScrollText size={14} aria-hidden />
        <strong>From the script</strong>
        <span className={s.hint}>{suggestions.length} to plan for{high > 0 ? `, ${high} high` : ''}</span>
      </summary>
      <p className={s.hint} style={{ margin: '8px 0' }}>What the scenes say is risky and the plan does not cover yet. Each is a starting point: edit it after you add it.</p>
      <div className={s.row} style={{ marginBottom: 8 }}>
        <button type="button" className={s.btnPrimary} disabled={busy} onClick={() => void add(suggestions)}><Plus size={12} /> Add all {suggestions.length}</button>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {suggestions.map((x) => (
          <li key={`${x.sceneId}:${x.hazard.kind}`} className={cx(s.row)} style={{ gap: 10, alignItems: 'flex-start', flexWrap: 'wrap', borderLeft: `3px solid ${SEV_COLOR[x.hazard.severity]}`, paddingLeft: 10 }}>
            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{x.hazard.hazard} <span className={s.hint}>· Sc {x.sceneNumber}{x.place ? ` · ${x.place}` : ''}</span></div>
              <div className={s.hint} style={{ fontSize: 12 }}>&ldquo;{x.hazard.evidence}&rdquo;</div>
            </div>
            <button type="button" className={cx(s.btn, s.small)} disabled={busy} onClick={() => void add([x])}><Plus size={11} /> Add</button>
          </li>
        ))}
      </ul>
    </details>
  );
}
