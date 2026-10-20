import { describe, expect, it, vi } from 'vitest';
import { useFake } from '@/tests/unit-support/fakeSupabase';

vi.mock('./client', async () => ({ supabase: (await import('@/tests/unit-support/fakeSupabase')).supabaseProxy }));

import { applyToJob, closeJob } from './jobs';

describe('applyToJob', () => {
  it('sends the application with the trimmed note', async () => {
    const f = useFake({ job_applications: { error: null } });
    await expect(applyToJob('j1', 'u1', '  I would love to read.  ')).resolves.toBe('sent');
    expect(f.argsOf('job_applications', 'insert')).toEqual([
      [{ job_id: 'j1', applicant_id: 'u1', cover_note: 'I would love to read.' }],
    ]);
  });

  it.each(['', '   \n '])('stores a blank note (%j) as null', async (note) => {
    const f = useFake({ job_applications: { error: null } });
    await applyToJob('j1', 'u1', note);
    expect(f.argsOf('job_applications', 'insert')[0]).toEqual([{ job_id: 'j1', applicant_id: 'u1', cover_note: null }]);
  });

  it("answers 'duplicate' when the job + applicant key is already taken", async () => {
    useFake({ job_applications: { error: { message: 'duplicate key value', code: '23505' } as { message: string } } });
    await expect(applyToJob('j1', 'u1', 'again')).resolves.toBe('duplicate');
  });

  it('throws any other error as it came', async () => {
    const boom = { message: 'row-level security', code: '42501' };
    useFake({ job_applications: { error: boom } });
    await expect(applyToJob('j1', 'u1', '')).rejects.toBe(boom);
  });
});

describe('closeJob', () => {
  it('sets the posting to closed, by id only', async () => {
    const f = useFake({ jobs: { error: null } });
    await expect(closeJob('j9')).resolves.toBeUndefined();
    expect(f.argsOf('jobs', 'update')).toEqual([[{ status: 'closed' }]]);
    expect(f.argsOf('jobs', 'eq')).toEqual([['id', 'j9']]);
  });

  it('throws when the database refuses', async () => {
    const boom = { message: 'permission denied' };
    useFake({ jobs: { error: boom } });
    await expect(closeJob('j9')).rejects.toBe(boom);
  });

  it('does not write an audit entry itself (the admin RPC does, covered by tests/integration/admin-close-job.test.ts)', async () => {
    const f = useFake({ jobs: { error: null } });
    await closeJob('j9');
    expect(f.calls.map((c) => c.table)).toEqual(['jobs', 'jobs']);
  });
});
