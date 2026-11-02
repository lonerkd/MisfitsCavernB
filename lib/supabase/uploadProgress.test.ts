import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadWithProgress } from './uploadProgress';

class FakeXhr {
  static last: FakeXhr;
  method = ''; url = ''; headers: Record<string, string> = {}; body: unknown = null;
  status = 200; responseText = '';
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null; onerror: (() => void) | null = null; onabort: (() => void) | null = null;
  constructor() { FakeXhr.last = this; }
  open(m: string, u: string) { this.method = m; this.url = u; }
  setRequestHeader(k: string, v: string) { this.headers[k] = v; }
  send(b: unknown) { this.body = b; }
}

const file = new Blob(['x'.repeat(100)], { type: 'image/png' });
const store = (over: Partial<Parameters<typeof uploadWithProgress>[0]> = {}) => ({
  upload: vi.fn(async () => ({ error: null })),
  createSignedUploadUrl: vi.fn(async () => ({ data: { signedUrl: 'https://s/object/upload/sign/b/p?token=t' }, error: null })),
  ...over,
});
afterEach(() => vi.unstubAllGlobals());

describe('uploadWithProgress', () => {
  it('sends the file to the signed URL and reports progress, then finishes', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const seen: Array<[number, number]> = [];
    const s = store();
    const done = uploadWithProgress(s, 'p', file, { contentType: 'image/png', cacheControl: '31536000' }, (l, t) => seen.push([l, t]));
    await Promise.resolve(); await Promise.resolve();
    const x = FakeXhr.last;
    expect(x.method).toBe('PUT');
    expect(x.url).toContain('token=t');
    expect(x.headers).toMatchObject({ 'x-upsert': 'false', 'cache-control': 'max-age=31536000', 'content-type': 'image/png' });
    expect(x.body).toBe(file);
    x.upload.onprogress!({ lengthComputable: true, loaded: 40, total: 100 });
    x.onload!();
    expect(await done).toEqual({ error: null });
    expect(seen).toEqual([[40, 100], [100, 100]]);
    expect(s.upload).not.toHaveBeenCalled();
  });
  it('reports the server’s own message when it refuses', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const done = uploadWithProgress(store(), 'p', file, {}, () => {});
    await Promise.resolve(); await Promise.resolve();
    FakeXhr.last.status = 413; FakeXhr.last.responseText = JSON.stringify({ message: 'The object exceeded the maximum allowed size' });
    FakeXhr.last.onload!();
    expect((await done).error?.message).toBe('The object exceeded the maximum allowed size');
  });
  it('says so when the network drops', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const done = uploadWithProgress(store(), 'p', file, {}, () => {});
    await Promise.resolve(); await Promise.resolve();
    FakeXhr.last.onerror!();
    expect((await done).error?.message).toMatch(/network dropped/);
  });
  it('falls back to the plain upload when there is no XMLHttpRequest or no signed URL', async () => {
    vi.stubGlobal('XMLHttpRequest', undefined);
    const a = store();
    await uploadWithProgress(a, 'p', file, {}, () => {});
    expect(a.upload).toHaveBeenCalledTimes(1);
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    const b = store({ createSignedUploadUrl: vi.fn(async () => ({ data: null, error: { message: 'no' } })) });
    await uploadWithProgress(b, 'p', file, {}, () => {});
    expect(b.upload).toHaveBeenCalledTimes(1);
  });
});
