import { describe, it, expect } from 'vitest';
import { toBreachEvent } from './index';

describe('toBreachEvent', () => {
  it('normalises the address and keeps the context', () => {
    expect(toBreachEvent('  Sam@Example.COM ', 42, 'signup')).toEqual({ email: 'sam@example.com', count: 42, context: 'signup' });
  });

  it('is not an event without a breach', () => {
    expect(toBreachEvent('sam@example.com', 0, 'reset')).toBeNull();
    expect(toBreachEvent('sam@example.com', -3, 'reset')).toBeNull();
    expect(toBreachEvent('sam@example.com', NaN, 'reset')).toBeNull();
  });

  it('is not an event without a usable address', () => {
    expect(toBreachEvent('', 5, 'change')).toBeNull();
    expect(toBreachEvent('nobody', 5, 'change')).toBeNull();
    expect(toBreachEvent('@x', 5, 'change')).toBeNull();
    expect(toBreachEvent(`${'a'.repeat(320)}@x.io`, 5, 'change')).toBeNull();
  });

  it('clamps the count to a database integer', () => {
    expect(toBreachEvent('a@b.co', 1e12, 'signup')?.count).toBe(2_147_483_647);
    expect(toBreachEvent('a@b.co', 3.9, 'signup')?.count).toBe(3);
  });
});
