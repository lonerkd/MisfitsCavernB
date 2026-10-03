'use client';

// The Lounge's side panels: search across everything you can read, and a
// channel's pinned messages. Both hand a message back to the page to jump to.

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Pin, PinOff, Search, X } from 'lucide-react';
import { getPinnedMessages, searchLounge, type LoungeHit } from '@/lib/supabase/messages';

const panelStyle: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(94vw, 400px)', background: 'var(--surface)',
  borderLeft: '1px solid rgba(var(--ink-rgb), 0.08)', backdropFilter: 'blur(24px)', zIndex: 200, display: 'flex',
  flexDirection: 'column', boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
};
const headStyle: React.CSSProperties = { padding: '14px 18px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const titleStyle: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', gap: 6 };
const closeStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' };
const rowStyle: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', background: 'rgba(var(--ink-rgb), 0.02)', border: '1px solid rgba(var(--ink-rgb), 0.06)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', color: 'var(--fg)' };
const metaStyle: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', display: 'flex', gap: 6, marginBottom: 4 };

const when = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** The message with each searched word's matches marked. */
function Marked({ text, query }: { text: string; query: string }) {
  const words = query.toLowerCase().split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}]+/gu, '')).filter(Boolean);
  if (!words.length) return <>{text}</>;
  const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return <>{text.split(re).map((part, i) => (i % 2 ? <mark key={i} style={{ background: 'rgba(16,185,129,0.25)', color: 'var(--fg-strong)', borderRadius: 4 }}>{part}</mark> : part))}</>;
}

