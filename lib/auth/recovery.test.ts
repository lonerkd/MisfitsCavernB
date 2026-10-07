import { describe, it, expect } from 'vitest';
import { checkNewPassword, recoveryErrorMessage } from './recovery';

describe('checkNewPassword', () => {
  it('accepts a good password that matches its confirmation', () => {
    expect(checkNewPassword('violet-lantern-92', 'violet-lantern-92', 'sam@example.com')).toBeNull();
  });
  it('refuses a short password', () => {
    expect(checkNewPassword('abc', 'abc')).toMatch(/at least 6/);
  });
  it('refuses a common password', () => {
    expect(checkNewPassword('password123', 'password123')).toMatch(/most-common/);
  });
  it('refuses a password built from the email', () => {
    expect(checkNewPassword('samwriter99', 'samwriter99', 'samwriter@example.com')).toMatch(/email or username/);
  });
  it('refuses a mismatch', () => {
    expect(checkNewPassword('violet-lantern-92', 'violet-lantern-93')).toMatch(/match/);
  });
});

describe('recoveryErrorMessage', () => {
  it.each([
    [{ code: 'same_password' }, /not used before/],
    [{ code: 'over_email_send_rate_limit' }, /Too many/],
    [{ message: 'email rate limit exceeded' }, /Too many/],
    [{ code: 'session_not_found' }, /expired/],
    [{ message: 'Failed to fetch' }, /connect/],
    [{ message: 'boom' }, /Something went wrong/],
    [null, /Something went wrong/],
  ])('%j', (err, expected) => {
    expect(recoveryErrorMessage(err as never)).toMatch(expected);
  });
});
