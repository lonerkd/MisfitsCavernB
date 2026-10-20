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

  const GENERIC = 'Something went wrong. Please try again.';
  const SAME = 'Choose a password you have not used before.';
  const WEAK = 'That password is too weak. Use a longer, more unique one.';
  const RATE = 'Too many attempts. Please wait a minute and try again.';
  const EXPIRED = 'This reset link has expired. Request a new one.';
  const NETWORK = 'Unable to connect. Please try again later.';

  it.each([
    ['undefined', undefined],
    ['empty object', {}],
    ['unknown code, no message', { code: 'totally_unknown' }],
    ['unknown code and message', { code: 'totally_unknown', message: 'boom' }],
    ['empty strings', { code: '', message: '' }],
    ['null message', { message: null }],
  ])('falls back to the generic message: %s', (_name, err) => {
    expect(recoveryErrorMessage(err as never)).toBe(GENERIC);
  });

  it('maps same_password by code and by the message regex (any case)', () => {
    expect(recoveryErrorMessage({ code: 'same_password' })).toBe(SAME);
    expect(recoveryErrorMessage({ message: 'New password should be different from the old password.' })).toBe(SAME);
    expect(recoveryErrorMessage({ message: 'DIFFERENT FROM THE OLD PASSWORD' })).toBe(SAME);
  });

  it('maps weak_password by code only', () => {
    expect(recoveryErrorMessage({ code: 'weak_password' })).toBe(WEAK);
    expect(recoveryErrorMessage({ message: 'weak password' })).toBe(GENERIC);
  });

  it.each([
    [{ code: 'over_email_send_rate_limit' }],
    [{ code: 'over_request_rate_limit' }],
    [{ message: 'Rate limit exceeded' }],
    [{ message: 'For security purposes, you can only request this after 42 seconds.' }],
  ])('maps rate limits: %j', (err) => {
    expect(recoveryErrorMessage(err)).toBe(RATE);
  });

  it.each([
    [{ code: 'session_not_found' }],
    [{ code: 'otp_expired' }],
    [{ message: 'Auth session missing!' }],
    [{ message: 'Email link is invalid or has EXPIRED' }],
  ])('maps expired links: %j', (err) => {
    expect(recoveryErrorMessage(err)).toBe(EXPIRED);
  });

  it.each(['fetch failed', 'Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Load failed'])(
    'maps the network string %j',
    (message) => {
      expect(recoveryErrorMessage({ message })).toBe(NETWORK);
    },
  );

  it('prefers a specific Supabase code over a network-looking message', () => {
    expect(recoveryErrorMessage({ code: 'weak_password', message: 'fetch failed' })).toBe(WEAK);
    expect(recoveryErrorMessage({ code: 'otp_expired', message: 'Failed to fetch' })).toBe(EXPIRED);
    expect(recoveryErrorMessage({ code: 'over_request_rate_limit', message: 'Load failed' })).toBe(RATE);
  });

  it('checks branches in order when a message matches several', () => {
    // same_password wins over rate limit and expired
    expect(recoveryErrorMessage({ code: 'same_password', message: 'rate limit expired' })).toBe(SAME);
    // rate limit wins over session/expired
    expect(recoveryErrorMessage({ message: 'rate limit: session expired' })).toBe(RATE);
    // session/expired wins over network
    expect(recoveryErrorMessage({ message: 'session fetch failed' })).toBe(EXPIRED);
  });
});
