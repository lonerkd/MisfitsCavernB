import { describe, expect, it } from 'vitest';
import { HISTORY_MAX, NO_HISTORY, remember, stepHistory } from './history';

describe('navigation history', () => {
  it('remembers the place a jump left, and drops what was ahead', () => {
    const a = remember(NO_HISTORY, 10);
    expect(a).toEqual({ back: [10], forward: [] });
    const b = stepHistory(a, 4, -1);
    expect(b.place).toBe(10);
    expect(b.state).toEqual({ back: [], forward: [4] });
    expect(remember(b.state, 20)).toEqual({ back: [20], forward: [] });
  });

  it('walks back and forward again through several places', () => {
    let s = remember(NO_HISTORY, 1);
    s = remember(s, 5);
    s = remember(s, 9); // back = [1, 5, 9]
    const one = stepHistory(s, 20, -1);
    expect(one.place).toBe(9);
    const two = stepHistory(one.state, 9, -1);
    expect(two.place).toBe(5);
    expect(two.state).toEqual({ back: [1], forward: [20, 9] });
    const backAgain = stepHistory(two.state, 5, 1);
    expect(backAgain.place).toBe(9);
    expect(backAgain.state).toEqual({ back: [1, 5], forward: [20] });
  });

  it('does nothing at either end', () => {
    expect(stepHistory(NO_HISTORY, 3, -1)).toEqual({ state: NO_HISTORY, place: null });
    expect(stepHistory(NO_HISTORY, 3, 1)).toEqual({ state: NO_HISTORY, place: null });
  });

  it('keeps the last 50 places', () => {
    let s = NO_HISTORY;
    for (let i = 0; i < HISTORY_MAX + 10; i++) s = remember(s, i);
    expect(s.back).toHaveLength(HISTORY_MAX);
    expect(s.back[0]).toBe(10);
    expect(s.back[s.back.length - 1]).toBe(HISTORY_MAX + 9);
  });
});
