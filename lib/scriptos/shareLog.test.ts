import { describe, it, expect, vi, afterEach } from 'vitest';
import { logShareLookup, tokenFingerprint } from './shareLog';

afterEach(() => vi.restoreAllMocks());

describe('share lookup logging', () => {
  it('fingerprints a token without revealing it', () => {
    const token = 'abcdef0123456789abcdef0123456789';
    const fp = tokenFingerprint(token);
    expect(fp).toMatch(/^[0-9a-f]{12}$/);
    expect(fp).toBe(tokenFingerprint(token));
    expect(fp).not.toBe(tokenFingerprint(token + 'x'));
    expect(token).not.toContain(fp);
  });

  it('logs a miss as one JSON line with no token', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const token = 'secret-token-value-0123456789';
    logShareLookup('share_link_miss', token);
    expect(warn).toHaveBeenCalledTimes(1);
    const line = String(warn.mock.calls[0][0]);
    expect(line).not.toContain(token);
    expect(JSON.parse(line)).toEqual({ event: 'share_link_miss', token_fp: tokenFingerprint(token), token_len: token.length });
  });

  it('logs an RPC failure as an error with its message', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    logShareLookup('share_link_error', 'tok', 'boom');
    expect(JSON.parse(String(err.mock.calls[0][0])).detail).toBe('boom');
  });
});
