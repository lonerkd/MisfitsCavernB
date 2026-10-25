import { describe, it, expect } from 'vitest';
import { useOnSet } from './useOnSet';

describe('useOnSet', () => {
  it('returns null when there is no active project', () => {
    // The hook returns null when there's no active project or on non-shoot days
    const result = useOnSet();
    expect(result).toBeNull();
  });
});
