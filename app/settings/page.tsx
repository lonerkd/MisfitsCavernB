'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Bell, Palette, ShieldCheck, LogOut, Check, Download, MonitorSmartphone, AlertTriangle, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { collectMyData } from '@/lib/supabase/profiles';
import { getNotificationPrefs, saveNotificationPrefs, DEFAULT_NOTIFICATION_PREFS, type NotificationPrefs } from '@/lib/supabase/notifications';
import { checkHibpBreach } from '@/lib/password-strength';
import { MOTION_PREF_EVENT } from '@/components/MotionPreference';
import { useUiPrefs } from '@/lib/os/uiPrefs';
import { ThemePicker } from '@/components/ThemePicker';
import { GuideSetup } from '@/components/guides/GuideSetup';
import { DEPTHS, EXPERIENCES, TEAMS, depthOf } from '@/lib/guides/profile';
import DeleteAccount from '@/components/settings/DeleteAccount';
import { ISLAND_SCALE_MAX, ISLAND_SCALE_MIN, ISLAND_SCALE_STEP, readIslandScale, writeIslandScale } from '@/lib/island/scale';

const PREF_KEYS = {
  cursor: 'mc_custom_cursor',
  motion: 'mc_reduce_motion',
} as const;

const getPref = (k: string, dflt: boolean) => {
  try { const v = localStorage.getItem(k); return v == null ? dflt : v === 'on'; } catch { return dflt; }
};

// A Row's label names the control inside it (switches have no visible text).
const RowLabel = React.createContext<string | undefined>(undefined);

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const label = React.useContext(RowLabel);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{
        width: 42, height: 24, borderRadius: 9999, border: 'none', cursor: 'pointer',
        background: on ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.12)', position: 'relative',
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
        <h2 style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', margin: 0, color: 'var(--fg-muted)' }}>{title}</h2>
      </div>
      <div style={{ background: 'var(--bg-2)', border: '1px solid rgba(var(--ink-rgb), 0.06)', borderRadius: 14, overflow: 'hidden' }}>
        {children}
      </div>
    </section>
  );
}

