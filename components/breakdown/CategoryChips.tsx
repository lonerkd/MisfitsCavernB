'use client';

import React from 'react';
import { readable } from '@/lib/color';
import type { BreakdownCategory } from '@/lib/breakdown';
import b from './breakdown.module.css';

export const catStyle = (color: string): React.CSSProperties => ({ ['--c' as string]: readable(color) });

/** The project's categories as colour chips, numbered for Alt+1…9. */
export function CategoryChips({ categories, selected, onPick, numbered = false, label }: {
  categories: BreakdownCategory[];
  selected?: string | null;
  onPick: (category: BreakdownCategory) => void;
  numbered?: boolean;
  label: string;
}) {
  return (
    <div className={b.cats} role="group" aria-label={label}>
      {categories.map((c, i) => (
        <button
          key={c.id}
          type="button"
          className={`${b.cat} ${selected === c.id ? b.catOn : ''}`}
          style={catStyle(c.color)}
          aria-pressed={selected != null ? selected === c.id : undefined}
          onMouseDown={(e) => e.preventDefault() /* keep the script's selection */}
          onClick={() => onPick(c)}
          title={numbered && i < 9 ? `${c.label} (Alt+${i + 1})` : c.label}
        >
          <span className={b.dot} aria-hidden />
          <span className={b.catLabel}>{c.label}</span>
          {numbered && i < 9 && <span className={b.key} aria-hidden>{i + 1}</span>}
        </button>
      ))}
    </div>
  );
}
