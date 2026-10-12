'use client';

import React from 'react';
import { RotateCcw, UserX } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { studio, type ReadingCorrection } from '@/lib/studio';

const messageOf = (e: unknown): string => (e as { message?: string } | null)?.message || 'Could not save that';

/**
 * Tell the reader a name is not a character (it is action, a sound, a title…).
 * It is remembered for the whole project and obeyed everywhere the script is read.
 */
export function NotCharacterButton({ projectId, name, onSaved }: { projectId: string; name: string; onSaved: (row: ReadingCorrection) => void }) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const say = async () => {
    setBusy(true);
    try {
      onSaved(await studio.setReadingCorrection(projectId, name, 'not_character'));
      toast(`${name} is not read as a character any more`, 'success');
    } catch (e) {
      toast(messageOf(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button" onClick={() => void say()} disabled={busy}
      title="Remember that this isn't a character, for everyone on the project"
      style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, cursor: busy ? 'wait' : 'pointer', background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.12)', color: 'var(--fg-muted)', fontSize: 12 }}
    >
      <UserX size={12} aria-hidden /> Not a character
    </button>
  );
}

/** The names the project has said are not characters, each with a way back. */
export function RejectedNames({ rows, onRemoved }: { rows: ReadingCorrection[]; onRemoved: (id: string) => void }) {
  const { toast } = useToast();
  if (!rows.length) return null;
  const restore = async (row: ReadingCorrection) => {
    try {
      await studio.removeReadingCorrection(row.id);
      onRemoved(row.id);
      toast(`${row.name} will be read normally again`, 'success');
    } catch (e) {
      toast(messageOf(e), 'error');
    }
  };
  return (
    <section aria-label="Names not read as characters" style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(var(--ink-rgb), 0.08)' }}>
      <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 8 }}>Not read as characters</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {rows.map((r) => (
          <li key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 6px 4px 10px', borderRadius: 8, background: 'rgba(var(--ink-rgb), 0.04)', fontSize: 12, color: 'var(--fg)' }}>
            {r.name}
            <button type="button" onClick={() => void restore(r)} aria-label={`Read ${r.name} as a character again`} title="Read it normally again"
              style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', padding: 2 }}>
              <RotateCcw size={12} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
