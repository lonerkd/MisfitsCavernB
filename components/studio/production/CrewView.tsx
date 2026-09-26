'use client';

import React, { useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { useOnlinePresence } from '@/lib/hooks/usePresence';
import { CrewMemberCard, RecruitModal } from '../CrewBoards';
import { CastingBoard } from '../CastingBoard';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';

export type CrewRow = { id: string; user_id: string; role: string; status?: string | null; profiles?: { username?: string | null; avatar_url?: string | null } | null };

/** The crew, who's online, recruiting, and casting. */
export function CrewView({ crew, onChanged }: { crew: CrewRow[]; onChanged: () => void }) {
  const { project, userId, isOwner } = useStudio();
  const online = useOnlinePresence(userId);
  const [recruiting, setRecruiting] = useState(false);

  return (
    <div className={s.stack} style={{ gap: 32 }}>
      <div style={{ maxWidth: 760 }}>
        <div className={s.toolbar}>
          <div className={s.panelTitle} style={{ marginBottom: 0 }}><Users size={14} /> Cast & crew · {crew.length}</div>
          {isOwner && <button type="button" className={cx(s.btn, s.small)} onClick={() => setRecruiting(true)}><UserPlus size={11} /> Recruit</button>}
        </div>
        {crew.length ? (
          <div className={s.stack} style={{ gap: 10 }}>
            {crew.map((m, i) => (
              <CrewMemberCard
                key={m.id}
                index={i}
                isOnline={online.has(m.user_id)}
                member={{ name: m.profiles?.username || 'Unknown', role: m.role, status: m.status, avatar: m.profiles?.avatar_url, userId: m.user_id }}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Users size={26} />} title="No crew yet" subtitle={isOwner ? 'Recruit people from the community, or post roles to Jobs.' : 'The project owner recruits crew.'} />
        )}
      </div>
      <CastingBoard crew={crew} />
      <RecruitModal isOpen={recruiting} onClose={() => setRecruiting(false)} projectId={project.id} onSuccess={onChanged} />
    </div>
  );
}
