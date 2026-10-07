import { describe, it, expect } from 'vitest';
import { newShareToken, scriptShareUrl } from './share';

describe('script share links', () => {
  it('makes 32-hex-character tokens the database accepts, never the same twice', () => {
    const a = newShareToken(), b = newShareToken();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(b);
  });

  it('builds the /s/ link on the given origin', () => {
    expect(scriptShareUrl('abc', 'https://example.test')).toBe('https://example.test/s/abc');
  });
});
