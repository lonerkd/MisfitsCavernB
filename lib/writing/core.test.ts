import { describe, it, expect } from 'vitest';
import { badges, localDay, summarize, typedWords, type WritingDay } from './core';

describe('typedWords', () => {
  it('counts growth from typing; deletions and pastes count nothing', () => {
    expect(typedWords('Sam lights', 'Sam lights a')).toBe(1);
    expect(typedWords('Sam lights a match', 'Sam lights')).toBe(0);
    expect(typedWords('', Array(200).fill('word').join(' '))).toBe(0);
    expect(typedWords('a', 'a b c')).toBe(2);
  });
});

describe('summarize', () => {
  const d = (day: string, words: number, goal = 500, sprints = 0): WritingDay => ({ day, words, goal, sprints });

  it('a streak runs through today, or yesterday while today is still going', () => {
    const rows = [d('2026-09-24', 600), d('2026-09-25', 500), d('2026-09-26', 900), d('2026-09-27', 100)];
    expect(summarize(rows, '2026-09-27', 500).streak).toBe(3);
    expect(summarize([...rows.slice(0, 3), d('2026-09-27', 700)], '2026-09-27', 500).streak).toBe(4);
    expect(summarize(rows.slice(0, 2), '2026-09-27', 500).streak).toBe(0);
  });

  it('best streak, records, and the recent grid', () => {
    const rows = [d('2026-09-01', 800), d('2026-09-02', 800), d('2026-09-03', 800), d('2026-09-05', 2100, 500, 3), d('2026-09-27', 50, 500, 1)];
    const s = summarize(rows, '2026-09-27', 600, 7);
    expect(s).toMatchObject({ streak: 0, best: 3, bestDay: 2100, totalWords: 4550, sprints: 4 });
    expect(s.today).toMatchObject({ words: 50, goal: 600 });
    expect(s.recent).toHaveLength(7);
    expect(s.recent[6]).toMatchObject({ day: '2026-09-27', words: 50, met: false });
    // A day's own goal decides it: a later, bigger goal doesn't undo it.
    expect(summarize([d('2026-09-27', 500, 500)], '2026-09-27', 2000).streak).toBe(1);
  });

  it('badges follow the record', () => {
    const s = summarize([d('2026-09-05', 2100, 500, 10)], '2026-09-27', 500);
    expect(badges(s).filter((b) => b.earned).map((b) => b.id)).toEqual(['first-goal', 'big-day', 'sprinter']);
  });

  it('local dates', () => {
    expect(localDay(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
