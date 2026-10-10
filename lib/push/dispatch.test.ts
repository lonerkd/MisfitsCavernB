import { describe, expect, it } from 'vitest';
import { toPayload } from './dispatch';

const n = { id: 'n1', type: 'call_sheet', title: 'Harbor — call sheet · Day 1', body: 'Your call 07:15.', link: '/call/abc' };

describe('toPayload', () => {
  it('title, body, a link inside the app, and the kind as the tag', () => {
    expect(toPayload(n)).toEqual({ id: 'n1', title: 'Harbor — call sheet · Day 1', body: 'Your call 07:15.', link: '/call/abc', tag: 'call_sheet' });
  });
  it('a link that isn’t inside the app (or none) opens Today', () => {
    for (const link of ['https://evil.example/x', '//evil.example', 'javascript:alert(1)', null]) expect(toPayload({ ...n, link }).link).toBe('/today');
  });
  it('keeps it short, as a lock screen shows it', () => {
    const p = toPayload({ ...n, title: 'T'.repeat(500), body: 'B'.repeat(900) });
    expect(p.title).toHaveLength(120);
    expect(p.body).toHaveLength(300);
    expect(toPayload({ ...n, body: null }).body).toBe('');
  });
});
