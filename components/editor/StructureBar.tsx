'use client';

// The structure bar: the script's elements, one key or click away, always on
// show above the page. Arc Studio's quick insert, but in the writing flow —
// not buried in a side panel. Each button inserts its element at the caret;
// the deck's letter keys do the same while Caps Lock is on.

import React from 'react';
import { TYPE_COLORS } from '@/components/editor/editorConstants';
import type { LineType } from '@/lib/scriptos/types';

export interface StructureBarProps {
  /** Insert an element's template at the caret (the editor's `insertElement`). */
  insert: (type: LineType | string) => void;
  /** The type of the line the caret is on, highlighted so the writer sees where they are. */
  currentType?: LineType | null;
  /** Hide on a phone (the phone's own tool strip carries these). */
  hideOnPhone?: boolean;
}

const ELEMENTS: Array<{ type: LineType; label: string; hint: string }> = [
  { type: 'slug', label: 'Scene', hint: 'INT./EXT.' },
  { type: 'action', label: 'Action', hint: 'description' },
  { type: 'character', label: 'Character', hint: 'NAME' },
  { type: 'parenthetical', label: 'Paren', hint: '(beat)' },
  { type: 'dialogue', label: 'Dialogue', hint: 'speech' },
  { type: 'transition', label: 'Transition', hint: 'CUT TO:' },
  { type: 'note', label: 'Note', hint: '[[ ]] ' },
];

export function StructureBar({ insert, currentType, hideOnPhone = true }: StructureBarProps) {
  return (
    <div
      className={hideOnPhone ? 'mc-hide-phone' : undefined}
      role="toolbar"
      aria-label="Insert a script element"
      style={{
        display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap',
        padding: '6px 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-2)', flexShrink: 0,
      }}
    >
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))',
        letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)',
        color: 'var(--fg-dim)', marginRight: 4,
      }}>
        Insert
      </span>
      {ELEMENTS.map((el) => {
        const color = TYPE_COLORS[el.type] ?? 'var(--fg)';
        const isCurrent = currentType === el.type;
        return (
          <button
            key={el.type}
            type="button"
            onClick={() => insert(el.type)}
            title={`${el.label} · ${el.hint}`}
            aria-label={`Insert ${el.label.toLowerCase()}`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 9999, cursor: 'pointer',
              background: isCurrent ? `${color}1f` : 'var(--bg-3)',
              border: `1px solid ${isCurrent ? `${color}55` : 'var(--border)'}`,
              color: isCurrent ? color : 'var(--fg-muted)',
              fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))',
              letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)',
              transition: 'background 0.15s, color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${color}1a`;
              e.currentTarget.style.color = color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isCurrent ? `${color}1f` : 'var(--bg-3)';
              e.currentTarget.style.color = isCurrent ? color : 'var(--fg-muted)';
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} aria-hidden />
            {el.label}
          </button>
        );
      })}
    </div>
  );
}
