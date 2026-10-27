import { describe, it, expect } from 'vitest';
import { checkCase, checkMessage, sortCases, type SupportCase } from './support';

const c = (id: string, status: SupportCase['status'], updated_at: string): SupportCase =>
  ({ id, opened_by: 'u', subject: id, page: null, status, created_at: updated_at, updated_at });

describe('checkCase', () => {
  it('trims and keeps the page', () => {
    expect(checkCase({ subject: '  Export fails ', body: ' It hangs ', page: '/studio' }))
      .toEqual({ ok: true, value: { subject: 'Export fails', body: 'It hangs', page: '/studio' } });
  });
  it('needs a subject and a message', () => {
    expect(checkCase({ subject: ' ', body: 'x' })).toEqual({ ok: false, error: 'Give it a subject.' });
    expect(checkCase({ subject: 'x', body: ' ' })).toEqual({ ok: false, error: 'Write a message first.' });
  });
  it('refuses a long subject and an empty page becomes null', () => {
    expect(checkCase({ subject: 'x'.repeat(201), body: 'y' }).ok).toBe(false);
    expect(checkCase({ subject: 'x', body: 'y', page: '  ' })).toMatchObject({ value: { page: null } });
  });
});

describe('checkMessage', () => {
  it('caps a message at 5,000 characters', () => {
    expect(checkMessage('x'.repeat(5000))).toBeNull();
    expect(checkMessage('x'.repeat(5001))).toMatch(/5,000/);
  });
});

describe('sortCases', () => {
  it('needs-an-answer first, then waiting, then resolved; newest first within each', () => {
    const sorted = sortCases([
      c('r', 'resolved', '2026-10-26T10:00:00Z'),
      c('w', 'waiting', '2026-10-26T09:00:00Z'),
      c('o-old', 'open', '2026-10-25T09:00:00Z'),
      c('o-new', 'open', '2026-10-26T08:00:00Z'),
    ]);
    expect(sorted.map((x) => x.id)).toEqual(['o-new', 'o-old', 'w', 'r']);
  });
});
