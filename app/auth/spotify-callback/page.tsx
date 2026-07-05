'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from '@/lib/spotify/auth';
import { motion } from 'framer-motion';

export default function SpotifyCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (!code) {
      setError('No authorization code found in URL.');
      return;
    }

    getAccessToken(code)
      .then(() => {
        // Dispatch an event so the SpotifyContext picks up the new token immediately
        window.dispatchEvent(new Event('spotify-auth-changed'));
        // Redirect back to the audio library or home
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
      background: 'var(--bg-main)',
      color: 'var(--fg)',
      fontFamily: 'var(--mono)',
      fontSize: 12,
      letterSpacing: 1.5,
      textTransform: 'uppercase'
    }}>
      {error ? (
        <div style={{ color: '#d7340b', textAlign: 'center' }}>
          <p style={{ marginBottom: 16 }}>Authentication Failed</p>
          <p style={{ fontSize: 10, opacity: 0.7, maxWidth: 400, textTransform: 'none' }}>{error}</p>
          <button 
            onClick={() => router.push('/')}
            style={{
              marginTop: 24, padding: '8px 16px', background: '#d7340b', color: '#050a14',
              border: 'none', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10,
              textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700
            }}
          >
            Return to Hub
          </button>
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
