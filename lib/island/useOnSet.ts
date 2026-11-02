'use client';
import { useEffect, useState } from 'react';
import { useProject } from '@/lib/os';
import { studio, useShootDays } from '@/lib/studio';
import { dayClock, dayStatus, localDateTime } from '@/lib/studio/onset';
import { localDate, onSetLine, shootDayToday } from './onset';

const key = (dayId: string) => `mc-onset-away:${dayId}`;

function wasAway(dayId: string): boolean {
  try { return !!localStorage.getItem(key(dayId)); } catch { return false; }
}

/** `line`: where the day is (phase, time on set, to wrap or over), once the crew call is stamped; `short` is for the phone. */
export interface OnSet { label: string; line: { short: string; full: string } | null; away: () => void }

/** Set on a shoot day, until the person steps out of it (per device, for that day). */
export function useOnSet(): OnSet | null {
  const { activeProject } = useProject();
  const days = useShootDays(activeProject?.id ?? null).rows;
  // The days arrive after mount, so reading the clock and the device here never disagrees with the server's page.
  const [today] = useState(() => localDate(new Date()));
  const [steppedOut, setSteppedOut] = useState<string | null>(null);
  const day = shootDayToday(days, today);
  const onToday = !!day && steppedOut !== day.id && !wasAway(day.id);
  // The day's own clock, read only while it is a shoot day and the person has not stepped out, and re-read every 30 seconds
  // (a narrow read of one call sheet and its clock stamps, not a live subscription: the island is on every page, and
  // both the desktop island and the phone's pill ask).
  const projectId = onToday ? activeProject?.id ?? null : null;
  const dayNumber = day?.day_number ?? null;
  const [clockData, setClockData] = useState<Awaited<ReturnType<typeof studio.getDayClock>> | null>(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!projectId || dayNumber === null) return;
    let cancelled = false;
    const read = () => {
      setNow(new Date());
      studio.getDayClock(projectId, dayNumber).then((d) => { if (!cancelled) setClockData(d); }).catch(() => { /* the line just stays as it was */ });
    };
    read();
    const t = window.setInterval(read, 30_000);
    return () => { cancelled = true; window.clearInterval(t); };
  }, [projectId, dayNumber]);
  if (!day || !onToday) return null;
  // Nothing to say until the crew call is stamped (a wrap stamped with no call is not a day to report on).
  const clock = clockData?.sheet ? dayClock(clockData.rows) : null;
  const line = clockData?.sheet && clock?.call ? onSetLine(dayStatus(clock, now, localDateTime(clockData.sheet.shoot_date, clockData.sheet.estimated_wrap))) : null;
  return {
    label: `On set · Day ${day.day_number}`,
    line,
    away: () => {
      setSteppedOut(day.id);
      try { localStorage.setItem(key(day.id), '1'); } catch { /* kept for this visit only */ }
    },
  };
}
