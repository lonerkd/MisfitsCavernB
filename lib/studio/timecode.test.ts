import { describe, it, expect } from 'vitest';
import { formatTimecode, parseTimecode } from './timecode';

describe('timecodes', () => {
  it('format as m:ss, or h:mm:ss past an hour', () => {
    expect(formatTimecode(0)).toBe('0:00');
    expect(formatTimecode(83.6)).toBe('1:23');
    expect(formatTimecode(3723)).toBe('1:02:03');
  });

  it('parse seconds, m:ss, h:mm:ss and tenths', () => {
    expect(parseTimecode('83')).toBe(83);
    expect(parseTimecode('1:23')).toBe(83);
    expect(parseTimecode('1:23.5')).toBe(83.5);
    expect(parseTimecode(' 01:02:03 ')).toBe(3723);
  });

  it('reject what isn’t a timecode', () => {
    for (const bad of ['', 'abc', '1:75', '1::2', '-4', '1:2:3:4', '100:00:00']) expect(parseTimecode(bad), bad).toBeNull();
  });

  it('round-trip', () => {
    for (const s of [0, 59, 60, 3599, 3600, 86399]) expect(parseTimecode(formatTimecode(s))).toBe(s);
  });
});
