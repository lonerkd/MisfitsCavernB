'use client';

// The signer's side. They read the whole text, type their full name, tick that they agree to sign electronically, and sign.
// Or they decline with a reason. Nothing else is asked of them and no account is made.

import React, { useState } from 'react';
import { guestDecline, guestSign } from '@/lib/supabase/signing';

export interface SigningView {
  title: string;
  body: string;
  project_title: string;
  signer_label: string | null;
  status: 'pending' | 'signed' | 'declined' | 'void' | 'expired';
  expires_at: string;
  signed_name: string | null;
  signed_at: string | null;
}

const field: React.CSSProperties = { background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.14)', borderRadius: 8, padding: '10px 12px', color: 'var(--fg)', fontSize: 15, width: '100%', boxSizing: 'border-box' };
const btn = (primary: boolean): React.CSSProperties => ({
  padding: '10px 18px', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600,
  border: `1px solid ${primary ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.2)'}`,
  background: primary ? 'var(--accent)' : 'transparent', color: primary ? 'var(--bg)' : 'var(--fg)',
});
const when = (at: string) => new Date(at).toLocaleString(undefined, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function SignClient({ token, view }: { token: string; view: SigningView }) {
  const [status, setStatus] = useState(view.status);
  const [signedName, setSignedName] = useState(view.signed_name);
  const [signedAt, setSignedAt] = useState(view.signed_at);
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const sign = async () => {
    if (name.trim().length < 2) { setNote('Type your full name to sign.'); return; }
    if (!agree) { setNote('Tick the box to say you agree to sign this electronically.'); return; }
    setBusy(true); setNote(null);
    try {
      if (await guestSign(token, name.trim(), true)) { setStatus('signed'); setSignedName(name.trim()); setSignedAt(new Date().toISOString()); }
      else setNote('This request is no longer open (it may have been signed, withdrawn or expired). Ask the sender for a new link.');
    } catch (e) { setNote(e instanceof Error ? e.message : 'Could not sign.'); }
    finally { setBusy(false); }
  };
  const decline = async () => {
    setBusy(true); setNote(null);
    try {
      if (await guestDecline(token, reason.trim())) setStatus('declined');
      else setNote('This request is no longer open. Ask the sender for a new link.');
    } catch (e) { setNote(e instanceof Error ? e.message : 'Could not send that.'); }
    finally { setBusy(false); }
  };

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '40px 16px 72px', color: 'var(--fg)' }}>
      <p style={{ margin: 0, fontSize: 12, letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)' as React.CSSProperties['textTransform'], color: 'var(--fg-muted)' }}>{view.project_title}</p>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', margin: '4px 0 6px' }}>{view.title}</h1>
      {view.signer_label && <p style={{ margin: '0 0 16px', color: 'var(--fg-muted)' }}>For {view.signer_label}</p>}

      <article aria-label="The document" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 15, padding: 20, borderRadius: 14, border: '1px solid rgba(var(--ink-rgb), 0.12)', background: 'rgba(var(--ink-rgb), 0.03)' }}>
        {view.body}
      </article>

      {status === 'signed' && (
        <p role="status" style={{ marginTop: 20, padding: 14, borderRadius: 8, border: '1px solid var(--ok)', fontSize: 15 }}>
          Signed by <strong>{signedName}</strong>{signedAt ? ` on ${when(signedAt)}` : ''}. The production has been told. You can close this page.
        </p>
      )}
      {status === 'declined' && <p role="status" style={{ marginTop: 20, fontSize: 15 }}>You declined, and the production has been told. You can close this page.</p>}
      {status === 'expired' && <p role="status" style={{ marginTop: 20, fontSize: 15 }}>This link has expired. Ask the person who sent it for a new one.</p>}

      {status === 'pending' && (
        <section aria-label="Sign" style={{ marginTop: 24, display: 'grid', gap: 12 }}>
          {!declining ? (
            <>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--fg-muted)' }}>Your full name
                <input style={field} value={name} maxLength={120} autoComplete="name" onChange={(e) => setName(e.target.value)} />
              </label>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14 }}>
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3 }} />
                <span>I have read this document and I agree to sign it electronically. Typing my name is my signature.</span>
              </label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" style={btn(true)} onClick={() => void sign()} disabled={busy}>{busy ? 'Signing…' : 'Sign'}</button>
                <button type="button" style={btn(false)} onClick={() => setDeclining(true)} disabled={busy}>I don’t agree</button>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-dim)' }}>The production keeps your name, the time you signed and a fingerprint of this exact text. Nothing else is collected.</p>
            </>
          ) : (
            <>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--fg-muted)' }}>Tell the production why (optional)
                <textarea style={{ ...field, minHeight: 90 }} value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" style={btn(true)} onClick={() => void decline()} disabled={busy}>{busy ? 'Sending…' : 'Decline'}</button>
                <button type="button" style={btn(false)} onClick={() => setDeclining(false)} disabled={busy}>Back</button>
              </div>
            </>
          )}
          {note && <p role="alert" style={{ margin: 0, color: 'var(--danger)', fontSize: 14 }}>{note}</p>}
        </section>
      )}
      <p style={{ marginTop: 32, fontSize: 12, color: 'var(--fg-dim)', lineHeight: 1.5 }}>This page is only a way to sign. The document is between you and {view.project_title}; The Cavern is not a party to it and does not give legal advice. If you are unsure, ask a lawyer before you sign.</p>
    </main>
  );
}
