'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { listCandidates, addCandidate, updateCandidate, deleteCandidate, CANDIDATE_STATUSES, type CastingCandidate, type CandidateStatus } from '@/lib/supabase/casting';

const label = (s: CandidateStatus) => (s === 'shortlisted' ? 'Shortlisted' : s === 'callback' ? 'Callback' : 'Passed');
const field = { background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', fontSize: 12 } as const;

/** The shortlist for one role, side by side: who, their reel, a note and where they stand. Crew read; deciders write. */
export function CandidateShortlist({ projectId, character, userId, canEdit, crew, onCast, onChanged }: {
  projectId: string; character: string; userId: string | null; canEdit: boolean;
  crew: Array<{ user_id: string; profiles?: { username?: string | null } | null }>;
  onCast?: (userId: string) => void;
  onChanged?: () => void;
}) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState<CastingCandidate[]>([]);
  const [name, setName] = useState('');
  const [reel, setReel] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => listCandidates(projectId, character).then(setRows, () => setRows([])), [projectId, character]);
  useEffect(() => { void load(); }, [load]);

  const add = async () => {
    if (busy || !name.trim()) return;
    setBusy(true);
    try {
      const match = crew.find((m) => (m.profiles?.username ?? '').toLowerCase() === name.trim().toLowerCase());
      await addCandidate(projectId, character, { name, reel_url: reel, note, user_id: match?.user_id ?? null }, userId ?? undefined);
      setName(''); setReel(''); setNote('');
      await load();
      onChanged?.();
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not add the candidate', 'error'); }
    finally { setBusy(false); }
  };
  const setStatus = async (c: CastingCandidate, status: CandidateStatus) => {
    try { await updateCandidate(c.id, { status }); setRows((r) => r.map((x) => (x.id === c.id ? { ...x, status } : x))); onChanged?.(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not update', 'error'); }
  };
  const remove = async (c: CastingCandidate) => {
    if (!await confirm(`Remove ${c.name} from the shortlist?`)) return;
    try { await deleteCandidate(c.id); setRows((r) => r.filter((x) => x.id !== c.id)); onChanged?.(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not remove', 'error'); }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', color: 'var(--fg-muted)', marginBottom: 10 }}>Candidates</div>
      {rows.length === 0 && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', marginBottom: 8 }}>No one shortlisted for this role yet.</div>}
      {rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8, marginBottom: 10 }}>
          {rows.map((c) => (
            <div key={c.id} data-testid="candidate" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8, display: 'grid', gap: 6, opacity: c.status === 'passed' ? 0.6 : 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
              {c.reel_url && <a href={c.reel_url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)' }}>Watch reel ↗</a>}
              {c.note && <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{c.note}</div>}
              {canEdit ? (
                <select value={c.status} onChange={(e) => void setStatus(c, e.target.value as CandidateStatus)} aria-label={`Status for ${c.name}`} style={field}>
                  {CANDIDATE_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                </select>
              ) : <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>{label(c.status)}</div>}
              {canEdit && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {c.user_id && onCast && <button type="button" onClick={() => onCast(c.user_id!)} style={{ ...field, cursor: 'pointer', flex: 1 }}>Cast</button>}
                  <button type="button" onClick={() => void remove(c)} aria-label={`Remove ${c.name}`} style={{ ...field, cursor: 'pointer' }}>×</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {canEdit && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Candidate name" aria-label="Candidate name" style={{ ...field, flex: '1 1 140px' }} />
          <input value={reel} onChange={(e) => setReel(e.target.value)} placeholder="Reel link" aria-label="Reel link" style={{ ...field, flex: '1 1 140px' }} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" aria-label="Candidate note" style={{ ...field, flex: '2 1 180px' }} />
          <button type="button" onClick={() => void add()} disabled={busy || !name.trim()} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', cursor: 'pointer', fontSize: 12 }}>Shortlist</button>
        </div>
      )}
    </div>
  );
}
