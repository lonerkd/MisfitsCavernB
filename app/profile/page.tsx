'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, LogOut, ExternalLink, Film, FileText, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

const ROLES = ['Director', 'DP / Cinematographer', 'Editor', 'Writer', 'Sound Designer', 'Colorist', 'Producer', 'Actor', 'PA', 'Multi-hyphenate'];

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: 12,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--fg)',
  fontFamily: 'var(--mono)',
  fontSize: 11,
  boxSizing: 'border-box',
  outline: 'none',
};

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({ scripts: 0, projects: 0, jobs: 0 });

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUser(user);

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (data) setProfile(data);

      // Load quick stats
      const [{ count: scripts }, { count: projects }, { count: jobs }] = await Promise.all([
        supabase.from('scripts').select('id', { count: 'exact', head: true }).eq('last_edited_by', user.id),
        supabase.from('projects').select('id', { count: 'exact', head: true }).eq('created_by', user.id),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('created_by', user.id),
      ]);
      setStats({ scripts: scripts || 0, projects: projects || 0, jobs: jobs || 0 });
    });
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      ...profile,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    setMessage(error ? `Error: ${error.message}` : '✓ SAVED');
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
        padding: '0 24px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', zIndex: 100,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>PROFILE</h1>
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {message && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)' }}>{message}</span>}
          <button onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              background: 'var(--accent)', color: 'var(--bg)', border: 'none',
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1 }}>
            <Save size={12} /> {saving ? 'SAVING...' : 'SAVE'}
          </button>
          <button onClick={handleSignOut}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'transparent', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer' }}>
            <LogOut size={12} />
          </button>
        </div>
      </header>

      <div style={{ marginTop: 60, maxWidth: 640, margin: '60px auto 0', padding: '40px 24px 80px' }}>

        {/* Avatar + name section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 40 }}>
          <div>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username}
                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,60,0,0.3)' }} />
            ) : (
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'var(--accent)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontFamily: 'var(--display)', fontSize: '1.8rem', color: 'var(--bg)',
              }}>
                {profile.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--display)', fontSize: '1.4rem', letterSpacing: 2 }}>
              {profile.username || 'unnamed'}
            </div>
            {profile.role && (
              <div style={{ fontSize: 9, color: 'var(--accent)', letterSpacing: 2, marginTop: 4, fontFamily: 'var(--mono)' }}>
                {profile.role.toUpperCase()}
              </div>
            )}
            <div style={{ fontSize: 9, opacity: 0.3, marginTop: 4, fontFamily: 'var(--mono)' }}>{user.email}</div>
          </div>
          {user.id && (
            <Link href={`/crew/${user.id}`} target="_blank"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, fontFamily: 'var(--mono)', color: 'rgba(255,255,255,0.35)', textDecoration: 'none', letterSpacing: 1 }}
              title="View public profile">
              <ExternalLink size={12} /> PUBLIC
            </Link>
          )}
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 40 }}>
          {[
            { icon: <FileText size={14} />, count: stats.scripts, label: 'Scripts', href: '/editor' },
            { icon: <Film size={14} />, count: stats.projects, label: 'Projects', href: '/projects' },
            { icon: <Briefcase size={14} />, count: stats.jobs, label: 'Jobs Posted', href: '/jobs' },
          ].map(({ icon, count, label, href }) => (
            <Link key={label} href={href} style={{ textDecoration: 'none' }}>
              <div style={{ padding: 16, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center',
                transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,60,0,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}>
                <div style={{ color: 'var(--accent)', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{icon}</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: '1.4rem', letterSpacing: 2, color: 'var(--fg)' }}>{count}</div>
                <div style={{ fontSize: 8, letterSpacing: 2, opacity: 0.4, fontFamily: 'var(--mono)', marginTop: 4 }}>{label.toUpperCase()}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Form fields */}
        <div style={{ display: 'grid', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, opacity: 0.5, display: 'block', marginBottom: 8 }}>USERNAME</label>
              <input type="text" value={profile.username || ''} onChange={e => setProfile({ ...profile, username: e.target.value })}
                placeholder="your_handle" style={fieldStyle} />
            </div>
            <div>
              <label style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, opacity: 0.5, display: 'block', marginBottom: 8 }}>LOCATION</label>
              <input type="text" value={profile.location || ''} onChange={e => setProfile({ ...profile, location: e.target.value })}
                placeholder="Los Angeles, CA" style={fieldStyle} />
            </div>
          </div>

          <div>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, opacity: 0.5, display: 'block', marginBottom: 8 }}>ROLE / SPECIALTY</label>
            <select value={profile.role || ''} onChange={e => setProfile({ ...profile, role: e.target.value })} style={{ ...fieldStyle, cursor: 'pointer' }}>
              <option value="">Select your primary role...</option>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, opacity: 0.5, display: 'block', marginBottom: 8 }}>BIO</label>
            <textarea value={profile.bio || ''} onChange={e => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell the community about yourself, your style, what you're looking for..."
              style={{ ...fieldStyle, height: 100, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, opacity: 0.5, display: 'block', marginBottom: 8 }}>DISCORD USERNAME</label>
              <input type="text" value={profile.discord_username || ''} onChange={e => setProfile({ ...profile, discord_username: e.target.value })}
                placeholder="handle#0000" style={fieldStyle} />
            </div>
            <div>
              <label style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, opacity: 0.5, display: 'block', marginBottom: 8 }}>AVATAR URL</label>
              <input type="url" value={profile.avatar_url || ''} onChange={e => setProfile({ ...profile, avatar_url: e.target.value })}
                placeholder="https://..." style={fieldStyle} />
            </div>
          </div>

          <div>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, opacity: 0.5, display: 'block', marginBottom: 8 }}>AVAILABILITY</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {['OPEN', 'BUSY'].map(s => (
                <button key={s} onClick={() => setProfile({ ...profile, status: s })}
                  style={{
                    flex: 1, padding: 12,
                    background: profile.status === s ? (s === 'OPEN' ? 'rgba(0,255,0,0.08)' : 'rgba(255,60,0,0.08)') : 'transparent',
                    border: `1px solid ${profile.status === s ? (s === 'OPEN' ? '#00ff00' : 'var(--accent)') : 'rgba(255,255,255,0.1)'}`,
                    color: profile.status === s ? (s === 'OPEN' ? '#00ff00' : 'var(--accent)') : 'rgba(255,255,255,0.4)',
                    fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, cursor: 'pointer',
                  }}>
                  {s === 'OPEN' ? '● OPEN TO WORK' : '○ BUSY'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/portfolio" style={{ fontSize: 9, letterSpacing: 2, fontFamily: 'var(--mono)', color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
              → MANAGE PORTFOLIO
            </Link>
            <Link href="/editor" style={{ fontSize: 9, letterSpacing: 2, fontFamily: 'var(--mono)', color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
              → OPEN EDITOR
            </Link>
            <Link href="/jobs?tab=mine" style={{ fontSize: 9, letterSpacing: 2, fontFamily: 'var(--mono)', color: 'rgba(255,255,255,0.35)', textDecoration: 'none' }}>
              → MY JOBS
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
