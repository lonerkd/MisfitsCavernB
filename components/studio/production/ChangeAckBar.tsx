'use client';

// "Seen" for a director's change that was sent to the crew: a person it reached says so with one tap (and can take it back), and
// the people who shape the project see who has and how many were told. What each person may read is the database's call
// (change_acknowledgements: your own row, or everyone's if you shape the project).
import React, { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { acknowledgeChange, listChangeAcks, unacknowledgeChange, type ChangeAck } from '@/lib/supabase/change-acks';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';

export function ChangeAckBar({ noteId, told }: { noteId: string; told: number | null | undefined }) {
  const { project, userId } = useStudio();
  const { toast } = useToast();
  const [acks, setAcks] = useState<ChangeAck[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setAcks(await listChangeAcks(project.id, noteId)); }
    catch (e) { toast((e as { message?: string } | null)?.message || 'Could not load who has seen this', 'error'); }
  }, [project.id, noteId, toast]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads who has acknowledged this note
  useEffect(() => { void load(); }, [load]);

  if (!userId || acks === null) return null;
  const mine = acks.some((a) => a.user_id === userId);
  const others = acks.filter((a) => a.user_id !== userId);

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (mine) await unacknowledgeChange(project.id, noteId, userId); else await acknowledgeChange(project.id, noteId, userId);
      await load();
    } catch (e) {
      toast((e as { message?: string } | null)?.message || 'Could not save that', 'error');
    } finally { setBusy(false); }
  };

  return (
    <div className={s.row} style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
      <button type="button" className={cx(s.btn, s.small)} style={{ minHeight: 44 }} aria-pressed={mine} onClick={() => void toggle()} disabled={busy}>
        <Check size={11} aria-hidden /> {mine ? 'Seen (undo)' : 'I have seen this'}
      </button>
      {others.length > 0 && (
        <span className={s.hint}>Seen by {others.map((a) => a.username ?? 'someone').join(', ')}{told ? ` (${acks.length} of ${told} told)` : ''}</span>
      )}
    </div>
  );
}
