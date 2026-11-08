// The writing sprint, as the island holds it: the time left, the words so far, and pause / resume / reset on the island itself.
import { mmss } from '@/lib/writing/clock';
import type { Activity } from './activities';

/** The parts of the sprint (components/editor/WritingLoop `useSprint`) the island needs. */
export interface SprintState {
  running: boolean;
  active: boolean;
  left: number;
  words: number;
  start: () => void;
  pause: () => void;
  reset: () => void;
}

/** Null when no sprint is under way. A paused sprint is held too, in the warning colour, so it is not forgotten. */
export function sprintActivity(s: SprintState): Activity | null {
  if (!s.running) return null;
  const words = `${s.words} word${s.words === 1 ? '' : 's'}`;
  return {
    id: 'sprint',
    kind: 'timer',
    tone: s.active ? 'info' : 'warn',
    title: `Sprint ${mmss(s.left)}`,
    detail: s.active ? words : `${words} · paused`,
    controls: [
      s.active ? { id: 'pause', label: 'Pause', run: s.pause } : { id: 'resume', label: 'Resume', run: s.start },
      { id: 'reset', label: 'Reset', run: s.reset },
    ],
  };
}
