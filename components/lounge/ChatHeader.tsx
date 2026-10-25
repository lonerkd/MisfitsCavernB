'use client';

import { Users, Lock, Settings as SettingsIcon, Pin, Search, ChevronLeft } from 'lucide-react';
import type { Lounge } from '@/components/lounge/useLounge';

export function ChatHeader({ l }: { l: Lounge }) {
  const { activeChannel, setShowManage, dmTarget, setDmTarget, messages, crewList, onlineIds, setShowSearch, setShowPinned, setPane, canManageActive } = l;
  return (
    <div className="mc-lounge-chathead" style={{ padding: '12px 32px', borderBottom: '1px solid rgba(var(--ink-rgb), 0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(var(--ink-rgb), 0.01)' }}>
       <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
         <button type="button" className="mc-phone-only mc-lounge-back" onClick={() => setPane('list')} aria-label="Back to channels and people"><ChevronLeft size={20} aria-hidden /></button>
         {dmTarget ? (
           <>
             <span style={{ fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--ok)', fontFamily: 'var(--mono)', letterSpacing: 'var(--caps-track)', background: 'rgba(16,185,129,0.12)', padding: '2px 7px', borderRadius: 9999 }}>DIRECT</span>
             <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-strong)' }}>@{dmTarget.name}</span>
             {onlineIds.has(dmTarget.id) && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00cc66', boxShadow: '0 0 8px rgba(0,204,102,0.8)' }} />}
           </>
         ) : activeChannel ? (
           <>
             {activeChannel.is_private && <Lock size={12} color="var(--fg-dim)" />}
             <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-strong)' }}>{activeChannel.type === 'voice' ? '🔊 ' : activeChannel.type === 'guide' ? '' : '#'}{activeChannel.name}</span>
             {activeChannel.type === 'guide' && <span style={{ fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--info)', fontFamily: 'var(--mono)', letterSpacing: 'var(--caps-track)', background: 'rgba(0,153,255,0.12)', padding: '2px 6px', borderRadius: 9999 }}>GUIDE</span>}
             {activeChannel.post_policy === 'managers' && activeChannel.type !== 'guide' && <span style={{ fontSize: 'max(7.5px, var(--mc-min-font, 0px))', color: 'var(--warn)', fontFamily: 'var(--mono)', letterSpacing: 'var(--caps-track)', background: 'rgba(245,158,11,0.12)', padding: '2px 6px', borderRadius: 9999 }}>ANNOUNCE</span>}
           </>
         ) : (
           <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-dim)' }}>No channels</span>
         )}
         <div style={{ width: 1, height: 14, background: 'rgba(var(--ink-rgb), 0.1)', margin: '0 4px' }} />
         <span style={{ fontSize: 11, color: 'var(--fg-muted)', fontFamily: 'var(--mono)' }}>{activeChannel?.topic || `${messages.length} message${messages.length === 1 ? '' : 's'}`}</span>
       </div>
       <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', color: 'var(--fg-muted)' }}>
          {dmTarget ? (
            <button className="mc-hide-phone" onClick={() => setDmTarget(null)} style={{ background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.12)', color: 'var(--fg-muted)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)' }}>← CHANNELS</button>
          ) : (
            <><Users size={13} color="var(--fg-dim)" /> {crewList.length}</>
          )}
          <button type="button" onClick={() => { setShowPinned(false); setShowSearch(true); }} aria-label="Search messages" title="Search"
            style={{ background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--fg-muted)', fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)' }}>
            <Search size={12} /> <span className="mc-hide-phone">SEARCH</span>
          </button>
          {!dmTarget && activeChannel && activeChannel.type !== 'voice' && (
            <button type="button" onClick={() => { setShowSearch(false); setShowPinned(true); }} aria-label={`Pinned${messages.some((m) => m.pinned) ? ` · ${messages.filter((m) => m.pinned).length}` : ''} messages in #${activeChannel.name}`} title="Pinned"
              style={{ background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--fg-muted)', fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)' }}>
              <Pin size={12} /> <span className="mc-hide-phone">PINNED</span>{messages.some((m) => m.pinned) ? ` · ${messages.filter((m) => m.pinned).length}` : ''}
            </button>
          )}
          {!dmTarget && activeChannel && canManageActive && (
            <button onClick={() => setShowManage(true)} title="Manage channel" style={{ background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--fg-muted)', fontFamily: 'var(--mono)', fontSize: 'max(8.5px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)' }}>
              <SettingsIcon size={12} /> <span className="mc-hide-phone">MANAGE</span>
            </button>
          )}
       </div>
    </div>
  );
}
