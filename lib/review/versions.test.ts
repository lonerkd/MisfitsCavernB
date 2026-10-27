import { describe, it, expect } from 'vitest';
import { approvalBlocker, linkLive, reviewUrl, versionState } from './versions';

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

describe('approvalBlocker', () => {
  const v = (script_id: string, number: number, status: 'draft' | 'sent', guest_decision: 'approved' | 'changes_requested' | null, confirmed: boolean) =>
    ({ script_id, number, status, guest_decision, confirmed_at: confirmed ? '2026-10-27T10:00:00Z' : null });

  it('blocks until something has been sent', () => {
    expect(approvalBlocker([])).toMatch(/Nothing has been sent/);
    expect(approvalBlocker([v('a', 1, 'draft', null, false)])).toMatch(/Nothing has been sent/);
  });

  it('passes when every script\'s latest sent version is approved and confirmed', () => {
    expect(approvalBlocker([v('a', 1, 'sent', 'approved', true), v('b', 3, 'sent', 'approved', true)])).toBeNull();
  });

  it('judges a script by its latest sent version, not an older approval', () => {
    expect(approvalBlocker([v('a', 1, 'sent', 'approved', true), v('a', 2, 'sent', null, false)])).toMatch(/has not approved a piece/);
    // a newer draft does not count; the sent one still stands
    expect(approvalBlocker([v('a', 1, 'sent', 'approved', true), v('a', 2, 'draft', null, false)])).toBeNull();
  });

  it('counts the pieces the client has not approved, including changes requested', () => {
    expect(approvalBlocker([v('a', 1, 'sent', 'changes_requested', true), v('b', 1, 'sent', null, false), v('c', 1, 'sent', 'approved', true)])).toMatch(/2 pieces/);
  });

  it('asks the team to confirm an approval that is not confirmed yet', () => {
    expect(approvalBlocker([v('a', 1, 'sent', 'approved', false)])).toMatch(/waiting for the team to confirm/);
    expect(approvalBlocker([v('a', 1, 'sent', 'approved', false), v('b', 1, 'sent', 'approved', false)])).toMatch(/2 approvals are waiting/);
  });
});
