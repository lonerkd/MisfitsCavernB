import { describe, expect, it } from 'vitest';
import { FEED_TOKEN, buildIcs, escapeText, fold, type FeedRow } from './ics';

const now = new Date('2026-11-18T10:00:00Z');
const row = (o: Partial<FeedRow>): FeedRow => ({ kind: 'day', uid: 'day-1', project_title: 'Harbour', summary: 'Shoot day 1', day: '2026-12-01', start_time: null, end_time: null, location: null, notes: null, ...o });

describe('the calendar feed', () => {
  it('is an empty calendar for no rows (a wrong token looks the same as a quiet week)', () => {
    const ics = buildIcs([], now);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).not.toContain('VEVENT');
  });
  it('makes a shoot day an all-day event that ends the next day, across a month end', () => {
    const ics = buildIcs([row({ day: '2026-12-31' })], now);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231');
    expect(ics).toContain('DTEND;VALUE=DATE:20270101');
    expect(ics).toContain('UID:day-1@cavern');
    expect(ics).toContain('SUMMARY:Shoot day 1 · Harbour');
  });
  it('makes a call a timed event from the call to the wrap, in floating time', () => {
    const ics = buildIcs([row({ kind: 'call', uid: 'sheet-9', start_time: '07:00:00', end_time: '19:30:00', location: 'Pier 4, Dock Rd' })], now);
    expect(ics).toContain('DTSTART:20261201T070000\r\n');
    expect(ics).toContain('DTEND:20261201T193000\r\n');
    expect(ics).toContain('LOCATION:Pier 4\\, Dock Rd');
  });
  it('gives a call with no usable wrap an hour, never an end before the start', () => {
    expect(buildIcs([row({ start_time: '07:00', end_time: null })], now)).toContain('DURATION:PT1H');
    expect(buildIcs([row({ start_time: '07:00', end_time: '06:00' })], now)).toContain('DURATION:PT1H');
  });
  it('escapes text and folds long lines at 75 octets without splitting a character', () => {
    expect(escapeText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
    const folded = fold('DESCRIPTION:' + 'é'.repeat(80));
    for (const part of folded.split('\r\n')) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, '')).toBe('DESCRIPTION:' + 'é'.repeat(80));
  });
  it('accepts only a uuid as a token', () => {
    expect(FEED_TOKEN.test('3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e')).toBe(true);
    expect(FEED_TOKEN.test('../etc/passwd')).toBe(false);
    expect(FEED_TOKEN.test('')).toBe(false);
  });
});
