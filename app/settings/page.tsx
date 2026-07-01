'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Bell, Palette, ShieldCheck, LogOut, Check, Download, MonitorSmartphone } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

// Device-level preferences live in localStorage (they describe this browser,
// not the account) and are read back by the components that honour them.
const PREF_KEYS = {
  cursor: 'mc_custom_cursor',      // 'on' | 'off'
  motion: 'mc_reduce_motion',      // 'on' | 'off'
  notifyReplies: 'mc_notify_replies',
  notifyJobs: 'mc_notify_jobs',
  notifyProduct: 'mc_notify_product',
} as const;

const getPref = (k: string, dflt: boolean) => {
  try { const v = localStorage.getItem(k); return v == null ? dflt : v === 'on'; } catch { return dflt; }
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: 42, height: 24, borderRadius: 999, border: 'none', cursor: 'pointer',
        background: on ? 'var(--accent)' : 'rgba(255,255,255,0.12)', position: 'relative',
        transition: 'background 0.2s', flexShrink: 0, padding: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
      }} />
    </button>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: 'var(--accent)' }}>
        {icon}
        <h2 style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', margin: 0, color: 'rgba(255,255,255,0.6)' }}>{title}</h2>
      </div>
      <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
        {children}
      </div>
    </section>
  );
}

