'use client';

import { motion } from 'framer-motion';
import Avatar from '@/components/ui/Avatar';
import { ProductionFeed } from '@/components/lounge/ProductionFeed';
import type { Lounge } from '@/components/lounge/useLounge';

export function CrewList({ l }: { l: Lounge }) {
  const { crewList, activeProject, dmTarget, currentUser, onlineIds, openDM, unreadFrom } = l;
  return (
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

      <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(9px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', color: 'var(--fg-subtle)', marginBottom: 12 }}>
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
                <div aria-label={`${unreadFrom(member.id)} unread from ${member.name}`} style={{ minWidth: 16, padding: '0 5px', borderRadius: 9999, background: 'var(--lounge-color)', color: '#04110b', fontSize: 'max(9px, var(--mc-min-font, 0px))', fontWeight: 700, lineHeight: '15px', textAlign: 'center', fontFamily: 'var(--mono)' }}>{unreadFrom(member.id)}</div>
              ) : isOnline && (
                <div style={{ fontSize: 'max(7px, var(--mc-min-font, 0px))', color: 'var(--ok)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)', fontFamily: 'var(--mono)' }}>Live</div>
              )}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', letterSpacing: 'var(--caps-track)', color: 'var(--fg-subtle)', marginTop: 2 }}>
              <span>{member.role}</span>
            </div>
          </div>
        </motion.div>
      ); })}
    </div>
  );
}
