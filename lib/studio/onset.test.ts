import { describe, it, expect } from 'vitest';
import { dayClock, dayProgress, dayStatus, eighthsOf, formatMinutes, localDateTime, pickDay } from './onset';

const sheet = (id: string, shoot_day: number, shoot_date: string | null) => ({ id, shoot_day, shoot_date });

describe('pickDay', () => {
  const sheets = [sheet('a', 1, '2026-10-01'), sheet('b', 2, '2026-10-03'), sheet('c', 3, null)];
  it('today’s sheet, else the next, else the last shot', () => {
    expect(pickDay(sheets, '2026-10-03')).toMatchObject({ sheet: { id: 'b' }, when: 'today' });
    expect(pickDay(sheets, '2026-10-02')).toMatchObject({ sheet: { id: 'b' }, when: 'next' });
    expect(pickDay(sheets, '2026-11-01')).toMatchObject({ sheet: { id: 'b' }, when: 'last' });
  });
  it('undated days: the first; none: nothing', () => {
    expect(pickDay([sheet('x', 2, null), sheet('y', 1, null)], '2026-10-01')).toMatchObject({ sheet: { id: 'y' }, when: 'undated' });
    expect(pickDay([], '2026-10-01')).toBeNull();
  });
});

describe('the day’s clock', () => {
  const at = (h: number, m = 0) => new Date(2026, 9, 3, h, m).toISOString();
  it('the latest stamp of each kind wins; unknown kinds are ignored', () => {
    const c = dayClock([{ kind: 'call', at: at(7) }, { kind: 'call', at: at(7, 15) }, { kind: 'continuity', at: at(9) }]);
    expect(c.call).toBe(at(7, 15));
    expect(c.wrap).toBeNull();
  });

  it('time on set leaves out lunch; overtime counts past the planned wrap', () => {
    const clock = dayClock([
      { kind: 'call', at: at(7) }, { kind: 'rolling', at: at(8) },
      { kind: 'lunch', at: at(12) }, { kind: 'back', at: at(13) }, { kind: 'wrap', at: at(19, 30) },
    ]);
    const s = dayStatus(clock, new Date(2026, 9, 3, 22), new Date(2026, 9, 3, 19));
    expect(s).toEqual({ phase: 'wrapped', onSetMinutes: 11 * 60 + 30, overtimeMinutes: 30, toWrapMinutes: null });
  });

  it('where the day is, live', () => {
    const now = new Date(2026, 9, 3, 12, 30);
    const wrapAt = new Date(2026, 9, 3, 19);
    expect(dayStatus(dayClock([]), now, null).phase).toBe('before');
    expect(dayStatus(dayClock([{ kind: 'call', at: at(7) }]), now, wrapAt)).toMatchObject({ phase: 'prep', onSetMinutes: 330, toWrapMinutes: 390 });
    const lunch = dayStatus(dayClock([{ kind: 'call', at: at(7) }, { kind: 'rolling', at: at(8) }, { kind: 'lunch', at: at(12) }]), now, wrapAt);
    expect(lunch).toMatchObject({ phase: 'lunch', onSetMinutes: 300 });
    expect(dayStatus(dayClock([{ kind: 'call', at: at(7) }, { kind: 'rolling', at: at(8) }]), now, wrapAt).phase).toBe('shooting');
  });
});

describe('progress and formats', () => {
  it('counts the day’s scenes, pages and shots', () => {
    const p = dayProgress(
      [{ id: 's1', est_duration: '3/8 pg', status: 'wrapped' }, { id: 's2', est_duration: '11/8 pg', status: 'scheduled' }],
      [{ scene_id: 's1', status: 'shot' }, { scene_id: 's2', status: 'omitted' }, { scene_id: 's2', status: 'planned' }, { scene_id: 'other', status: 'shot' }],
    );
    expect(p).toEqual({ scenes: 2, scenesDone: 1, eighths: 14, eighthsDone: 3, shots: 3, shotsDone: 1, shotsOmitted: 1 });
  });
  it('reads eighths, local times and minutes', () => {
    expect(eighthsOf('11/8 pg')).toBe(11);
    expect(eighthsOf(null)).toBe(0);
    expect(localDateTime('2026-10-03', '19:30:00')?.getHours()).toBe(19);
    expect(localDateTime(null, '19:30')).toBeNull();
    expect(formatMinutes(135)).toBe('2h 15m');
    expect(formatMinutes(40)).toBe('40m');
  });
});
