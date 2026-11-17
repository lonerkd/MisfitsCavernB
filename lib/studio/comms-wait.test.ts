import { describe, expect, it } from 'vitest';
import { daysWaiting } from './comms-wait';

describe('communications waiting for an answer', () => {
  it('flags a pending entry only when it is more than two days old', () => {
    expect(daysWaiting({ date: '2026-11-14', status: 'pending' }, '2026-11-17')).toBe(3);
    expect(daysWaiting({ date: '2026-11-15', status: 'pending' }, '2026-11-17')).toBeNull();
    expect(daysWaiting({ date: '2026-11-17', status: 'pending' }, '2026-11-17')).toBeNull();
  });

  it('never flags an entry that was sent or replied to', () => {
    expect(daysWaiting({ date: '2026-11-01', status: 'sent' }, '2026-11-17')).toBeNull();
    expect(daysWaiting({ date: '2026-11-01', status: 'replied' }, '2026-11-17')).toBeNull();
  });

  it('counts across a month boundary and ignores invalid dates', () => {
    expect(daysWaiting({ date: '2026-02-27', status: 'pending' }, '2026-03-02')).toBe(3);
    expect(daysWaiting({ date: 'last week', status: 'pending' }, '2026-03-02')).toBeNull();
    expect(daysWaiting({ date: '2026-02-27', status: 'pending' }, 'soon')).toBeNull();
  });
});
