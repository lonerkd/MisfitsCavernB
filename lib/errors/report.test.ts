import { describe, expect, it } from 'vitest';
import { createGate, describeError, toReport } from './report';

const where = { path: '/studio?token=secret#x', userAgent: 'Mozilla/5.0', release: 'abc123' };

describe('toReport', () => {
  it('shapes an error, dropping the query from the path', () => {
    const r = toReport('window', new Error('boom'), where)!;
    expect(r).toMatchObject({ kind: 'window', message: 'boom', path: '/studio', release: 'abc123', user_agent: 'Mozilla/5.0' });
    expect(r.stack).toContain('boom');
  });

  it('ignores browser noise', () => {
    for (const m of ['ResizeObserver loop completed with undelivered notifications.', 'Script error.', 'Loading chunk 42 failed.', 'NEXT_REDIRECT', '   ']) {
      expect(toReport('window', new Error(m), where), m).toBeNull();
    }
  });

  it('describes thrown non-errors', () => {
    expect(describeError('plain').message).toBe('plain');
    expect(describeError({ code: 1 }).message).toBe('{"code":1}');
    expect(toReport('promise', 'rejected', where)?.message).toBe('rejected');
  });

  it('keeps fields within the log’s limits', () => {
    const r = toReport('render', new Error('x'.repeat(5000)), { ...where, path: '/' + 'p'.repeat(500), digest: 'd'.repeat(200) })!;
    expect(r.message).toHaveLength(1000);
    expect(r.path).toHaveLength(300);
    expect(r.digest).toHaveLength(100);
  });
});

describe('createGate', () => {
  it('sends each error once per visit, and no more than the cap', () => {
    const pass = createGate(3);
    const r = (m: string) => toReport('window', new Error(m), where)!;
    expect(pass(r('a'))).toBe(true);
    expect(pass(r('a'))).toBe(false);
    expect(pass(r('b'))).toBe(true);
    expect(pass(r('c'))).toBe(true);
    expect(pass(r('d'))).toBe(false);
  });
});
