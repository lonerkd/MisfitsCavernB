import { describe, expect, it } from 'vitest';
import { MAX_LAG_DAYS, checkFreshness, daysBetween, newestNoteDate, parseHandoffDate } from './check-state-freshness.mjs';

describe('parseHandoffDate', () => {
  it('reads the date from the Resume here heading', () => {
    expect(parseHandoffDate('# x\n\n## Resume here (handoff, 2026-11-15, end of day)\n\n1. ...')).toBe('2026-11-15');
  });

  it('accepts a heading that closes right after the date', () => {
    expect(parseHandoffDate('## Resume here (handoff, 2026-01-02)')).toBe('2026-01-02');
  });

  it('returns null when there is no heading', () => {
    expect(parseHandoffDate('## Open work\n\nnothing here')).toBeNull();
  });

  it('ignores a Resume here line that is not a level-two heading', () => {
    expect(parseHandoffDate('Resume here (handoff, 2026-11-15)')).toBeNull();
  });
});

describe('newestNoteDate', () => {
  it('picks the newest date prefix, not the first in the list', () => {
    expect(newestNoteDate(['2026-10-01-a.md', '2026-11-15-b.md', '2026-11-02-c.md'])).toBe('2026-11-15');
  });

  it('ignores README.md and names without a date prefix', () => {
    expect(newestNoteDate(['README.md', '2026-11-01-x.md'])).toBe('2026-11-01');
  });

  it('returns null when no note has a date prefix', () => {
    expect(newestNoteDate(['README.md', 'notes.md'])).toBeNull();
  });

  it('skips an impossible date such as 2026-13-40', () => {
    expect(newestNoteDate(['2026-13-40-bad.md', '2026-11-01-ok.md'])).toBe('2026-11-01');
  });
});

describe('daysBetween', () => {
  it('counts whole days forward and backward', () => {
    expect(daysBetween('2026-11-12', '2026-11-15')).toBe(3);
    expect(daysBetween('2026-11-15', '2026-11-12')).toBe(-3);
  });

  it('is not changed by a month or year boundary', () => {
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1);
  });
});

describe('checkFreshness', () => {
  it('passes when the handoff is the same day as the newest note', () => {
    expect(checkFreshness({ handoff: '2026-11-15', newest: '2026-11-15' }).ok).toBe(true);
  });

  it('passes at exactly the limit', () => {
    expect(MAX_LAG_DAYS).toBe(3);
    expect(checkFreshness({ handoff: '2026-11-12', newest: '2026-11-15' }).ok).toBe(true);
  });

  it('fails one day past the limit, and says how far behind it is', () => {
    const result = checkFreshness({ handoff: '2026-11-11', newest: '2026-11-15' });
    expect(result.ok).toBe(false);
    expect(result.lag).toBe(4);
    expect(result.message).toContain('2026-11-11');
    expect(result.message).toContain('2026-11-15');
    expect(result.message).toContain('4 days');
  });

  it('passes when the handoff is newer than the note', () => {
    expect(checkFreshness({ handoff: '2026-11-20', newest: '2026-11-15' }).ok).toBe(true);
  });

  it('fails when the heading is missing', () => {
    const result = checkFreshness({ handoff: null, newest: '2026-11-15' });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('Resume here');
  });

  it('fails when no dated note exists', () => {
    const result = checkFreshness({ handoff: '2026-11-15', newest: null });
    expect(result.ok).toBe(false);
    expect(result.message).toContain('sessions');
  });

  it('honours a custom limit', () => {
    expect(checkFreshness({ handoff: '2026-11-01', newest: '2026-11-15', maxLag: 14 }).ok).toBe(true);
  });
});
