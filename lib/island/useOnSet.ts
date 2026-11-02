'use client';
import { useEffect, useState } from 'react';
import { useProject } from '@/lib/os';
import { useCallSheets, useSetLog, useShootDays } from '@/lib/studio';
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
  // The day's own clock, read (and kept live) only while it is a shoot day and the person has not stepped out.
  const projectId = onToday ? activeProject?.id ?? null : null;
  const sheets = useCallSheets(projectId).rows;
  const log = useSetLog(projectId).rows;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!onToday) return;
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, [onToday]);
  if (!day || !onToday) return null;
  const sheet = sheets.find((c) => c.shoot_day === day.day_number);
  const line = sheet ? onSetLine(dayStatus(dayClock(log.filter((r) => r.call_sheet_id === sheet.id)), now, localDateTime(sheet.shoot_date, sheet.estimated_wrap))) : null;
  return {
    label: `On set · Day ${day.day_number}`,
    line,
    away: () => {
      setSteppedOut(day.id);
      try { localStorage.setItem(key(day.id), '1'); } catch { /* kept for this visit only */ }
    },
  };
}
