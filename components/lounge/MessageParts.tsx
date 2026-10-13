'use client';

import { ReportButton } from '@/components/ui/ReportButton';
import React, { useState } from 'react';
import { Smile, MessageSquare, Trash2, Pin, PinOff, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import Avatar from '@/components/ui/Avatar';
import type { Message } from '@/components/lounge/types';

export const REACTION_CHOICES = ['👍', '❤️', '🔥', '🎬', '😂', '🎉', '👀', '🙏'];

/**
 * A guide channel reads as a document: each post is a section, its first line
 * the heading. Whoever runs the guide can remove a section.
 */
export function GuideSections({ messages, canEdit, onDelete }: { messages: Message[]; canEdit: boolean; onDelete: (m: Message) => void }) {
  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {messages.map((m) => {
        const [head, ...rest] = m.text.split('\n');
        const body = rest.join('\n').trim();
        return (
          <section key={m.id} style={{ background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.06)', borderRadius: 8, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: 'var(--fg-strong)', fontWeight: 600, lineHeight: 1.4 }}>{head}</h3>
              {canEdit && (
                <button type="button" onClick={() => onDelete(m)} aria-label={`Remove section: ${head.slice(0, 60)}`}
                  style={{ background: 'none', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 8, color: 'var(--fg-muted)', cursor: 'pointer', padding: 4, display: 'inline-flex', flexShrink: 0 }}><Trash2 size={12} /></button>
              )}
            </div>
            {body && <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.65, color: 'var(--fg)', whiteSpace: 'pre-wrap', fontFamily: 'var(--serif)' }}>{body}</p>}
            <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)' }}>{m.user} · {m.timestamp.toLocaleDateString()}</div>
          </section>
        );
      })}
    </article>
  );
}

export function MessageBubble({ msg, currentUserId, onReact, onOpenThread, replyCount = 0, canPin = false, onPin, onEdit, highlight = false }: {
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
        borderRadius: 14,
        outline: highlight ? '1px solid rgba(16,185,129,0.6)' : 'none',
        outlineOffset: 6,
        transition: 'outline-color 0.4s',
      }}
    >
      {msg.pinned && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--warn)', marginBottom: 4 }}>
          <Pin size={9} aria-hidden /> PINNED
        </span>
      )}
      {!isMe && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <Avatar src={msg.avatar_url} name={msg.user} size={20} />
          <span style={{ fontFamily: 'var(--display)', fontSize: 13, letterSpacing: '-0.02em', color: 'var(--accent)' }}>
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
                style={{ width: '100%', background: 'var(--sunken)', border: '1px solid rgba(var(--ink-rgb), 0.15)', borderRadius: 8, color: 'var(--fg)', fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.55, padding: '6px 8px', resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))' }}>
                <span style={{ color: 'var(--fg-dim)', marginRight: 'auto', alignSelf: 'center' }}>Enter saves · Esc cancels</span>
                <button type="button" onClick={() => { setDraft(msg.text); setEditing(false); }} style={{ background: 'none', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 4, color: 'var(--fg-muted)', padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}>Cancel</button>
                <button type="button" onClick={() => void saveEdit()} disabled={!draft.trim()} style={{ background: 'var(--accent)', border: 'none', borderRadius: 4, color: 'var(--on-accent)', padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 600 }}>Save</button>
              </div>
            </div>
          ) : (
            <p style={{ fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.65, color: msg.hidden ? 'var(--fg-muted)' : 'rgba(var(--fg-rgb), 0.85)', fontStyle: msg.hidden ? 'italic' : undefined, margin: 0, whiteSpace: 'pre-wrap' }}>
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
            <div style={{ position: 'absolute', bottom: '100%', [isMe ? 'right' : 'left']: 0, marginBottom: 6, display: 'flex', gap: 2, padding: 5, background: 'var(--surface)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 20 } as React.CSSProperties}>
              {REACTION_CHOICES.map(e => (
                <button key={e} onClick={() => { onReact(msg.id, e); setPickerOpen(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 4px', borderRadius: 8 }}>{e}</button>
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
        {isMe && onEdit && !editing && !msg.hidden && (
          <button type="button" onClick={() => { setDraft(msg.text); setEditing(true); }} aria-label="Edit message" title="Edit" style={actionStyle}>
            <Pencil size={11} />
          </button>
        )}
        {!isMe && !msg.hidden && currentUserId && <ReportButton kind="message" targetId={msg.id} style={actionStyle} />}
        {canPin && onPin && (
          <button type="button" onClick={() => onPin(msg)} aria-label={msg.pinned ? 'Unpin message' : 'Pin message'} title={msg.pinned ? 'Unpin' : 'Pin'} style={actionStyle}>
            {msg.pinned ? <PinOff size={11} /> : <Pin size={11} />}
          </button>
        )}
      </div>

      {replyCount > 0 && onOpenThread && (
        <button onClick={() => onOpenThread(msg)} style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 9999, padding: '3px 10px', cursor: 'pointer', color: 'var(--ok)', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
          <MessageSquare size={10} /> {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
        </button>
      )}

      {reactions.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
          {reactions.map(([emoji, users]) => {
            const reacted = !!currentUserId && users.includes(currentUserId);
            return (
              <button key={emoji} onClick={() => onReact(msg.id, emoji)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 9999, cursor: 'pointer', fontSize: 11, fontFamily: 'var(--mono)', background: reacted ? 'rgba(232, 67, 26,0.16)' : 'rgba(var(--ink-rgb), 0.05)', border: `1px solid ${reacted ? 'rgba(232, 67, 26,0.4)' : 'rgba(var(--ink-rgb), 0.08)'}`, color: reacted ? '#ff7a4d' : 'var(--fg-muted)' }}>
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
