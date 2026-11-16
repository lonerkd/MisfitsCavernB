// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  toast: vi.fn(),
  notify: vi.fn(),
  applyToJob: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: h.toast }) }));
vi.mock('@/components/ui/Confirm', () => ({ useConfirm: () => vi.fn() }));
vi.mock('@/components/ui/GrainOverlay', () => ({ default: () => null }));
vi.mock('@/lib/os/PillContext', () => ({ usePillStage: () => {} }));
vi.mock('@/lib/os', () => ({
  useProject: () => ({ activeProject: null }),
  awaitOSUser: () => Promise.resolve({ id: 'applicant-1' }),
}));
vi.mock('@/lib/crafts/crafts', () => ({ useCrafts: () => ({ crafts: [], byName: new Map() }) }));
vi.mock('@/components/jobs/PostModal', () => ({ PostModal: () => null }));
vi.mock('@/components/jobs/JobCards', () => ({
  MyJobCard: () => null,
  JobCard: ({ job, onApply }: { job: { id: string; title: string }; onApply: (id: string, note: string) => Promise<boolean> }) => (
    <button type="button" onClick={() => void onApply(job.id, 'hello')}>apply to {job.title}</button>
  ),
}));
vi.mock('@/lib/supabase/audit', () => ({ logAuditAction: vi.fn() }));
vi.mock('@/lib/supabase/notifications', () => ({ notify: h.notify }));
vi.mock('@/lib/supabase/jobs', () => ({
  applyToJob: h.applyToJob,
  closeJob: vi.fn(),
  listJobsPostedBy: () => Promise.resolve([]),
  listMyApplications: () => Promise.resolve([]),
  listOpenJobs: () => Promise.resolve([{ id: 'job-1', title: 'Gaffer wanted', role: 'Gaffer', status: 'open', created_by: 'poster-1', profiles: null, projects: null }]),
}));

import JobsPage from './page';

beforeEach(() => {
  h.toast.mockReset();
  h.notify.mockReset().mockResolvedValue(null);
  h.applyToJob.mockReset().mockResolvedValue('sent');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('applying from the jobs board', () => {
  it('reports a poster who could not be told, after saying the application was sent', async () => {
    h.notify.mockResolvedValue('permission denied');
    render(<JobsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'apply to Gaffer wanted' }));

    await waitFor(() => expect(h.toast).toHaveBeenCalledWith('Application sent, but the poster wasn’t notified: permission denied', 'error'));
    expect(h.toast).toHaveBeenCalledWith('Application sent.', 'success');
  });

  it('stays quiet about the notice when it went through', async () => {
    render(<JobsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'apply to Gaffer wanted' }));

    await waitFor(() => expect(h.notify).toHaveBeenCalledWith('poster-1', expect.objectContaining({ type: 'application' }), 'applicant-1'));
    expect(h.toast).toHaveBeenCalledTimes(1);
  });
});
