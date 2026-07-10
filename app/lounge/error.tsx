'use client';

export default function LoungeError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 }}>
      <div style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 4, color: 'var(--accent)' }}>LOUNGE ERROR</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--fg-muted)', maxWidth: 500, textAlign: 'center', lineHeight: 1.6 }}>
        {error.message || 'The lounge hit an unexpected error. Your messages and channels are safe.'}
      </div>
      {error.digest && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--fg-dim)', opacity: 0.5 }}>Error ID: {error.digest}</div>
      )}
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button onClick={reset} style={{ padding: '10px 24px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, cursor: 'pointer' }}>TRY AGAIN</button>
        <button onClick={() => window.location.href = '/'} style={{ padding: '10px 24px', background: 'transparent', color: 'var(--fg)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, cursor: 'pointer', textDecoration: 'none' }}>GO HOME</button>
      </div>
    </div>
  );
}