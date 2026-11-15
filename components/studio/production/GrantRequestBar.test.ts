import { describe, it, expect } from 'vitest';
import { parseGrant } from './GrantRequestBar';

describe('parseGrant', () => {
  it('splits the user id from a capability key that has a dot', () => {
    expect(parseGrant('1b2c-uuid.budget.read')).toEqual({ userId: '1b2c-uuid', capability: 'budget.read' });
  });
  it('refuses anything that is not a request', () => {
    expect(parseGrant(null)).toBeNull();
    expect(parseGrant('nodot')).toBeNull();
    expect(parseGrant('.budget.read')).toBeNull();
    expect(parseGrant('abc.')).toBeNull();
  });
});
