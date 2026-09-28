// The writing loop, computed from real days of writing (writing_days): words
// typed today against the goal, the streak of days the goal was met, records,
// and what's been earned. Words are counted as they're typed — a paste or a
// file load isn't writing.

export interface WritingDay { day: string; words: number; sprints: number; goal: number }

const wordsIn = (t: string) => (t.match(/\S+/g) ?? []).length;

/** A single edit this big at once is a paste or a load, not typing. */
export const PASTE_WORDS = 25;

/** Words typed by one edit: the growth in word count, 0 for deletions and pastes. */
export function typedWords(before: string, after: string): number {
  const d = wordsIn(after) - wordsIn(before);
  return d > 0 && d <= PASTE_WORDS ? d : 0;
}

/** The local calendar date, "2026-09-27". */
export function localDay(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + n));
}

export interface WritingSummary {
  today: WritingDay;
  /** Consecutive days meeting the goal, through today (or yesterday while today is in progress). */
  streak: number;
  best: number;
  totalWords: number;
  bestDay: number;
  sprints: number;
  /** The last `days` days, oldest first. */
  recent: Array<WritingDay & { met: boolean }>;
}

export function summarize(rows: WritingDay[], today: string, goal: number, days = 28): WritingSummary {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const met = (r: WritingDay | undefined) => !!r && r.words >= r.goal;

  const t = byDay.get(today) ?? { day: today, words: 0, sprints: 0, goal };
  let streak = 0;
  let cursor = met(t) ? today : addDays(today, -1);
  while (met(byDay.get(cursor))) { streak += 1; cursor = addDays(cursor, -1); }

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const r of [...rows].sort((a, b) => a.day.localeCompare(b.day))) {
    if (!met(r)) { run = 0; prev = r.day; continue; }
    run = prev && addDays(prev, 1) === r.day && run > 0 ? run + 1 : 1;
    prev = r.day;
    best = Math.max(best, run);
  }

  const recent: WritingSummary['recent'] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(today, -i);
    const r = byDay.get(day) ?? { day, words: 0, sprints: 0, goal: day === today ? goal : 0 };
    recent.push({ ...r, met: met(byDay.get(day)) });
  }

  return {
    // Today is measured against the current goal (the row keeps the goal it was last logged with).
    today: { ...t, goal },
    streak,
    best: Math.max(best, streak),
    totalWords: rows.reduce((n, r) => n + r.words, 0),
    bestDay: rows.reduce((n, r) => Math.max(n, r.words), 0),
    sprints: rows.reduce((n, r) => n + r.sprints, 0),
    recent,
  };
}

export interface Badge { id: string; label: string; hint: string; earned: boolean }

/** What the writing has earned — all from real days. */
export function badges(s: WritingSummary): Badge[] {
  return [
    { id: 'first-goal', label: 'First goal', hint: 'Meet your daily goal once', earned: s.best >= 1 },
    { id: 'week', label: '7-day streak', hint: 'Meet it seven days running', earned: s.best >= 7 },
    { id: 'month', label: '30-day streak', hint: 'Thirty days running', earned: s.best >= 30 },
    { id: 'big-day', label: '2,000-word day', hint: 'Type 2,000 words in a day', earned: s.bestDay >= 2000 },
    { id: 'sprinter', label: '10 sprints', hint: 'Finish ten sprints', earned: s.sprints >= 10 },
    { id: 'feature', label: '20,000 words', hint: 'About a feature’s worth of typing', earned: s.totalWords >= 20000 },
  ];
}
