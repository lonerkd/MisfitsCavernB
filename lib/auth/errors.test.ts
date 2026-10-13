import { describe, expect, it } from 'vitest';
import { signInMessage } from './errors';

describe('signInMessage', () => {
  it('says a suspended account is suspended, and where to go', () => {
    expect(signInMessage('User is banned')).toMatch(/suspended.*Instagram/);
  });
  it('keeps any other message, and has one when there is none', () => {
    expect(signInMessage('Invalid login credentials')).toBe('Invalid login credentials');
    expect(signInMessage(undefined)).toBe('Sign in failed');
    expect(signInMessage('  ')).toBe('Sign in failed');
  });
});
