import { describe, it, expect } from 'vitest';
import { linkLive, reviewUrl, versionState } from './versions';

describe('versionState', () => {
  it('walks draft → with the client → decided → confirmed', () => {
    expect(versionState({ status: 'draft', guest_decision: null, confirmed_at: null })).toBe('draft');
    expect(versionState({ status: 'sent', guest_decision: null, confirmed_at: null })).toBe('with-client');
    expect(versionState({ status: 'sent', guest_decision: 'approved', confirmed_at: null })).toBe('approved');
    expect(versionState({ status: 'sent', guest_decision: 'changes_requested', confirmed_at: null })).toBe('changes-requested');
    expect(versionState({ status: 'sent', guest_decision: 'approved', confirmed_at: '2026-10-27T00:00:00Z' })).toBe('confirmed');
  });
});

describe('links', () => {
  it('builds the address a client opens, without doubling the slash', () => {
    expect(reviewUrl('https://x.test/', 'abc')).toBe('https://x.test/review/abc');
    expect(reviewUrl('https://x.test', 'abc')).toBe('https://x.test/review/abc');
  });
  it('is live until revoked or expired', () => {
    const now = Date.parse('2026-10-27T12:00:00Z');
    expect(linkLive({ revoked_at: null, expires_at: null }, now)).toBe(true);
    expect(linkLive({ revoked_at: '2026-10-27T10:00:00Z', expires_at: null }, now)).toBe(false);
    expect(linkLive({ revoked_at: null, expires_at: '2026-10-27T11:00:00Z' }, now)).toBe(false);
    expect(linkLive({ revoked_at: null, expires_at: '2026-10-28T11:00:00Z' }, now)).toBe(true);
  });
});
