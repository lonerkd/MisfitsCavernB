'use client';

// The Cavern's switch: a disc. A ring with a lamp inside it; off, the lamp is a small dim dot resting at the rim, on, it
// slides to the middle, grows and lights in the accent. The whole disc is the touch target (44 pt on a phone, where the
// global touch rule makes a button at least that tall, and a round control that size is the point, not a defect).
// One component for every on/off in the suite so the look stays one look.

import React from 'react';

export const DISC_SIZE = 28;

export function DiscSwitch({
  on, onChange, label, accent, disabled,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  /** The accessible name: what this switch turns on. */
  label: string;
  /** The lit colour; the theme's accent by default. */
  accent?: string;
  disabled?: boolean;
}) {
  const lit = accent || 'var(--accent)';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="mc-disc"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        width: 44, height: 44, padding: 0, border: 'none', background: 'none', borderRadius: '50%',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'relative', display: 'block', width: DISC_SIZE, height: DISC_SIZE, borderRadius: '50%', boxSizing: 'border-box',
          border: `2px solid ${on ? lit : 'rgba(var(--ink-rgb), 0.28)'}`,
          background: on ? `color-mix(in srgb, ${lit} 16%, transparent)` : 'rgba(var(--ink-rgb), 0.04)',
          boxShadow: on ? `0 0 14px color-mix(in srgb, ${lit} 45%, transparent)` : 'none',
          transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
        }}
      >
        <span
          style={{
            position: 'absolute', borderRadius: '50%',
            width: on ? 14 : 6, height: on ? 14 : 6,
            top: on ? 5 : 3, left: on ? 5 : 3,
            background: on ? lit : 'var(--fg-dim)',
            transition: 'all 0.22s cubic-bezier(.3,.9,.3,1)',
          }}
        />
      </span>
    </button>
  );
}
