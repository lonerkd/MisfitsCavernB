'use client';

import React, { useState } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';
import { Briefcase, UserPlus, Users } from 'lucide-react';
import { useOnlinePresence } from '@/lib/hooks/usePresence';
import { useToast } from '@/components/ui/Toast';
import { setCrewCraft } from '@/lib/supabase/crew-management';
import { useCanShape } from '@/lib/brief';
import { describeRange, localToday, upcoming, useProjectAvailability } from '@/lib/availability';
import { CrewMemberCard, RecruitModal } from '../CrewBoards';
import { CastingBoard } from '../CastingBoard';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import { PrintButton } from '@/components/ui/PrintButton';
import { crewDoc } from '@/lib/studio/crew-print';
import { ToolHeader } from '../ToolHeader';
import s from '../studio.module.css';

export type CrewRow = { id: string; user_id: string; role: string; craft?: string | null; status?: string | null; profiles?: { username?: string | null; avatar_url?: string | null } | null };

/** The crew, who's online, recruiting, and casting. */
import { BriefHints } from '@/components/brief/BriefHints';

export function CrewView({ crew, onChanged }: { crew: CrewRow[]; onChanged: () => void }) {
  const { project, userId, isOwner } = useStudio();
  const online = useOnlinePresence(userId);
  const { toast } = useToast();
  const [recruiting, setRecruiting] = useState(false);
  // Those who plan the production see when people are away (dates only).
  const canShape = useCanShape(project.id, isOwner);
  const away = useProjectAvailability(project.id, canShape);
  const today = localToday();
  const awayText = (userId: string) => upcoming(away, userId, today).slice(0, 3).map((a) => describeRange(a.starts_on, a.ends_on)).join(' · ') || null;

  // The owner changes what someone does on the project; the database refuses anyone else.
  const changeCraft = async (m: CrewRow, craft: string | null) => {
    try {
      await setCrewCraft(project.id, m.user_id, craft, userId);
      toast(craft ? `${m.profiles?.username || 'They'} is now ${craft}` : 'Craft cleared', 'success');
      onChanged();
    } catch (e) {
      toast((e as { message?: string } | null)?.message || 'Could not change the craft', 'error');
    }
  };

  return (
    <div className={s.stack} style={{ gap: 32 }}>
      <div style={{ maxWidth: 760 }}>
        <BriefHints projectId={project.id} projectTitle={project.title} accent={project.accent_color} ids={['roles', 'casting', 'night']} style={{ marginBottom: 16 }} />
        <ToolHeader icon={<Users size={16} />} eyebrow="Pre-production" title="Cast & crew" purpose="Who is on the project, their craft and when they are away." accent={project.accent_color}
          stats={[{ label: crew.length === 1 ? 'person' : 'people', value: crew.length }]}
          next={crew.length === 0 ? { text: isOwner ? 'Recruit your first person, or post a role to Jobs.' : 'The project owner recruits crew.' } : null}
          actions={<>{crew.length > 0 && <PrintButton label="the cast and crew list" build={() => crewDoc({
              project: project.title, accent: project.accent_color,
              crew: crew.map((m) => ({ name: m.profiles?.username || 'Unknown', role: m.craft || (m.role === 'lead' ? 'Lead' : 'Crew'), status: m.status ?? null, away: canShape ? awayText(m.user_id) : null })),
              generated: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
            })} />}{isOwner && <button type="button" className={cx(s.btn, s.small)} onClick={() => setRecruiting(true)}><UserPlus size={11} /> Recruit</button>}</>} />
        <div style={{ height: 14 }} />
        {crew.length ? (
          <div className={s.stack} style={{ gap: 10 }}>
            {crew.map((m, i) => (
              <CrewMemberCard
                key={m.id}
                index={i}
                isOnline={online.has(m.user_id)}
                away={awayText(m.user_id)}
                member={{ name: m.profiles?.username || 'Unknown', role: m.craft || (m.role === 'lead' ? 'Lead' : 'Crew'), status: m.status, avatar: m.profiles?.avatar_url, userId: m.user_id }}
                craft={m.craft ?? null}
                onCraftChange={isOwner ? (c) => void changeCraft(m, c) : undefined}
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Users size={26} />} title="No crew yet" subtitle={isOwner ? 'Recruit people from the community, or post roles to Jobs.' : 'The project owner recruits crew.'}
            action={isOwner ? (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button type="button" className={s.btnPrimary} onClick={() => setRecruiting(true)}><UserPlus size={12} /> Recruit</button>
                <Link href="/jobs" className={s.btn}><Briefcase size={12} /> Post a role</Link>
              </div>
            ) : undefined} />
        )}
      </div>
      <CastingBoard crew={crew} />
      <RecruitModal isOpen={recruiting} onClose={() => setRecruiting(false)} projectId={project.id} onSuccess={onChanged} />
    </div>
  );
}
