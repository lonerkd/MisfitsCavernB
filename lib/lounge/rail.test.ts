import { describe, it, expect } from 'vitest';
import { RAIL_AREAS, SPLIT_MIN_WIDTH, loungeSplit, paneEmpty, sumUnread, unreadLabel } from './rail';

describe('the Lounge rail', () => {
  it('has three areas in this order, each saying what it is for', () => {
    expect(RAIL_AREAS.map((a) => a.label)).toEqual(['Productions', 'Community', 'People']);
    for (const a of RAIL_AREAS) expect(a.purpose.length).toBeGreaterThan(10);
  });

  it('adds up what is unread and caps the label at 99+', () => {
    expect(sumUnread(['a', 'b', 'c'], (id) => ({ a: 2, b: 0, c: 5 })[id as 'a'] ?? 0)).toBe(7);
    expect(unreadLabel(7)).toBe('7');
    expect(unreadLabel(99)).toBe('99');
    expect(unreadLabel(100)).toBe('99+');
  });

  it('puts the rail beside the conversation on the desk, and on a phone only when held sideways with 700 px left', () => {
    expect(loungeSplit(false, false, 0)).toBe(true);
    expect(loungeSplit(true, false, 390)).toBe(false);
    expect(loungeSplit(true, true, SPLIT_MIN_WIDTH - 1)).toBe(false);
    expect(loungeSplit(true, true, SPLIT_MIN_WIDTH)).toBe(true);
    // not measured yet: push, never a cramped split
    expect(loungeSplit(true, true, 0)).toBe(false);
  });

  it('picks the empty state: messages win, then a direct message, no channel, then what the person may do', () => {
    const base = { messageCount: 0, hasDm: false, hasChannel: true, canPost: true, canManage: false };
    expect(paneEmpty({ ...base, messageCount: 3 })).toBeNull();
    expect(paneEmpty({ ...base, hasDm: true, hasChannel: false })).toBe('dm');
    expect(paneEmpty({ ...base, hasChannel: false })).toBe('no-channel');
    expect(paneEmpty({ ...base, canManage: true })).toBe('channel-managers');
    expect(paneEmpty(base)).toBe('channel-members');
    expect(paneEmpty({ ...base, canPost: false })).toBe('channel-readers');
  });
});
