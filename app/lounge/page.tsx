'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Users, Smile, Hash, Lock, Settings as SettingsIcon, MessageSquare, X, Volume2, Mic, MicOff, BookOpen, Globe, Shield, Crown, ArrowUp, ArrowDown, UserCheck, Trash2, Pin, PinOff, Pencil, Search, ChevronLeft } from 'lucide-react';
import { audienceLabel, audienceOptions, defaultPostPolicy, groupChannels, type ChannelAudience } from '@/lib/lounge/audience';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import GrainOverlay from '@/components/GrainOverlay';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase/client';
import { getDMThread, sendDirectMessage, toggleReaction, getThreadReplies, getReplyCounts, sendChannelMessage, getChannelMessagesByUuid, subscribeToChannelUuid, deleteMessage, editMessage, pinMessage, markLoungeRead, getLoungeUnread, type LoungeHit, type LoungeUnread } from '@/lib/supabase/messages';
import { LoungeSearch, PinnedPanel } from '@/components/lounge/LoungePanels';
import { getMyAccount } from '@/lib/supabase/profiles';
import { listChannels, createChannel, canPostChannel, canManageChannel, listChannelMembers, addChannelMember, removeChannelMember, updateChannel, deleteChannel, hasDiscordWebhook, setDiscordWebhook, removeDiscordWebhook, type Channel, type ChannelMember } from '@/lib/supabase/channels';
import { useProject } from '@/lib/os';
import { usePillStage } from '@/lib/context/PillContext';
import { useOSGate } from '@/lib/os';
import { notify } from '@/lib/supabase/notifications';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import { useVoiceRoom } from '@/lib/webrtc/voice';
import Avatar from '@/components/Avatar';
import { useOnlinePresence } from '@/lib/hooks/usePresence';
import { awaitOSUser } from '@/lib/os';
import { useProjectBrief, loadChannelPresets, suggestChannels, type ChannelPreset } from '@/lib/brief';
import { mapStatusToPhase } from '@/lib/os/phases';

interface Message {
  id: string;
  user: string;
  text: string;
  timestamp: Date;
  sender_id?: string;
  mine?: boolean;
  reactions?: Record<string, string[]>;
  avatar_url?: string | null;
  edited?: boolean;
  pinned?: boolean;
}

const REACTION_CHOICES = ['👍', '❤️', '🔥', '🎬', '😂', '🎉', '👀', '🙏'];

function ProductionFeed({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<{ label: string; t: string; color: string }[]>([]);

  useEffect(() => {
    let on = true;
    (async () => {
      const [sc, bd, tl, cr, ca, sn] = await Promise.all([
        supabase.from('scenes').select('title,created_at').eq('project_id', projectId).is('removed_at', null).order('created_at', { ascending: false }).limit(4),
        supabase.from('budget_items').select('category,created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(4),
        supabase.from('timeline_items').select('title,created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(4),
        supabase.from('project_crew').select('role,craft,created_at,profiles!project_crew_user_id_fkey(username)').eq('project_id', projectId).order('created_at', { ascending: false }).limit(4),
        supabase.from('media').select('title,created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(4),
        supabase.from('script_annotations').select('type,text,created_at').eq('project_id', projectId).order('created_at', { ascending: false }).limit(4),
      ]);
      if (!on) return;
      const merged = [
        ...(sc.data || []).map((x: any) => ({ label: `Scene — ${x.title}`, t: x.created_at, color: 'var(--warn)' })),
        ...(bd.data || []).map((x: any) => ({ label: `Budget — ${x.category}`, t: x.created_at, color: 'var(--ok)' })),
        ...(tl.data || []).map((x: any) => ({ label: `Milestone — ${x.title}`, t: x.created_at, color: 'var(--violet)' })),
        ...(cr.data || []).map((x: any) => ({ label: `Crew — ${x.profiles?.username || 'member'}`, t: x.created_at, color: '#ec4899' })),
        ...(ca.data || []).map((x: any) => ({ label: `Reference — ${x.title || 'untitled'}`, t: x.created_at, color: '#a855f7' })),
        ...(sn.data || []).map((x: any) => ({ label: `Script ${x.type} — "${x.text}"`, t: x.created_at, color: 'var(--danger)' })),
      ].sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime()).slice(0, 8);
      setItems(merged);
    })();
    return () => { on = false; };
  }, [projectId]);

  const ago = (iso: string) => { const d = (Date.now() - new Date(iso).getTime()) / 3600000; return d < 1 ? `${Math.max(1, Math.floor(d * 60))}m` : d < 24 ? `${Math.floor(d)}h` : `${Math.floor(d / 24)}d`; };

  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 18, paddingBottom: 16, borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 3, textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 10 }}>Production Feed</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: it.color, marginTop: 5, flexShrink: 0, boxShadow: `0 0 6px ${it.color}` }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9.5px, var(--mc-min-font, 0px))', color: 'var(--fg-muted)', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</div>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-subtle)', flexShrink: 0 }}>{ago(it.t)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * A guide channel reads as a document: each post is a section, its first line
 * the heading. Whoever runs the guide can remove a section.
 */
function GuideSections({ messages, canEdit, onDelete }: { messages: Message[]; canEdit: boolean; onDelete: (m: Message) => void }) {
  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {messages.map((m) => {
        const [head, ...rest] = m.text.split('\n');
        const body = rest.join('\n').trim();
        return (
          <section key={m.id} style={{ background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.06)', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: 'var(--fg-strong)', fontWeight: 600, lineHeight: 1.4 }}>{head}</h3>
              {canEdit && (
                <button type="button" onClick={() => onDelete(m)} aria-label={`Remove section: ${head.slice(0, 60)}`}
                  style={{ background: 'none', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 6, color: 'var(--fg-muted)', cursor: 'pointer', padding: 4, display: 'inline-flex', flexShrink: 0 }}><Trash2 size={12} /></button>
              )}
            </div>
            {body && <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.65, color: 'var(--fg)', whiteSpace: 'pre-wrap', fontFamily: 'var(--serif)' }}>{body}</p>}
            <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>{m.user} · {m.timestamp.toLocaleDateString()}</div>
          </section>
        );
      })}
    </article>
  );
}

