// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  toast: vi.fn(),
  notify: vi.fn(),
  applyToJob: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'job-1' }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: h.toast }) }));
vi.mock('@/lib/os', () => ({ awaitOSUser: () => Promise.resolve({ id: 'applicant-1' }) }));
vi.mock('@/lib/supabase/notifications', () => ({ notify: h.notify }));
vi.mock('@/lib/supabase/jobs', () => ({
  applyToJob: h.applyToJob,
  hasApplied: () => Promise.resolve(false),
  listApplications: () => Promise.resolve([]),
  respondToApplication: vi.fn(),
  getJob: () => Promise.resolve({
    id: 'job-1', title: 'Gaffer wanted', role: 'Gaffer', status: 'open', created_by: 'poster-1',
    created_at: '2026-11-01T00:00:00Z', description: 'Night shoot', project_id: null, projects: null, profiles: { username: 'sam' },
  }),
}));

import JobDetailPage from './page';

beforeEach(() => {
  h.toast.mockReset();
  h.notify.mockReset().mockResolvedValue(null);
  h.applyToJob.mockReset().mockResolvedValue('sent');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const apply = async () => {
  render(<JobDetailPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'APPLY' }));
};

describe('applying to a job', () => {
  it('tells the poster, and says nothing more when that works', async () => {
    await apply();
    await waitFor(() => expect(h.notify).toHaveBeenCalledWith('poster-1', expect.objectContaining({ type: 'application' }), 'applicant-1'));
    expect(h.toast).not.toHaveBeenCalled();
  });

  it('says so when the application was sent but the poster could not be told', async () => {
    h.notify.mockResolvedValue('permission denied for table notifications');
    await apply();
    await waitFor(() => expect(h.toast).toHaveBeenCalledWith('Application sent, but the poster wasn’t notified: permission denied for table notifications', 'error'));
    // The application itself still counts as done.
    expect(screen.getByText('APPLICATION SUBMITTED')).toBeTruthy();
  });
});
