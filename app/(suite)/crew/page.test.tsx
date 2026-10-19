// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// The data layer and the OS store are the page's boundaries; everything between
// them (useLoad, the mode switch, the mapping, the cards) runs for real.
const h = vi.hoisted(() => ({
  activeProject: null as { id: string; title: string } | null,
  listDirectory: vi.fn(),
  getProjectCrew: vi.fn(),
}));

vi.mock('@/lib/os', () => ({
  useProject: () => ({ activeProject: h.activeProject }),
  awaitOSUser: () => Promise.resolve({ id: 'viewer-1' }),
}));
vi.mock('@/lib/hooks/usePresence', () => ({ useOnlinePresence: () => new Set<string>(['p1']) }));
vi.mock('@/lib/supabase/profiles', () => ({ listDirectory: h.listDirectory }));
vi.mock('@/lib/supabase/crew-management', () => ({ getProjectCrew: h.getProjectCrew }));
vi.mock('@/components/crafts/CraftPicker', () => ({
  CraftPicker: ({ onChange }: { onChange: (c: string | null) => void }) => (
    <button type="button" onClick={() => onChange('Editor')}>pick craft</button>
  ),
}));

import CrewPage from './page';

const profile = (over: Record<string, unknown> = {}) => ({
  id: 'p1', username: 'Ada', avatar_url: null, role: 'Editor', status: 'OPEN',
  bio: 'Cuts fast.', location: 'Calgary', discord_username: 'ada#1', ...over,
});
const member = (over: Record<string, unknown> = {}) => ({
  id: 'm1', user_id: 'u1', username: 'Bo', avatar_url: null, role: 'Gaffer', status: 'confirmed', ...over,
});

beforeEach(() => {
  h.activeProject = null;
  h.listDirectory.mockReset().mockResolvedValue([profile()]);
  h.getProjectCrew.mockReset().mockResolvedValue([]);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('CrewPage', () => {
  it('global mode maps a profile to a card and passes filters to listDirectory', async () => {
    render(<CrewPage />);
    expect(await screen.findByText('Ada')).toBeTruthy();
    expect(screen.getByText('EDITOR')).toBeTruthy();
    expect(screen.getByText('OPEN')).toBeTruthy();
    expect(screen.getByText('Cuts fast.')).toBeTruthy();
    expect(screen.getByText('Calgary')).toBeTruthy();
    expect(screen.getByText(/Discord: ada#1/)).toBeTruthy();
    expect(screen.getByTitle('Online now')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe('/crew/p1');
    expect(h.listDirectory).toHaveBeenLastCalledWith({ search: '', role: 'All', availability: 'all' });
    expect(h.getProjectCrew).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'BUSY' }));
    fireEvent.click(screen.getByRole('button', { name: 'pick craft' }));
    await waitFor(() =>
      expect(h.listDirectory).toHaveBeenLastCalledWith({ search: '', role: 'Editor', availability: 'BUSY' }));
  });

  it('debounces the search text before querying', async () => {
    render(<CrewPage />);
    await screen.findByText('Ada');
    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText('Search crew'), { target: { value: 'ada' } });
    expect(h.listDirectory).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(300); });
    expect(h.listDirectory).toHaveBeenLastCalledWith({ search: 'ada', role: 'All', availability: 'all' });
  });

  it("project mode loads the active project's crew and maps members", async () => {
    h.activeProject = { id: 'proj-9', title: 'Night Shift' };
    h.getProjectCrew.mockResolvedValue([
      member(),
      member({ id: 'm2', user_id: null, username: null, role: 'Grip', status: 'invited' }),
    ]);
    render(<CrewPage />);
    await screen.findByText('Ada'); // starts on ALL TALENT
    fireEvent.click(screen.getByRole('button', { name: 'NIGHT SHIFT CREW' }));

    expect(await screen.findByText('Bo')).toBeTruthy();
    expect(h.getProjectCrew).toHaveBeenCalledWith('proj-9');
    expect(screen.getByText('GAFFER')).toBeTruthy();
    expect(screen.getByText('CONFIRMED')).toBeTruthy();
    expect(screen.getByText('INVITED')).toBeTruthy();
    expect(screen.getByText('Unknown')).toBeTruthy(); // no username
    expect(screen.queryByLabelText('Search crew')).toBeNull(); // directory filters hidden
    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href'));
    expect(hrefs).toEqual(['/crew/u1', '/crew/']);
  });

  it('shows the error and retries when getProjectCrew fails', async () => {
    h.activeProject = { id: 'proj-9', title: 'Night Shift' };
    h.getProjectCrew.mockRejectedValueOnce(new Error('boom'));
    render(<CrewPage />);
    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: 'NIGHT SHIFT CREW' }));

    expect(await screen.findByText("Couldn't load this project's crew")).toBeTruthy();
    expect(screen.getByText('boom')).toBeTruthy();
    expect(console.error).toHaveBeenCalled();

    h.getProjectCrew.mockResolvedValueOnce([member()]);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Bo')).toBeTruthy();
  });

  it('falls back to a default message when the directory error has none', async () => {
    h.listDirectory.mockRejectedValueOnce({});
    render(<CrewPage />);
    expect(await screen.findByText("Couldn't load the crew directory")).toBeTruthy();
    expect(screen.getByText('Failed to load crew directory')).toBeTruthy();
  });

  it('global empty state offers Clear filters only when a filter is set', async () => {
    h.listDirectory.mockResolvedValue([]);
    render(<CrewPage />);
    expect(await screen.findByText('No crew members found')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'OPEN' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Clear filters' }));
    await waitFor(() =>
      expect(h.listDirectory).toHaveBeenLastCalledWith({ search: '', role: 'All', availability: 'all' }));
  });

  it('project empty state points to Studio and Jobs', async () => {
    h.activeProject = { id: 'proj-9', title: 'Night Shift' };
    render(<CrewPage />);
    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('button', { name: 'NIGHT SHIFT CREW' }));

    expect(await screen.findByText('No crew on this project yet')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Recruit in Studio' }).getAttribute('href')).toBe('/studio?tab=production&view=crew');
    expect(screen.getByRole('link', { name: 'Post a role' }).getAttribute('href')).toBe('/jobs');
  });
});