function MessageBubble({ msg, currentUserId, onReact, onOpenThread, replyCount = 0, canPin = false, onPin, onEdit, highlight = false }: {
  msg: Message, currentUserId?: string, onReact: (id: string, emoji: string) => void, onOpenThread?: (m: Message) => void, replyCount?: number,
  /** Whoever runs the channel (or either side of a DM) pins. */
  canPin?: boolean, onPin?: (m: Message) => void,
  /** Saves new wording for your own message; resolves false when it didn't save. */
  onEdit?: (m: Message, text: string) => Promise<boolean>,
  /** Just jumped to (from search or the pinned list). */
  highlight?: boolean,
}) {
  const isMe = msg.mine || (msg.sender_id && msg.sender_id === currentUserId);
  const [hovered, setHovered] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.text);
  const saveEdit = async () => {
    const text = draft.trim();
    if (!text || !onEdit) return;
    if (text === msg.text) { setEditing(false); return; }
    if (await onEdit(msg, text)) setEditing(false);
  };
  const actionStyle: React.CSSProperties = { opacity: hovered ? 1 : 0, transition: 'opacity 0.15s', width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(var(--ink-rgb), 0.1)', background: 'var(--surface)', color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const reactions = Object.entries(msg.reactions || {}).filter(([, u]) => u.length > 0);

  return (
    <motion.div
      id={`msg-${msg.id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPickerOpen(false); }}
      onFocus={() => setHovered(true)}
      style={{
        marginBottom: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMe ? 'flex-end' : 'flex-start',
        borderRadius: 12,
        outline: highlight ? '1px solid rgba(16,185,129,0.6)' : 'none',
        outlineOffset: 6,
        transition: 'outline-color 0.4s',
      }}
    >
      {msg.pinned && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 1, color: 'var(--warn)', marginBottom: 4 }}>
          <Pin size={9} aria-hidden /> PINNED
        </span>
      )}
      {!isMe && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <Avatar src={msg.avatar_url} name={msg.user} size={20} />
          <span style={{ fontFamily: 'var(--display)', fontSize: 13, letterSpacing: 2, color: 'var(--accent)' }}>
            {msg.user}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-subtle)' }}>
            {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row', maxWidth: '80%' }}>
        <div style={{
          padding: '12px 16px',
          background: isMe ? 'rgba(232, 67, 26,0.12)' : 'rgba(var(--ink-rgb), 0.04)',
          border: `1px solid ${isMe ? 'rgba(232, 67, 26,0.2)' : 'rgba(var(--ink-rgb), 0.06)'}`,
          borderRadius: isMe ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
        }}>
          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 260 }}>
              <textarea value={draft} autoFocus rows={Math.min(6, draft.split('\n').length + 1)} aria-label="Edit message" maxLength={4000}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void saveEdit(); }
                  if (e.key === 'Escape') { e.preventDefault(); setDraft(msg.text); setEditing(false); }
                }}
                style={{ width: '100%', background: 'var(--sunken)', border: '1px solid rgba(var(--ink-rgb), 0.15)', borderRadius: 6, color: 'var(--fg)', fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.55, padding: '6px 8px', resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))' }}>
                <span style={{ color: 'var(--fg-dim)', marginRight: 'auto', alignSelf: 'center' }}>Enter saves · Esc cancels</span>
                <button type="button" onClick={() => { setDraft(msg.text); setEditing(false); }} style={{ background: 'none', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 5, color: 'var(--fg-muted)', padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>Cancel</button>
                <button type="button" onClick={() => void saveEdit()} disabled={!draft.trim()} style={{ background: 'var(--accent)', border: 'none', borderRadius: 5, color: 'var(--on-accent)', padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 600 }}>Save</button>
              </div>
            </div>
          ) : (
            <p style={{ fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.65, color: 'rgba(var(--fg-rgb), 0.85)', margin: 0, whiteSpace: 'pre-wrap' }}>
              {msg.text}
              {msg.edited && <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', marginLeft: 6 }}>(edited)</span>}
            </p>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setPickerOpen(o => !o)}
            aria-label="Add reaction"
            style={{ opacity: hovered || pickerOpen ? 1 : 0, transition: 'opacity 0.15s', width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(var(--ink-rgb), 0.1)', background: 'var(--surface)', color: 'var(--fg-muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Smile size={13} />
          </button>
          {pickerOpen && (
            <div style={{ position: 'absolute', bottom: '100%', [isMe ? 'right' : 'left']: 0, marginBottom: 6, display: 'flex', gap: 2, padding: 5, background: 'var(--surface)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 20 } as React.CSSProperties}>
              {REACTION_CHOICES.map(e => (
                <button key={e} onClick={() => { onReact(msg.id, e); setPickerOpen(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 4px', borderRadius: 6 }}>{e}</button>
              ))}
            </div>
          )}
        </div>

        {onOpenThread && (
          <button onClick={() => onOpenThread(msg)} aria-label="Reply in thread"
            style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.15s', width: 26, height: 26, borderRadius: '50%', border: '1px solid rgba(var(--ink-rgb), 0.1)', background: 'var(--surface)', color: 'var(--fg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={12} />
          </button>
        )}
        {isMe && onEdit && !editing && (
          <button type="button" onClick={() => { setDraft(msg.text); setEditing(true); }} aria-label="Edit message" title="Edit" style={actionStyle}>
            <Pencil size={11} />
          </button>
        )}
        {canPin && onPin && (
          <button type="button" onClick={() => onPin(msg)} aria-label={msg.pinned ? 'Unpin message' : 'Pin message'} title={msg.pinned ? 'Unpin' : 'Pin'} style={actionStyle}>
            {msg.pinned ? <PinOff size={11} /> : <Pin size={11} />}
          </button>
        )}
      </div>

      {replyCount > 0 && onOpenThread && (
        <button onClick={() => onOpenThread(msg)} style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 99, padding: '3px 10px', cursor: 'pointer', color: 'var(--ok)', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 0.5, alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
          <MessageSquare size={10} /> {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
        </button>
      )}

      {reactions.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
          {reactions.map(([emoji, users]) => {
            const reacted = !!currentUserId && users.includes(currentUserId);
            return (
              <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, cursor: 'pointer', fontSize: 11, fontFamily: 'var(--mono)', background: reacted ? 'rgba(232, 67, 26,0.16)' : 'rgba(var(--ink-rgb), 0.05)', border: `1px solid ${reacted ? 'rgba(232, 67, 26,0.4)' : 'rgba(var(--ink-rgb), 0.08)'}`, color: reacted ? '#ff7a4d' : 'var(--fg-muted)' }}>
                <span>{emoji}</span><span>{users.length}</span>
              </button>
            );
          })}
        </div>
      )}

      {isMe && (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-subtle)', marginTop: 4 }}>
          {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </motion.div>
  );
}

function VoiceRoom({ channel, me }: { channel: Channel; me: { id: string; name: string; avatar?: string } | null }) {
  const [joined, setJoined] = useState(false);
  const { peers, muted, toggleMute, micError, speaking } = useVoiceRoom(channel.id, me, joined);

  useEffect(() => { setJoined(false); }, [channel.id]);

  const everyone = joined && me ? [{ id: me.id, name: me.name, avatar: me.avatar, speaking, connected: true }, ...peers] : peers;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, padding: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--display)', fontSize: '1.8rem', letterSpacing: 2 }}>
        <Volume2 size={24} color="var(--accent)" /> {channel.name}
      </div>
      {everyone.length > 0 ? (
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
          {everyone.map(m => (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ border: `2px solid ${m.speaking ? '#10b981' : 'rgba(var(--ink-rgb), 0.15)'}`, borderRadius: '50%', boxShadow: m.speaking ? '0 0 18px rgba(16,185,129,0.6)' : 'none', transition: 'border-color 0.15s, box-shadow 0.15s' }}>
                <Avatar src={m.avatar} name={m.name} size={56} />
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--fg-muted)' }}>
                {m.name}{m.id === me?.id ? ' (you)' : ''}
                {m.id !== me?.id && !m.connected && <span style={{ color: 'var(--warn)' }}> · connecting…</span>}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', letterSpacing: 1 }}>{joined ? 'Waiting for others to join…' : 'No one here yet'}</div>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={() => setJoined(j => !j)} style={{ padding: '12px 28px', borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, fontWeight: 600, background: joined ? 'rgba(232, 67, 26,0.15)' : '#10b981', color: joined ? '#ff7a4d' : '#031a12', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Volume2 size={14} /> {joined ? 'LEAVE VOICE' : 'JOIN VOICE'}
        </button>
        {joined && (
          <button onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'} style={{ padding: 12, borderRadius: '50%', border: `1px solid ${muted ? 'rgba(232, 67, 26,0.5)' : 'rgba(var(--ink-rgb), 0.15)'}`, cursor: 'pointer', background: muted ? 'rgba(232, 67, 26,0.15)' : 'rgba(var(--ink-rgb), 0.05)', color: muted ? 'var(--accent)' : 'var(--fg-strong)', display: 'flex' }}>
            {muted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', color: micError ? 'var(--warn)' : 'var(--fg-dim)', letterSpacing: 1, maxWidth: 340, textAlign: 'center', lineHeight: 1.6 }}>
        {micError || (joined ? 'Live — peer-to-peer audio with your crew. Green ring = speaking.' : 'Join to talk with everyone in this room.')}
      </div>
    </div>
  );
}

function NewChannelModal({ projectTitle, scope, onClose, onCreate }: {
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
  const label: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--fg-muted)', display: 'block', marginBottom: 8 };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal)', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} onMouseDown={e => e.stopPropagation()}
        style={{ width: 440, maxWidth: '100%', maxHeight: '100%', overflowY: 'auto', background: 'var(--bg-3)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 16, padding: 26 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 3, color: 'var(--fg-dim)', textTransform: 'uppercase', marginBottom: 6 }}>{projectTitle}</div>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.5rem', letterSpacing: 2, margin: '0 0 20px' }}>New channel</h2>

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
                style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 7, cursor: 'pointer', background: audience === o.id ? 'rgba(232, 67, 26,0.1)' : 'transparent', border: `1px solid ${audience === o.id ? 'rgba(232, 67, 26,0.45)' : 'rgba(var(--ink-rgb), 0.08)'}`, color: audience === o.id ? 'var(--fg-strong)' : 'var(--fg-muted)' }}>
                <span style={{ display: 'block', fontSize: 12 }}>{o.label}</span>
                <span style={{ display: 'block', fontSize: 10, color: 'var(--fg-dim)', marginTop: 2, lineHeight: 1.35 }}>{o.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div><div style={{ fontSize: 12, color: 'var(--fg)' }}>Private channel</div><div style={{ fontSize: 10, color: 'var(--fg-dim)', marginTop: 2 }}>Invite-only, within who it’s for</div></div>
          <button role="switch" aria-checked={isPrivate} aria-label="Private channel" onClick={() => setIsPrivate(v => !v)} style={{ width: 42, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer', background: isPrivate ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.12)', position: 'relative', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: 3, left: isPrivate ? 21 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
          </button>
        </div>

        {type === 'text' && (
          <div style={{ marginBottom: 22 }}>
            <label style={label}>Who can post</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {([['viewers', 'Everyone who can see it'], ['members', 'Only explicit members'], ['managers', 'Only managers (announcements)']] as const).map(([v, d]) => (
                <button key={v} onClick={() => setPostPolicy(v)} style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 7, cursor: 'pointer', background: postPolicy === v ? 'rgba(var(--ink-rgb), 0.06)' : 'transparent', border: `1px solid ${postPolicy === v ? 'rgba(var(--ink-rgb), 0.2)' : 'rgba(var(--ink-rgb), 0.06)'}`, color: postPolicy === v ? 'var(--fg-strong)' : 'var(--fg-muted)', fontSize: 12 }}>{d}</button>
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

function ManageChannelModal({ channel, meId, onClose, onChanged }: { channel: Channel; meId?: string; onClose: () => void; onChanged: () => void }) {
  const [members, setMembers] = useState<ChannelMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string; username: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [postPolicy, setPostPolicy] = useState(channel.post_policy);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [discordConnected, setDiscordConnected] = useState(false);
  const [discordInput, setDiscordInput] = useState('');
  const [discordBusy, setDiscordBusy] = useState(false);
  const confirm = useConfirm();

  const refresh = useCallback(async () => { setLoading(true); setMembers(await listChannelMembers(channel.id)); setLoading(false); }, [channel.id]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { hasDiscordWebhook(channel.id).then(setDiscordConnected); }, [channel.id]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    let live = true; setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id, username').ilike('username', `%${query.trim()}%`).eq('is_sample', false).limit(8);
      if (live) { setResults((data as any[] || []).filter(u => !members.some(m => m.user_id === u.id))); setSearching(false); }
    }, 220);
    return () => { live = false; clearTimeout(t); };
  }, [query, members]);

  const doAdd = async (u: { id: string; username: string }) => {
    setBusy(true); setErr(null);
    const e = await addChannelMember(channel.id, u.id, { can_post: true, can_manage: false });
    setBusy(false); setQuery(''); setResults([]);
    if (e) { setErr(e); return; }
    await refresh(); onChanged();
  };
  const doRemove = async (m: ChannelMember) => { setBusy(true); const e = await removeChannelMember(m.id); setBusy(false); if (e) { setErr(e); return; } await refresh(); onChanged(); };
  const toggle = async (m: ChannelMember, field: 'can_post' | 'can_manage') => {
    setBusy(true);
    await supabase.from('channel_members').update({ [field]: !m[field] } as { can_post?: boolean; can_manage?: boolean }).eq('id', m.id);
    setBusy(false); await refresh();
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

  const label: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--fg-muted)', display: 'block', marginBottom: 8 };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal)', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} onMouseDown={e => e.stopPropagation()}
        style={{ width: 460, maxWidth: '100%', maxHeight: '86vh', overflowY: 'auto', background: 'var(--bg-3)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 16, padding: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 3, color: 'var(--fg-dim)', textTransform: 'uppercase', marginBottom: 6 }}>Manage channel</div>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: '1.4rem', letterSpacing: 1, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
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
                style={{ textAlign: 'left', padding: '7px 10px', borderRadius: 7, cursor: 'pointer', background: audience === o.id ? 'rgba(232, 67, 26,0.1)' : 'transparent', border: `1px solid ${audience === o.id ? 'rgba(232, 67, 26,0.45)' : 'rgba(var(--ink-rgb), 0.08)'}`, color: audience === o.id ? 'var(--fg-strong)' : 'var(--fg-muted)', fontSize: 12 }}>
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
                <button key={v} onClick={() => savePolicy(v)} style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 7, cursor: 'pointer', background: postPolicy === v ? 'rgba(var(--ink-rgb), 0.06)' : 'transparent', border: `1px solid ${postPolicy === v ? 'rgba(var(--ink-rgb), 0.2)' : 'rgba(var(--ink-rgb), 0.06)'}`, color: postPolicy === v ? 'var(--fg-strong)' : 'var(--fg-muted)', fontSize: 12 }}>{d}</button>
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
                {searching && <div style={{ fontSize: 10, color: 'var(--fg-dim)', padding: 6, fontFamily: 'var(--mono)' }}>Searching…</div>}
                {results.map(u => (
                  <button key={u.id} disabled={busy} onClick={() => doAdd(u)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 7, background: 'rgba(var(--ink-rgb), 0.03)', border: '1px solid rgba(var(--ink-rgb), 0.06)', cursor: 'pointer', color: 'var(--fg-strong)', textAlign: 'left' }}>
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
          <div style={{ fontSize: 10, color: 'var(--fg-dim)', padding: 12, fontFamily: 'var(--mono)' }}>Loading…</div>
        ) : members.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--fg-dim)', padding: 12 }}>{channel.is_private ? 'No explicit members yet — add someone above.' : 'Public channel — everyone with project access can see it.'}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {members.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'rgba(var(--ink-rgb), 0.03)', border: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(var(--ink-rgb), 0.1)', color: 'var(--fg-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{(m.profiles?.username || '?').charAt(0).toUpperCase()}</div>
                <span style={{ fontSize: 13, color: 'var(--fg-strong)' }}>{m.profiles?.username || 'unknown'}{m.user_id === meId && <span style={{ color: 'var(--fg-dim)', fontSize: 10 }}> (you)</span>}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={() => toggle(m, 'can_post')} disabled={busy} title="Can post" style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 1, padding: '4px 7px', borderRadius: 5, cursor: 'pointer', background: m.can_post ? 'rgba(16,185,129,0.14)' : 'rgba(var(--ink-rgb), 0.04)', border: `1px solid ${m.can_post ? 'rgba(16,185,129,0.4)' : 'rgba(var(--ink-rgb), 0.1)'}`, color: m.can_post ? 'var(--ok)' : 'var(--fg-dim)' }}>POST</button>
                  <button onClick={() => toggle(m, 'can_manage')} disabled={busy} title="Can manage" style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 1, padding: '4px 7px', borderRadius: 5, cursor: 'pointer', background: m.can_manage ? 'rgba(245,158,11,0.14)' : 'rgba(var(--ink-rgb), 0.04)', border: `1px solid ${m.can_manage ? 'rgba(245,158,11,0.4)' : 'rgba(var(--ink-rgb), 0.1)'}`, color: m.can_manage ? 'var(--warn)' : 'var(--fg-dim)' }}>MANAGE</button>
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

export default function LoungePage() {
  const { isLoading } = useOSGate();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { activeProject, projects, setActiveProject } = useProject();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [canPost, setCanPost] = useState(true);
  const [canManageActive, setCanManageActive] = useState(false);
  // Where a new channel goes: the active project, or (admins) the community.
  const [showNewChannel, setShowNewChannel] = useState<false | 'project' | 'community'>(false);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => { getMyAccount().then((a) => setIsAdmin(!!a?.is_admin)).catch(() => setIsAdmin(false)); }, []);
  const [showManage, setShowManage] = useState(false);
  const [dmTarget, setDmTarget] = useState<{ id: string; name: string } | null>(null);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [threadParent, setThreadParent] = useState<Message | null>(null);
  const [threadReplies, setThreadReplies] = useState<Message[]>([]);
  const [threadInput, setThreadInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [crewList, setCrewList] = useState<any[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const onlineIds = useOnlinePresence(currentUser?.id);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<any>(null);
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastBroadcast = useRef(0);
  // Unread per channel and per person; search and pinned panels; the message to jump to.
  const [unread, setUnread] = useState<LoungeUnread>({ channels: {}, people: {} });
  const [showSearch, setShowSearch] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const pendingChannel = useRef<string | null>(null);
  // On a phone the Lounge is one pane at a time: the list (channels and
  // people) or the conversation. Desktop shows both; CSS decides.
  const [pane, setPane] = useState<'list' | 'chat'>('list');
  const openChannel = (ch: Channel) => { setActiveChannel(ch); setDmTarget(null); setPane('chat'); };
  const openDM = (t: { id: string; name: string }) => { setDmTarget(t); setPane('chat'); };

  // A link straight into a conversation: /lounge?channel=<id> or ?dm=<person>.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const channel = q.get('channel'), dm = q.get('dm');
    if (channel) { pendingChannel.current = channel; setPane('chat'); }
    if (dm) {
      supabase.from('profiles').select('id, username').eq('id', dm).maybeSingle()
        .then(({ data }) => { if (data) openDM({ id: data.id, name: data.username || 'someone' }); });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reloadChannels = useCallback(async () => {
    const list = await listChannels(activeProject?.id);
    setChannels(list);
    setActiveChannel(prev => {
      const pending = pendingChannel.current && list.find(c => c.id === pendingChannel.current);
      if (pending) { pendingChannel.current = null; return pending; }
      if (prev && list.some(c => c.id === prev.id)) return prev;
      return list.find(c => c.type === 'text') || list[0] || null;
    });
  }, [activeProject?.id]);

  useEffect(() => { reloadChannels(); }, [reloadChannels]);

  // Channels a production tends to want, offered to its owner when they fit
  // the phase, the brief and the crew (public.channel_presets, lib/brief).
  const ownsActive = !!(activeProject && currentUser && activeProject.creator_id === currentUser.id);
  const loungePhase = activeProject ? mapStatusToPhase(activeProject.status) : null;
  const loungeBrief = useProjectBrief(ownsActive ? activeProject!.id : null, activeProject?.project_type ?? null, loungePhase, { script: false });
  const [presets, setPresets] = useState<ChannelPreset[]>([]);
  useEffect(() => { if (ownsActive) loadChannelPresets().then(setPresets).catch(() => setPresets([])); }, [ownsActive]);
  const suggested = useMemo(() => {
    if (!ownsActive || !loungePhase || loungeBrief.loading) return [];
    const open = channels.filter((c) => c.project_id === activeProject!.id).map((c) => c.name);
    return suggestChannels(presets, { phase: loungePhase, context: { ...loungeBrief.context, channels: open }, implied: loungeBrief.implied.channels });
  }, [ownsActive, loungePhase, loungeBrief.loading, loungeBrief.context, loungeBrief.implied.channels, presets, channels, activeProject]);
  const addPreset = async (p: ChannelPreset) => {
    if (!activeProject) return;
    const { channel, error } = await createChannel({ project_id: activeProject.id, name: p.name, type: p.type, audience: p.audience, post_policy: p.post_policy, topic: p.topic });
    if (error) { toast(error, 'error'); return; }
    toast(`Opened #${p.name} for ${audienceLabel(p.audience).toLowerCase()}`, 'success');
    await reloadChannels();
    if (channel) openChannel(channel);
  };

  // The people on the active project: its owner and crew (not the whole platform).
  useEffect(() => {
    let alive = true;
    const project = activeProject;
    if (!project?.id) { setCrewList([]); return; }
    (async () => {
      const [{ data: crew }, { data: owner }] = await Promise.all([
        supabase.from('project_crew').select('user_id, role, craft, profiles!project_crew_user_id_fkey(username, avatar_url)').eq('project_id', project.id),
        project.creator_id
          ? supabase.from('profiles').select('id, username, avatar_url').eq('id', project.creator_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (!alive) return;
      const team = [
        ...(owner ? [{ id: owner.id, name: owner.username || 'Owner', role: 'Owner', avatar: owner.avatar_url }] : []),
        ...(crew || [])
          .filter((c) => c.user_id !== owner?.id)
          .map((c) => ({ id: c.user_id, name: c.profiles?.username || 'Crew', role: c.craft || (c.role === 'lead' ? 'Lead' : 'Crew'), avatar: c.profiles?.avatar_url })),
      ];
      setCrewList(team);
    })();
    return () => { alive = false; };
  }, [activeProject?.id, activeProject?.creator_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onlineCrew = crewList.filter(m => onlineIds.has(m.id)).length;
  // What's open doesn't count as unread: it's being read.
  const unreadOf = (channelId: string) => (!dmTarget && activeChannel?.id === channelId ? 0 : unread.channels[channelId] ?? 0);
  const unreadFrom = (personId: string) => (dmTarget?.id === personId ? 0 : unread.people[personId] ?? 0);
  const unreadTotal = Object.keys(unread.channels).filter((id) => channels.some((c) => c.id === id)).reduce((n, id) => n + unreadOf(id), 0)
    + Object.keys(unread.people).reduce((n, id) => n + unreadFrom(id), 0);
  usePillStage(
    {
      module: 'lounge',
      title: activeChannel ? `#${activeChannel.name}` : 'Lounge',
      accent: '#10b981',
      fields: [
        { label: 'Online', value: `${onlineCrew}/${crewList.length}`, color: onlineCrew > 0 ? 'var(--ok)' : undefined },
        { label: 'Msgs', value: `${messages.length}` },
        ...(unreadTotal > 0 ? [{ label: 'Unread', value: `${unreadTotal}`, color: 'var(--ok)' }] : []),
      ],
    },
    [activeChannel?.name, onlineCrew, crewList.length, messages.length, unreadTotal],
  );

  useEffect(() => {
    if (!activeChannel || activeChannel.type === 'voice') { setCanPost(false); setCanManageActive(false); return; }
    let active = true;
    Promise.all([canPostChannel(activeChannel.id), canManageChannel(activeChannel.id)]).then(([p, m]) => {
      if (active) { setCanPost(p); setCanManageActive(m); }
    });
    return () => { active = false; };
  }, [activeChannel]);

  // Who's signed in, once. (awaitOSUser returns a fresh object each call, so
  // this can't live in an effect that depends on currentUser — it would loop.)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const user = await awaitOSUser();
      if (user && mounted) {
        setCurrentUser(user);
        const { data: mine } = await supabase.from('profiles').select('username, avatar_url, role, status').eq('id', user.id).single();
        if (mounted) setMyProfile(mine);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const currentUserId: string | undefined = currentUser?.id;
  useEffect(() => {
    let mounted = true;
    const loadMessages = async () => {
      try {
        const data = dmTarget && currentUserId
          ? await getDMThread(currentUserId, dmTarget.id)
          : activeChannel
          ? await getChannelMessagesByUuid(activeChannel.id)
          : [];
        if (!mounted) return;
        const formatted = data.map((m: any) => ({
          id: m.id,
          user: m.profiles?.username || 'Deleted account',
          text: m.content,
          timestamp: new Date(m.created_at),
          sender_id: m.sender_id,
          reactions: m.reactions || {},
          avatar_url: m.profiles?.avatar_url,
          edited: !!m.edited_at,
          pinned: !!m.pinned,
        }));
        setMessages(formatted);
        if (!dmTarget) {
          const counts = await getReplyCounts(formatted.map(f => f.id));
          if (mounted) setReplyCounts(counts);
        }
      } catch (e) {
        console.error(e);
      }
    };
    if (dmTarget && !currentUserId) return () => { mounted = false; };
    loadMessages();

    let channel: any;
    if (dmTarget && currentUserId) {
      const pairKey = [currentUserId, dmTarget.id].sort().join(':');
      channel = supabase.channel(`dm:${pairKey}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload: any) => {
          const m = payload.new;
          if ((m.sender_id === currentUserId && m.receiver_id === dmTarget.id) ||
              (m.sender_id === dmTarget.id && m.receiver_id === currentUserId)) loadMessages();
        })
        .subscribe();
    } else if (activeChannel) {
      channel = subscribeToChannelUuid(activeChannel.id, () => loadMessages());
    }

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [activeChannel, dmTarget, currentUserId]);

  useEffect(() => {
    // Jumping to a message (search, pinned) scrolls to it; otherwise follow the newest.
    if (focusId) {
      const el = document.getElementById(`msg-${focusId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightId(focusId);
      setFocusId(null);
      const t = setTimeout(() => setHighlightId(null), 2600);
      return () => clearTimeout(t);
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, focusId]);

  // Unread counts: loaded once signed in, and again whenever a message arrives
  // anywhere this person can read (Realtime applies the same policy).
  useEffect(() => {
    if (!currentUserId) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reload = () => { getLoungeUnread().then((u) => { if (alive) setUnread(u); }); };
    reload();
    const ch = supabase.channel(`lounge-unread:${currentUserId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => { clearTimeout(timer); timer = setTimeout(reload, 700); })
      .subscribe();
    return () => { alive = false; clearTimeout(timer); supabase.removeChannel(ch); };
  }, [currentUserId]);

  // Reading what's open: the channel or conversation is marked read when it
  // opens and as messages arrive in it.
  useEffect(() => {
    if (!currentUserId) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const partner = dmTarget?.id ?? null;
    const channelId = !partner && activeChannel && activeChannel.type !== 'voice' ? activeChannel.id : null;
    if (!partner && !channelId) return;
    const t = setTimeout(() => {
      void markLoungeRead(partner ? { partner } : { channel: channelId! }).then(() => setUnread((u) => partner
        ? { ...u, people: { ...u.people, [partner]: 0 } }
        : { ...u, channels: { ...u.channels, [channelId!]: 0 } }));
    }, 400);
    return () => clearTimeout(t);
  }, [currentUserId, activeChannel, dmTarget, messages.length]);

  useEffect(() => {
    if (!activeChannel) return;
    const uname = myProfile?.username || 'Someone';
    const ch = supabase.channel(`typing:${activeChannel.id}`, { config: { broadcast: { self: false } } });
    ch.on('broadcast', { event: 'typing' }, ({ payload }: any) => {
      const name = payload?.username;
      if (!name) return;
      setTypingUsers(prev => prev.includes(name) ? prev : [...prev, name]);
      clearTimeout(typingTimers.current[name]);
      typingTimers.current[name] = setTimeout(() => setTypingUsers(prev => prev.filter(n => n !== name)), 3200);
    }).subscribe();
    typingChannelRef.current = { ch, uname };
    return () => { supabase.removeChannel(ch); setTypingUsers([]); };
  }, [activeChannel, myProfile?.username]);

  useEffect(() => {
    if (!threadParent) { setThreadReplies([]); return; }
    let mounted = true;
    const load = async () => {
      const data = await getThreadReplies(threadParent.id);
      if (!mounted) return;
      setThreadReplies(data.map((m: any) => ({ id: m.id, user: m.profiles?.username || 'Deleted account', text: m.content, timestamp: new Date(m.created_at), sender_id: m.sender_id, reactions: m.reactions || {} })));
    };
    load();
    const ch = supabase.channel(`thread:${threadParent.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `parent_message_id=eq.${threadParent.id}` }, () => load())
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [threadParent]);

  if (isLoading) return null;
  const isGuide = !dmTarget && activeChannel?.type === 'guide';

  const broadcastTyping = () => {
    const now = Date.now();
    if (now - lastBroadcast.current < 1200) return;
    lastBroadcast.current = now;
    typingChannelRef.current?.ch?.send({ type: 'broadcast', event: 'typing', payload: { username: typingChannelRef.current.uname } });
  };

  const handleDeleteGuideSection = async (m: Message) => {
    if (!(await confirm({ title: 'Remove this section?', message: `“${m.text.split('\n')[0].slice(0, 80)}” will be removed from the guide.`, confirmLabel: 'Remove', danger: true }))) return;
    try {
      await deleteMessage(m.id);
      setMessages((prev) => prev.filter((x) => x.id !== m.id));
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not remove it', 'error'); }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    if (!currentUser) return;
    setMessages(prev => prev.map(m => {
      if (m.id !== messageId) return m;
      const r: Record<string, string[]> = { ...(m.reactions || {}) };
      const users = r[emoji] || [];
      if (users.includes(currentUser.id)) { const n = users.filter(u => u !== currentUser.id); if (n.length) r[emoji] = n; else delete r[emoji]; }
      else r[emoji] = [...users, currentUser.id];
      return { ...m, reactions: r };
    }));
    try { await toggleReaction(messageId, emoji, currentUser.id); } catch (e) { console.error(e); }
  };

  const handleEdit = async (m: Message, text: string) => {
    try {
      await editMessage(m.id, text);
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, text, edited: true } : x)));
      return true;
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not edit it', 'error'); return false; }
  };

  const handlePin = async (m: Message) => {
    try {
      await pinMessage(m.id, !m.pinned);
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned: !m.pinned } : x)));
      toast(m.pinned ? 'Unpinned' : 'Pinned — find it under Pinned', 'success');
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not pin it', 'error'); }
  };

  const unpinById = async (id: string) => {
    try {
      await pinMessage(id, false);
      setMessages((prev) => prev.map((x) => (x.id === id ? { ...x, pinned: false } : x)));
    } catch (e) { toast(e instanceof Error ? e.message : 'Could not unpin it', 'error'); }
  };

  // Opens where a search result lives — its channel (switching project if it's
  // another production's), or the direct conversation — and scrolls to it.
  const jumpTo = (hit: LoungeHit) => {
    setShowSearch(false);
    setPane('chat');
    setFocusId(hit.parent_message_id ?? hit.id);
    if (hit.channel_uuid) {
      const here = channels.find((c) => c.id === hit.channel_uuid);
      if (here) { setDmTarget(null); setActiveChannel(here); return; }
      const project = hit.project_id ? projects.find((p) => p.id === hit.project_id) : null;
      if (project) { pendingChannel.current = hit.channel_uuid; setDmTarget(null); setActiveProject(project); return; }
      toast('That channel isn’t in your list any more', 'info');
      return;
    }
    const partner = hit.sender_id === currentUser?.id ? hit.receiver_id : hit.sender_id;
    if (!partner) return;
    const known = crewList.find((c) => c.id === partner);
    setDmTarget({ id: partner, name: known?.name ?? hit.sender ?? 'someone' });
  };

  const handleThreadSend = async () => {
    const text = threadInput.trim();
    if (!text || !currentUser || !threadParent) return;
    setThreadInput('');
    try {
      if (!activeChannel) return;
      await sendChannelMessage(currentUser.id, text, activeChannel.id, threadParent.id);
      setReplyCounts(prev => ({ ...prev, [threadParent.id]: (prev[threadParent.id] || 0) + 1 }));

      if (threadParent.sender_id && threadParent.sender_id !== currentUser.id) {
        notify(threadParent.sender_id, {
          type: 'reply',
          title: `${myProfile?.username || 'Someone'} replied in a thread`,
          body: text.length > 90 ? text.slice(0, 90) + '…' : text,
          link: `/lounge?channel=${activeChannel.id}`,
        }, currentUser.id);
      }
    } catch (e: any) { console.error(e); setThreadInput(text); toast(e?.message || 'Reply failed to send', 'error'); }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !currentUser) return;
    setInput('');
    try {
      const from = myProfile?.username || 'Someone';
      if (dmTarget) {
        await sendDirectMessage(currentUser.id, dmTarget.id, text);
        notify(dmTarget.id, {
          type: 'reply',
          title: `Direct message from ${from}`,
          body: text.length > 90 ? text.slice(0, 90) + '…' : text,
          link: `/lounge?dm=${currentUser.id}`,
        }, currentUser.id);
        return;
      }
      if (!activeChannel) return;
      await sendChannelMessage(currentUser.id, text, activeChannel.id);

      const mentioned = new Set((text.match(/@([a-zA-Z0-9_]+)/g) || []).map(m => m.slice(1).toLowerCase()));
      if (mentioned.size > 0) {
        crewList
          .filter(m => m.id !== currentUser.id && mentioned.has(String(m.name).toLowerCase()))
          .forEach(m => notify(m.id, {
            type: 'mention',
            title: `${from} mentioned you in #${activeChannel.name}`,
            body: text.length > 90 ? text.slice(0, 90) + '…' : text,
            link: `/lounge?channel=${activeChannel.id}`,
          }, currentUser.id));
      }
    } catch (e: any) {
      console.error(e);
      setInput(text);
      toast(e?.message || 'Message failed to send', 'error');
    }
  };

  // Exactly one screen tall, ending above the dock: each pane scrolls on its
  // own, so a long channel list never pushes the composer under the dock.
  return (
    <div className="mc-lounge" style={{ background: 'var(--bg)', color: 'var(--fg)', height: '100dvh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', paddingBottom: 'calc(var(--taskbar-height, 94px) + 16px)' }}>
      <h1 className="sr-only">Lounge{activeProject ? ` — ${activeProject.title}` : ''}</h1>
      <GrainOverlay />

      <nav className="mc-lounge-top" style={{
        position: 'sticky',
        top: 0,
        padding: '0 28px',
        height: 62,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 100,
        background: 'var(--surface)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)',
        boxShadow: '0 1px 0 rgba(16,185,129,0.08) inset',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontFamily: 'var(--display)', fontSize: '0.9rem', letterSpacing: 6, color: 'var(--fg-dim)', transition: 'opacity 0.2s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '0.7')}
            >MC</div>
          </Link>
          <div style={{ width: 1, height: 16, background: 'rgba(var(--ink-rgb), 0.08)' }} />
          <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 3, color: 'var(--ok)', textTransform: 'uppercase' }}>Lounge</div>
        </div>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(var(--ink-rgb), 0.03)', padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: activeProject?.accent_color || 'var(--accent)' }} />
            <select
              aria-label="Active project"
              value={activeProject?.id || ''}
              onChange={(e) => {
                const p = projects.find(p => p.id === e.target.value);
                if (p) setActiveProject(p);
              }}
              style={{ background: 'transparent', border: 'none', color: 'var(--fg-strong)', fontSize: 10, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
            >
              {projects.map(p => <option key={p.id} value={p.id} style={{ background: 'var(--bg-3)' }}>{p.title}</option>)}
            </select>
          </div>

          <div className="mc-lounge-online" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 14px',
            background: 'rgba(var(--ink-rgb), 0.03)',
            border: '1px solid rgba(var(--ink-rgb), 0.06)',
            borderRadius: 'var(--radius-full)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00cc66', boxShadow: '0 0 8px rgba(0,204,102,0.8)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 1, color: 'var(--fg-muted)' }}>
              {onlineCrew} of {crewList.length} online
            </span>
          </div>
        </div>
      </nav>

      <div className="mc-lounge-body" data-pane={pane} style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        <div className="mc-lounge-channels" style={{
          width: 220,
          background: 'var(--bg-2)',
          borderRight: '1px solid rgba(var(--ink-rgb), 0.04)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}>
          <div style={{ padding: '16px 12px', overflowY: 'auto', flex: 1 }}>
             {(() => {
               const groups = groupChannels(channels, activeProject?.id ?? null);
               const isOwner = !!(activeProject && currentUser && (activeProject as any).creator_id === currentUser.id);
               const renderGroup = (label: string, list: Channel[], showAdd: boolean, scope: 'project' | 'community') => (
                 <div style={{ marginBottom: 18 }}>
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px', marginBottom: 8 }}>
                     <span style={{ fontSize: 'max(9px, var(--mc-min-font, 0px))', fontFamily: 'var(--mono)', color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                     {showAdd && <button aria-label={scope === 'community' ? 'New community channel' : 'New channel'} title="New channel" onClick={() => setShowNewChannel(scope)} style={{ background: 'none', border: 'none', color: 'var(--fg-subtle)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: '0 6px', minWidth: 32, minHeight: 32 }}>+</button>}
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                     {list.length === 0 && showAdd && <div style={{ fontSize: 'max(9.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', fontFamily: 'var(--mono)', padding: '2px 6px' }}>No channels yet</div>}
                     {list.map(ch => {
                       const isActive = activeChannel?.id === ch.id && !dmTarget;
                       const AUD_ICON: Record<string, typeof Hash> = { public: Globe, admins: Shield, owners: Crown, above: ArrowUp, below: ArrowDown, guests: UserCheck };
                       const Icon = ch.type === 'guide' ? BookOpen : ch.type === 'voice' ? Volume2 : ch.is_private ? Lock : AUD_ICON[ch.audience] ?? Hash;
                       const who = ch.audience === 'users' || ch.audience === 'team' ? undefined : audienceLabel(ch.audience);
                       const n = unreadOf(ch.id);
                       return (
                         <button key={ch.id} title={[who, ch.is_private ? 'Invite-only' : null, ch.topic].filter(Boolean).join(' · ') || undefined} onClick={() => openChannel(ch)}
                           aria-label={n > 0 ? `${ch.name}, ${n >= 100 ? '99+' : n} unread` : undefined}
                           style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 5, background: isActive ? 'rgba(232, 67, 26,0.1)' : 'transparent', border: 'none', color: isActive || n > 0 ? 'var(--fg-strong)' : 'var(--fg-dim)', fontWeight: n > 0 ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--mono)', fontSize: 11, width: '100%', textAlign: 'left' }}>
                           <Icon size={12} color={isActive ? 'var(--accent)' : n > 0 ? 'var(--ok)' : 'var(--fg-dim)'} style={{ flexShrink: 0 }} />
                           <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{ch.name}</span>
                           {n > 0 && <span aria-hidden style={{ marginLeft: 'auto', minWidth: 16, padding: '0 5px', borderRadius: 99, background: '#10b981', color: '#04110b', fontSize: 'max(9px, var(--mc-min-font, 0px))', fontWeight: 700, lineHeight: '15px', textAlign: 'center' }}>{n >= 100 ? '99+' : n}</span>}
                         </button>
                       );
                     })}
                   </div>
                 </div>
               );
               return (
                 <>
                   {groups.guides.length > 0 && renderGroup('Guides', groups.guides, false, 'community')}
                   {activeProject && renderGroup(activeProject.title, groups.project, isOwner, 'project')}
                   {suggested.length > 0 && (
                     <div style={{ margin: '-8px 0 18px' }} aria-label="Suggested channels" role="group">
                       <div style={{ fontSize: 'max(8.5px, var(--mc-min-font, 0px))', fontFamily: 'var(--mono)', color: 'var(--fg-dim)', textTransform: 'uppercase', letterSpacing: 2, padding: '0 6px', marginBottom: 6 }}>Suggested for this phase</div>
                       {suggested.map((p) => (
                         <button key={p.key} type="button" onClick={() => void addPreset(p)} title={`${p.why} ${p.topic}`.trim()}
                           aria-label={`Open #${p.name} for ${audienceLabel(p.audience)}`}
                           style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 8px', borderRadius: 5, background: 'transparent', border: '1px dashed rgba(var(--ink-rgb), 0.1)', color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 10.5, textAlign: 'left', marginBottom: 4 }}>
                           <span aria-hidden style={{ color: 'var(--accent)' }}>+</span>
                           <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.type === 'voice' ? '🔊 ' : '#'}{p.name}</span>
                           <span style={{ fontSize: 'max(8.5px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>{audienceLabel(p.audience)}</span>
                         </button>
                       ))}
                     </div>
                   )}
                   {renderGroup('Community', groups.community, isAdmin, 'community')}
                   {groups.open.length > 0 && renderGroup('Other productions', groups.open, false, 'project')}
                 </>
               );
             })()}
          </div>

          <div style={{ marginTop: 'auto', padding: 20, borderTop: '1px solid rgba(var(--ink-rgb), 0.04)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar src={myProfile?.avatar_url} name={myProfile?.username || currentUser?.email} size={28} radius={6} />
                <div style={{ flex: 1, minWidth: 0 }}>
                   <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{myProfile?.username || 'You'}</div>
                   <div style={{ fontSize: 'max(9px, var(--mc-min-font, 0px))', color: myProfile?.status === 'BUSY' ? 'var(--warn)' : 'var(--ok)' }}>● {myProfile?.status === 'BUSY' ? 'Busy' : 'Available'}</div>
                </div>
                <Link href="/settings" title="Settings"><SettingsIcon size={14} color="var(--fg-dim)" style={{ cursor: 'pointer' }} /></Link>
             </div>
          </div>
        </div>

        <div className="mc-lounge-chat" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="mc-lounge-chathead" style={{ padding: '12px 32px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(var(--ink-rgb), 0.01)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
               <button type="button" className="mc-phone-only mc-lounge-back" onClick={() => setPane('list')} aria-label="Back to channels and people"><ChevronLeft size={20} aria-hidden /></button>
               {dmTarget ? (
                 <>
                   <span style={{ fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--ok)', fontFamily: 'var(--mono)', letterSpacing: 1, background: 'rgba(16,185,129,0.12)', padding: '2px 7px', borderRadius: 99 }}>DIRECT</span>
                   <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-strong)' }}>@{dmTarget.name}</span>
                   {onlineIds.has(dmTarget.id) && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00cc66', boxShadow: '0 0 8px rgba(0,204,102,0.8)' }} />}
                 </>
               ) : activeChannel ? (
                 <>
                   {activeChannel.is_private && <Lock size={12} color="var(--fg-dim)" />}
                   <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-strong)' }}>{activeChannel.type === 'voice' ? '🔊 ' : activeChannel.type === 'guide' ? '' : '#'}{activeChannel.name}</span>
                   {activeChannel.type === 'guide' && <span style={{ fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--info)', fontFamily: 'var(--mono)', letterSpacing: 1, background: 'rgba(0,153,255,0.12)', padding: '2px 6px', borderRadius: 99 }}>GUIDE</span>}
                   {activeChannel.post_policy === 'managers' && activeChannel.type !== 'guide' && <span style={{ fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--warn)', fontFamily: 'var(--mono)', letterSpacing: 1, background: 'rgba(245,158,11,0.12)', padding: '2px 6px', borderRadius: 99 }}>ANNOUNCE</span>}
                 </>
               ) : (
                 <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-dim)' }}>No channels</span>
               )}
               <div style={{ width: 1, height: 14, background: 'rgba(var(--ink-rgb), 0.1)', margin: '0 4px' }} />
               <span style={{ fontSize: 10, color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>{activeChannel?.topic || `${messages.length} message${messages.length === 1 ? '' : 's'}`}</span>
             </div>
             <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-muted)' }}>
                {dmTarget ? (
                  <button className="mc-hide-phone" onClick={() => setDmTarget(null)} style={{ background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.12)', color: 'var(--fg-muted)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 1 }}>← CHANNELS</button>
                ) : (
                  <><Users size={13} color="var(--fg-dim)" /> {crewList.length}</>
                )}
                <button type="button" onClick={() => { setShowPinned(false); setShowSearch(true); }} aria-label="Search messages" title="Search"
                  style={{ background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--fg-muted)', fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 1 }}>
                  <Search size={12} /> <span className="mc-hide-phone">SEARCH</span>
                </button>
                {!dmTarget && activeChannel && activeChannel.type !== 'voice' && (
                  <button type="button" onClick={() => { setShowSearch(false); setShowPinned(true); }} aria-label={`Pinned messages in #${activeChannel.name}`} title="Pinned"
                    style={{ background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--fg-muted)', fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 1 }}>
                    <Pin size={12} /> <span className="mc-hide-phone">PINNED</span>{messages.some((m) => m.pinned) ? ` · ${messages.filter((m) => m.pinned).length}` : ''}
                  </button>
                )}
                {!dmTarget && activeChannel && canManageActive && (
                  <button onClick={() => setShowManage(true)} title="Manage channel" style={{ background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--fg-muted)', fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 1 }}>
                    <SettingsIcon size={12} /> <span className="mc-hide-phone">MANAGE</span>
                  </button>
                )}
             </div>
          </div>

          {activeChannel?.type === 'voice' && !dmTarget ? (
            <VoiceRoom channel={activeChannel} me={currentUser ? { id: currentUser.id, name: myProfile?.username || 'You', avatar: myProfile?.avatar_url } : null} />
          ) : (
          <>
          <div className="mc-lounge-thread" style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              {isGuide ? (
                messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--fg-dim)', marginTop: 100, fontFamily: 'var(--mono)', fontSize: 10 }}>
                    {canPost ? `WRITE THE FIRST SECTION OF ${activeChannel!.name.toUpperCase()} BELOW` : `${activeChannel!.name.toUpperCase()} IS BEING WRITTEN — CHECK BACK SOON`}
                  </div>
                ) : (
                  <GuideSections messages={messages} canEdit={canPost} onDelete={handleDeleteGuideSection} />
                )
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--fg-muted)', marginTop: 100, fontFamily: 'var(--mono)', fontSize: 10, lineHeight: 1.7 }}>
                  {dmTarget
                    ? `Say hello to @${dmTarget.name} — messages here are just between you two.`
                    : activeChannel
                      ? `Nothing in #${activeChannel.name} yet. ${canPost ? 'Start it — write below.' : 'Only whoever runs it posts here.'}`
                      : 'Choose a channel on the left.'}
                  {!dmTarget && !activeChannel && (() => {
                    const start = channels.find((c) => !c.project_id && c.name === 'start-here');
                    return start ? (
                      <div style={{ marginTop: 14 }}>
                        <button type="button" onClick={() => openChannel(start)}
                          style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, cursor: 'pointer', fontWeight: 600 }}>
                          Open #start-here
                        </button>
                      </div>
                    ) : null;
                  })()}
                </div>
              ) : messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} currentUserId={currentUser?.id} onReact={handleReact} onOpenThread={dmTarget ? undefined : setThreadParent} replyCount={replyCounts[msg.id] || 0}
                  canPin={dmTarget ? true : canManageActive} onPin={handlePin} onEdit={dmTarget || canPost ? handleEdit : undefined} highlight={highlightId === msg.id} />
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          {(!isGuide || canPost) && <div className="mc-lounge-composer" style={{
            padding: '16px 28px',
            borderTop: '1px solid rgba(var(--ink-rgb), 0.04)',
            background: 'var(--bg-2)',
            flexShrink: 0,
          }}>
            <div style={{ maxWidth: 720, margin: '0 auto', height: 14, marginBottom: 4 }}>
              {typingUsers.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--ok)', letterSpacing: 0.5 }}>
                  <span style={{ display: 'inline-flex', gap: 2 }}>
                    {[0, 1, 2].map(i => (
                      <motion.span key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} style={{ width: 3, height: 3, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    ))}
                  </span>
                  {typingUsers.slice(0, 2).join(', ')}{typingUsers.length > 2 ? ` +${typingUsers.length - 2}` : ''} {typingUsers.length === 1 ? 'is' : 'are'} typing…
                </div>
              )}
            </div>
            <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ position: 'relative', alignSelf: 'center' }}>
                <button style={{ background: 'none', border: 'none', color: showEmoji ? 'var(--fg)' : 'var(--fg-muted)', padding: 10, cursor: 'pointer', transition: 'color 0.2s' }}
                  onClick={() => setShowEmoji(v => !v)} aria-label="emoji">
                  <Smile size={16} />
                </button>
                {showEmoji && (
                  <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, background: 'var(--surface)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 10, padding: 8, display: 'flex', gap: 4, flexWrap: 'wrap', width: 180, boxShadow: '0 12px 30px rgba(0,0,0,0.6)' }}>
                    {['😀','😂','🔥','❤️','👍','🎬','🎥','✨','💡','🎉','😮','🙏'].map(e => (
                      <button key={e} onClick={() => { setInput(prev => prev + e); setShowEmoji(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 2 }}>{e}</button>
                    ))}
                  </div>
                )}
              </div>

              <textarea
                value={input}
                disabled={!dmTarget && !canPost}
                onChange={e => { setInput(e.target.value); if (e.target.value.trim()) broadcastTyping(); }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={dmTarget ? `Message @${dmTarget.name}...` : isGuide ? `Add a section to ${activeChannel?.name || 'the guide'} — the first line is its heading` : !canPost ? `You don't have permission to post in #${activeChannel?.name || ''}` : `Message #${activeChannel?.name || ''}...`}
                rows={1}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'rgba(var(--ink-rgb), 0.03)',
                  border: '1px solid rgba(var(--ink-rgb), 0.08)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--fg)',
                  fontFamily: 'var(--serif)',
                  fontSize: 14,
                  resize: 'none',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  lineHeight: 1.5,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(232, 67, 26,0.35)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(var(--ink-rgb), 0.08)')}
              />

              <motion.button
                onClick={handleSend}
                whileHover={input.trim() ? { scale: 1.05 } : {}}
                whileTap={input.trim() ? { scale: 0.95 } : {}}
                style={{
                  padding: '11px 18px',
                  background: input.trim() ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.05)',
                  border: 'none',
                  color: input.trim() ? 'var(--bg)' : 'var(--fg-muted)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 2,
                  textTransform: 'uppercase',
                  transition: 'background 0.3s, color 0.3s',
                  alignSelf: 'flex-end',
                }}
              >
                <Send size={12} /> {isGuide ? 'Add' : 'Send'}
              </motion.button>
            </div>
          </div>}
          </>
          )}
        </div>

        <div className="mc-lounge-crew" style={{
          width: 240,
          borderLeft: '1px solid rgba(var(--ink-rgb), 0.04)',
          background: 'var(--bg-2)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          flexShrink: 0,
          overflowY: 'auto',
        }}>
          {activeProject && <ProductionFeed projectId={activeProject.id} />}

          <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 3, textTransform: 'uppercase', color: 'var(--fg-subtle)', marginBottom: 12 }}>
            Crew
          </div>

          {[...crewList].sort((a, b) => Number(onlineIds.has(b.id)) - Number(onlineIds.has(a.id))).map((member, i) => {
            const isOnline = onlineIds.has(member.id);
            const isSelf = member.id === currentUser?.id;
            return (
            <motion.div
              key={member.id || i}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.05 }}
              onClick={() => { if (!isSelf) openDM({ id: member.id, name: member.name }); }}
              title={isSelf ? 'This is you' : `Message ${member.name}`}
              style={{
                padding: '10px 12px',
                border: `1px solid ${dmTarget?.id === member.id ? 'rgba(16,185,129,0.4)' : 'rgba(var(--ink-rgb), 0.04)'}`,
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: isSelf ? 'default' : 'pointer',
                background: dmTarget?.id === member.id ? 'rgba(16,185,129,0.06)' : isOnline ? 'rgba(0,204,102,0.03)' : 'transparent',
              }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar src={member.avatar} name={member.name} size={26} />
                <div style={{
                  position: 'absolute', bottom: -1, right: -1,
                  width: 8, height: 8, borderRadius: '50%',
                  border: '1.5px solid #090909',
                  background: isOnline ? '#00cc66' : '#444',
                  boxShadow: isOnline ? '0 0 6px rgba(0,204,102,0.8)' : 'none',
                }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.3, color: isOnline ? 'var(--fg)' : 'var(--fg-muted)', fontWeight: 600 }}>
                    {member.name}
                  </div>
                  {unreadFrom(member.id) > 0 ? (
                    <div aria-label={`${unreadFrom(member.id)} unread from ${member.name}`} style={{ minWidth: 16, padding: '0 5px', borderRadius: 99, background: '#10b981', color: '#04110b', fontSize: 'max(9px, var(--mc-min-font, 0px))', fontWeight: 700, lineHeight: '15px', textAlign: 'center', fontFamily: 'var(--mono)' }}>{unreadFrom(member.id)}</div>
                  ) : isOnline && (
                    <div style={{ fontSize: 'max(7px, var(--mc-min-font, 0px))', color: 'var(--ok)', letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>Live</div>
                  )}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 1, color: 'var(--fg-subtle)', marginTop: 2 }}>
                  <span>{member.role}</span>
                </div>
              </div>
            </motion.div>
          ); })}
        </div>
      </div>

      <AnimatePresence>
        {threadParent && (
          <motion.div
            initial={{ x: 380 }} animate={{ x: 0 }} exit={{ x: 380 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(94vw, 380px)', background: 'var(--surface)', borderLeft: '1px solid rgba(var(--ink-rgb), 0.08)', backdropFilter: 'blur(24px)', zIndex: 200, display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px rgba(0,0,0,0.6)' }}
          >
            <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ok)' }}>Thread</span>
              <button onClick={() => setThreadParent(null)} aria-label="Close thread" style={{ background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
              <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
                <div style={{ fontFamily: 'var(--display)', fontSize: 12, letterSpacing: 1, color: 'var(--accent)', marginBottom: 4 }}>{threadParent.user}</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.6, color: 'rgba(var(--fg-rgb), 0.85)' }}>{threadParent.text}</div>
              </div>
              {threadReplies.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--fg-dim)', marginTop: 40, fontFamily: 'var(--mono)', fontSize: 'max(9.5px, var(--mc-min-font, 0px))' }}>No replies yet — start the thread.</div>
              ) : threadReplies.map(r => (
                <div key={r.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: r.sender_id === currentUser?.id ? '#ff7a4d' : 'var(--ok)', fontWeight: 600 }}>{r.sender_id === currentUser?.id ? 'You' : r.user}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--fg-subtle)' }}>{r.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--serif)', fontSize: 13.5, lineHeight: 1.6, color: 'rgba(var(--fg-rgb), 0.82)' }}>{r.text}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: 14, borderTop: '1px solid rgba(var(--ink-rgb), 0.06)', display: 'flex', gap: 8 }}>
              <input value={threadInput} onChange={e => setThreadInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleThreadSend(); } }}
                placeholder="Reply…" style={{ flex: 1, padding: '10px 12px', background: 'rgba(var(--ink-rgb), 0.03)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 8, color: 'var(--fg)', fontFamily: 'var(--serif)', fontSize: 13, outline: 'none' }} />
              <button onClick={handleThreadSend} aria-label="Send message" style={{ padding: '10px 14px', background: threadInput.trim() ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.05)', border: 'none', color: threadInput.trim() ? 'var(--bg)' : 'var(--fg-muted)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Send size={13} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSearch && (
          <LoungeSearch channel={!dmTarget && activeChannel && activeChannel.type !== 'voice' ? { id: activeChannel.id, name: activeChannel.name } : null}
            meId={currentUser?.id} onClose={() => setShowSearch(false)} onJump={jumpTo} />
        )}
        {showPinned && !dmTarget && activeChannel && (
          <PinnedPanel channel={{ id: activeChannel.id, name: activeChannel.name }} refreshKey={messages}
            canUnpin={canManageActive} onUnpin={(id) => void unpinById(id)} onClose={() => setShowPinned(false)}
            onJump={(id) => { setShowPinned(false); setFocusId(id); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewChannel && (showNewChannel === 'community' || activeProject) && (
          <NewChannelModal
            projectTitle={showNewChannel === 'community' ? 'Community · everyone on Misfits Cavern' : activeProject!.title}
            scope={showNewChannel}
            onClose={() => setShowNewChannel(false)}
            onCreate={async (vals) => {
              const { channel, error } = await createChannel({ project_id: showNewChannel === 'community' ? null : activeProject!.id, ...vals });
              if (error) { toast(error, 'error'); return; }
              toast(`Created #${channel?.name}`, 'success');
              setShowNewChannel(false);
              await reloadChannels();
              if (channel) setActiveChannel(channel);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showManage && activeChannel && (
          <ManageChannelModal
            channel={activeChannel}
            meId={currentUser?.id}
            onClose={() => setShowManage(false)}
            onChanged={async () => {
              await reloadChannels();
              if (activeChannel) canManageChannel(activeChannel.id).then(setCanManageActive);
            }}
          />
        )}
      </AnimatePresence>

      <style>{`
        textarea::placeholder { color: rgba(var(--fg-rgb), 0.18); }
      `}</style>
    </div>
  );
}
