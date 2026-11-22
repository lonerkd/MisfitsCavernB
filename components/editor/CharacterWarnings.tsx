'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { ArrowRight, EyeOff, RotateCcw } from 'lucide-react';
import { checkCharacters, RULE_LABELS, type CharacterWarning } from '@/lib/scriptos/character-checks';
import { readDismissed, writeDismissed } from '@/lib/scriptos/warning-dismissals';
import type { ScriptLine, Scene } from '@/lib/scriptos/types';

/** A dismissal set kept on this device, per script. */
export function useDismissedWarnings(storageKey: string) {
  const [state, setState] = useState<{ key: string; ids: Set<string> }>(() => ({ key: storageKey, ids: readDismissed(storageKey) }));
  const ids = state.key === storageKey ? state.ids : readDismissed(storageKey);
  const set = useCallback((next: Set<string>) => { writeDismissed(storageKey, next); setState({ key: storageKey, ids: next }); }, [storageKey]);
  return {
    ids,
    dismiss: (id: string) => set(new Set([...ids, id])),
    restore: (id: string) => { const n = new Set(ids); n.delete(id); set(n); },
  };
}

/**
 * The script's own consistency warnings about its characters, as a quiet list: each says what it saw and why, jumps to the line, and can be
 * dismissed (kept on this device, per script). Derived from the parse; nothing is stored about the warnings themselves.
 */
export function CharacterWarnings({ lines, scenes, rejectedNames, storageKey, onJump, jumpLabel = 'Go to line' }: {
  lines: ScriptLine[];
  scenes: Scene[];
  rejectedNames: readonly string[];
  storageKey: string;
  onJump: (line: number) => void;
  jumpLabel?: string;
}) {
  const all = useMemo(() => checkCharacters(lines, scenes, { rejectedNames }), [lines, scenes, rejectedNames]);
  const { ids, dismiss, restore } = useDismissedWarnings(storageKey);
  const shown = all.filter((w) => !ids.has(w.id));
  const hidden = all.filter((w) => ids.has(w.id));
  const item = (w: CharacterWarning, dismissed: boolean) => (
    <li key={w.id} data-testid="character-warning" data-rule={w.rule} style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.08)', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, color: w.severity === 'warn' ? 'var(--warn-text, var(--fg))' : 'var(--fg-muted)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)' }}>{RULE_LABELS[w.rule]}</div>
      <div style={{ fontSize: 13, color: 'var(--fg)' }}>{w.message}</div>
      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{w.reason}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
        <button type="button" onClick={() => onJump(w.line)} style={linkBtn}>
          <ArrowRight size={12} aria-hidden /> {jumpLabel} {w.line + 1}
        </button>
        {dismissed
          ? <button type="button" onClick={() => restore(w.id)} style={linkBtn} aria-label={`Show again: ${w.message}`}><RotateCcw size={12} aria-hidden /> Show again</button>
          : <button type="button" onClick={() => dismiss(w.id)} style={linkBtn} aria-label={`It is on purpose: ${w.message}`}><EyeOff size={12} aria-hidden /> It is on purpose</button>}
      </div>
    </li>
  );
  return (
    <section aria-label="Consistency warnings" data-testid="character-warnings" style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(var(--ink-rgb), 0.08)' }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg-strong)', margin: '0 0 4px' }}>Consistency {shown.length > 0 && <span style={{ color: 'var(--fg-muted)', fontWeight: 400 }}>· {shown.length}</span>}</h3>
      <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '0 0 10px' }}>Read from the script itself. Dismissing hides a warning on this device only.</p>
      {all.length === 0 && <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>Nothing looks inconsistent: no name spelled two ways, no one speaking after dying.</p>}
      {all.length > 0 && shown.length === 0 && <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: 0 }}>Every warning is dismissed.</p>}
      {shown.length > 0 && <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>{shown.map((w) => item(w, false))}</ul>}
      {hidden.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: 12, color: 'var(--fg-muted)', cursor: 'pointer' }}>Dismissed · {hidden.length}</summary>
          <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>{hidden.map((w) => item(w, true))}</ul>
        </details>
      )}
    </section>
  );
}

const linkBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 8, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.12)', color: 'var(--fg-muted)', fontSize: 12 };
