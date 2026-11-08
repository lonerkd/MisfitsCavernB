'use client';

import React, { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { useProjectLocations } from '@/lib/studio';
import { placeResolver } from '@/lib/film/places';
import { DEFAULT_DAY_CAPACITY_EIGHTHS } from '@/lib/studio/shoot-days';
import { buildBoard, dayOutOfDays } from '@/lib/studio/stripboard';
import type { ProjectSettings } from '@/lib/types/settings';
import { useStudio } from '../StudioContext';
import { DoodTable } from './DoodTable';
import { PrintButton } from '@/components/ui/PrintButton';
import { doodDoc } from '@/lib/studio/dood-print';
import s from '../studio.module.css';

/**
 * Day out of days as its own view: the SAME engine and table as the Stripboard's "Day out of days" (`dayOutOfDays`, the
 * film graph's scene-to-character links, S / W / H / F / SF), not a second calculation.
 */
export function DoodView() {
  const { project, scenes, castOf } = useStudio();
  const places = useProjectLocations(project.id);
  const capacity = (project.settings as ProjectSettings | null)?.dayLengthEighths ?? DEFAULT_DAY_CAPACITY_EIGHTHS;
  const placeOf = useMemo(() => placeResolver(places.rows), [places.rows]);
  const board = useMemo(() => buildBoard(scenes.rows, capacity, castOf, placeOf), [scenes.rows, capacity, castOf, placeOf]);
  const dood = useMemo(() => dayOutOfDays(board), [board]);

  if (!scenes.rows.some((sc) => sc.shoot_day != null)) {
    return (
      <EmptyState
        icon={<Calendar size={26} />}
        title="No schedule yet"
        subtitle="Day out of days appears once scenes are scheduled to shoot days."
      />
    );
  }
  return (
    <div className={s.panel}>
      <div className={s.panelTitle}>
        <Calendar size={14} /> Day out of days
        <span className={s.hint}> · {dood.length} cast · {board.filter((d) => d.scenes.length).length} shoot days</span>
        <span style={{ marginLeft: 'auto' }}><PrintButton label="the day out of days" build={() => {
          // The cells line up with the whole board (one per day), so the columns are the board's days, as the screen shows them.
          return doodDoc({ project: project.title, accent: project.accent_color, days: board.map((d) => d.day), rows: dood.map((r) => ({ name: r.name, cells: r.cells, worked: r.worked })), generated: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) });
        }} /></span>
      </div>
      <DoodTable board={board} dood={dood} />
    </div>
  );
}
