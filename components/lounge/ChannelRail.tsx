'use client';

import { Hash, Lock, Settings as SettingsIcon, Volume2, BookOpen, Globe, Shield, Crown, ArrowUp, ArrowDown, UserCheck } from 'lucide-react';
import { audienceLabel, groupChannels } from '@/lib/lounge/audience';
import Link from 'next/link';
import { type Channel } from '@/lib/supabase/channels';
import Avatar from '@/components/ui/Avatar';
import type { Lounge } from '@/components/lounge/useLounge';

export function ChannelRail({ l }: { l: Lounge }) {
  const { activeProject, channels, activeChannel, setShowNewChannel, isAdmin, dmTarget, currentUser, myProfile, openChannel, ownsActive, suggested, addPreset, unreadOf } = l;
  return (
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
           const isOwner = ownsActive;
           const renderGroup = (label: string, list: Channel[], showAdd: boolean, scope: 'project' | 'community') => (
             <div style={{ marginBottom: 18 }}>
               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px', marginBottom: 8 }}>
                 <span style={{ fontSize: 'max(9px, var(--mc-min-font, 0px))', fontFamily: 'var(--mono)', color: 'var(--fg-subtle)', textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
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
                       style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 4, background: isActive ? 'rgba(232, 67, 26,0.1)' : 'transparent', border: 'none', color: isActive || n > 0 ? 'var(--fg-strong)' : 'var(--fg-dim)', fontWeight: n > 0 ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--mono)', fontSize: 11, width: '100%', textAlign: 'left' }}>
                       <Icon size={12} color={isActive ? 'var(--accent)' : n > 0 ? 'var(--ok)' : 'var(--fg-dim)'} style={{ flexShrink: 0 }} />
                       <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{ch.name}</span>
                       {n > 0 && <span aria-hidden style={{ marginLeft: 'auto', minWidth: 16, padding: '0 5px', borderRadius: 9999, background: 'var(--lounge-color)', color: '#04110b', fontSize: 'max(9px, var(--mc-min-font, 0px))', fontWeight: 700, lineHeight: '15px', textAlign: 'center' }}>{n >= 100 ? '99+' : n}</span>}
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
                   <div style={{ fontSize: 'max(8.5px, var(--mc-min-font, 0px))', fontFamily: 'var(--mono)', color: 'var(--fg-dim)', textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', padding: '0 6px', marginBottom: 6 }}>Suggested for this phase</div>
                   {suggested.map((p) => (
                     <button key={p.key} type="button" onClick={() => void addPreset(p)} title={`${p.why} ${p.topic}`.trim()}
                       aria-label={`${p.type === 'voice' ? '🔊 ' : ''}#${p.name} ${audienceLabel(p.audience)}, add this channel`}
                       style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 8px', borderRadius: 4, background: 'transparent', border: '1px dashed rgba(var(--ink-rgb), 0.1)', color: 'var(--fg-muted)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11, textAlign: 'left', marginBottom: 4 }}>
                       <span aria-hidden style={{ color: 'var(--accent)' }}>+</span>
                       <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.type === 'voice' ? '🔊 ' : '#'}{p.name}</span>{' '}
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
  );
}
