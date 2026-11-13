import { beforeEach, describe, expect, it, vi } from 'vitest';

// Uploading a sound effect shows in the island and always lets go of it, even when the upload fails.
const end = vi.fn();
const begin = vi.fn(() => ({ progress: vi.fn(), end }));
vi.mock('@/lib/island/uploads', () => ({ beginUpload: (...a: unknown[]) => (begin as unknown as (...x: unknown[]) => unknown)(...a) }));

let uploadResult: { error: { message: string } | null } = { error: null };
const insert = vi.fn(async () => ({ error: null }));
vi.mock('./client', () => ({
  supabase: {
    storage: { from: () => ({
      upload: async () => uploadResult,
      createSignedUploadUrl: async () => ({ data: null, error: { message: 'no signed url in a test' } }),
      getPublicUrl: (p: string) => ({ data: { publicUrl: `https://db.test/${p}` } }),
    }) },
    from: () => ({ insert }),
  },
}));
import { uploadSfx } from './audio';

const file = new File(['abc'], 'door slam.wav', { type: 'audio/wav' });
beforeEach(() => { uploadResult = { error: null }; vi.clearAllMocks(); });

describe('uploadSfx', () => {
  it('reports the file to the island, saves it, and lets go of the activity', async () => {
    await uploadSfx(file, 'u1', 'p1');
    expect(begin).toHaveBeenCalledWith('door slam.wav', file.size);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ title: 'door slam.wav', user_id: 'u1', project_id: 'p1' }));
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('a failed upload throws its message, saves nothing, and still lets go of the activity', async () => {
    uploadResult = { error: { message: 'The network dropped during the upload' } };
    await expect(uploadSfx(file, 'u1', 'p1')).rejects.toThrow('The network dropped during the upload');
    expect(insert).not.toHaveBeenCalled();
    expect(end).toHaveBeenCalledTimes(1);
  });
});
