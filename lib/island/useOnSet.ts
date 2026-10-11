'use client';
import { useState } from 'react';
import { useProject } from '@/lib/os';
import { useShootDays } from '@/lib/studio';
import { localDate, shootDayToday } from './onset';

const key = (dayId: string) => `mc-onset-away:${dayId}`;

function wasAway(dayId: string): boolean {
  try { return !!localStorage.getItem(key(dayId)); } catch { return false; }
}

export interface OnSet { label: string; away: () => void }

/** Set on a shoot day, until the person steps out of it (per device, for that day). */
export function useOnSet(): OnSet | null {
  const { activeProject } = useProject();
  const days = useShootDays(activeProject?.id ?? null).rows;
  // The days arrive after mount, so reading the clock and the device here never disagrees with the server's page.
  const [today] = useState(() => localDate(new Date()));
  const [steppedOut, setSteppedOut] = useState<string | null>(null);
  const day = shootDayToday(days, today);
  if (!day || steppedOut === day.id || wasAway(day.id)) return null;
  return {
    label: `On set · Day ${day.day_number}`,
    away: () => {
      setSteppedOut(day.id);
      try { localStorage.setItem(key(day.id), '1'); } catch { /* kept for this visit only */ }
    },
  };
}
