import { describe, expect, it } from 'vitest';
import { readOnline } from './storage';

describe('readOnline', () => {
  it('reads a navigator with no onLine (Node on the server) as online, so the server draws no Offline chip', () => {
    expect(readOnline({})).toBe(true);
    expect(readOnline(undefined)).toBe(true);
  });
  it('follows the browser when it answers', () => {
    expect(readOnline({ onLine: true })).toBe(true);
    expect(readOnline({ onLine: false })).toBe(false);
  });
});
