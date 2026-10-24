import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The Supabase client is replaced so reportError runs without a live RPC.
const rpc = vi.fn();
vi.mock('@/lib/supabase/client', () => ({ supabase: { rpc } }));

// reportError keeps a per-visit gate at module level, so each test loads a fresh copy.
async function load() {
  vi.resetModules();
  return (await import('./report')).reportError;
}

beforeEach(() => {
  rpc.mockReset();
  rpc.mockResolvedValue({ data: null, error: null });
  vi.stubGlobal('window', { location: { pathname: '/studio' } });
  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reportError', () => {
  it('sends a sanitized report through report_client_error', async () => {
    const reportError = await load();
    await reportError('window', new Error('boom'), 'dig');
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('report_client_error', expect.objectContaining({
      p_kind: 'window', p_message: 'boom', p_path: '/studio', p_digest: 'dig', p_user_agent: 'Mozilla/5.0',
    }));
  });

  it('does not send noise', async () => {
    const reportError = await load();
    await reportError('window', new Error('ResizeObserver loop completed with undelivered notifications.'));
    expect(rpc).not.toHaveBeenCalled();
  });

  it('sends the same error once per visit', async () => {
    const reportError = await load();
    await reportError('window', new Error('again'));
    await reportError('window', new Error('again'));
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('does nothing outside the browser', async () => {
    vi.unstubAllGlobals();
    const reportError = await load();
    await expect(reportError('window', new Error('server'))).resolves.toBeUndefined();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('swallows a rejected RPC', async () => {
    rpc.mockRejectedValue(new Error('network down'));
    const reportError = await load();
    await expect(reportError('promise', new Error('x'))).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('swallows an error returned by the RPC', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'denied' } });
    const reportError = await load();
    await expect(reportError('render', new Error('y'))).resolves.toBeUndefined();
  });
});
