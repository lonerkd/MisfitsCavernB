'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { answerCreditRequest, listCreditRequests, type CreditRequest } from '@/lib/supabase/credit-requests';
import { cx } from './ui';
import s from './studio.module.css';

/**
 * The owner's pending "put me in the credits" asks. Approve records the credit they asked for (no access to the project);
 * Decline just closes the ask. Renders nothing when no one is waiting. The caller shows it to the project's owner only.
 */
export function CreditRequests({ projectId, ownerId, onChanged }: { projectId: string; ownerId: string; onChanged?: () => void }) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try { setRequests(await listCreditRequests(projectId)); }
    catch (e) { toast((e as { message?: string } | null)?.message || 'Could not load credit requests', 'error'); }
  }, [projectId, toast]);

  useEffect(() => {
    let alive = true;
    listCreditRequests(projectId)
      .then((rows) => { if (alive) setRequests(rows); })
      .catch((e) => { if (alive) toast((e as { message?: string } | null)?.message || 'Could not load credit requests', 'error'); });
    return () => { alive = false; };
  }, [projectId, toast]);

  const answer = async (req: CreditRequest, approve: boolean) => {
    if (busyId) return;
    setBusyId(req.id);
    const who = req.username || 'They';
    try {
      await answerCreditRequest(req, approve, ownerId);
      toast(approve ? `Credited ${who} as ${req.craft}` : `Declined ${who}’s request`, 'success');
      await reload();
      onChanged?.();
    } catch (e) {
      toast((e as { message?: string } | null)?.message || 'Could not answer that request', 'error');
    } finally { setBusyId(null); }
  };

  if (requests.length === 0) return null;

  return (
    <section aria-label="Credit requests" style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-strong)', marginBottom: 8 }}>Credit requests</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {requests.map((r) => (
          <li key={r.id} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ flex: 1, minWidth: 180, fontSize: 13, color: 'var(--fg-strong)', overflowWrap: 'anywhere' }}>
              <strong>{r.username || 'Someone'}</strong> asks to be credited as <strong>{r.craft}</strong>
              {r.note && <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 2 }}>{r.note}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className={cx(s.btn, s.small)} style={{ minHeight: 44, minWidth: 44 }} disabled={busyId !== null}
                title="Adds this credit to the film and to their page; it does not give them access to the project" onClick={() => void answer(r, true)}>Approve</button>
              <button type="button" className={cx(s.btn, s.small)} style={{ minHeight: 44, minWidth: 44 }} disabled={busyId !== null}
                title="Closes the request; they are not added" onClick={() => void answer(r, false)}>Decline</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
