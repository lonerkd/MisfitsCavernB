'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, LogOut, ExternalLink, Film, FileText, Briefcase, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getMyWork, getProfile, saveMyProfile } from '@/lib/supabase/profiles';
import { withTimeout } from '@/lib/supabase/withTimeout';
import Avatar from '@/components/Avatar';
import { useConfirm } from '@/components/Confirm';
import { CraftPicker } from '@/components/crafts/CraftPicker';
import { AwayEditor } from '@/components/availability/AwayEditor';


const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: 12,
  background: 'rgba(var(--ink-rgb), 0.05)',
  border: '1px solid rgba(var(--ink-rgb), 0.1)',
  color: 'var(--fg)',
  fontFamily: 'var(--mono)',
  fontSize: 11,
  boxSizing: 'border-box',
  outline: 'none',
};

export default function ProfilePage() {
  const confirm = useConfirm();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({ scripts: 0, projects: 0, jobs: 0 });
  const [scriptsList, setScriptsList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'scripts' | 'projects' | 'jobs' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    withTimeout(supabase.auth.getSession(), 12000, 'getSession timed out').then(async ({ data }) => {
      if (!data.session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }
      setUser(data.session.user);

      const userId = data.session.user.id;
      const [prof, work] = await Promise.all([getProfile(userId), getMyWork(userId)]);
      if (prof) setProfile(prof);

      setScriptsList(work.scripts);
      setProjectsList(work.projects);
      setJobsList(work.jobs);

      setStats({ scripts: work.scripts.length, projects: work.projects.length, jobs: work.jobs.length });
      setLoading(false);
    }).catch((err) => {
      console.error('Failed to load profile:', err);
      setMessage('Error: could not load your profile');
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    let error: { message?: string } | null = null;
    try { await saveMyProfile(user.id, profile); } catch (e) { error = e as { message?: string }; }

    setSaving(false);
    setMessage(error ? `Error: ${error.message ?? 'could not save'}` : '✓ SAVED');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSignOut = async () => {
    if (!await confirm({ message: 'Sign out of The Cavern?', confirmLabel: 'SIGN OUT', danger: false })) return;
    const { forgetThisDevicePush } = await import('@/lib/push/client');
    await forgetThisDevicePush();
    await supabase.auth.signOut();
    router.replace('/auth');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)' }}>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, marginBottom: 16, color: 'var(--fg-dim)' }}>Not signed in.</p>
          <Link href="/auth" style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 11 }}>Sign in →</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
      <header style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: 60,
        background: 'var(--surface)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)',
        padding: '0 24px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', zIndex: 100,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>PROFILE</h1>
        </Link>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {message && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)' }}>{message}</span>}
          <button onClick={handleSave} disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              background: 'var(--accent)', color: 'var(--on-accent)', border: 'none',
              fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1 }}>
            <Save size={12} /> {saving ? 'SAVING...' : 'SAVE'}
          </button>
          <Link href="/settings" title="Settings" aria-label="Settings"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'transparent', color: 'var(--fg-dim)', border: '1px solid rgba(var(--ink-rgb), 0.08)',
              fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer', textDecoration: 'none' }}>
            <Settings size={12} />
          </Link>
          <button onClick={handleSignOut} aria-label="Sign out" title="Sign out"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: 'transparent', color: 'var(--fg-dim)', border: '1px solid rgba(var(--ink-rgb), 0.08)',
              fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer' }}>
            <LogOut size={12} />
          </button>
        </div>
      </header>

      <div style={{ marginTop: 60, maxWidth: 'var(--w-reading)', margin: '60px auto 0', padding: '40px 24px 80px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 4vw, 24px)', marginBottom: 40 }}>
          <div style={{ flexShrink: 0 }}>
            <Avatar src={profile.avatar_url} name={profile.username || user.email} size={72} style={{ border: '2px solid rgba(232, 67, 26,0.3)' }} />
          </div>
          <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: '1.4rem', letterSpacing: 2 }}>
              {profile.username || 'unnamed'}
            </div>
            {profile.role && (
              <div style={{ fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--accent)', letterSpacing: 2, marginTop: 4, fontFamily: 'var(--mono)' }}>
                {profile.role.toUpperCase()}
              </div>
            )}
            <div style={{ fontSize: 'max(9px, var(--mc-min-font, 0px))', marginTop: 4, fontFamily: 'var(--mono)', color: 'var(--fg-dim)' }}>{user.email}</div>
          </div>
          {user.id && (
            <Link href={`/crew/${user.id}`} target="_blank"
              style={{ marginLeft: 'auto', flexShrink: 0, minHeight: 44, display: 'flex', alignItems: 'center', gap: 6, fontSize: 'max(9px, var(--mc-min-font, 0px))', fontFamily: 'var(--mono)', color: 'var(--fg-dim)', textDecoration: 'none', letterSpacing: 1 }}
              title="View public profile">
              <ExternalLink size={12} /> PUBLIC
            </Link>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: activeTab ? 12 : 40 }}>
          {[
            { id: 'scripts', icon: <FileText size={14} />, count: stats.scripts, label: 'Scripts' },
            { id: 'projects', icon: <Film size={14} />, count: stats.projects, label: 'Projects' },
            { id: 'jobs', icon: <Briefcase size={14} />, count: stats.jobs, label: 'Jobs Posted' },
          ].map(({ id, icon, count, label }) => {
            const isTabActive = activeTab === id;
            return (
              <div key={label} onClick={() => setActiveTab(activeTab === id ? null : (id as any))}
                style={{
                  padding: 16, background: isTabActive ? 'var(--accent-dim)' : 'var(--bg-2)',
                  border: `1px solid ${isTabActive ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.06)'}`,
                  textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
                  borderRadius: 8
                }}
                onMouseEnter={e => { if (!isTabActive) e.currentTarget.style.borderColor = 'rgba(232, 67, 26,0.3)'; }}
                onMouseLeave={e => { if (!isTabActive) e.currentTarget.style.borderColor = 'rgba(var(--ink-rgb), 0.06)'; }}>
                <div style={{ color: 'var(--accent)', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{icon}</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: '1.4rem', letterSpacing: 2, color: 'var(--fg)' }}>{count}</div>
                <div style={{ fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 2, fontFamily: 'var(--mono)', marginTop: 4, color: 'var(--fg-dim)' }}>{label.toUpperCase()}</div>
              </div>
            );
          })}
        </div>

        {activeTab && (
          <div style={{
            background: 'rgba(var(--ink-rgb), 0.01)',
            border: '1px solid rgba(var(--ink-rgb), 0.05)',
            borderRadius: 8,
            padding: 16,
            marginBottom: 40,
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid rgba(var(--ink-rgb), 0.05)', paddingBottom: 10, marginBottom: 12
            }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--fg-dim)' }}>
                {activeTab === 'scripts' ? 'My Screenplays' : activeTab === 'projects' ? 'My Productions' : 'My Posted Jobs'}
              </span>
              <button onClick={() => setActiveTab(null)} style={{ background: 'none', border: 'none', color: 'var(--fg-dim)', cursor: 'pointer', fontSize: 'max(9px, var(--mc-min-font, 0px))', fontFamily: 'var(--mono)', letterSpacing: 1 }}>
                [CLOSE]
              </button>
            </div>

            {activeTab === 'scripts' && (
              <div style={{ display: 'grid', gap: 8 }}>
                {scriptsList.length === 0 ? (
                  <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--fg-dim)' }}>No scripts created yet.</div>
                ) : (
                  scriptsList.map(s => (
                    <Link
                      key={s.id}
                      href={`/editor?script=${s.id}`}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.04)',
                        borderRadius: 8, textDecoration: 'none', transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--ink-rgb), 0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(var(--ink-rgb), 0.02)'}
                    >
                      <span style={{ fontFamily: 'var(--display)', fontSize: '0.95rem', color: 'var(--fg)' }}>{s.title}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>
                        EDITED {new Date(s.updated_at).toLocaleDateString()}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            )}

            {activeTab === 'projects' && (
              <div style={{ display: 'grid', gap: 8 }}>
                {projectsList.length === 0 ? (
                  <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--fg-dim)' }}>No projects created yet.</div>
                ) : (
                  projectsList.map(p => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.04)',
                        borderRadius: 8, textDecoration: 'none', transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--ink-rgb), 0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(var(--ink-rgb), 0.02)'}
                    >
                      <span style={{ fontFamily: 'var(--display)', fontSize: '0.95rem', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.accent_color || '#e8431a' }} />
                        {p.title}
                      </span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>
                        {p.status || 'production'}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            )}

            {activeTab === 'jobs' && (
              <div style={{ display: 'grid', gap: 8 }}>
                {jobsList.length === 0 ? (
                  <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--fg-dim)' }}>No jobs posted yet.</div>
                ) : (
                  jobsList.map(j => (
                    <Link
                      key={j.id}
                      href="/jobs"
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.04)',
                        borderRadius: 8, textDecoration: 'none', transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--ink-rgb), 0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(var(--ink-rgb), 0.02)'}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontFamily: 'var(--display)', fontSize: '0.95rem', color: 'var(--fg)' }}>{j.title}</span>
                        {j.role && <span style={{ fontSize: 'max(8px, var(--mc-min-font, 0px))', fontFamily: 'var(--mono)', marginTop: 2, color: 'var(--fg-dim)' }}>{j.role}</span>}
                      </div>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>
                        {(j.status || 'OPEN').toUpperCase()}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 2, display: 'block', marginBottom: 8, color: 'var(--fg-dim)' }}>USERNAME</label>
              <input type="text" value={profile.username || ''} onChange={e => setProfile({ ...profile, username: e.target.value })}
                placeholder="your_handle" style={fieldStyle} />
            </div>
            <div>
              <label style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 2, display: 'block', marginBottom: 8, color: 'var(--fg-dim)' }}>LOCATION</label>
              <input type="text" value={profile.location || ''} onChange={e => setProfile({ ...profile, location: e.target.value })}
                placeholder="Los Angeles, CA" style={fieldStyle} />
            </div>
          </div>

          <div>
            <label htmlFor="profile-craft" style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 2, display: 'block', marginBottom: 8, color: 'var(--fg-dim)' }}>CRAFT</label>
            <CraftPicker id="profile-craft" label="Your craft" value={profile.role || null} onChange={(craft) => setProfile({ ...profile, role: craft })} placeholder="What do you do on a set?" noneLabel="No craft yet" />
          </div>

          <div>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 2, display: 'block', marginBottom: 8, color: 'var(--fg-dim)' }}>BIO</label>
            <textarea value={profile.bio || ''} onChange={e => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell the community about yourself, your style, what you're looking for..."
              style={{ ...fieldStyle, height: 100, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 2, display: 'block', marginBottom: 8, color: 'var(--fg-dim)' }}>DISCORD USERNAME</label>
              <input type="text" value={profile.discord_username || ''} onChange={e => setProfile({ ...profile, discord_username: e.target.value })}
                placeholder="handle#0000" style={fieldStyle} />
            </div>
            <div>
              <label style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 2, display: 'block', marginBottom: 8, color: 'var(--fg-dim)' }}>AVATAR URL</label>
              <input type="url" value={profile.avatar_url || ''} onChange={e => setProfile({ ...profile, avatar_url: e.target.value })}
                placeholder="https://..." style={fieldStyle} />
            </div>
          </div>

          <div>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 2, display: 'block', marginBottom: 8, color: 'var(--fg-dim)' }}>AVAILABILITY</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {['OPEN', 'BUSY'].map(s => (
                <button key={s} onClick={() => setProfile({ ...profile, status: s })}
                  style={{
                    flex: 1, padding: 12,
                    background: profile.status === s ? (s === 'OPEN' ? 'rgba(0,255,0,0.08)' : 'rgba(232, 67, 26,0.08)') : 'transparent',
                    border: `1px solid ${profile.status === s ? (s === 'OPEN' ? '#00ff00' : 'var(--accent)') : 'rgba(var(--ink-rgb), 0.1)'}`,
                    color: profile.status === s ? (s === 'OPEN' ? 'var(--ok)' : 'var(--accent)') : 'var(--fg-dim)',
                    fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, cursor: 'pointer',
                  }}>
                  {s === 'OPEN' ? '● OPEN TO WORK' : '○ BUSY'}
                </button>
              ))}
            </div>
          </div>

          <AwayEditor userId={user?.id ?? null} />

          <div style={{ borderTop: '1px solid rgba(var(--ink-rgb), 0.05)', paddingTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/portfolio/manage" style={{ fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 2, fontFamily: 'var(--mono)', color: 'var(--fg-dim)', textDecoration: 'none' }}>
              → MANAGE PORTFOLIO
            </Link>
            <Link href="/editor" style={{ fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 2, fontFamily: 'var(--mono)', color: 'var(--fg-dim)', textDecoration: 'none' }}>
              → OPEN EDITOR
            </Link>
            <Link href="/jobs?tab=mine" style={{ fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 2, fontFamily: 'var(--mono)', color: 'var(--fg-dim)', textDecoration: 'none' }}>
              → MY JOBS
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
