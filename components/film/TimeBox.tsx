'use client';

import React from 'react';
import f from './film.module.css';

/** The three times of a day, side by side, as ruled cells. */
export function TimeBoxes({ children }: { children: React.ReactNode }) {
  return <div className={f.boxes}>{children}</div>;
}

/**
 * One time in a ruled cell (Call, Shoot, Wrap). Edits are committed when the
 * field loses focus; `late` fills it with the limit colour (it breaks a limit).
 * `name` is the accessible name — the visible label is short.
 */
export function TimeBox({ label, name, value, late = false, onCommit }: {
  label: string; name: string; value: string; late?: boolean; onCommit: (next: string) => void;
}) {
  return (
    <label className={[f.box, late ? f.boxLate : '', value ? '' : f.boxEmpty].filter(Boolean).join(' ')}>
      <span className={f.label}>{label}</span>
      <input type="time" aria-label={name} defaultValue={value} key={value}
        onBlur={(e) => { if (e.target.value !== value) onCommit(e.target.value); }} />
    </label>
  );
}
