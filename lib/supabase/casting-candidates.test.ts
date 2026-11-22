import { describe, it, expect } from 'vitest';
import { cleanReelUrl } from './casting';

describe('cleanReelUrl', () => {
  it('is empty for blank input', () => { expect(cleanReelUrl('  ')).toBeNull(); });
  it('adds https when missing', () => { expect(cleanReelUrl('vimeo.com/123')).toBe('https://vimeo.com/123'); });
  it('keeps http(s) links', () => { expect(cleanReelUrl('http://a.co/x')).toBe('http://a.co/x'); });
  it('refuses other schemes', () => { expect(() => cleanReelUrl('javascript:alert(1)')).toThrow(); });
});
