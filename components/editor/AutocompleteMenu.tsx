import React from 'react';

// The editor's autocomplete dropdown (restructure phase 7 — moved out of
// the editor page unchanged), floated at the caret.
export function AutocompleteMenu({ open, items, activeIdx, pos, onPick, onHover }: {
  open: boolean;
  items: string[];
  activeIdx: number;
  pos: { top: number; left: number };
  onPick: (item: string) => void;
  onHover: (idx: number) => void;
}) {
  if (!open || items.length === 0) return null;
  return (
    <div style={{
      position: 'fixed', top: pos.top, left: pos.left,
      background: 'var(--bg-3)', border: '1px solid rgba(var(--ink-rgb), 0.12)',
      borderRadius: 8, padding: 4, zIndex: 1000, boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      maxHeight: 200, overflowY: 'auto', minWidth: 160
    }}>
      {items.map((item, idx) => (
        <div
          key={idx}
          onMouseDown={(e) => { e.preventDefault(); onPick(item); }}
          onMouseEnter={() => onHover(idx)}
          style={{ padding: '6px 12px', fontSize: 12, color: idx === activeIdx ? 'var(--fg-strong)' : 'var(--fg-muted)', background: idx === activeIdx ? 'rgba(var(--ink-rgb), 0.08)' : 'transparent', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--script)', letterSpacing: 0.5 }}
        >
          {item}
        </div>
      ))}
      <div style={{ padding: '4px 12px 2px', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)' }}>↑↓ navigate · ⏎/⇥ accept · esc</div>
    </div>
  );
}
