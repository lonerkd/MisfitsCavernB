'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', username: '', password: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { username: formData.username } }
        });
        if (error) throw error;
        // Profile auto-created via trigger
        router.push('/profile');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
        if (error) throw error;
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 440, padding: 40 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: '2rem', letterSpacing: 8, marginBottom: 8 }}>
            MISFITS<br />CAVERN
          </div>
          <div style={{ fontSize: 9, letterSpacing: 4, opacity: 0.4, fontFamily: 'var(--mono)' }}>
            {mode === 'signup' ? 'JOIN THE CREATIVE COLLECTIVE' : 'WELCOME BACK, CREATOR'}
          </div>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', marginBottom: 32, border: '1px solid rgba(255,255,255,0.08)' }}>
          {(['signin', 'signup'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{
                flex: 1, padding: 14, background: mode === m ? 'var(--accent)' : 'transparent',
                color: mode === m ? 'var(--bg)' : 'var(--fg)', border: 'none',
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, cursor: 'pointer',
                transition: 'all 0.2s'
              }}>
              {m === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
          <div>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, opacity: 0.5, display: 'block', marginBottom: 8 }}>
              EMAIL
            </label>
            <input type="email" required value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="creator@misfitscavern.com"
              style={{ width: '100%', padding: 14, background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)',
                fontFamily: 'var(--mono)', fontSize: 12, outline: 'none',
                transition: 'border-color 0.2s' }} />
          </div>

          {mode === 'signup' && (
            <div>
              <label style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, opacity: 0.5, display: 'block', marginBottom: 8 }}>
                USERNAME
              </label>
              <input type="text" required={mode === 'signup'} value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                placeholder="your_handle"
                style={{ width: '100%', padding: 14, background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)',
                  fontFamily: 'var(--mono)', fontSize: 12, outline: 'none' }} />
            </div>
          )}

          <div>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, opacity: 0.5, display: 'block', marginBottom: 8 }}>
              PASSWORD
            </label>
            <input type="password" required value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••••"
              style={{ width: '100%', padding: 14, background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)',
                fontFamily: 'var(--mono)', fontSize: 12, outline: 'none' }} />
          </div>

          {error && (
            <div style={{ padding: 12, background: 'rgba(255,60,0,0.1)', border: '1px solid rgba(255,60,0,0.3)',
              fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ padding: 16, background: loading ? 'rgba(255,60,0,0.5)' : 'var(--accent)',
              color: 'var(--bg)', border: 'none', fontFamily: 'var(--mono)',
              fontSize: 11, letterSpacing: 3, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', marginTop: 8 }}>
            {loading ? 'ENTERING THE CAVERN...' : (mode === 'signin' ? 'ENTER' : 'JOIN')}
          </button>
        </form>

        {/* Discord OAuth */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, opacity: 0.3, letterSpacing: 2 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signInWithOAuth({
                provider: 'discord',
                options: { redirectTo: `${window.location.origin}/auth/callback` }
              });
            }}
            style={{ width: '100%', padding: 14, background: 'rgba(88,101,242,0.12)', border: '1px solid rgba(88,101,242,0.4)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'all 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(88,101,242,0.22)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(88,101,242,0.12)'}>
            <svg width="16" height="12" viewBox="0 0 71 55" fill="#5865f2"><path d="M60.1 4.9A58.5 58.5 0 0045.6 0a40 40 0 00-1.8 3.7 54.1 54.1 0 00-16.2 0A38.5 38.5 0 0025.9 0 58.3 58.3 0 0011.3 5C1.6 19.6-1 33.8.3 47.9a58.8 58.8 0 0017.9 9 44 44 0 003.8-6.2 38.3 38.3 0 01-6-2.9l1.5-1.2a41.9 41.9 0 0036.2 0l1.5 1.2a38.3 38.3 0 01-6 2.9 44 44 0 003.8 6.2 58.6 58.6 0 0017.9-9C72 31.6 68.3 17.5 60.1 4.9zM23.7 39.4c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2 6.5 3.2 6.4 7.2c0 4-2.8 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2 6.5 3.2 6.4 7.2c0 4-2.9 7.2-6.4 7.2z"/></svg>
            CONTINUE WITH DISCORD
          </button>
        </div>

        <div style={{ marginTop: 20, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 9, opacity: 0.25 }}>
          By joining you agree to be excellent to each other.
        </div>
      </div>
    </div>
  );
}
