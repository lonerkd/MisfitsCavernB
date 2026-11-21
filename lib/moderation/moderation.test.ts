import { describe, it, expect } from 'vitest';
import { isSuspendedError, cleanReason, outcomeLabel, removedNote, REASON_MAX } from './moderation';

describe('isSuspendedError', () => {
  it('recognises the database sentence, in an error or a string', () => {
    expect(isSuspendedError({ message: 'Your account is suspended: you can read, but not post, apply, create or report.' })).toBe(true);
    expect(isSuspendedError(new Error('Your account is suspended: x'))).toBe(true);
    expect(isSuspendedError('your ACCOUNT IS SUSPENDED')).toBe(true);
  });
  it('is false for anything else', () => {
    expect(isSuspendedError({ message: 'new row violates row-level security policy' })).toBe(false);
    expect(isSuspendedError(null)).toBe(false);
    expect(isSuspendedError(undefined)).toBe(false);
    expect(isSuspendedError({ message: 42 })).toBe(false);
  });
});

describe('cleanReason', () => {
  it('trims, and refuses empty or over-long text', () => {
    expect(cleanReason('  spam  ')).toBe('spam');
    expect(cleanReason('   ')).toBeNull();
    expect(cleanReason('x'.repeat(REASON_MAX))).toHaveLength(REASON_MAX);
    expect(cleanReason('x'.repeat(REASON_MAX + 1))).toBeNull();
  });
});

describe('outcomeLabel', () => {
  it('says what was done', () => {
    expect(outcomeLabel('hidden', 'resolved')).toBe('Hidden');
    expect(outcomeLabel('suspended', 'resolved')).toBe('Account suspended');
    expect(outcomeLabel('hidden_and_suspended', 'resolved')).toBe('Hidden, account suspended');
    expect(outcomeLabel(null, 'resolved')).toBe('Resolved');
    expect(outcomeLabel(null, 'dismissed')).toBe('Dismissed, no action');
  });
});

describe('removedNote', () => {
  it('names the thing and gives the reason when there is one', () => {
    expect(removedNote('job')).toBe('This job was removed by moderators and is no longer visible to others.');
    expect(removedNote('job', ' Not a real job ')).toContain('Reason: Not a real job');
    expect(removedNote('profile')).toMatch(/^Your public page/);
    expect(removedNote('message', '')).not.toContain('Reason');
  });
});
