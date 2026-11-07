'use client';

const KEYS: Array<[string, string]> = [['scene', 'Scene'], ['action', 'Action'], ['character', 'Character'], ['dialogue', 'Dialogue'], ['transition', 'Transition'], ['note', 'Note']];

/**
 * The strip that sits on top of the keyboard while a writer types on a phone: one tap puts a scene heading, an action, a
 * character cue, dialogue, a transition or a note at the cursor. `pointerdown` is cancelled so the keyboard (and the caret) stay.
 */
export function PhoneElementBar({ insert, bottom, compact = false }: { insert: (type: string) => void; bottom: number; compact?: boolean }) {
  return (
    <div role="toolbar" aria-label="Insert an element" style={{
      position: 'fixed', left: 0, right: 0, bottom, zIndex: 150, display: 'flex', gap: 8, overflowX: 'auto', padding: compact ? '4px 12px' : '8px 12px', WebkitOverflowScrolling: 'touch',
      background: 'var(--surface)', borderTop: '1px solid rgba(var(--ink-rgb), 0.08)', paddingLeft: 'max(12px, env(safe-area-inset-left))', paddingRight: 'max(12px, env(safe-area-inset-right))',
    }}>
      {KEYS.map(([type, label]) => (
        <button key={type} type="button" onPointerDown={(e) => e.preventDefault()} onClick={() => insert(type)}
          style={{ flex: '0 0 auto', minHeight: compact ? 40 : 44, padding: compact ? '0 12px' : '0 16px', borderRadius: 14, border: '1px solid rgba(var(--ink-rgb), 0.12)', background: 'var(--bg)', color: 'var(--fg)', fontSize: 14, cursor: 'pointer' }}>{label}</button>
      ))}
    </div>
  );
}
