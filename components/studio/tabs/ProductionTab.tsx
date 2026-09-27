'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Calendar, Lock, Users } from 'lucide-react';
import { PRODUCTION_VIEW_TOOL, toolState, type ProductionView } from '@/lib/os/progress';
import { LockedTool, useProgressContext } from '@/components/progress/LockedTool';
import { getProjectCrew } from '@/lib/supabase/crew-management';
import { useStudio } from '../StudioContext';
import { SectionHeader, cx } from '../ui';
import { StoryView } from '../production/StoryView';
import { ScheduleView } from '../production/ScheduleView';
import { CrewView, type CrewRow } from '../production/CrewView';
import s from '../studio.module.css';

type View = ProductionView;
const VIEWS: Array<{ id: View; label: string; icon: React.ReactNode }> = [
  { id: 'story', label: 'Story', icon: <BookOpen size={12} /> },
  { id: 'schedule', label: 'Schedule', icon: <Calendar size={12} /> },
  { id: 'crew', label: 'Cast & crew', icon: <Users size={12} /> },
];

/** Story, schedule and people. The view is the Studio's (?view=), so milestones can link straight to it. */
export function ProductionTab({ view, onView }: { view: View; onView: (view: View) => void }) {
  const { project } = useStudio();
  const progress = useProgressContext()?.progress ?? null;
  const [peeked, setPeeked] = useState<Set<View>>(new Set());
  const lockOf = (v: View) => {
    const id = PRODUCTION_VIEW_TOOL[v];
    const t = id ? toolState(progress, id) : null;
    return t && !t.unlocked && !peeked.has(v) ? t : null;
  };
  const lock = lockOf(view);
  const [crew, setCrew] = useState<CrewRow[]>([]);

  const loadCrew = useCallback(async () => {
    setCrew((await getProjectCrew(project.id)) as unknown as CrewRow[]);
  }, [project.id]);
  // The OS store's crew changes live (Realtime); refetch the joined rows then.
  const crewSignature = (project.crew ?? []).map((c) => `${c.id}:${c.role}`).join(',');
  useEffect(() => { void loadCrew(); }, [loadCrew, crewSignature]);

  return (
    <section aria-labelledby="production-title">
      <SectionHeader id="production-title" eyebrow="Pre-production" title="Production" subtitle="Story, schedule and people — built from the screenplay and kept in step with it." />
      <div className={s.chips} role="tablist" aria-label="Production views" style={{ marginBottom: 24 }}>
        {VIEWS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={cx(s.chip, view === v.id && s.chipOn)} onClick={() => onView(v.id)}>
            {v.icon} {v.label}
            {lockOf(v.id) && <><Lock size={9} aria-hidden style={{ opacity: 0.7 }} /><span className="sr-only">(opens in {lockOf(v.id)!.phaseLabel})</span></>}
          </button>
        ))}
      </div>
      {lock && <LockedTool tool={lock} accent={project.accent_color} onOpen={() => setPeeked((prev) => new Set(prev).add(view))} />}
      {!lock && view === 'story' && <StoryView />}
      {!lock && view === 'schedule' && <ScheduleView crew={crew.map((c) => ({ ...c, username: c.profiles?.username ?? undefined }))} />}
      {!lock && view === 'crew' && <CrewView crew={crew} onChanged={() => void loadCrew()} />}
    </section>
  );
}
