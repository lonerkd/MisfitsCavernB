'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Calendar, Users } from 'lucide-react';
import { getProjectCrew } from '@/lib/supabase/crew-management';
import { useStudio } from '../StudioContext';
import { SectionHeader, cx } from '../ui';
import { StoryView } from '../production/StoryView';
import { ScheduleView } from '../production/ScheduleView';
import { CrewView, type CrewRow } from '../production/CrewView';
import s from '../studio.module.css';

type View = 'story' | 'schedule' | 'crew';
const VIEWS: Array<{ id: View; label: string; icon: React.ReactNode }> = [
  { id: 'story', label: 'Story', icon: <BookOpen size={12} /> },
  { id: 'schedule', label: 'Schedule', icon: <Calendar size={12} /> },
  { id: 'crew', label: 'Cast & crew', icon: <Users size={12} /> },
];

export function ProductionTab() {
  const { project } = useStudio();
  const [view, setView] = useState<View>('story');
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
          <button key={v.id} type="button" role="tab" aria-selected={view === v.id} className={cx(s.chip, view === v.id && s.chipOn)} onClick={() => setView(v.id)}>
            {v.icon} {v.label}
          </button>
        ))}
      </div>
      {view === 'story' && <StoryView />}
      {view === 'schedule' && <ScheduleView crew={crew.map((c) => ({ ...c, username: c.profiles?.username ?? undefined }))} />}
      {view === 'crew' && <CrewView crew={crew} onChanged={() => void loadCrew()} />}
    </section>
  );
}
