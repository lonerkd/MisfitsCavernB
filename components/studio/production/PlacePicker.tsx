'use client';

import React, { useId, useMemo, useState } from 'react';
import { LocateFixed, MapPin, X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { parseCoordinates } from '@/lib/film/coordinates';
import { isCoordinate } from '@/lib/film/daylight';
import { deviceZone } from '@/lib/film/studio';
import { cx } from '../ui';
import s from '../studio.module.css';

export interface Place { latitude: number | null; longitude: number | null; timezone: string | null }

const zones = (): string[] => {
  // Not in this TypeScript lib target; every browser the suite supports has it.
  try { return (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? []; } catch { return []; }
};
const round = (n: number) => Math.round(n * 1e6) / 1e6;
const mapHref = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

/**
 * Where a location is: from the device ("I'm here now", for a scout standing
 * in it) or from coordinates or a maps link pasted in. No address lookup —
 * nothing here calls an outside service.
 */
export function PlacePicker({ name, value, onChange }: { name: string; value: Place; onChange: (next: Place) => void | Promise<void> }) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [bad, setBad] = useState(false);
  const [locating, setLocating] = useState(false);
  const fieldId = useId();
  const errorId = useId();
  const placed = isCoordinate(value.latitude, value.longitude);
  const zone = value.timezone || deviceZone();
  const zoneList = useMemo(() => { const all = zones(); return all.includes(zone) ? all : [zone, ...all]; }, [zone]);

  const place = (latitude: number, longitude: number) => {
    setText(''); setBad(false);
    void onChange({ latitude: round(latitude), longitude: round(longitude), timezone: value.timezone || deviceZone() });
  };
  const submit = () => {
    if (!text.trim()) { setBad(false); return; }
    const c = parseCoordinates(text);
    if (!c) { setBad(true); return; }
    place(c.latitude, c.longitude);
  };
  const here = () => {
    if (!('geolocation' in navigator)) { toast('Couldn’t get your position — paste the coordinates or a map link instead.', 'error'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocating(false); place(pos.coords.latitude, pos.coords.longitude); },
      () => { setLocating(false); toast('Couldn’t get your position — paste the coordinates or a map link instead.', 'error'); },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  };

  if (placed) {
    const lat = value.latitude as number, lng = value.longitude as number;
    return (
      <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span className={s.hint} style={{ color: 'var(--fg)', display: 'inline-flex', alignItems: 'center', gap: 6 }}><MapPin size={11} aria-hidden /> {lat.toFixed(4)}, {lng.toFixed(4)}</span>
        <select className={s.select} style={{ width: 'auto', maxWidth: 240 }} aria-label={`${name} time zone`} value={zone}
          onChange={(e) => void onChange({ latitude: lat, longitude: lng, timezone: e.target.value })}>
          {zoneList.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        <a href={mapHref(lat, lng)} target="_blank" rel="noopener noreferrer" className={cx(s.btnGhost, s.small)}>Open map<span className="sr-only"> (opens in a new tab)</span></a>
        <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => void onChange({ latitude: null, longitude: null, timezone: null })}>
          <X size={11} aria-hidden /> Clear position<span className="sr-only"> of {name}</span>
        </button>
      </div>
    );
  }

  return (
    <div className={s.stack} style={{ gap: 6 }}>
      <p className={s.hint} style={{ margin: 0 }}>Add where this is to see its light.</p>
      <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <button type="button" className={cx(s.btn, s.small)} onClick={here} disabled={locating}>
          <LocateFixed size={11} aria-hidden /> {locating ? 'Finding you…' : 'I’m here now'}
        </button>
        <label className={s.stack} style={{ gap: 4, flex: '1 1 240px' }} htmlFor={fieldId}>
          <span className={s.hint}>Coordinates or a map link</span>
          <input id={fieldId} className={s.input} value={text} placeholder="51.0447, -114.0719" inputMode="text" autoComplete="off"
            aria-invalid={bad} aria-describedby={bad ? errorId : undefined}
            onChange={(e) => { setText(e.target.value); if (bad) setBad(false); }}
            onBlur={submit}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }} />
        </label>
      </div>
      {bad && <p id={errorId} role="alert" className={s.hint} style={{ margin: 0, color: 'var(--danger)' }}>That doesn’t look like coordinates.</p>}
    </div>
  );
}
