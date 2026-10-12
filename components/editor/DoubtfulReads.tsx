'use client';

import React from 'react';
import { Check, UserCheck, UserX } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { studio, type ReadingCorrection } from '@/lib/studio';
import type { Doubt } from '@/lib/scriptos/review';

const messageOf = (e: unknown): string => (e as { message?: string } | null)?.message || 'Could not save that';
const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 9px', borderRadius: 8, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.14)', color: 'var(--fg)', fontSize: 12 };

/**
 * The lines the reader is least sure of, with what it read them as and one tap
 * to settle a name for the whole project. Nothing is written to the script.
 */
export function DoubtfulReads({ doubts, projectId, onSaved }: { doubts: Doubt[]; projectId: string | null; onSaved: (row: ReadingCorrection) => void }) {
  const { toast } = useToast();
  const [gone, setGone] = React.useState<Set<number>>(new Set());
  const shown = doubts.filter((d) => !gone.has(d.index));
  if (!shown.length) return null;

  const say = async (d: Doubt, kind: 'not_character' | 'character') => {
    if (!projectId || !d.name) return;
    try {
      onSaved(await studio.setReadingCorrection(projectId, d.name, kind));
      toast(kind === 'character' ? `${d.name} is read as a character` : `${d.name} is not read as a character any more`, 'success');
    } catch (e) {
      toast(messageOf(e), 'error');
    }
  };

  return (
    <section aria-label="Doubtful reads" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Not sure about {shown.length === 1 ? 'this line' : `these ${shown.length} lines`}</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {shown.map((d) => (
          <li key={d.index} style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(var(--ink-rgb), 0.04)', border: '1px solid rgba(var(--ink-rgb), 0.08)' }}>
            <div style={{ fontFamily: 'var(--script)', fontSize: 13, color: 'var(--fg)', overflowWrap: 'anywhere' }}>{d.text.length > 70 ? `${d.text.slice(0, 70)}…` : d.text}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '4px 0 8px' }}>Line {d.index + 1} · {d.why}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {projectId && d.name && d.type === 'character' && <button type="button" style={btn} onClick={() => void say(d, 'not_character')}><UserX size={12} aria-hidden /> Not a character</button>}
              {projectId && d.name && d.type !== 'character' && d.alternative === 'character' && <button type="button" style={btn} onClick={() => void say(d, 'character')}><UserCheck size={12} aria-hidden /> It’s a character</button>}
              <button type="button" style={btn} onClick={() => setGone((g) => new Set(g).add(d.index))} title="Hide this for now"><Check size={12} aria-hidden /> Looks right</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