export function LoungeSearch({ channel, meId, onClose, onJump }: {
  channel: { id: string; name: string } | null;
  meId?: string;
  onClose: () => void;
  onJump: (hit: LoungeHit) => void;
}) {
  const [query, setQuery] = useState('');
  const [here, setHere] = useState(!!channel);
  const [hits, setHits] = useState<LoungeHit[]>([]);
  const [state, setState] = useState<'idle' | 'searching' | 'done' | 'error'>('idle');
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.replace(/[^\p{L}\p{N}]+/gu, '').length < 2) { setHits([]); setState('idle'); return; }
    const mine = ++seq.current;
    setState('searching');
    const t = setTimeout(() => {
      searchLounge(q, here && channel ? channel.id : null)
        .then((r) => { if (seq.current === mine) { setHits(r); setState('done'); } })
        .catch(() => { if (seq.current === mine) setState('error'); });
    }, 250);
    return () => clearTimeout(t);
  }, [query, here, channel]);

  return (
    <motion.aside role="dialog" aria-label="Search the Lounge" initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} style={panelStyle}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div style={headStyle}>
        <span style={titleStyle}><Search size={12} aria-hidden /> Search</span>
        <button type="button" onClick={onClose} aria-label="Close search" style={closeStyle}><X size={16} /></button>
      </div>
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Words from a message…" aria-label="Search messages"
          style={{ padding: '10px 12px', background: 'rgba(var(--ink-rgb), 0.03)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 8, color: 'var(--fg)', fontFamily: 'var(--serif)', fontSize: 14, outline: 'none' }} />
        {channel && (
          <div role="radiogroup" aria-label="Where to search" style={{ display: 'flex', gap: 6 }}>
            {[{ v: true, l: `#${channel.name}` }, { v: false, l: 'Everywhere' }].map((o) => (
              <button key={o.l} type="button" role="radio" aria-checked={here === o.v} onClick={() => setHere(o.v)}
                style={{ padding: '4px 10px', borderRadius: 9999, fontFamily: 'var(--mono)', fontSize: 'max(9.5px, var(--mc-min-font, 0px))', cursor: 'pointer', border: `1px solid ${here === o.v ? 'rgba(16,185,129,0.5)' : 'rgba(var(--ink-rgb), 0.1)'}`, background: here === o.v ? 'rgba(16,185,129,0.12)' : 'transparent', color: here === o.v ? 'var(--ok)' : 'var(--fg-muted)' }}>
                {o.l}
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }} aria-live="polite">
        {state === 'idle' && <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', margin: 0 }}>Type a word or two. The start of a word is enough.</p>}
        {state === 'searching' && <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', margin: 0 }}>Searching…</p>}
        {state === 'error' && <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--danger)', margin: 0 }}>Search failed — try again.</p>}
        {state === 'done' && hits.length === 0 && <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', margin: 0 }}>Nothing matches{here && channel ? ` in #${channel.name}` : ''}.</p>}
        {state === 'done' && hits.length > 0 && <p style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', margin: 0 }}>{hits.length === 40 ? 'The 40 newest matches' : `${hits.length} match${hits.length === 1 ? '' : 'es'}`}</p>}
        {hits.map((h) => (
          <button key={h.id} type="button" onClick={() => onJump(h)} style={rowStyle}>
            <span style={metaStyle}>
              <span style={{ color: 'var(--ok)' }}>{h.channel_name ? `#${h.channel_name}` : h.sender_id === meId ? 'Your direct message' : `@${h.sender ?? 'someone'}`}</span>
              <span>· {h.sender_id === meId ? 'you' : h.sender ?? 'Deleted account'}</span>
              <span>· {when(h.created_at)}</span>
              {h.parent_message_id && <span>· in a thread</span>}
            </span>
            <span style={{ fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.55, color: 'rgba(var(--fg-rgb), 0.85)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              <Marked text={h.content} query={query} />
            </span>
          </button>
        ))}
      </div>
    </motion.aside>
  );
}

interface PinnedRow { id: string; content: string; created_at: string; pinned_at: string | null; parent_message_id: string | null; profiles: { username: string } | null }

export function PinnedPanel({ channel, refreshKey, canUnpin, onUnpin, onClose, onJump }: {
  channel: { id: string; name: string };
  /** Changes whenever the channel's messages do, so the list follows pins made elsewhere. */
  refreshKey: unknown;
  canUnpin: boolean;
  onUnpin: (id: string) => void;
  onClose: () => void;
  onJump: (id: string) => void;
}) {
  const [rows, setRows] = useState<PinnedRow[] | null>(null);
  useEffect(() => {
    let on = true;
    getPinnedMessages(channel.id).then((r) => { if (on) setRows(r as unknown as PinnedRow[]); }).catch(() => { if (on) setRows([]); });
    return () => { on = false; };
  }, [channel.id, refreshKey]);

  return (
    <motion.aside role="dialog" aria-label={`Pinned in #${channel.name}`} initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} style={panelStyle}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div style={headStyle}>
        <span style={titleStyle}><Pin size={12} aria-hidden /> Pinned in #{channel.name}</span>
        <button type="button" onClick={onClose} aria-label="Close pinned messages" style={closeStyle}><X size={16} /></button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows === null && <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', margin: 0 }}>Loading…</p>}
        {rows?.length === 0 && (
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', margin: 0, lineHeight: 1.7 }}>
            Nothing pinned yet. {canUnpin ? 'Pin a message (the pin by it) to keep call times, addresses and decisions here.' : 'Whoever runs the channel pins what matters.'}
          </p>
        )}
        {rows?.map((r) => (
          <div key={r.id} style={{ ...rowStyle, cursor: 'default', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <button type="button" onClick={() => onJump(r.parent_message_id ?? r.id)} style={{ flex: 1, background: 'none', border: 'none', textAlign: 'left', padding: 0, cursor: 'pointer', color: 'inherit' }}>
              <span style={metaStyle}><span style={{ color: 'var(--warn)' }}>{r.profiles?.username ?? 'Deleted account'}</span><span>· {when(r.created_at)}</span></span>
              <span style={{ fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.55, color: 'rgba(var(--fg-rgb), 0.85)', whiteSpace: 'pre-wrap' }}>{r.content}</span>
            </button>
            {canUnpin && (
              <button type="button" onClick={() => { onUnpin(r.id); setRows((prev) => prev?.filter((x) => x.id !== r.id) ?? null); }} aria-label="Unpin" title="Unpin"
                style={{ background: 'none', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 8, color: 'var(--fg-muted)', cursor: 'pointer', padding: 4, display: 'inline-flex' }}>
                <PinOff size={11} />
              </button>
            )}
          </div>
        ))}
      </div>
    </motion.aside>
  );
}
