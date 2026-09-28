'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, MapPin, PenLine, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import EmptyState from '@/components/EmptyState';
import {
  LOCATION_STATUS, PERMIT_STATE, locationReadiness, locationRows, mapHref, studio, useProjectLocations,
  type LocationPatch, type LocationRow, type ProjectLocation,
} from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';

/**
 * Every place the script goes, as a record the production fills in: where it
 * is, who to call, whether it's confirmed, the permit, the cost. Scenes link
 * by the heading's location name, so the list follows the script. The
 * readiness board blocks scenes at a location that isn't locked down, and the
 * call sheet offers its address.
 */
export function LocationsView() {
  const { project, scenes, scriptId } = useStudio();
  const records = useProjectLocations(project.id);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState('');
  const { toast } = useToast();

  const rows = useMemo(() => locationRows(scenes.rows, records.rows), [scenes.rows, records.rows]);
  const locked = rows.filter((r) => r.scenes.length && locationReadiness(r.name, r.record).ready).length;
  const inScript = rows.filter((r) => r.scenes.length).length;

  const addOther = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = adding.trim();
    if (!name) return;
    try {
      const row = await studio.saveLocation(project.id, name, {});
      records.upsertLocal(row);
      setAdding('');
      setOpen(row.name);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add the location', 'error');
    }
  };

  if (scenes.status !== 'loading' && rows.length === 0) {
    return (
      <EmptyState icon={<MapPin size={26} />} title="No locations yet"
        subtitle="Scene headings name them (INT. HARBOR - NIGHT → HARBOR) — write the script and every location shows up here, ready for an address, a contact and a permit."
        action={scriptId ? <Link href={`/editor?script=${scriptId}`} className={s.btnPrimary}><PenLine size={12} /> Open the script</Link> : undefined} />
    );
  }

  return (
    <div className={s.stack} style={{ maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}><MapPin size={14} /> Locations <span className={s.hint}>· {locked} of {inScript} locked down</span></div>
      </div>
      {records.status === 'error' && <p className={s.hint} style={{ color: '#ff6b6b' }}>{records.error}</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((row) => (
          <LocationItem key={row.name} row={row} expanded={open === row.name} onToggle={() => setOpen(open === row.name ? null : row.name)}
            onSaved={(r) => records.upsertLocal(r)} onRemoved={(id) => records.removeLocal(id)} />
        ))}
      </ul>
      <form onSubmit={addOther} className={s.row} style={{ gap: 8 }}>
        <input className={s.input} style={{ maxWidth: 280 }} placeholder="A location the script doesn’t name yet" aria-label="New location name"
          value={adding} maxLength={200} onChange={(e) => setAdding(e.target.value)} />
        <button type="submit" className={cx(s.btn, s.small)} disabled={!adding.trim()}><Plus size={11} /> Add</button>
      </form>
    </div>
  );
}

