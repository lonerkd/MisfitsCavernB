'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Hash, Lock, X, Volume2, BookOpen, Search } from 'lucide-react';
import { audienceOptions, defaultPostPolicy, type ChannelAudience } from '@/lib/lounge/audience';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { findPeopleByName } from '@/lib/supabase/profiles';
import { listChannelMembers, addChannelMember, removeChannelMember, updateChannel, deleteChannel, hasDiscordWebhook, setDiscordWebhook, removeDiscordWebhook, setChannelMemberRights, type Channel, type ChannelMember } from '@/lib/supabase/channels';
import { useConfirm } from '@/components/ui/Confirm';

export function NewChannelModal({ projectTitle, scope, onClose, onCreate }: {
  projectTitle: string; scope: 'project' | 'community'; onClose: () => void;
  onCreate: (v: { name: string; type: 'text' | 'voice' | 'guide'; audience: ChannelAudience; is_private: boolean; post_policy: 'viewers' | 'members' | 'managers' }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'voice' | 'guide'>('text');
  const [audience, setAudience] = useState<ChannelAudience>(scope === 'community' ? 'users' : 'team');
  const [isPrivate, setIsPrivate] = useState(false);
  const [postPolicy, setPostPolicy] = useState<'viewers' | 'members' | 'managers'>('viewers');
  const [busy, setBusy] = useState(false);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  const submit = async () => { if (!name.trim() || busy) return; setBusy(true); try { await onCreate({ name, type, audience, is_private: isPrivate, post_policy: type === 'guide' ? 'managers' : postPolicy }); } finally { setBusy(false); } };
  const label: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-muted)', display: 'block', marginBottom: 8 };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal)', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} onMouseDown={e => e.stopPropagation()}
        style={{ width: 440, maxWidth: '100%', maxHeight: '100%', overflowY: 'auto', background: 'var(--bg-3)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 14, padding: 26 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--fg-dim)', textTransform: 'var(--caps)', marginBottom: 6 }}>{projectTitle}</div>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', letterSpacing: '-0.02em', margin: '0 0 20px' }}>New channel</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={label}>Type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['text', 'voice', 'guide'] as const).map(t => (
              <button key={t} aria-pressed={type === t} onClick={() => setType(t)} style={{ flex: 1, padding: 10, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: type === t ? 'rgba(232, 67, 26,0.12)' : 'rgba(var(--ink-rgb), 0.04)', border: `1px solid ${type === t ? 'rgba(232, 67, 26,0.4)' : 'rgba(var(--ink-rgb), 0.1)'}`, color: type === t ? '#ff7a4d' : 'var(--fg-muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>
                {t === 'text' ? <Hash size={13} /> : t === 'voice' ? <Volume2 size={13} /> : <BookOpen size={13} />} {t}
              </button>
            ))}
          </div>
        </div>

        <Input
          autoFocus
          label="Name"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="e.g. writers-room"
        />

        {type === 'guide' && <p style={{ fontSize: 11, color: 'var(--fg-muted)', margin: '-6px 0 14px', lineHeight: 1.5 }}>A guide is read-only: FAQ, a start-here tour, tutorials. Only whoever runs it can post.</p>}

        <div style={{ marginBottom: 16 }} role="radiogroup" aria-label="Who it’s for">
          <span style={label}>Who it’s for</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {audienceOptions(scope).map((o) => (
              <button key={o.id} role="radio" aria-checked={audience === o.id} title={o.hint}
                onClick={() => { setAudience(o.id); setPostPolicy(defaultPostPolicy(o.id)); }}
                style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: audience === o.id ? 'rgba(232, 67, 26,0.1)' : 'transparent', border: `1px solid ${audience === o.id ? 'rgba(232, 67, 26,0.45)' : 'rgba(var(--ink-rgb), 0.08)'}`, color: audience === o.id ? 'var(--fg-strong)' : 'var(--fg-muted)' }}>
                <span style={{ display: 'block', fontSize: 12 }}>{o.label}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--fg-dim)', marginTop: 2, lineHeight: 1.35 }}>{o.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><div style={{ fontSize: 12, color: 'var(--fg)' }}>Private channel</div><div style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 2 }}>Invite-only, within who it’s for</div></div>
          <button role="switch" aria-checked={isPrivate} aria-label="Private channel" onClick={() => setIsPrivate(v => !v)} style={{ width: 42, height: 24, borderRadius: 9999, border: 'none', cursor: 'pointer', background: isPrivate ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.12)', position: 'relative', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: 3, left: isPrivate ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </button>
        </div>

        {type === 'text' && (
          <div style={{ marginBottom: 22 }}>
            <label style={label}>Who can post</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {([['viewers', 'Everyone who can see it'], ['members', 'Only explicit members'], ['managers', 'Only managers (announcements)']] as const).map(([v, d]) => (
                <button key={v} onClick={() => setPostPolicy(v)} style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: postPolicy === v ? 'rgba(var(--ink-rgb), 0.06)' : 'transparent', border: `1px solid ${postPolicy === v ? 'rgba(var(--ink-rgb), 0.2)' : 'rgba(var(--ink-rgb), 0.06)'}`, color: postPolicy === v ? 'var(--fg-strong)' : 'var(--fg-muted)', fontSize: 12 }}>{d}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="outline" size="sm" onClick={onClose}>CANCEL</Button>
          <Button size="sm" onClick={submit} disabled={!name.trim() || busy} isLoading={busy}>CREATE</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ManageChannelModal({ channel, meId, onClose, onChanged }: { channel: Channel; meId?: string; onClose: () => void; onChanged: () => void }) {
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  // People found for a query, tagged with it: "searching" is a query without its answer yet.
  const [found, setFound] = useState<{ q: string; users: { id: string; username: string }[] } | null>(null);
  const [postPolicy, setPostPolicy] = useState(channel.post_policy);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [discordConnected, setDiscordConnected] = useState(false);
  const [discordInput, setDiscordInput] = useState('');
  const [discordBusy, setDiscordBusy] = useState(false);
  const confirm = useConfirm();

  const refresh = useCallback(async () => { setMembers(await listChannelMembers(channel.id)); setLoading(false); }, [channel.id]);
  useEffect(() => {
    let alive = true;
    listChannelMembers(channel.id).then((m) => { if (alive) { setMembers(m); setLoading(false); } });
    return () => { alive = false; };
  }, [channel.id]);
  useEffect(() => { hasDiscordWebhook(channel.id).then(setDiscordConnected); }, [channel.id]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);

  const q = query.trim();
  const results = q && found ? found.users.filter(u => !members.some(m => m.user_id === u.id)) : [];
  const searching = !!q && found?.q !== q;
  useEffect(() => {
    if (!q) return;
    let live = true;
    const t = setTimeout(async () => {
      const users = await findPeopleByName(q).catch(() => { if (live) setErr('Could not search people.'); return []; });
      if (live) setFound({ q, users });
    }, 220);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  const doAdd = async (u: { id: string; username: string }) => {
    setBusy(true); setErr(null);
    const e = await addChannelMember(channel.id, u.id, { can_post: true, can_manage: false });
    setBusy(false); setQuery('');
    if (e) { setErr(e); return; }
    await refresh(); onChanged();
  };
  const doRemove = async (m: ChannelMember) => { setBusy(true); const e = await removeChannelMember(m.id); setBusy(false); if (e) { setErr(e); return; } await refresh(); onChanged(); };
  const toggle = async (m: ChannelMember, field: 'can_post' | 'can_manage') => {
    setBusy(true); setErr(null);
    const e = await setChannelMemberRights(m.id, { [field]: !m[field] });
    setBusy(false);
    if (e) setErr(e);
    await refresh();
  };
  const savePolicy = async (p: 'viewers' | 'members' | 'managers') => {
    const was = postPolicy; setPostPolicy(p); setErr(null);
    const e = await updateChannel(channel.id, { post_policy: p });
    if (e) { setPostPolicy(was); setErr(e); return; }
    onChanged();
  };
  const [audience, setAudience] = useState<ChannelAudience>(channel.audience);
  const saveAudience = async (a: ChannelAudience) => {
    const was = audience; setAudience(a); setErr(null);
    const e = await updateChannel(channel.id, { audience: a });
    if (e) { setAudience(was); setErr(e); return; }
    onChanged();
  };
  const saveDiscordWebhook = async () => {
    const url = discordInput.trim();
    if (!url) return;
    setDiscordBusy(true);
    setErr(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setErr('Your session has expired — sign in again to connect a webhook.');
        setDiscordBusy(false);
        return;
      }

      const testRes = await fetch('/api/discord/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ webhookUrl: url }),
      });
      const test = await testRes.json();
      if (!test.ok) { setErr(test.error || 'Could not verify that webhook.'); setDiscordBusy(false); return; }
    } catch {
      setErr('Could not reach the server to verify that webhook.'); setDiscordBusy(false); return;
    }
    const e = await setDiscordWebhook(channel.id, url);
    setDiscordBusy(false);
    if (e) { setErr(e); return; }
    setDiscordInput(''); setDiscordConnected(true);
  };
  const clearDiscordWebhook = async () => {
    setDiscordBusy(true);
    const e = await removeDiscordWebhook(channel.id);
    setDiscordBusy(false);
    if (e) { setErr(e); return; }
    setDiscordConnected(false);
  };
  const doDelete = async () => {
    if (!await confirm({ title: `Delete #${channel.name}?`, message: 'All its messages will be removed. This cannot be undone.', confirmLabel: 'DELETE' })) return;
    setBusy(true); const e = await deleteChannel(channel.id); setBusy(false);
    if (e) { setErr(e); return; }
    onChanged(); onClose();
  };

  const label: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-muted)', display: 'block', marginBottom: 8 };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal)', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} onMouseDown={e => e.stopPropagation()}
        style={{ width: 460, maxWidth: '100%', maxHeight: '100%', overflowY: 'auto', background: 'var(--bg-3)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 14, padding: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--fg-dim)', textTransform: 'var(--caps)', marginBottom: 6 }}>Manage channel</div>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.4rem', letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              {channel.is_private ? <Lock size={15} /> : <Hash size={15} />}{channel.name}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close manage channel" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--fg-dim)' }}><X size={18} /></button>
        </div>

        <div style={{ marginBottom: 18 }} role="radiogroup" aria-label="Who it’s for">
          <span style={label}>Who it’s for</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {audienceOptions(channel.project_id ? 'project' : 'community').map((o) => (
              <button key={o.id} role="radio" aria-checked={audience === o.id} title={o.hint} onClick={() => void saveAudience(o.id)}
                style={{ textAlign: 'left', padding: '7px 10px', borderRadius: 8, cursor: 'pointer', background: audience === o.id ? 'rgba(232, 67, 26,0.1)' : 'transparent', border: `1px solid ${audience === o.id ? 'rgba(232, 67, 26,0.45)' : 'rgba(var(--ink-rgb), 0.08)'}`, color: audience === o.id ? 'var(--fg-strong)' : 'var(--fg-muted)', fontSize: 12 }}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {channel.type === 'text' && (
          <div style={{ marginBottom: 22 }}>
            <label style={label}>Who can post</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {([['viewers', 'Everyone who can see it'], ['members', 'Only explicit members'], ['managers', 'Only managers (announcements)']] as const).map(([v, d]) => (
                <button key={v} onClick={() => savePolicy(v)} style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: postPolicy === v ? 'rgba(var(--ink-rgb), 0.06)' : 'transparent', border: `1px solid ${postPolicy === v ? 'rgba(var(--ink-rgb), 0.2)' : 'rgba(var(--ink-rgb), 0.06)'}`, color: postPolicy === v ? 'var(--fg-strong)' : 'var(--fg-muted)', fontSize: 12 }}>{d}</button>
              ))}
            </div>
          </div>
        )}

        {channel.type === 'text' && (
          <div style={{ marginBottom: 22 }}>
            <label style={label}>Discord bridge</label>
            <div style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 8 }}>
              One-way: messages posted here also get sent to a Discord channel via webhook. The webhook URL is write-only once set — it can be replaced but never viewed again.
            </div>
            {discordConnected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <span style={{ fontSize: 12, color: 'var(--ok)' }}>● Connected</span>
                <Button variant="outline" size="sm" onClick={clearDiscordWebhook} disabled={discordBusy} style={{ marginLeft: 'auto' }}>DISCONNECT</Button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}><Input label="Webhook URL" value={discordInput} onChange={e => setDiscordInput(e.target.value)} type="password" /></div>
                <Button size="sm" onClick={saveDiscordWebhook} disabled={discordBusy || !discordInput.trim()} isLoading={discordBusy}>CONNECT</Button>
              </div>
            )}
          </div>
        )}

        {channel.is_private && (
          <div style={{ marginBottom: 20 }}>
            <Input label="Add member" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by username…" />
            {(searching || results.length > 0) && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {searching && <div style={{ fontSize: 11, color: 'var(--fg-dim)', padding: 6, fontFamily: 'var(--mono)' }}>Searching…</div>}
                {results.map(u => (
                  <button key={u.id} disabled={busy} onClick={() => doAdd(u)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 8, background: 'rgba(var(--ink-rgb), 0.03)', border: '1px solid rgba(var(--ink-rgb), 0.06)', cursor: 'pointer', color: 'var(--fg-strong)', textAlign: 'left' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', color: 'var(--on-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{u.username.charAt(0).toUpperCase()}</div>
                    <span style={{ fontSize: 13 }}>{u.username}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--accent)' }}>+ ADD</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <label style={label}>{channel.is_private ? `Members (${members.length})` : 'Roster'}</label>
        {loading ? (
          <div style={{ fontSize: 11, color: 'var(--fg-dim)', padding: 12, fontFamily: 'var(--mono)' }}>Loading…</div>
        ) : members.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--fg-dim)', padding: 12 }}>{channel.is_private ? 'No explicit members yet — add someone above.' : 'Public channel — everyone with project access can see it.'}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(var(--ink-rgb), 0.03)', border: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(var(--ink-rgb), 0.1)', color: 'var(--fg-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{(m.profiles?.username || '?').charAt(0).toUpperCase()}</div>
                <span style={{ fontSize: 13, color: 'var(--fg-strong)' }}>{m.profiles?.username || 'unknown'}{m.user_id === meId && <span style={{ color: 'var(--fg-dim)', fontSize: 11 }}> (you)</span>}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={() => toggle(m, 'can_post')} disabled={busy} title="Can post" style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', padding: '4px 7px', borderRadius: 4, cursor: 'pointer', background: m.can_post ? 'rgba(16,185,129,0.14)' : 'rgba(var(--ink-rgb), 0.04)', border: `1px solid ${m.can_post ? 'rgba(16,185,129,0.4)' : 'rgba(var(--ink-rgb), 0.1)'}`, color: m.can_post ? 'var(--ok)' : 'var(--fg-dim)' }}>POST</button>
                  <button onClick={() => toggle(m, 'can_manage')} disabled={busy} title="Can manage" style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', padding: '4px 7px', borderRadius: 4, cursor: 'pointer', background: m.can_manage ? 'rgba(245,158,11,0.14)' : 'rgba(var(--ink-rgb), 0.04)', border: `1px solid ${m.can_manage ? 'rgba(245,158,11,0.4)' : 'rgba(var(--ink-rgb), 0.1)'}`, color: m.can_manage ? 'var(--warn)' : 'var(--fg-dim)' }}>MANAGE</button>
                  <button aria-label="Remove" onClick={() => doRemove(m)} disabled={busy} title="Remove" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--fg-dim)', display: 'flex' }}><X size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {err && <div style={{ marginTop: 12, fontSize: 11, color: 'var(--danger)' }}>{err}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 18, borderTop: '1px solid rgba(var(--ink-rgb), 0.08)' }}>
          <Button variant="danger" size="sm" onClick={doDelete} disabled={busy}>DELETE CHANNEL</Button>
          <Button size="sm" onClick={onClose}>DONE</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
