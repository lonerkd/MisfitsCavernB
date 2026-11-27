// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

type N = { id: string; read: boolean; title: string; body: string; created_at: string; type: string; link: string | null };
const feed = vi.hoisted(() => ({ items: [] as unknown[] }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/community' }));
vi.mock('@/lib/os', () => ({ awaitOSUser: () => Promise.resolve({ id: 'u1' }) }));
vi.mock('@/lib/supabase/client', () => {
  const channel = { on: () => channel, subscribe: () => channel };
  return { supabase: { channel: () => channel, removeChannel: () => {} } };
});
vi.mock('@/lib/supabase/notifications', () => ({
  fetchNotifications: () => Promise.resolve(feed.items), markRead: vi.fn(), markAllRead: vi.fn(), deleteNotification: vi.fn(), typeEnabled: () => true,
}));
import NotificationBell from './NotificationBell';

// The bell now asks which island surface it sits on (its panel fits a phone differently); jsdom has no
// matchMedia, so give it the desktop answer — these tests are about the badge's name, not the panel's fit.
window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false, onchange: null })) as unknown as typeof window.matchMedia;

const note = (i: number, read = false): N => ({ id: `n${i}`, read, title: 't', body: 'b', created_at: new Date().toISOString(), type: 'x', link: null });
afterEach(cleanup);

// WCAG 2.5.3 Label in Name: the badge's visible number is part of the button's accessible name.
describe('the bell names its badge', () => {
  it('has the plain name when nothing is unread', async () => {
    feed.items = [note(1, true)];
    render(<NotificationBell />);
    expect(await screen.findByRole('button', { name: 'Notifications' })).toBeTruthy();
  });
  it('carries the number the badge shows in its accessible name', async () => {
    feed.items = [note(1), note(2), note(3)];
    render(<NotificationBell />);
    const b = await screen.findByRole('button', { name: 'Notifications, 3 unread' });
    expect(b.textContent).toContain('3');
  });
  it('says 9+ when the badge says 9+', async () => {
    feed.items = Array.from({ length: 12 }, (_, i) => note(i));
    render(<NotificationBell />);
    const b = await screen.findByRole('button', { name: 'Notifications, 9+ unread' });
    expect(b.textContent).toContain('9+');
  });
});

describe('the bell is honest about a held push', () => {
  it('says a notification was held for quiet hours once the panel is open', async () => {
    feed.items = [{ ...note(1), push_skipped: 'quiet-hours' }, note(2)];
    render(<NotificationBell />);
    fireEvent.click(await screen.findByRole('button', { name: /^Notifications/ }));
    const lines = await screen.findAllByTestId('delivery-note');
    expect(lines).toHaveLength(1);
    expect(lines[0].textContent).toMatch(/quiet hours/);
  });
});
