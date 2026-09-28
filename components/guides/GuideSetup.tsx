'use client';

// The questions that set how deep a guide goes: experience, hours a week,
// team, and how much explanation. Asked once (on /welcome or the first time a
// guide appears) and changed any time from a guide or Settings.

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DEFAULT_PROFILE, DEPTHS, EXPERIENCES, HOUR_PRESETS, TEAMS, depthOf, type Depth, type GuideProfile } from '@/lib/guides/profile';
import g from './guides.module.css';

interface Option<T extends string> { id: T; label: string; hint: string }

function Choice<T extends string>({ label, hint, options, value, onChange, disabled }: {
  label: string; hint?: string; options: Option<T>[]; value: T | undefined; onChange: (v: T) => void; disabled?: boolean;
}) {
  return (
    <fieldset className={g.question}>
      <legend className={g.qLabel}>{label}</legend>
      {hint && <p className={g.qHint}>{hint}</p>}
      <div className={g.chips} role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className={g.chip} disabled={disabled} onClick={() => onChange(o.id)}>
            {o.label}<span className={g.chipHint}>{o.hint}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function GuideSetup({ initial, onSave, saveLabel = 'Save', onCancel, cancelLabel = 'Cancel', idPrefix = 'guide' }: {
  initial: GuideProfile | null;
  onSave: (profile: GuideProfile) => Promise<void>;
  saveLabel?: React.ReactNode;
  onCancel?: () => void;
  cancelLabel?: string;
  idPrefix?: string;
}) {
  const start = initial ?? DEFAULT_PROFILE;
  const [experience, setExperience] = useState(initial?.experience);
  const [hours, setHours] = useState(String(start.hours));
  const [team, setTeam] = useState(start.team);
  const [depth, setDepth] = useState<Depth | 'auto'>(initial?.depth ?? 'auto');
  const [saving, setSaving] = useState(false);

  const n = Number(hours);
  const hoursOk = Number.isInteger(n) && n >= 1 && n <= 80;
  const suggested = experience ? DEPTHS.find((d) => d.id === depthOf({ experience }))!.label : null;
  const depthOptions: Option<Depth | 'auto'>[] = [
    { id: 'auto', label: 'Match my experience', hint: suggested ? `For you: ${suggested.toLowerCase()}` : 'Set by your answer above' },
    ...DEPTHS,
  ];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!experience || !hoursOk || saving) return;
    setSaving(true);
    try {
      await onSave(depth === 'auto' ? { hours: n, experience, team } : { hours: n, experience, team, depth });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={g.setup} onSubmit={save}>
      <Choice label="How much have you made before?" options={EXPERIENCES} value={experience} onChange={setExperience} disabled={saving} />
      <fieldset className={g.question}>
        <legend className={g.qLabel}>How much time do you have?</legend>
        <p className={g.qHint}>Hours a week for this — the guide plans each week to fit.</p>
        <div className={g.hoursRow}>
          <div className={g.chips} role="radiogroup" aria-label="Hours a week">
            {HOUR_PRESETS.map((h) => (
              <button key={h} type="button" role="radio" aria-checked={n === h} className={g.chip} disabled={saving} onClick={() => setHours(String(h))}>{h}h</button>
            ))}
          </div>
          <label htmlFor={`${idPrefix}-hours`} className="sr-only">Hours a week</label>
          <input id={`${idPrefix}-hours`} className={g.hours} type="number" inputMode="numeric" min={1} max={80} step={1} value={hours}
            disabled={saving} onChange={(e) => setHours(e.target.value)} aria-invalid={!hoursOk} />
          <span className={g.unit}>hours a week</span>
        </div>
      </fieldset>
      <Choice label="Who’s making it with you?" options={TEAMS} value={team} onChange={setTeam} disabled={saving} />
      <Choice label="How much should the guide explain?" options={depthOptions} value={depth} onChange={setDepth} disabled={saving} />
      <div className={g.setupActions}>
        <Button type="submit" isLoading={saving} disabled={saving || !experience || !hoursOk}>{saveLabel}</Button>
        {onCancel && <button type="button" className={g.ghost} onClick={onCancel}>{cancelLabel}</button>}
        {!experience && <span className={g.unit}>Pick how much you’ve made to go on.</span>}
      </div>
    </form>
  );
}
