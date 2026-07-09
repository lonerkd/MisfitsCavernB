'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Unhandled page error:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', color: 'var(--fg)', padding: 24, textAlign: 'center', gap: 18,
    }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 3, color: 'var(--accent)', textTransform: 'uppercase' }}>
        Something broke
      </span>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.6rem', letterSpacing: 2, margin: 0, maxWidth: 480 }}>
        This page hit an unexpected error.
      </h1>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--fg-muted)', maxWidth: 440 }}>
        Nothing else on the site is affected. Try again, or head back home.
      </p>
      <div style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.2)', padding: '12px', borderRadius: '8px', color: '#ff6666', fontFamily: 'var(--mono)', fontSize: 11, maxWidth: 600, wordBreak: 'break-all', textAlign: 'left' }}>
        <strong>Error Details:</strong> {error?.message || 'Unknown Error'} <br/>
        {error?.digest && <span style={{opacity: 0.7}}>Digest: {error.digest}</span>}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 22px', borderRadius: 9999, background: 'var(--accent)', color: '#040710',
            border: 'none', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2,
            textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Try Again
        </button>
        <button
          onClick={() => { window.location.href = '/'; }}
          style={{
            padding: '10px 22px', borderRadius: 9999, background: 'transparent', color: 'var(--fg)',
            border: '1px solid rgba(224,221,174,0.15)', fontFamily: 'var(--mono)', fontSize: 10,
            letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
