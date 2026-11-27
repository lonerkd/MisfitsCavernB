// @vitest-environment jsdom
import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';

const hub = vi.hoisted(() => ({ unread: 0 }));
vi.mock('@/components/hub/useHubUnread', () => ({ useHubUnread: () => hub.unread }));
const people = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock('@/lib/supabase/profiles', () => ({ findPeopleByName: (...a: unknown[]) => people.find(...a) }));

import { ChannelRail } from '@/components/lounge/ChannelRail';
import { LoungeWelcome, PaneEmptyState, WELCOME_KEY } from '@/components/lounge/LoungeEmpty';
import type { Lounge } from '@/components/lounge/useLounge';

const css = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8');

const ch = (id: string, o: Partial<Record<string, unknown>> = {}) => ({ id, project_id: null, name: id, type: 'text', audience: 'users', topic: null, position: 0, is_private: false, post_policy: 'viewers', created_by: null, created_at: '', ...o });

function lounge(o: Record<string, unknown> = {}): Lounge {
  return {
    activeProject: { id: 'p1', title: 'Night Shift', creator_id: 'u1' },
    channels: [ch('crew', { project_id: 'p1', audience: 'team' }), ch('rooms', { project_id: 'p1', type: 'voice', audience: 'team' }), ch('news', { post_policy: 'managers' }), ch('general')],
    activeChannel: null, dmTarget: null, setShowNewChannel: vi.fn(), isAdmin: false, currentUser: { id: 'u1' }, myProfile: { username: 'Sam' },
    openChannel: vi.fn(), openDM: vi.fn(), ownsActive: false, suggested: [], addPreset: vi.fn(), unreadOf: () => 0, unreadFrom: () => 0,
    dmPeople: [], onlineIds: new Set<string>(), unreadPeopleTotal: 0, toast: vi.fn(),
    ...o,
  } as unknown as Lounge;
}

beforeEach(() => { cleanup(); hub.unread = 0; people.find.mockReset(); try { localStorage.clear(); } catch { /* none */ } });