function LocationItem({ row, expanded, onToggle, onSaved, onRemoved }: {
  row: LocationRow; expanded: boolean; onToggle: () => void; onSaved: (r: ProjectLocation) => void; onRemoved: (id: string) => void;
}) {
  const { project } = useStudio();
  const { toast } = useToast();
  const confirm = useConfirm();
  const rec = row.record as ProjectLocation | null;
  const ready = locationReadiness(row.name, rec);
  const id = `loc-${row.name.replace(/[^A-Z0-9]+/g, '-')}`;

  const save = async (patch: LocationPatch) => {
    try { onSaved(await studio.saveLocation(project.id, row.name, patch)); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not save the location', 'error'); }
  };
  const text = (key: 'address' | 'contact' | 'notes', value: string) => {
    const next = value.trim() || null;
    if ((rec?.[key] ?? null) !== next) void save({ [key]: next });
  };
  const remove = async () => {
    if (!rec || !(await confirm(`Remove the record for ${row.name}? ${row.scenes.length ? 'The scenes stay; the address, contact and permit go.' : ''}`))) return;
    try { await studio.deleteLocation(rec.id); onRemoved(rec.id); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not remove it', 'error'); }
  };

  const status = LOCATION_STATUS.find((x) => x.id === rec?.status);
  const summary = [
    row.scenes.length ? `${row.scenes.length} scene${row.scenes.length === 1 ? '' : 's'}` : 'not in the script',
    row.days.length ? `day${row.days.length === 1 ? '' : 's'} ${row.days.join(', ')}` : null,
    row.exterior ? 'exterior' : null,
    row.night ? 'night' : null,
  ].filter(Boolean).join(' · ');

  return (
    <li className={s.panel} style={{ padding: 0 }}>
      <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={id}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: ready.ready ? '#10b981' : rec ? '#f59e0b' : 'rgba(255,255,255,0.25)' }} aria-hidden />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontFamily: 'var(--display)', fontSize: '1.05rem', letterSpacing: 1.5 }}>{row.name}</span>
          <span className={s.hint}>{summary}{rec?.address ? ` · ${rec.address}` : ''}</span>
        </span>
        <span className={s.hint} style={{ color: ready.ready ? '#6ee7b7' : undefined }}>
          {ready.ready ? 'Locked down' : rec ? `${status?.label ?? 'Scouting'}${rec.permit === 'needed' ? ' · permit needed' : rec.permit === 'applied' ? ' · permit pending' : ''}` : 'Not scouted'}
        </span>
        <ChevronDown size={14} aria-hidden style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }} />
      </button>
      {expanded && (
        <div id={id} className={s.stack} style={{ gap: 12, padding: '0 14px 14px' }}>
          <div className={s.row} style={{ gap: 6, flexWrap: 'wrap' }} role="radiogroup" aria-label={`${row.name} status`}>
            {LOCATION_STATUS.map((st) => (
              <button key={st.id} type="button" role="radio" aria-checked={(rec?.status ?? 'scouting') === st.id} title={st.hint}
                className={cx(s.chip, (rec?.status ?? 'scouting') === st.id && s.chipOn)} onClick={() => void save({ status: st.id })}>{st.label}</button>
            ))}
            <select className={s.select} aria-label={`${row.name} permit`} value={rec?.permit ?? 'unknown'} onChange={(e) => void save({ permit: e.target.value })} style={{ width: 'auto' }}>
              {PERMIT_STATE.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <label className={s.stack} style={{ gap: 4 }}>
              <span className={s.hint}>Address</span>
              <input className={s.input} defaultValue={rec?.address ?? ''} key={`a:${rec?.address}`} maxLength={500} onBlur={(e) => text('address', e.target.value)} />
            </label>
            <label className={s.stack} style={{ gap: 4 }}>
              <span className={s.hint}>Contact (name, phone)</span>
              <input className={s.input} defaultValue={rec?.contact ?? ''} key={`c:${rec?.contact}`} maxLength={300} onBlur={(e) => text('contact', e.target.value)} />
            </label>
            <label className={s.stack} style={{ gap: 4 }}>
              <span className={s.hint}>Cost</span>
              <input className={s.input} type="number" min={0} step="0.01" defaultValue={rec?.cost ?? ''} key={`$:${rec?.cost}`}
                onBlur={(e) => { const v = e.target.value.trim(); const n = v ? Number(v) : null; if (n !== (rec?.cost ?? null) && (n === null || Number.isFinite(n))) void save({ cost: n }); }} />
            </label>
          </div>
          <label className={s.stack} style={{ gap: 4 }}>
            <span className={s.hint}>Notes (access, parking, power, noise, hours)</span>
            <textarea className={s.textarea} rows={2} defaultValue={rec?.notes ?? ''} key={`n:${rec?.notes}`} maxLength={5000} onBlur={(e) => text('notes', e.target.value)} />
          </label>
          {row.scenes.length > 0 && (
            <p className={s.hint} style={{ margin: 0 }}>
              Scenes: {row.scenes.map((sc) => `${sc.scene_number}${sc.shoot_day ? ` (day ${sc.shoot_day})` : ''}`).join(', ')}
            </p>
          )}
          <div className={s.row} style={{ gap: 8 }}>
            {rec?.address && <a href={mapHref(rec.address)} target="_blank" rel="noopener noreferrer" className={cx(s.btnGhost, s.small)}><MapPin size={11} /> Map<span className="sr-only"> (opens in a new tab)</span></a>}
            {rec && <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => void remove()}><Trash2 size={11} /> Remove record</button>}
          </div>
        </div>
      )}
    </li>
  );
}
