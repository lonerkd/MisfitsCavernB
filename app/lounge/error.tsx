'use client';

import Link from 'next/link';

export default function LoungeError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
      <div style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 4, color: 'var(--accent)' }}>LOUNGE ERROR</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--fg-muted)', maxWidth: 'var(--w-form)', textAlign: 'center', lineHeight: 1.6 }}>
        {error.message || 'The lounge hit an unexpected error. Your messages and channels are safe.'}
      </div>
      {error.digest && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)'}}>Error ID: {error.digest}</div>
      )}
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button onClick={reset} style={{ padding: '10px 24px', background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, cursor: 'pointer' }}>TRY AGAIN</button>
        <Link href="/" style={{ padding: '10px 24px', background: 'transparent', color: 'var(--fg)', border: '1px solid rgba(var(--ink-rgb), 0.15)', borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, cursor: 'pointer', textDecoration: 'none' }}>GO HOME</Link>
      </div>
    </div>
  );
}