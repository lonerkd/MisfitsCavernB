import { describe, it, expect } from 'vitest';
import { authHeading } from './heading';

describe('authHeading', () => {
  it('differs between sign-in, sign-up and reset', () => {
    const titles = (['signin', 'signup', 'forgot'] as const).map((m) => authHeading(m).join(' '));
    expect(new Set(titles).size).toBe(3);
  });

  it('sign-up reads WELCOME over CAVERN — the lower line stays (owner, Nov 26 2026)', () => {
    expect(authHeading('signup')).toEqual(['WELCOME', 'CAVERN']);
  });
});
