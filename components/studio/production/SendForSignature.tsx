'use client';

import React, { useMemo, useState } from 'react';
import { Copy, PenLine, Undo2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { createSigningRequest, voidSigningRequest, type SigningRequest } from '@/lib/supabase/signing';
import { SIGNING_TEMPLATES, signUrl, signingState, type SigningTemplateId } from '@/lib/studio/signing-templates';
import { cx } from '../ui';
import s from '../studio.module.css';

type CrewRow = { user_id: string; username: string; craft: string | null };

const TONE: Record<string, string | undefined> = { done: 'var(--ok)', open: undefined, warn: 'var(--warn)', bad: 'var(--danger)' };
const link = (token: string) => signUrl(token, typeof window === 'undefined' ? '' : window.location.origin);

/** The signature requests already sent for one piece of paperwork: where each stands, its link while it is open, and withdraw. */
export function SigningStatus({ requests, onChanged }: { requests: SigningRequest[]; onChanged: (r: SigningRequest) => void }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  if (requests.length === 0) return null;
  const copy = async (token: string) => {
    try { await navigator.clipboard.writeText(link(token)); toast('Link copied', 'success'); }
    catch { toast('Could not copy. Open the request and copy the link by hand.', 'error'); }
  };
  const withdraw = async (r: SigningRequest) => {
    if (!await confirm({ title: 'Withdraw this request?', message: 'The link stops working. You can send a new one.', confirmLabel: 'Withdraw', danger: true })) return;
    try { await voidSigningRequest(r.id); onChanged({ ...r, status: 'void' }); }
    catch (e) { toast(e instanceof Error ? e.message : 'Could not withdraw it', 'error'); }
  };
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }} aria-label="Signature requests">
      {requests.map((r) => {
        const st = signingState(r);
        const open = r.status === 'pending' && st.tone === 'open';
        return (
          <li key={r.id} className={s.row} style={{ gap: 8, flexWrap: 'wrap' }}>
            <PenLine size={11} aria-hidden />
            <span className={s.hint} style={{ flex: '1 1 220px', color: TONE[st.tone] }}>{r.signer_label ? `${r.signer_label}: ` : ''}{st.label}</span>
            {open && <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => void copy(r.token)}><Copy size={11} /> Copy link</button>}
            {open && <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => void withdraw(r)}><Undo2 size={11} /> Withdraw</button>}
          </li>
        );
      })}
    </ul>
  );
}

/** Make a signature request for a piece of paperwork: a starting text with the names filled in, edited, then a link to send. */
export function SendForSignature({ projectId, projectTitle, userId, documentId, kind, crew, personId, onCreated, onClose }: {
  projectId: string; projectTitle: string; userId: string; documentId: string; kind: 'contract' | 'release' | string;
  crew: CrewRow[]; personId: string | null;
  onCreated: (r: SigningRequest) => void; onClose: () => void;
}) {
  const { toast } = useToast();
  const templates = useMemo(() => SIGNING_TEMPLATES.filter((t) => t.docKind === kind || (kind !== 'contract' && kind !== 'release')), [kind]);
  const [tid, setTid] = useState<SigningTemplateId>(templates[0]?.id ?? 'crew-deal');
  const person = crew.find((c) => c.user_id === personId);
  const [signer, setSigner] = useState(person?.username ?? '');
  const [role, setRole] = useState(person?.craft ?? '');
  const [rate, setRate] = useState('');
  const [dates, setDates] = useState('');
  const tpl = SIGNING_TEMPLATES.find((t) => t.id === tid)!;
  const fill = { project: projectTitle, signer: signer.trim() || '[name]', role: role.trim() || undefined, rate: rate.trim() || undefined, dates: dates.trim() || undefined };
  const generated = tpl.body(fill);
  // The person's edits to the text win until a field changes the generated text again.
  const [edited, setEdited] = useState<{ base: string; text: string } | null>(null);
  const body = edited && edited.base === generated ? edited.text : generated;
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<SigningRequest | null>(null);

  const make = async () => {
    setBusy(true);
    try {
      const r = await createSigningRequest({ projectId, userId, documentId, title: tpl.title(fill), body, signerLabel: signer.trim() || null });
      setMade(r); onCreated(r);
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not make the link', 'error'); }
    finally { setBusy(false); }
  };
  const copy = async (token: string) => {
    try { await navigator.clipboard.writeText(link(token)); toast('Link copied', 'success'); }
    catch { toast('Could not copy. Select the link and copy it.', 'error'); }
  };

  if (made) {
    return (
      <div style={{ padding: '0 12px 12px', display: 'grid', gap: 8 }}>
        <p className={s.hint} style={{ margin: 0 }}>Send this link to {made.signer_label || 'the signer'}. It works for 30 days, needs no account, and the paperwork row turns to Signed when they sign.</p>
        <input readOnly className={s.input} aria-label="Signing link" value={link(made.token)} onFocus={(e) => e.currentTarget.select()} />
        <div className={s.row} style={{ gap: 8 }}>
          <button type="button" className={cx(s.btn, s.small)} onClick={() => void copy(made.token)}><Copy size={11} /> Copy link</button>
          <button type="button" className={cx(s.btnGhost, s.small)} onClick={onClose}>Done</button>
        </div>
      </div>
    );
  }
  return (
    <form style={{ padding: '0 12px 12px', display: 'grid', gap: 10 }} onSubmit={(e) => { e.preventDefault(); void make(); }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
        <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>Text</span>
          <select className={s.select} value={tid} onChange={(e) => { setTid(e.target.value as SigningTemplateId); setEdited(null); }}>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select></label>
        <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>Signer’s full name</span>
          <input className={s.input} value={signer} maxLength={120} onChange={(e) => setSigner(e.target.value)} list="signers" /></label>
        <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>{tid === 'location-release' ? 'Location' : tid === 'appearance-release' ? 'Part' : 'Position'}</span>
          <input className={s.input} value={role} maxLength={120} onChange={(e) => setRole(e.target.value)} /></label>
        <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>Rate or fee</span>
          <input className={s.input} value={rate} maxLength={80} placeholder="$250 per day" onChange={(e) => setRate(e.target.value)} /></label>
        <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>Date or range</span>
          <input className={s.input} value={dates} maxLength={80} placeholder="1–3 Dec 2026" onChange={(e) => setDates(e.target.value)} /></label>
      </div>
      <datalist id="signers">{crew.map((c) => <option key={c.user_id} value={c.username} />)}</datalist>
      <label className={s.stack} style={{ gap: 4 }}><span className={s.hint}>What they will read and sign. Edit it freely.</span>
        <textarea className={s.textarea} rows={12} maxLength={20000} value={body} onChange={(e) => setEdited({ base: generated, text: e.target.value })} /></label>
      <p className={s.hint} style={{ margin: 0 }}>This is a starting text, not legal advice. Have a lawyer review anything you rely on. A typed name and an agreement tick is the signature; the production keeps the name, the time and a fingerprint of the text.</p>
      {/\[[a-z ]+\]/i.test(body) && <p className={s.hint} style={{ margin: 0, color: 'var(--warn)' }}>The text still has [blanks] to fill in.</p>}
      <div className={s.row} style={{ gap: 8 }}>
        <button type="submit" className={s.btnPrimary} disabled={busy || !signer.trim() || !body.trim()}>{busy ? 'Making…' : 'Make the signing link'}</button>
        <button type="button" className={cx(s.btnGhost, s.small)} onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}
