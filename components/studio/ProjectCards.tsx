'use client';

import React from 'react';
import { getPhasesForType, mapStatusToPhase, phaseIndexForType } from '@/lib/os/phases';

const PHASE_COLORS = ['#ffaa00', '#0099ff', '#d7340b', '#a855f7', '#10b981'];

/** Where the project is in its lifecycle, with phase names for its type. */
export function StageIndicator({ status, projectType }: { status: string; projectType?: string | null }) {
  const phases = getPhasesForType(projectType);
  const current = phaseIndexForType(projectType, mapStatusToPhase(status));
  return (
    <ol aria-label="Project phase" style={{ display: 'flex', gap: 4, listStyle: 'none', margin: 0, padding: 0 }}>
      {phases.map((p, i) => {
        const color = PHASE_COLORS[i % PHASE_COLORS.length];
        const state = i < current ? 'done' : i === current ? 'current' : 'next';
        return (
          <li key={p.id} aria-current={state === 'current' ? 'step' : undefined} style={{ flex: 1 }}>
            <div style={{ height: 3, borderRadius: 2, marginBottom: 10, background: state === 'next' ? 'rgba(224,221,174,0.08)' : color, opacity: state === 'done' ? 0.45 : 1 }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: state === 'next' ? 'var(--fg-dim)' : color, opacity: state === 'next' ? 0.6 : 1 }}>
              {p.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
