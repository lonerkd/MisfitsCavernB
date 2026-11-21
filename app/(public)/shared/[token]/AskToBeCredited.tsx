'use client';

// "Missing from the credits?" — a signed-in person asks the owner to add them. The project id comes from
// get_shared_project_id (signed-in only, exact share token); the API enforces who may ask (owner and crew are refused).

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase/client';
import { askToBeCredited, myCreditRequest, sharedProjectId, withdrawCreditRequest, type CreditRequest } from '@/lib/supabase/credit-requests';
import { useToast } from '@/components/ui/Toast';
import s from './shared.module.css';

const msg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

export default function AskToBeCredited({ token }: { token: string }) {
  const { toast } = useToast();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [req, setReq] = useState<CreditRequest | null>(null);
  const [open, setOpen] = useState(false);
  const [craft, setCraft] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user.id ?? null;
        if (!live) return;
        setUserId(uid);
        if (uid) {
          const pid = await sharedProjectId(token);
          if (!pid) return;
          const latest = await myCreditRequest(pid, uid);
          if (!live) return;
          setProjectId(pid);
          setReq(latest);
        }
      } catch (e) {
        if (live) toast(msg(e, 'Could not check your credit request.'), 'error');
      } finally {
        if (live) setReady(true);
      }
    })();
    return () => { live = false; };
  }, [token, toast]);

  const send = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!projectId || !userId || busy) return;
    setBusy(true);
    try {
      await askToBeCredited(projectId, userId, craft.trim(), note.trim());
      setReq(await myCreditRequest(projectId, userId));
      setOpen(false); setCraft(''); setNote('');
      toast('Sent. The owner will see your request.', 'success');
    } catch (err) {
      toast(msg(err, 'Could not send your request.'), 'error');
    } finally {
      setBusy(false);
    }
  }, [projectId, userId, busy, craft, note, toast]);

  const withdraw = async () => {
    if (!req || busy) return;
    setBusy(true);
    try {
      await withdrawCreditRequest(req.id);
      setReq(null);
      toast('Request withdrawn.', 'success');
    } catch (err) {
      toast(msg(err, 'Could not withdraw your request.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;
  if (!userId) {
    const next = typeof window !== 'undefined' ? window.location.pathname : `/shared/${token}`;
    return <div className={s.ask}><a className={s.askLink} href={`/auth?next=${encodeURIComponent(next)}`}>Sign in to ask to be credited</a></div>;
  }
  if (!projectId) return null;
  if (req?.status === 'approved') return null;
  if (req?.status === 'pending') {
    return (
      <div className={s.ask}>
        <span>Asked: {req.craft}. The owner has not answered yet.</span>
        <button type="button" className={s.askBtn} onClick={withdraw} disabled={busy}>Withdraw</button>
      </div>
    );
  }
  return (
    <div className={s.ask}>
      {req?.status === 'declined' && <span>The owner did not add this credit.</span>}
      {!open ? (
        <button type="button" className={s.askBtn} onClick={() => setOpen(true)}>Missing from the credits? Ask to be added</button>
      ) : (
        <form className={s.askForm} onSubmit={send}>
          <label className={s.askLabel}>What did you do?
            <input className={s.askField} value={craft} maxLength={60} required onChange={(e) => setCraft(e.target.value)} />
          </label>
          <label className={s.askLabel}>Note
            <textarea className={s.askField} value={note} maxLength={500} rows={3} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className={s.askRow}>
            <button type="submit" className={s.askBtn} disabled={busy}>Send</button>
            <button type="button" className={s.askBtn} onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
