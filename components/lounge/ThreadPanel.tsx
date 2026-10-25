'use client';

import { Send, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Lounge } from '@/components/lounge/useLounge';

export function ThreadPanel({ l }: { l: Lounge }) {
  const { threadParent, setThreadParent, threadInput, setThreadInput, currentUser, threadReplies, handleThreadSend } = l;
  if (!threadParent) return null;
  return (
    <motion.div
      initial={{ x: 380 }} animate={{ x: 0 }} exit={{ x: 380 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(94vw, 380px)', background: 'var(--surface)', borderLeft: '1px solid rgba(var(--ink-rgb), 0.08)', backdropFilter: 'blur(24px)', zIndex: 200, display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px rgba(0,0,0,0.6)' }}
    >
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--ok)' }}>Thread</span>
        <button onClick={() => setThreadParent(null)} aria-label="Close thread" style={{ background: 'transparent', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}><X size={16} /></button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
        <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: '1px solid rgba(var(--ink-rgb), 0.06)' }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 12, letterSpacing: '-0.02em', color: 'var(--accent)', marginBottom: 4 }}>{threadParent.user}</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.6, color: 'rgba(var(--fg-rgb), 0.85)' }}>{threadParent.text}</div>
        </div>
        {threadReplies.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--fg-dim)', marginTop: 40, fontFamily: 'var(--mono)', fontSize: 'max(9.5px, var(--mc-min-font, 0px))' }}>No replies yet — start the thread.</div>
        ) : threadReplies.map(r => (
          <div key={r.id} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: r.sender_id === currentUser?.id ? '#ff7a4d' : 'var(--ok)', fontWeight: 600 }}>{r.sender_id === currentUser?.id ? 'You' : r.user}</span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--fg-subtle)' }}>{r.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 14, lineHeight: 1.6, color: 'rgba(var(--fg-rgb), 0.82)' }}>{r.text}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: 14, borderTop: '1px solid rgba(var(--ink-rgb), 0.06)', display: 'flex', gap: 8 }}>
        <input value={threadInput} onChange={e => setThreadInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleThreadSend(); } }}
          placeholder="Reply…" style={{ flex: 1, padding: '10px 12px', background: 'rgba(var(--ink-rgb), 0.03)', border: '1px solid rgba(var(--ink-rgb), 0.08)', borderRadius: 8, color: 'var(--fg)', fontFamily: 'var(--serif)', fontSize: 13, outline: 'none' }} />
        <button onClick={handleThreadSend} aria-label="Send message" style={{ padding: '10px 14px', background: threadInput.trim() ? 'var(--accent)' : 'rgba(var(--ink-rgb), 0.05)', border: 'none', color: threadInput.trim() ? 'var(--bg)' : 'var(--fg-muted)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Send size={13} /></button>
      </div>
    </motion.div>
  );
}
