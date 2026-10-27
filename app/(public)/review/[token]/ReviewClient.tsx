'use client';

// The client's side of a review: read each version, comment, approve or ask for
// changes. They give a name (nothing else); the page says so. Every action goes
// through the review RPCs with the link's token.

import React, { useState } from 'react';
import { guestComment, guestDecide, type GuestReview, type GuestVersion } from '@/lib/review/versions';
import { parseCopy } from '@/lib/ad/copy';

const field: React.CSSProperties = { background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.14)', borderRadius: 8, padding: '8px 12px', color: 'var(--fg-strong)', fontSize: 15, width: '100%' };
const btn = (primary: boolean): React.CSSProperties => ({
  padding: '10px 16px', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600,
  border: `1px solid ${primary ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.2)'}`,
  background: primary ? 'var(--accent)' : 'transparent', color: primary ? 'var(--bg)' : 'var(--fg)',
});
const stamp = (at: string) => new Date(at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function VersionCard({ token, v, name }: { token: string; v: GuestVersion; name: string }) {
  const [decision, setDecision] = useState(v.decision);
  const [comments, setComments] = useState(v.comments);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const copy = v.script_format === 'copy' ? parseCopy(v.snapshot) : null;

  const needName = () => {
    if (!name.trim()) { setNote('Add your name first, so the team knows who you are.'); return true; }
    return false;
  };
  const comment = async () => {
    if (needName() || !text.trim()) return;
    setBusy(true);
    const ok = await guestComment(token, v.id, name.trim(), text.trim());
    setBusy(false);
    if (!ok) { setNote('We couldn’t send that. The link may have closed, or the comment is too long.'); return; }
    setComments((c) => [...c, { name: name.trim(), from_team: false, body: text.trim(), at: new Date().toISOString() }]);
    setText('');
    setNote(null);
  };
  const decide = async (d: 'approved' | 'changes_requested') => {
    if (needName()) return;
    setBusy(true);
    const ok = await guestDecide(token, v.id, d, name.trim(), text.trim());
    setBusy(false);
    if (!ok) { setNote('We couldn’t record that. The link may have closed, or the team has already confirmed this version.'); return; }
    if (text.trim()) setComments((c) => [...c, { name: name.trim(), from_team: false, body: text.trim(), at: new Date().toISOString() }]);
    setDecision(d);
    setText('');
    setNote(null);
  };

  return (
    <article aria-label={`${v.script_title}, version ${v.number}`} style={{ border: '1px solid rgba(var(--ink-rgb), 0.14)', borderRadius: 14, padding: 16, marginBottom: 24 }}>
      <header style={{ marginBottom: 12 }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.3rem', margin: 0 }}>{v.script_title}</h2>
        <div style={{ fontSize: 13, color: 'var(--fg-muted)' }}>Version {v.number}{v.label ? ` · ${v.label}` : ''}{v.sent_at ? ` · sent ${stamp(v.sent_at)}` : ''}</div>
      </header>
      {copy ? (
        <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
            {(['VISUAL', 'VO', 'SFX'] as const).map((section) => (
              <section key={section} style={{ background: 'rgba(var(--ink-rgb), 0.04)', borderRadius: 8, padding: 12 }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--fg-muted)' }}>{section === 'VISUAL' ? 'Picture' : section === 'VO' ? 'Voice-over' : 'Sound effects'}</h3>
                <div style={{ whiteSpace: 'pre-wrap' }}>{copy[section] || '—'}</div>
              </section>
            ))}
          </div>
          {(['HEADLINE', 'BODY', 'CTA'] as const).map((section) => copy[section] && (
            <section key={section} style={{ background: 'rgba(var(--ink-rgb), 0.04)', borderRadius: 8, padding: 12 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--fg-muted)' }}>{section === 'CTA' ? 'Call to action' : section === 'BODY' ? 'Body copy' : 'Headline'}</h3>
              <div style={{ whiteSpace: 'pre-wrap' }}>{copy[section]}</div>
            </section>
          ))}
        </div>
      ) : <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--script)', fontSize: 15, lineHeight: 1.5, background: 'rgba(var(--ink-rgb), 0.04)', borderRadius: 8, padding: 14, margin: '0 0 16px', overflowX: 'auto' }}>{v.snapshot || '(empty)'}</pre>}

      {decision && (
        <p role="status" style={{ margin: '0 0 12px', fontWeight: 600, color: decision === 'approved' ? 'var(--ok, var(--accent))' : 'var(--warn)' }}>
          {decision === 'approved' ? 'You approved this version.' : 'You asked for changes.'} The team has been told.
        </p>
      )}

      {comments.length > 0 && (
        <ol style={{ listStyle: 'none', margin: '0 0 12px', padding: 0, display: 'grid', gap: 8 }}>
          {comments.map((c, i) => (
            <li key={i} style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.1)', background: c.from_team ? 'rgba(232, 67, 26, 0.06)' : 'transparent' }}>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{c.from_team ? `${c.name} (the team)` : c.name} · {stamp(c.at)}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{c.body}</div>
            </li>
          ))}
        </ol>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        <label style={{ display: 'grid', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}>Your comment (optional with a decision)
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3} style={field} />
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" style={btn(true)} disabled={busy} onClick={() => void decide('approved')}>Approve this version</button>
          <button type="button" style={btn(false)} disabled={busy} onClick={() => void decide('changes_requested')}>Ask for changes</button>
          <button type="button" style={btn(false)} disabled={busy || !text.trim()} onClick={() => void comment()}>Send comment</button>
        </div>
        {note && <p role="alert" style={{ margin: 0, color: 'var(--danger)' }}>{note}</p>}
      </div>
    </article>
  );
}

export function ReviewClient({ token, review }: { token: string; review: GuestReview }) {
  const [name, setName] = useState('');
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 16px 96px', color: 'var(--fg)' }}>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.8rem', margin: '0 0 4px' }}>{review.label || 'For your review'}</h1>
      <p style={{ color: 'var(--fg-muted)', margin: '0 0 20px', maxWidth: '60ch' }}>
        Read each version, then approve it, ask for changes, or leave a comment. You don’t need an account — we only ask for your name, which the team sees next to what you write. Anyone with this link can do the same.
      </p>
      <label style={{ display: 'grid', gap: 4, fontSize: 12, color: 'var(--fg-muted)', maxWidth: 320, marginBottom: 24 }}>Your name
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" style={field} />
      </label>
      {review.versions.length === 0 && <p style={{ color: 'var(--fg-muted)' }}>Nothing has been sent on this link yet.</p>}
      {review.versions.map((v) => <VersionCard key={v.id} token={token} v={v} name={name} />)}
    </div>
  );
}
