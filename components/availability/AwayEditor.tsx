'use client';

// The dates you can't work: a day or a range, with a private note. The
// productions you're on see the dates (never the note) when they plan shoot
// days.

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { describeRange, localToday, rangeProblem, useMyUnavailability } from '@/lib/availability';

const label: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 2, display: 'block', marginBottom: 6, color: 'var(--fg-dim)' };
const field: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: 'rgba(var(--ink-rgb), 0.03)', border: '1px solid rgba(var(--ink-rgb), 0.1)',
  color: 'var(--fg)', fontSize: 13, borderRadius: 8, colorScheme: 'dark',
};
const btn: React.CSSProperties = {
  padding: '10px 14px', background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)',
  fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, cursor: 'pointer', borderRadius: 8,
};

export function AwayEditor({ userId }: { userId: string | null }) {
  const { toast } = useToast();
  const { rows, loaded, error, add, remove } = useMyUnavailability(userId);
  const [starts, setStarts] = useState('');
  const [ends, setEnds] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const today = localToday();
  const current = rows.filter((r) => r.ends_on >= today);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const last = ends || starts;
    const problem = rangeProblem(starts, last);
    if (problem) { toast(problem, 'error'); return; }
    setBusy(true);
    try {
      await add({ starts_on: starts, ends_on: last, note: note.trim() || null });
      setStarts(''); setEnds(''); setNote('');
      toast(`Away ${describeRange(starts, last)} — saved`, 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save those dates', 'error');
    } finally {
      setBusy(false);
    }
  };

  const drop = async (id: string, text: string) => {
    try { await remove(id); toast(`Removed ${text}`, 'success'); }
    catch (err) { toast(err instanceof Error ? err.message : 'Could not remove those dates', 'error'); }
  };

  return (
    <section aria-labelledby="away-title">
      <h2 id="away-title" style={{ ...label, fontSize: 'max(9px, var(--mc-min-font, 0px))', margin: '0 0 4px' }}>DATES YOU’RE AWAY</h2>
      <p style={{ fontSize: 12, color: 'var(--fg-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
        Productions you’re on see these dates when they plan shoot days — never your note.
      </p>
      {error && <p role="alert" style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</p>}
      {loaded && current.length > 0 && (
        <ul aria-label="Dates you’re away" style={{ listStyle: 'none', margin: '0 0 12px', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {current.map((r) => {
            const text = describeRange(r.starts_on, r.ends_on);
            return (
              <li key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--fg)' }}>{text}</span>
                {r.note && <span style={{ fontSize: 12, color: 'var(--fg-muted)', flex: 1 }}>{r.note}</span>}
                <button type="button" onClick={() => drop(r.id, text)} aria-label={`Remove ${text}`}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4, display: 'flex' }}>
                  <X size={14} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={submit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, alignItems: 'end' }}>
        <div>
          <label htmlFor="away-from" style={label}>FROM</label>
          <input id="away-from" type="date" value={starts} min={today} onChange={(e) => setStarts(e.target.value)} style={field} required />
        </div>
        <div>
          <label htmlFor="away-to" style={label}>TO (OPTIONAL)</label>
          <input id="away-to" type="date" value={ends} min={starts || today} onChange={(e) => setEnds(e.target.value)} style={field} />
        </div>
        <div>
          <label htmlFor="away-note" style={label}>NOTE (ONLY YOU SEE IT)</label>
          <input id="away-note" type="text" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="e.g. another shoot" style={field} />
        </div>
        <button type="submit" style={btn} disabled={busy || !userId}>{busy ? '…' : 'ADD DATES'}</button>
      </form>
    </section>
  );
}
