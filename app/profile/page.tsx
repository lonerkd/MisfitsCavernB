'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, LogOut, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

const ROLES = ['Director', 'DP / Cinematographer', 'Editor', 'Writer', 'Sound Designer', 'Colorist', 'Producer', 'Actor', 'PA', 'Multi-hyphenate'];

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUser(user);

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data);
    });
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      ...profile,
      updated_at: new Date().toISOString()
    });

    setSaving(false);
    setMessage(error ? `Error: ${error.message}` : 'Profile saved!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.5, marginBottom: 16 }}>Not signed in.</p>
          <Link href="/auth" style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 11 }}>Sign in →</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
      <header style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: 60,
        background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        padding: '16px 24px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', zIndex: 100
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>PROFILE</h1>
        </Link>
        <div style={{ display: 'flex', gap: 12 }}>
          {message && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)' }}>{message}</span>}
          <button onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              background: 'var(--accent)', color: 'var(--bg)', border: 'none',
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, cursor: 'pointer' }}>
            <Save size={12} /> {saving ? 'SAVING...' : 'SAVE'}
          </button>
          <button onClick={handleSignOut}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              background: 'transparent', color: 'var(--fg)', border: '1px solid rgba(255,255,255,0.1)',
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, cursor: 'pointer' }}>
            <LogOut size={12} /> SIGN OUT
          </button>
        </div>
      </header>

      <div style={{ marginTop: 60, maxWidth: 600, margin: '60px auto 0', padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--accent)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
            fontFamily: 'var(--display)', fontSize: '2rem', color: 'var(--bg)'
          }}>
            {profile.username?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.5 }}>{user.email}</div>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          {[
            { key: 'username', label: 'USERNAME', type: 'text', placeholder: 'your_handle' },
            { key: 'bio', label: 'BIO', type: 'textarea', placeholder: 'Tell the community about yourself...' },
            { key: 'location', label: 'LOCATION', type: 'text', placeholder: 'Los Angeles, CA' },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key}>
              <label style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, opacity: 0.5, display: 'block', marginBottom: 8 }}>
                {label}
              </label>
              {type === 'textarea' ? (
                <textarea value={profile[key] || ''} onChange={e => setProfile({ ...profile, [key]: e.target.value })}
                  placeholder={placeholder}
                  style={{ width: '100%', padding: 12, background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)',
                    fontFamily: 'var(--mono)', fontSize: 11, height: 80, resize: 'none' }} />
              ) : (
                <input type={type} value={profile[key] || ''} onChange={e => setProfile({ ...profile, [key]: e.target.value })}
                  placeholder={placeholder}
                  style={{ width: '100%', padding: 12, background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)',
                    fontFamily: 'var(--mono)', fontSize: 11 }} />
              )}
            </div>
          ))}

          <div>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, opacity: 0.5, display: 'block', marginBottom: 8 }}>
              ROLE / SPECIALTY
            </label>
            <select value={profile.role || ''} onChange={e => setProfile({ ...profile, role: e.target.value })}
              style={{ width: '100%', padding: 12, background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', color: 'var(--fg)',
                fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer' }}>
              <option value="">Select your role...</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, opacity: 0.5, display: 'block', marginBottom: 8 }}>
              AVAILABILITY STATUS
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              {['OPEN', 'BUSY'].map(s => (
                <button key={s} onClick={() => setProfile({ ...profile, status: s })}
                  style={{
                    flex: 1, padding: 12,
                    background: profile.status === s ? (s === 'OPEN' ? 'rgba(0,255,0,0.1)' : 'rgba(255,60,0,0.1)') : 'transparent',
                    border: `1px solid ${profile.status === s ? (s === 'OPEN' ? '#00ff00' : 'var(--accent)') : 'rgba(255,255,255,0.1)'}`,
                    color: profile.status === s ? (s === 'OPEN' ? '#00ff00' : 'var(--accent)') : 'var(--fg)',
                    fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, cursor: 'pointer'
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
