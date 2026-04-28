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
      </div>
    </div>
  );
}
