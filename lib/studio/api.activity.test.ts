import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeSupabase } from '@/tests/unit-support/fakeSupabase';
import type { Client } from './api';

const { logActivity } = vi.hoisted(() => ({ logActivity: vi.fn() }));
vi.mock('@/lib/supabase/activity', () => ({ logActivity }));

import { createStudioApi } from './api';

const projectId = 'project-1';

function apiFor(results: Record<string, { data: unknown; error?: { message: string } | null }> = {}, rpcs: Record<string, { data: unknown; error?: { message: string } | null }> = {}) {
  const fake = createFakeSupabase(results, rpcs);
  const db = Object.assign(fake.client, {
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        remove: async () => ({ error: null }),
      }),
    },
  });
  return createStudioApi(db as unknown as Client);
}

afterEach(() => vi.clearAllMocks());

describe('Studio activity', () => {
  it('records an uploaded library item after its row is saved', async () => {
    const api = apiFor({ media: { data: { id: 'media-1' }, error: null } });
    const file = Object.assign(new Blob(['image'], { type: 'image/png' }), { name: 'frame.png' });

    await api.uploadFile(projectId, 'user-1', file);

    expect(logActivity).toHaveBeenCalledWith('uploaded an item to the library', 'media', 'media-1', { project_id: projectId });
  });

  it('records the issued call-sheet version for the project', async () => {
    const sheet = { id: 'sheet-1', project_id: projectId, shoot_day: 3, version: 2 };
    const api = apiFor({}, { issue_call_sheet: { data: sheet, error: null } });

    await api.issueCallSheet(sheet.id);

    expect(logActivity).toHaveBeenCalledWith('issued the call sheet for day 3 (v2)', 'call_sheet', sheet.id, { project_id: projectId });
  });

  it('records paperwork without exposing its title or details', async () => {
    const doc = { id: 'document-1', project_id: projectId, title: 'Private contract' };
    const api = apiFor({ project_documents: { data: doc, error: null } });

    await api.addDocument(projectId, { kind: 'contract', title: doc.title });

    expect(logActivity).toHaveBeenCalledWith('added production paperwork', 'project_document', doc.id, { project_id: projectId, audience: 'shapers' });
    expect(JSON.stringify(logActivity.mock.calls)).not.toContain(doc.title);
  });
});
