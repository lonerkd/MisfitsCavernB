'use client';

import { Send, Smile } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Lounge } from '@/components/lounge/useLounge';

export function Composer({ l }: { l: Lounge }) {
  const { activeChannel, dmTarget, input, setInput, showEmoji, setShowEmoji, typingUsers, canPost, isGuide, broadcastTyping, handleSend } = l;
  return (
    <div className="mc-lounge-composer" style={{
      padding: '16px 28px',
      borderTop: '1px solid rgba(var(--ink-rgb), 0.04)',
      background: 'var(--bg-2)',
      flexShrink: 0,
    }}>
      <div style={{ maxWidth: 'var(--w-reading)', margin: '0 auto', height: 14, marginBottom: 4 }}>
        {typingUsers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--ok)', letterSpacing: 'var(--caps-track)' }}>
            <span style={{ display: 'inline-flex', gap: 2 }}>
              {[0, 1, 2].map(i => (
                <motion.span key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--lounge-color)', display: 'inline-block' }} />
              ))}
            </span>
            {typingUsers.slice(0, 2).join(', ')}{typingUsers.length > 2 ? ` +${typingUsers.length - 2}` : ''} {typingUsers.length === 1 ? 'is' : 'are'} typing…
          </div>
        )}
      </div>
      <div style={{ maxWidth: 'var(--w-reading)', margin: '0 auto', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ position: 'relative', alignSelf: 'center' }}>
          <button style={{ background: 'none', border: 'none', color: showEmoji ? 'var(--fg)' : 'var(--fg-muted)', padding: 10, cursor: 'pointer', transition: 'color 0.2s' }}
            onClick={() => setShowEmoji(v => !v)} aria-label="emoji">
            <Smile size={16} />
          </button>
          {showEmoji && (
            <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, background: 'var(--surface)', border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 8, padding: 8, display: 'flex', gap: 4, flexWrap: 'wrap', width: 180, boxShadow: '0 12px 30px rgba(0,0,0,0.6)' }}>
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
            fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)',
            textTransform: 'var(--caps)',
            transition: 'background 0.3s, color 0.3s',
            alignSelf: 'flex-end',
          }}
        >
          <Send size={12} /> {isGuide ? 'Add' : 'Send'}
        </motion.button>
      </div>
    </div>
  );
}
