'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function LoungeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Lounge error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        color: 'var(--fg)',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 40 }}>
        <AlertTriangle size={48} style={{ color: '#d7340b', marginBottom: 24 }} />
        <h1
          style={{
            fontFamily: 'var(--display)',
            fontSize: '1.5rem',
            letterSpacing: 4,
            marginBottom: 12,
          }}
        >
          LOUNGE ERROR
        </h1>
        <p
          style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            opacity: 0.6,
            lineHeight: 1.8,
            marginBottom: 32,
          }}
        >
          {error.message || 'An unexpected error occurred in the lounge.'}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            style={{
              padding: '10px 24px',
              background: 'var(--accent)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: 6,
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: 1,
              cursor: 'pointer',
              textTransform: 'uppercase',
            }}
          >
            Try Again
          </button>
          <Link
            href="/"
            style={{
              padding: '10px 24px',
              background: 'transparent',
              color: 'var(--fg-muted)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              fontFamily: 'var(--mono)',
              fontSize: 11,
              letterSpacing: 1,
              cursor: 'pointer',
              textTransform: 'uppercase',
              textDecoration: 'none',
            }}
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}