describe('the rail: three areas', () => {
  it('shows Productions, Community and People in order, with the hub link pinned above them', () => {
    const { container } = render(<ChannelRail l={lounge()} />);
    const hubLink = screen.getByRole('link', { name: /Learn \/ What.s new/ });
    expect(hubLink.getAttribute('href')).toBe('/#updates');
    const sections = [...container.querySelectorAll('section.mc-lounge-section')].map((s) => s.getAttribute('data-area'));
    expect(sections).toEqual(['productions', 'community', 'people']);
    // the link comes before the first area in the document
    expect(hubLink.compareDocumentPosition(container.querySelector('section')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('puts the production’s text channels before its voice room, and marks announce-only channels', () => {
    render(<ChannelRail l={lounge()} />);
    const prod = document.querySelector('[data-area="productions"]')!;
    const names = [...prod.querySelectorAll('button.mc-lounge-row')].map((b) => b.getAttribute('aria-label'));
    expect(names[0]).toBe('crew');
    expect(names[1]).toMatch(/^rooms, voice room/);
    expect(screen.getByRole('button', { name: /^news, announcements, only managers post/ })).toBeTruthy();
  });

  it('counts what is unread on each row and in each area, and in the hub link', () => {
    hub.unread = 3;
    render(<ChannelRail l={lounge({ unreadOf: (id: string) => (id === 'crew' ? 4 : id === 'general' ? 2 : 0), unreadFrom: () => 1, unreadPeopleTotal: 1, dmPeople: [{ id: 'u2', name: 'Jordan' }] })} />);
    expect(screen.getByRole('button', { name: 'crew, 4 unread' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Productions, 4 unread' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Community, 2 unread' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'People, 1 unread' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Jordan, 1 unread' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Learn \/ What’s new.*3 unread/ })).toBeTruthy();
  });

  it('collapses an area, keeps it that way on this device, and still shows its unread count', () => {
    const l = lounge({ unreadOf: (id: string) => (id === 'general' ? 2 : 0) });
    render(<ChannelRail l={l} />);
    const head = screen.getByRole('button', { name: 'Community, 2 unread' });
    expect(head.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(head);
    expect(head.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById(head.getAttribute('aria-controls')!)!.hidden).toBe(true);
    cleanup();
    render(<ChannelRail l={l} />);
    expect(screen.getByRole('button', { name: 'Community, 2 unread' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('opens a channel from its row', () => {
    const l = lounge();
    render(<ChannelRail l={l} />);
    fireEvent.click(screen.getByRole('button', { name: 'general' }));
    expect(l.openChannel).toHaveBeenCalledWith(expect.objectContaining({ id: 'general' }));
  });

  it('with no active production, explains Productions and links to Projects', () => {
    render(<ChannelRail l={lounge({ activeProject: null, channels: [ch('general')] })} />);
    expect(screen.getByText(/Productions are your projects/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Go to Projects' }).getAttribute('href')).toBe('/projects');
  });

  it('with no direct messages, says so and finds someone to start one', async () => {
    people.find.mockResolvedValue([{ id: 'u2', username: 'Jordan' }, { id: 'u1', username: 'Sam' }]);
    const l = lounge();
    render(<ChannelRail l={l} />);
    expect(screen.getByText(/No direct messages yet/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Find someone to message'), { target: { value: 'jo' } });
    const row = await screen.findByRole('button', { name: 'Message Jordan' }, { timeout: 2000 });
    // yourself is not offered
    expect(screen.queryByRole('button', { name: 'Message Sam' })).toBeNull();
    await act(async () => { fireEvent.click(row); });
    expect(l.openDM).toHaveBeenCalledWith({ id: 'u2', name: 'Jordan' });
    await waitFor(() => expect((screen.getByLabelText('Find someone to message') as HTMLInputElement).value).toBe(''));
  });
});

describe('the Lounge’s empty states and welcome', () => {
  it('no conversation chosen: the three areas’ purposes and a link to Learn', () => {
    render(<PaneEmptyState l={lounge({ activeChannel: null, messages: [], canPost: false, canManageActive: false })} />);
    for (const a of ['Productions', 'Community', 'People']) expect(screen.getByText(a)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Open Learn/ }).getAttribute('href')).toBe('/#updates');
  });

  it('an empty channel says hello; a manager gets a real Manage button', () => {
    const setShowManage = vi.fn();
    render(<PaneEmptyState l={lounge({ activeChannel: ch('crew'), messages: [], canPost: true, canManageActive: true, setShowManage })} />);
    expect(screen.getByText('Nothing here yet. Say hello.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Manage #crew/ }));
    expect(setShowManage).toHaveBeenCalledWith(true);
  });

  it('an empty channel someone cannot post in says who does', () => {
    render(<PaneEmptyState l={lounge({ activeChannel: ch('news'), messages: [], canPost: false, canManageActive: false })} />);
    expect(screen.getByText(/Only whoever runs #news posts here/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Manage/ })).toBeNull();
  });

  it('shows the welcome once, and Got it hides it on this device', () => {
    const { unmount } = render(<LoungeWelcome />);
    expect(screen.getByRole('link', { name: 'What’s new' }).getAttribute('href')).toBe('/#updates');
    expect(screen.getByRole('link', { name: 'Learn' }).getAttribute('href')).toBe('/#updates');
    fireEvent.click(screen.getByRole('button', { name: /Got it/ }));
    expect(screen.queryByLabelText('Welcome to the Lounge')).toBeNull();
    expect(localStorage.getItem(WELCOME_KEY)).toBe('1');
    unmount();
    render(<LoungeWelcome />);
    expect(screen.queryByLabelText('Welcome to the Lounge')).toBeNull();
  });
});

describe('the Lounge on a phone (CSS)', () => {
  it('sits the rail beside the conversation only when the page says there is room, and hides the back button then', () => {
    expect(css).toMatch(/\.mc-lounge-body\[data-split='true'\]\[data-pane\] \.mc-lounge-chat \{ display: flex !important; \}/);
    expect(css).toMatch(/\.mc-lounge-body\[data-split='true'\]\[data-pane\] \.mc-lounge-channels \{ display: flex !important;/);
    expect(css).toMatch(/\.mc-lounge-body\[data-split='true'\] \.mc-lounge-back \{ display: none !important; \}/);
  });

  it('keeps the push: the list pane hides the conversation and the chat pane hides the rail', () => {
    expect(css).toMatch(/\.mc-lounge-body\[data-pane='list'\] \.mc-lounge-chat \{ display: none !important; \}/);
    expect(css).toMatch(/\.mc-lounge-body\[data-pane='chat'\] \.mc-lounge-channels,/);
  });

  it('gives every rail row and area header a 44 pt target on touch, and 16 px text in the finder', () => {
    expect(css).toMatch(/@media \(pointer: coarse\), \(max-width: 760px\) \{\s*\.mc-lounge-row, \.mc-lounge-sechead > button \{ min-height: 44px; \}/);
    expect(css).toMatch(/\.mc-lounge-channels input \{ font-size: 16px !important; \}/);
  });

  it('makes the thread panel a sheet inside the safe areas and the app rail', () => {
    expect(css).toMatch(/\.mc-lounge-thread-panel \{ left: max\(env\(safe-area-inset-left\), var\(--mc-rail\)\) !important; right: env\(safe-area-inset-right\) !important; width: auto !important;/);
  });
});
