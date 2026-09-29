'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/spotify/auth';
import { withTimeout } from '@/lib/supabase/withTimeout';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

export default function SpotifyCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // The one-time code and state are consumed on first use; don't run twice.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const denied = params.get('error');

    if (denied) {
      setError(denied === 'access_denied' ? 'Spotify access was declined.' : `Spotify returned an error: ${denied}`);
      return;
    }
    if (!code) {
      setError('No authorization code found in URL.');
      return;
    }

    withTimeout(getAccessToken(code, params.get('state')), 15000, 'Spotify token exchange timed out.')
      .then(() => {

        window.dispatchEvent(new Event('spotify-auth-changed'));

        router.push('/soundtrack');
      })
      .catch((err) => {
        console.error('Spotify Auth Error:', err);
        setError(err.message || 'Failed to authenticate with Spotify');
      });
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      color: 'var(--fg)',
      fontFamily: 'var(--mono)',
      fontSize: 12,
      letterSpacing: 1.5,
      textTransform: 'uppercase'
    }}>
      {error ? (
        <div style={{ color: '#e8431a', textAlign: 'center' }}>
          <p style={{ marginBottom: 16 }}>Authentication Failed</p>
          <p style={{ fontSize: 11, maxWidth: 400, textTransform: 'none', color: 'var(--fg-dim)' }}>{error}</p>
          <Button onClick={() => router.push('/')} style={{ marginTop: 24 }}>
            Return to Hub
          </Button>
        </div>
      ) : (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ display: 'flex', alignItems: 'center', gap: 12 }}
        >
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 12px #10b981' }} />
          Connecting to Spotify...
        </motion.div>
      )}
    </div>
  );
}
