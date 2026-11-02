// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportScriptAsText } from './export';
import type { StoredScript } from './storage';

const PODCAST = 'COLD OPEN\n\nHOST: Welcome back.\nGUEST: Glad to be here.\n';
const script = (format?: string): StoredScript => ({ id: 's', title: 'Pod', content: PODCAST, format, createdAt: '', updatedAt: '' });

async function exported(s: StoredScript): Promise<string> {
  let blob: Blob | null = null;
  vi.stubGlobal('URL', { createObjectURL: (b: Blob) => { blob = b; return 'blob:x'; }, revokeObjectURL: () => {} });
  exportScriptAsText(s, 'fountain');
  return (blob as unknown as Blob).text();
}
afterEach(() => vi.unstubAllGlobals());

describe('exports read a script with its own format', () => {
  it('a podcast script exports as it was written; read as a screenplay its segment header would be forced with "!"', async () => {
    expect(await exported(script('podcast'))).toBe(PODCAST);
    expect(await exported(script(undefined))).toBe('!' + PODCAST);
  });
});