function Row({ label, hint, control }: { label: string; hint?: string; control: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: 'var(--fg)' }}>{label}</div>
        {hint && <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', marginTop: 3, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, borderRadius: 6, outline: 'none', width: 200,
};
const btnStyle: React.CSSProperties = {
  padding: '8px 14px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 6,
  fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, cursor: 'pointer', fontWeight: 600,
};
const ghostBtn: React.CSSProperties = {
  padding: '8px 14px', background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, cursor: 'pointer',
};

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Account form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  // Preferences (device-level)
  const [cursor, setCursor] = useState(true);
  const [motion, setMotion] = useState(false);
  const [notifyReplies, setNotifyReplies] = useState(true);
  const [notifyJobs, setNotifyJobs] = useState(true);
  const [notifyProduct, setNotifyProduct] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/auth'); return; }
      setUser(data.user);
      setNewEmail(data.user.email || '');
      setLoaded(true);
    });
    setCursor(getPref(PREF_KEYS.cursor, true));
    setMotion(getPref(PREF_KEYS.motion, false));
    setNotifyReplies(getPref(PREF_KEYS.notifyReplies, true));
    setNotifyJobs(getPref(PREF_KEYS.notifyJobs, true));
    setNotifyProduct(getPref(PREF_KEYS.notifyProduct, false));
  }, [router]);

  const flash = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3500); };
  const savePref = (key: string, val: boolean) => { try { localStorage.setItem(key, val ? 'on' : 'off'); } catch {} };

  const setCursorPref = (v: boolean) => {
    setCursor(v); savePref(PREF_KEYS.cursor, v);
    window.dispatchEvent(new Event('mc-cursor-pref-change'));
  };
  const setMotionPref = (v: boolean) => {
    setMotion(v); savePref(PREF_KEYS.motion, v);
    document.body.classList.toggle('reduce-motion', v);
  };

  const changeEmail = async () => {
    if (!newEmail || newEmail === user?.email) return;
    setBusy('email');
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setBusy(null);
    flash(error ? error.message : 'Confirmation sent to your new email.', !error);
  };
  const changePassword = async () => {
    if (newPassword.length < 8) { flash('Password must be at least 8 characters.', false); return; }
    setBusy('password');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(null);
    if (!error) setNewPassword('');
    flash(error ? error.message : 'Password updated.', !error);
  };

  const signOut = async () => { await supabase.auth.signOut(); router.replace('/auth'); };
  const signOutEverywhere = async () => {
    setBusy('global');
    await supabase.auth.signOut({ scope: 'global' });
    router.replace('/auth');
  };

  // GDPR-friendly: export everything this account owns as a JSON file.
  const exportData = async () => {
    if (!user) return;
    setBusy('export');
    try {
      const [profile, projects, scripts, jobs] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('projects').select('*').eq('creator_id', user.id),
        supabase.from('scripts').select('*').eq('last_edited_by', user.id),
        supabase.from('jobs').select('*').eq('created_by', user.id),
      ]);
      const payload = {
        exported_at: new Date().toISOString(),
        account: { id: user.id, email: user.email, created_at: user.created_at },
        profile: profile.data ?? null,
        projects: projects.data ?? [],
        scripts: scripts.data ?? [],
        jobs: jobs.data ?? [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `misfits-cavern-data-${user.id.slice(0, 8)}.json`; a.click();
      URL.revokeObjectURL(url);
      flash('Your data export has downloaded.');
    } catch (e: any) {
      flash(e?.message || 'Export failed.', false);
    } finally {
      setBusy(null);
    }
  };

  if (!loaded) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 11, opacity: 0.5 }}>Loading settings…</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
      <header style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: 60,
        background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '0 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100,
      }}>
        <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>SETTINGS</h1>
        </Link>
        {msg && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 10, color: msg.ok ? '#34d399' : '#ff5c5c' }}>
            {msg.ok && <Check size={12} />} {msg.text}
          </span>
        )}
      </header>

      <div style={{ maxWidth: 620, margin: '60px auto 0', padding: '40px 24px 120px' }}>

        <Section icon={<User size={15} />} title="Account">
          <Row label="Email address" hint="Changing this sends a confirmation link to the new address." control={
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={inputStyle} />
              <button style={btnStyle} onClick={changeEmail} disabled={busy === 'email'}>{busy === 'email' ? '…' : 'UPDATE'}</button>
            </div>
          } />
          <Row label="Password" hint="At least 8 characters." control={
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" style={inputStyle} />
              <button style={btnStyle} onClick={changePassword} disabled={busy === 'password'}>{busy === 'password' ? '…' : 'CHANGE'}</button>
            </div>
          } />
          <Row label="Public profile" hint="Edit your name, role, bio and availability." control={
            <Link href="/profile" style={{ ...ghostBtn, textDecoration: 'none', display: 'inline-block' }}>EDIT PROFILE</Link>
          } />
        </Section>

        <Section icon={<Palette size={15} />} title="Appearance">
          <Row label="Custom cursor" hint="The adaptive Misfits cursor on mouse/trackpad devices." control={<Toggle on={cursor} onChange={setCursorPref} />} />
          <Row label="Reduce motion" hint="Minimise animations and transitions across the app." control={<Toggle on={motion} onChange={setMotionPref} />} />
        </Section>

        <Section icon={<Bell size={15} />} title="Notifications">
          <Row label="Comment replies" hint="When someone replies to your notes or reviews." control={<Toggle on={notifyReplies} onChange={v => { setNotifyReplies(v); savePref(PREF_KEYS.notifyReplies, v); }} />} />
          <Row label="Job & casting alerts" hint="New roles matching your profile." control={<Toggle on={notifyJobs} onChange={v => { setNotifyJobs(v); savePref(PREF_KEYS.notifyJobs, v); }} />} />
          <Row label="Product updates" hint="Occasional news about new tools and features." control={<Toggle on={notifyProduct} onChange={v => { setNotifyProduct(v); savePref(PREF_KEYS.notifyProduct, v); }} />} />
        </Section>

        <Section icon={<ShieldCheck size={15} />} title="Data & Privacy">
          <Row label="Export my data" hint="Download your profile, projects, scripts and jobs as JSON." control={
            <button style={{ ...ghostBtn, display: 'flex', alignItems: 'center', gap: 6 }} onClick={exportData} disabled={busy === 'export'}>
              <Download size={12} /> {busy === 'export' ? 'PREPARING…' : 'EXPORT'}
            </button>
          } />
        </Section>

        <Section icon={<MonitorSmartphone size={15} />} title="Sessions">
          <Row label="Sign out" hint="Sign out of this device only." control={
            <button style={{ ...ghostBtn, display: 'flex', alignItems: 'center', gap: 6 }} onClick={signOut}><LogOut size={12} /> SIGN OUT</button>
          } />
          <Row label="Sign out everywhere" hint="End every active session on all devices." control={
            <button style={{ ...ghostBtn, color: '#ff5c5c', borderColor: 'rgba(255,92,92,0.3)' }} onClick={signOutEverywhere} disabled={busy === 'global'}>
              {busy === 'global' ? '…' : 'SIGN OUT ALL'}
            </button>
          } />
        </Section>

        <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,0.2)', marginTop: 40 }}>
          MISFITS CAVERN · {user.email}
        </div>
      </div>
    </div>
  );
}
