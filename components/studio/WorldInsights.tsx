'use client';

// What the production's own data says across its places, under the Locations list: the world checks as a quiet list (each says what it saw
// and why, jumps to the scene, and can be dismissed on this device) and the world bible as a PDF. Everything is derived from the scenes,
// location records and shoot days already loaded; nothing new is stored. Loaded on demand (next/dynamic) so the Studio does not grow.
import React, { useMemo } from 'react';
import { ArrowRight, EyeOff, Globe2, RotateCcw } from 'lucide-react';
import { LOCATION_STATUS, PERMIT_STATE, type ProjectLocation, type SceneRow, type ShootDay } from '@/lib/studio';
import { WORLD_RULE_LABELS, checkWorld, localDate, warningsForLocation, worldLocations, type WorldWarning } from '@/lib/studio/world';
import { worldBibleDoc } from '@/lib/studio/world-print';
import { PrintButton } from '@/components/ui/PrintButton';
import { useDismissedWarnings } from '@/components/editor/CharacterWarnings';
import { useStudio } from './StudioContext';
import s from './studio.module.css';

const linkBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 8, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.12)', color: 'var(--fg-muted)', fontSize: 12 };

export function WorldInsights({ scenes, records, days }: { scenes: SceneRow[]; records: ProjectLocation[]; days: ShootDay[] }) {
  const { project, openInScript, scriptId } = useStudio();
  const today = localDate();
  const world = useMemo(() => worldLocations(scenes, records, days), [scenes, records, days]);
  const all = useMemo(() => checkWorld(world, today), [world, today]);
  const { ids, dismiss, restore } = useDismissedWarnings(`world:${project.id}`);
  const shown = all.filter((w) => !ids.has(w.id));
  const hidden = all.filter((w) => ids.has(w.id));

  const jump = (w: WorldWarning) => {
    const scene = scenes.find((x) => x.id === w.sceneId);
    if (scene) openInScript({ id: scene.id, script_id: scene.script_id ?? scriptId });
  };

  const buildDoc = () => worldBibleDoc({
    project: project.title, accent: project.accent_color, logo: project.logo_url,
    format: (n) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }),
    generated: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
    locations: world.map((l) => ({
      name: l.name, address: l.record?.address ?? null, contact: l.record?.contact ?? null,
      status: LOCATION_STATUS.find((x) => x.id === l.record?.status)?.label ?? 'Not set',
      permit: PERMIT_STATE.find((x) => x.id === l.record?.permit)?.label ?? '', cost: l.record?.cost ?? null, notes: l.record?.notes ?? null,
      appearances: l.appearances, days: l.days, pages: l.pages,
      warnings: warningsForLocation(all, l.name).map((w) => w.message),
    })),
  });

  const item = (w: WorldWarning, dismissed: boolean) => (
    <li key={w.id} data-testid="world-warning" data-rule={w.rule} style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.08)', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, color: w.severity === 'warn' ? 'var(--warn)' : 'var(--fg-muted)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)' }}>{WORLD_RULE_LABELS[w.rule]}</div>
      <div style={{ fontSize: 13, color: 'var(--fg)' }}>{w.message}</div>
      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{w.reason}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
        {w.sceneId && (
          <button type="button" onClick={() => jump(w)} style={linkBtn}>
            <ArrowRight size={12} aria-hidden /> Open scene {w.sceneNumber} in the script
          </button>
        )}
        {dismissed
          ? <button type="button" onClick={() => restore(w.id)} style={linkBtn} aria-label={`Show again: ${w.message}`}><RotateCcw size={12} aria-hidden /> Show again</button>
          : <button type="button" onClick={() => dismiss(w.id)} style={linkBtn} aria-label={`It is on purpose: ${w.message}`}><EyeOff size={12} aria-hidden /> It is on purpose</button>}
      </div>
    </li>
  );

  return (
    <div data-testid="world-insights" style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
      <div className={s.row} style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div className={s.panelTitle} style={{ margin: 0 }}><Globe2 size={14} aria-hidden /> Across the places</div>
        {world.length > 0 && <PrintButton label="the world bible" build={buildDoc} />}
      </div>
      <p className={s.hint} style={{ margin: '6px 0 12px' }}>Read from the script, the location records and the schedule. Dismissing a note hides it on this device only.</p>
      <section aria-label="World checks" data-testid="world-warnings">
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-strong)', margin: '0 0 8px' }}>Worth a look {shown.length > 0 && <span style={{ color: 'var(--fg-muted)', fontWeight: 400 }}>· {shown.length}</span>}</h3>
        {all.length === 0 && <p className={s.hint} style={{ margin: 0 }}>Nothing looks off: no place spelled two ways, nothing unconfirmed shooting in the next two weeks.</p>}
        {all.length > 0 && shown.length === 0 && <p className={s.hint} style={{ margin: 0 }}>Every note is dismissed.</p>}
        {shown.length > 0 && <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>{shown.map((w) => item(w, false))}</ul>}
        {hidden.length > 0 && (
          <details style={{ marginTop: 10 }}>
            <summary style={{ fontSize: 12, color: 'var(--fg-muted)', cursor: 'pointer' }}>Dismissed · {hidden.length}</summary>
            <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>{hidden.map((w) => item(w, true))}</ul>
          </details>
        )}
      </section>
    </div>
  );
}
