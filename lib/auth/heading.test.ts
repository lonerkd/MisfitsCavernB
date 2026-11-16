import { describe, it, expect } from 'vitest';
import { authHeading } from './heading';

describe('authHeading', () => {
  it('differs between sign-in, sign-up and reset', () => {
    const titles = (['signin', 'signup', 'forgot'] as const).map((m) => authHeading(m).join(' '));
    expect(new Set(titles).size).toBe(3);
  });
});
