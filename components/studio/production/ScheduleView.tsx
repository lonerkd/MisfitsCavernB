'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Calendar, PenLine } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { useBreakdown } from '@/lib/breakdown';
import { StripboardView } from './StripboardView';
import { CallSheetsPanel } from './CallSheetsPanel';
import { useStudio } from '../StudioContext';
import s from '../studio.module.css';

/**
 * The shooting schedule for the selected script: the stripboard (days,
 * strips, day out of days) and the call sheets. Scene headings, cast and page
 * counts come from the screenplay; days and status are set here.
 */
export function ScheduleView({ crew }: { crew: Array<{ user_id: string; role: string; username?: string }> }) {
  const { project, scenes, scriptId } = useStudio();
  const bd = useBreakdown(project.id);
  const elementCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of bd.tags.rows) m.set(t.scene_id, (m.get(t.scene_id) ?? 0) + 1);
    return m;
  }, [bd.tags.rows]);

  if (!scenes.rows.length) {
    return (
      <EmptyState
        icon={<Calendar size={26} />}
        title="No scenes to schedule"
        subtitle="The schedule is built from the screenplay’s scene headings."
        action={scriptId ? <Link href={`/editor?script=${scriptId}`} className={s.btnPrimary}><PenLine size={12} /> Open ScriptOS</Link> : undefined}
      />
    );
  }

  return (
    <div className={s.stack} style={{ gap: 28 }}>
      <StripboardView elementCounts={elementCounts} />
      <CallSheetsPanel scenes={scenes.rows} crew={crew} />
    </div>
  );
}
