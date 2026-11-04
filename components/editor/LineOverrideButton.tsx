'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { studio } from '@/lib/studio';
import type { LineType } from '@/lib/scriptos/types';

const LINE_TYPES: LineType[] = ['slug', 'action', 'character', 'dialogue', 'parenthetical', 'transition', 'shot', 'text', 'title', 'centered', 'section', 'synopsis', 'lyric', 'scene', 'note', 'dual', 'pagebreak', 'boneyard', 'empty'];

export function LineOverrideButton({ projectId, scriptId, lineIndex, currentType, onSaved }: {
  projectId: string | null;
  scriptId: string | null;
  lineIndex: number;
  currentType: string;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  if (!projectId || !scriptId) return null;

  const setOverride = async (type: LineType) => {
    setBusy(true);
    try {
      await studio.setLineOverride(projectId, scriptId, lineIndex, type);
      toast(`Line ${lineIndex + 1} forced to ${type}`, 'success');
      onSaved();
    } catch (e) {
      toast((e as { message?: string })?.message || 'Could not save', 'error');
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const removeOverride = async () => {
    setBusy(true);
    try {
      await studio.removeLineOverride(projectId, scriptId, lineIndex);
      toast(`Line ${lineIndex + 1} override removed`, 'success');
      onSaved();
    } catch (e) {
      toast((e as { message?: string })?.message || 'Could not remove', 'error');
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={busy}
        title="Force this line to a type"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 4, cursor: busy ? 'wait' : 'pointer', background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.12)', color: 'var(--fg-muted)', fontSize: 11 }}
      >
        <Lock size={10} /> Force type
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 50, background: 'var(--card)', border: '1px solid rgba(var(--ink-rgb), 0.14)', borderRadius: 8, padding: 4, maxHeight: 240, overflow: 'auto', minWidth: 140 }}>
          {LINE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => void setOverride(t)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px 8px', borderRadius: 4, border: 'none', background: t === currentType ? 'rgba(var(--ink-rgb), 0.08)' : 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--fg)' }}
            >
              {t}{t === currentType ? ' (current)' : ''}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void removeOverride()}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px 8px', borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: 'var(--fg-muted)' }}
          >
            Remove override
          </button>
        </div>
      )}
    </div>
  );
}