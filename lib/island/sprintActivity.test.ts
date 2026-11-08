import { describe, expect, it, vi } from 'vitest';
import { mmss } from '@/lib/writing/clock';
import { sprintActivity, type SprintState } from './sprintActivity';

const state = (over: Partial<SprintState> = {}): SprintState => ({ running: true, active: true, left: 1500, words: 0, start: () => {}, pause: () => {}, reset: () => {}, ...over });

describe('mmss', () => {
  it('reads as a clock', () => {
    expect(mmss(1500)).toBe('25:00');
    expect(mmss(59)).toBe('00:59');
    expect(mmss(0)).toBe('00:00');
    expect(mmss(3599)).toBe('59:59');
  });
});

describe('sprintActivity', () => {
  it('holds nothing when no sprint is under way', () => {
    expect(sprintActivity(state({ running: false }))).toBeNull();
  });

  it('shows the time left and the words so far, with Pause and Reset', () => {
    const pause = vi.fn();
    const activity = sprintActivity(state({ left: 754, words: 31, pause }))!;
    expect(activity).toMatchObject({ id: 'sprint', kind: 'timer', tone: 'info', title: 'Sprint 12:34', detail: '31 words' });
    expect(activity.controls!.map((c) => c.label)).toEqual(['Pause', 'Reset']);
    activity.controls![0].run();
    expect(pause).toHaveBeenCalledTimes(1);
  });

  it('says "1 word", not "1 words"', () => {
    expect(sprintActivity(state({ words: 1 }))!.detail).toBe('1 word');
  });

  it('keeps a paused sprint on the island, in the warning colour, with Resume', () => {
    const start = vi.fn();
    const activity = sprintActivity(state({ active: false, words: 12, start }))!;
    expect(activity).toMatchObject({ tone: 'warn', detail: '12 words · paused' });
    expect(activity.controls![0].label).toBe('Resume');
    activity.controls![0].run();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('wires Reset to the sprint\'s reset', () => {
    const reset = vi.fn();
    sprintActivity(state({ reset }))!.controls![1].run();
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
