'use client';

import React, { useMemo, useState } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';
import { Users, PenLine, Check, X } from 'lucide-react';
import { useStudio } from '../StudioContext';
import { useScriptCharacters } from './useScriptCharacters';
import { useCharacters, useSceneCharacters, useCastings } from '@/lib/studio';
import { castByScene } from '@/lib/film/cast';
import { getProjectCrew, type CrewMember } from '@/lib/supabase/crew-management';
import { cx } from '../ui';
import s from '../studio.module.css';

export function CastBreakdownView() {
  const { project, userId, scriptId, scriptFormat, scenes } = useStudio();
  const { chars, status } = useScriptCharacters(scriptId, userId, scriptFormat);
  const storyChars = useCharacters(project.id);
  const sceneLinks = useSceneCharacters(project.id);
  const castings = useCastings(project.id);

  const castByScn = useMemo(() => castByScene(sceneLinks.rows, storyChars.rows), [sceneLinks.rows, storyChars.rows]);

  const sceneCountByChar = useMemo(() => {
    const m = new Map<string, number>();
    for (const sc of scenes.rows) {
      const cast = castByScn.get(sc.id) ?? [];
      for (const name of cast) {
        m.set(name, (m.get(name) ?? 0) + 1);
      }
    }
    return m;
  }, [scenes.rows, castByScn]);

  const daysByChar = useMemo(() => {
    const m = new Map<string, Set<number>>();
    for (const sc of scenes.rows) {
      if (sc.shoot_day == null) continue;
      const cast = castByScn.get(sc.id) ?? [];
      for (const name of cast) {
        if (!m.has(name)) m.set(name, new Set());
        m.get(name)!.add(sc.shoot_day);
      }
    }
    return m;
  }, [scenes.rows, castByScn]);

  const castingByChar = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of castings.rows) {
      m.set(c.character_name.toUpperCase(), c.crew_user_id);
    }
    return m;
  }, [castings.rows]);

  const [crewList, setCrewList] = useState<CrewMember[]>([]);
  React.useEffect(() => {
    getProjectCrew(project.id).then((rows) => setCrewList(rows)).catch(() => {});
  }, [project.id]);

  const crewById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of crewList) {
      m.set(c.user_id, c.username ?? c.user_id);
    }
    return m;
  }, [crewList]);

  if (status === 'loading') {
    return <div className={s.stack}><p className={s.hint}>Loading characters…</p></div>;
  }

  if (chars.length === 0) {
    return (
      <EmptyState
        icon={<Users size={26} />}
        title="No characters yet"
        subtitle="Characters appear here once the script has dialogue."
        action={scriptId ? <Link href="/studio?tab=production&view=crew" className={s.btnPrimary}><PenLine size={12} /> Open crew</Link> : undefined}
      />
    );
  }

  const sorted = [...chars].sort((a, b) => (sceneCountByChar.get(b.name) ?? 0) - (sceneCountByChar.get(a.name) ?? 0));
  const castCount = sorted.filter((c) => castingByChar.has(c.name.toUpperCase())).length;

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <Users size={14} /> Cast breakdown
          <span className={s.hint}> · {castCount} of {sorted.length} cast · {scenes.rows.length} scenes</span>
        </div>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((c) => {
          const crewId = castingByChar.get(c.name.toUpperCase());
          const actorName = crewId ? (crewById.get(crewId) ?? 'Unknown') : null;
          const scenes = sceneCountByChar.get(c.name) ?? 0;
          const days = daysByChar.get(c.name);
          const dayList = days ? Array.from(days).sort((a, b) => a - b) : [];
          return (
            <li key={c.name} className={s.panel} style={{ padding: 12 }}>
              <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} aria-hidden />
                <span style={{ fontFamily: 'var(--display)', fontSize: '1.05rem', flex: 1, minWidth: 0 }}>{c.name}</span>
                {actorName ? (
                  <span className={s.row} style={{ gap: 4 }}>
                    <Check size={12} style={{ color: 'var(--ok)' }} />
                    <span style={{ fontSize: 13 }}>{actorName}</span>
                  </span>
                ) : (
                  <span className={s.row} style={{ gap: 4, color: 'var(--warn)' }}>
                    <X size={12} />
                    <span style={{ fontSize: 13 }}>Uncast</span>
                  </span>
                )}
              </div>
              <div className={s.row} style={{ gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                <span className={s.hint}>{scenes} scene{scenes === 1 ? '' : 's'}</span>
                {dayList.length > 0 && <span className={s.hint}>Day{dayList.length === 1 ? '' : 's'} {dayList.join(', ')}</span>}
                {c.row?.arc && <span className={s.hint} style={{ fontStyle: 'italic' }}>{c.row.arc}</span>}
              </div>
            </li>
          );
        })}
      </ul>

      <p className={s.hint} style={{ fontSize: 11 }}>
        Cast characters in Production › Cast & crew. Scene counts and shoot days come from the schedule.
      </p>
    </div>
  );
}
