'use client';

// The last line of defence: an error in the root layout itself (providers,
// shell). It replaces the whole document, so it brings its own <html> and
// plain styles — the suite's theme and fonts may be what failed. The error is
// sent to the suite's log (Admin › Errors).

import { useEffect } from 'react';
import { reportError } from '@/lib/errors/report';

export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { void reportError('render', error, error?.digest); }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#040710', color: '#e8e4d8', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', padding: 24, textAlign: 'center' }}>
        <main style={{ maxWidth: 440 }}>
          <p style={{ fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--accent)', margin: '0 0 12px' }}>Something broke</p>
          <h1 style={{ fontSize: 22, margin: '0 0 12px', fontWeight: 600 }}>The Cavern couldn’t load.</h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: '#a9a495', margin: '0 0 20px' }}>
            It’s been reported. Reload to try again — your work is saved as you go.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ minHeight: 44, padding: '10px 22px', borderRadius: 9999, border: 0, background: 'var(--accent)', color: '#040710', fontFamily: 'inherit', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, cursor: 'pointer' }}
          >
            Reload
          </button>
          {error?.digest && <p style={{ fontSize: 11, color: '#7d7a70', marginTop: 16 }}>Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
