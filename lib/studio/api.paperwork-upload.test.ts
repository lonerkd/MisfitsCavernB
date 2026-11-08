import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from '@/tests/unit-support/fakeSupabase';
import type { Client } from './api';

// Attaching a file to production paperwork shows in the island and always lets go of it.
const end = vi.fn();
const begin = vi.fn(() => ({ progress: vi.fn(), end }));
vi.mock('@/lib/island/uploads', () => ({ beginUpload: (...a: unknown[]) => (begin as unknown as (...x: unknown[]) => unknown)(...a) }));
vi.mock('@/lib/supabase/activity', () => ({ logActivity: vi.fn() }));
import { createStudioApi } from './api';

let uploadResult: { error: { message: string } | null } = { error: null };
function apiFor() {
  const fake = createFakeSupabase({ project_documents: { data: { id: 'd1', project_id: 'p1' }, error: null } });
  const db = Object.assign(fake.client, {
    storage: { from: () => ({
      upload: async () => uploadResult,
      createSignedUploadUrl: async () => ({ data: null, error: { message: 'no signed url in a test' } }),
      remove: async () => ({ error: null }),
    }) },
  });
  return createStudioApi(db as unknown as Client);
}
const doc = { id: 'd1', project_id: 'p1', storage_path: null };
const pdf = Object.assign(new Blob(['%PDF'], { type: 'application/pdf' }), { name: 'contract.pdf' });

afterEach(() => { vi.clearAllMocks(); uploadResult = { error: null }; });

describe('attaching a file to paperwork', () => {
  it('reports the file to the island and lets go of the activity when it is saved', async () => {
    await apiFor().attachDocumentFile(doc, pdf);
    expect(begin).toHaveBeenCalledWith('contract.pdf', pdf.size);
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('a failed upload says so and still lets go of the activity', async () => {
    uploadResult = { error: { message: 'The network dropped during the upload' } };
    await expect(apiFor().attachDocumentFile(doc, pdf)).rejects.toThrow(/Upload failed: The network dropped/);
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('a file that is not a PDF or an image never starts an upload', async () => {
    const txt = Object.assign(new Blob(['x'], { type: 'text/plain' }), { name: 'a.txt' });
    await expect(apiFor().attachDocumentFile(doc, txt)).rejects.toThrow(/PDF or an image/);
    expect(begin).not.toHaveBeenCalled();
  });
});