function Row({ label, hint, control }: { label: string; hint?: string; control: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 16px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--fg)' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 3, lineHeight: 1.4 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}><RowLabel.Provider value={label}>{control}</RowLabel.Provider></div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px', background: 'rgba(var(--ink-rgb), 0.05)', border: '1px solid rgba(var(--ink-rgb), 0.1)',
  color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, borderRadius: 8, outline: 'none', width: 200,
};
const btnStyle: React.CSSProperties = {
  padding: '8px 14px', background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 8,
  fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, cursor: 'pointer', fontWeight: 600,
};
const ghostBtn: React.CSSProperties = {
  padding: '8px 14px', background: 'transparent', color: 'var(--fg-muted)', border: '1px solid rgba(var(--ink-rgb), 0.12)',
  borderRadius: 8, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, cursor: 'pointer',
};

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  // Device-level prefs (this browser's storage). The page shows them only once
  // the account has loaded, after hydration, so reading them up front is safe.
  const [cursor, setCursor] = useState(() => getPref(PREF_KEYS.cursor, true));
  const [motion, setMotion] = useState(() => getPref(PREF_KEYS.motion, false));
  const [islandScale, setIslandScale] = useState(readIslandScale);
  const [notifyReplies, setNotifyReplies] = useState(true);
  const [notifyJobs, setNotifyJobs] = useState(true);
  const [notifyProduct, setNotifyProduct] = useState(false);
  const [leakCheck, setLeakCheck] = useState(true);
  const { prefs: uiPrefs, save: saveUiPrefs } = useUiPrefs();
  const [editingGuide, setEditingGuide] = useState(false);
  const guide = uiPrefs.guide;
  const guideSummary = guide
    ? [EXPERIENCES.find((x) => x.id === guide.experience)?.label, `${guide.hours}h a week`, TEAMS.find((x) => x.id === guide.team)?.label,
       DEPTHS.find((x) => x.id === depthOf(guide))?.label].filter(Boolean).join(' · ')
    : 'Not set yet — every project’s guide asks the first time.';


  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session?.user) { router.replace('/auth'); return; }
      setUser(data.session.user);
      setNewEmail(data.session.user.email || '');
      setLoaded(true);
      const prefs = await getNotificationPrefs(data.session.user.id);
      setNotifyReplies(prefs.replies);
      setNotifyJobs(prefs.jobs);
      setNotifyProduct(prefs.product);
      setLeakCheck(prefs.leak_check);
    });
  }, [router]);

  const flash = (text: string, ok = true) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3500); };

  // Account prefs live in the DB: show the change, put it back if the save fails.
  const savePrefs = (patch: Partial<NotificationPrefs>, apply: (v: boolean) => void, v: boolean) => {
    apply(v);
    if (!user) return;
    saveNotificationPrefs(user.id, patch).catch((e: any) => { apply(!v); flash(e?.message || 'Could not save that setting', false); });
  };
  const setNotifyPref = (key: 'replies' | 'jobs' | 'product', v: boolean) => {
    const apply = key === 'replies' ? setNotifyReplies : key === 'jobs' ? setNotifyJobs : setNotifyProduct;
    savePrefs({ [key]: v }, apply, v);
  };
  const savePref = (key: string, val: boolean) => { try { localStorage.setItem(key, val ? 'on' : 'off'); } catch {} };

  const setCursorPref = (v: boolean) => {
    setCursor(v); savePref(PREF_KEYS.cursor, v);
    window.dispatchEvent(new Event('mc-cursor-pref-change'));
  };
  const setMotionPref = (v: boolean) => {
    setMotion(v); savePref(PREF_KEYS.motion, v);
    window.dispatchEvent(new Event(MOTION_PREF_EVENT));
  };
  const setIslandScalePref = (v: number) => setIslandScale(writeIslandScale(v));

  const changeEmail = async () => {
    if (!newEmail || newEmail === user?.email) return;
    setBusy('email');
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setBusy(null);
    flash(error ? error.message : 'Confirmation sent to your new email.', !error);
  };
  const changePassword = async () => {
    if (newPassword.length < 8) { flash('Password must be at least 8 characters.', false); return; }
    if (leakCheck) {
      setBusy('password');
      const count = await checkHibpBreach(newPassword);
      if (count > 0) { setBusy(null); flash(`This password has appeared in ${count.toLocaleString()} known data breaches. Choose something unique.`, false); return; }
    }
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

  const exportData = async () => {
    if (!user) return;
    setBusy('export');
    try {
      const payload = {
        exported_at: new Date().toISOString(),
        account: { id: user.id, email: user.email, created_at: user.created_at },
        ...(await collectMyData(user.id)),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `the-cavern-data-${user.id.slice(0, 8)}.json`; a.click();
      URL.revokeObjectURL(url);
      flash('Your data export has downloaded.');
    } catch (e: any) {
      flash(e?.message || 'Export failed.', false);
    } finally {
      setBusy(null);
    }
  };

  if (!loaded) {
    return <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--mono)', fontSize: 11}}>Loading settings…</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)' }}>
      <header style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: 60,
        background: 'var(--surface)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)', padding: '0 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100,
      }}>
        <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--fg)', textDecoration: 'none' }}>
          <ArrowLeft size={20} />
          <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.2rem', letterSpacing: 4, margin: 0 }}>SETTINGS</h1>
        </Link>
        {msg && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 11, color: msg.ok ? 'var(--ok)' : 'var(--danger)' }}>
            {msg.ok && <Check size={12} />} {msg.text}
          </span>
        )}
      </header>

      <div style={{ maxWidth: 'var(--w-form)', margin: '60px auto 0', padding: '20px 24px calc(var(--taskbar-height, 94px) + 20px)' }}>

        <Section icon={<User size={15} />} title="Account">
          <Row label="Email address" hint="Changing this sends a confirmation link to the new address." control={
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="email" aria-label="New email address" autoComplete="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={inputStyle} />
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

        <Section icon={<LayoutGrid size={15} />} title="Workspace">
          <Row label="Show every tool" hint="Open every tool in every project at once, instead of each arriving with its phase. You can also open everything in a single project from its phase panel." control={
            <Toggle on={uiPrefs.show_all_tools} onChange={(v) => { void saveUiPrefs({ show_all_tools: v }).catch((e: any) => flash(e?.message || 'Could not save that setting', false)); }} />
          } />
          <Row label="Project guides" hint={guideSummary} control={
            <button type="button" style={ghostBtn} aria-label={editingGuide ? 'Close project guides' : 'Edit project guides'} aria-expanded={editingGuide} onClick={() => setEditingGuide((v) => !v)}>{editingGuide ? 'CLOSE' : 'EDIT'}</button>
          } />
          {editingGuide && (
            <div style={{ padding: '0 16px 16px', ['--pa' as string]: 'var(--accent)', ['--pa-dim' as string]: 'color-mix(in srgb, var(--accent) 14%, transparent)', ['--pa-line' as string]: 'color-mix(in srgb, var(--accent) 45%, transparent)' }}>
              <GuideSetup initial={guide} idPrefix="settings-guide" onCancel={() => setEditingGuide(false)}
                onSave={async (p) => {
                  try { await saveUiPrefs({ guide: p }); setEditingGuide(false); flash('Guides updated', true); }
                  catch (e: any) { flash(e?.message || 'Could not save that setting', false); }
                }} />
            </div>
          )}
        </Section>

        <Section icon={<Palette size={15} />} title="Appearance">
          <Row label="Custom cursor" hint="The adaptive Cavern cursor on mouse/trackpad devices." control={<Toggle on={cursor} onChange={setCursorPref} />} />
          <Row label="Reduce motion" hint="Minimise animations and transitions across the app." control={<Toggle on={motion} onChange={setMotionPref} />} />
          <div style={{ borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)' }}>
            <div style={{ padding: '14px 16px 0' }}>
              <div style={{ fontSize: 13, color: 'var(--fg)' }}>Theme</div>
              <div style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 3, lineHeight: 1.4 }}>The look of the whole suite, on every device you sign in on.</div>
            </div>
            <ThemePicker signedIn={!!user} />
          </div>
          <Row label="Island size" hint="How big the island at the foot of the screen is, on this device. It resizes as you drag." control={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="range"
                aria-label="Island size"
                min={ISLAND_SCALE_MIN}
                max={ISLAND_SCALE_MAX}
                step={ISLAND_SCALE_STEP}
                value={islandScale}
                onChange={e => setIslandScalePref(parseFloat(e.target.value))}
                style={{ width: 120, accentColor: 'var(--accent)' }}
              />
              <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--accent)', minWidth: 36, textAlign: 'right' }}>{islandScale.toFixed(2)}x</span>
            </div>
          } />
        </Section>

        <Section icon={<Bell size={15} />} title="Notifications">
          <Row label="Comment replies" hint="When someone replies to your notes or reviews." control={<Toggle on={notifyReplies} onChange={v => setNotifyPref('replies', v)} />} />
          <Row label="Job & casting alerts" hint="New roles matching your profile." control={<Toggle on={notifyJobs} onChange={v => setNotifyPref('jobs', v)} />} />
          <Row label="Product updates" hint="Occasional news about new tools and features." control={<Toggle on={notifyProduct} onChange={v => setNotifyPref('product', v)} />} />
        </Section>

        <Section icon={<ShieldCheck size={15} />} title="Data & Privacy">
              <Row label="Leaked-password detection" hint="Checks passwords against known data breaches (k-anonymity — only a hash prefix leaves your device)." control={<Toggle on={leakCheck} onChange={v => savePrefs({ leak_check: v }, setLeakCheck, v)} />} />
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
            <button style={{ ...ghostBtn, color: 'var(--danger)', borderColor: 'color-mix(in srgb, var(--danger) 35%, transparent)' }} onClick={signOutEverywhere} disabled={busy === 'global'}>
              {busy === 'global' ? '…' : 'SIGN OUT ALL'}
            </button>
          } />
        </Section>

        <Section icon={<AlertTriangle size={15} />} title="Delete account">
          <DeleteAccount userId={user.id} />
        </Section>

        <div style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 1.5, color: 'var(--fg-dim)', marginTop: 40 }}>
          THE CAVERN · {user.email}
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 18 }}>
            <Link href="/privacy" style={{ color: 'inherit' }}>PRIVACY</Link>
            <Link href="/terms" style={{ color: 'inherit' }}>TERMS</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
