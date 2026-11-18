// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

const phone = vi.hoisted(() => ({ typing: false }));

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('@/lib/os', () => ({
  useSession: () => ({ status: 'authed' }),
  useProject: () => ({ projects: [], activeProject: null, setActiveProject: () => {} }),
}));
vi.mock('@/lib/os/PillContext', () => ({ usePill: () => ({ activeDescriptor: null }) }));
vi.mock('@/lib/island/routes', () => ({ islandRoute: () => ({ title: 'Community', back: null }) }));
vi.mock('@/lib/island/onset', () => ({ ON_SET_HREF: '/onset' }));
vi.mock('@/lib/island/useOnSet', () => ({ useOnSet: () => null }));
vi.mock('@/lib/island/useIslandCondition', () => ({ useIslandCondition: () => ({ label: '', kind: 'ok' }) }));
vi.mock('@/lib/island/useIslandSurface', () => ({ useIslandSurface: () => 'pill' }));
vi.mock('@/lib/supabase/messages', () => ({ getLoungeUnread: () => Promise.resolve({ channels: {}, people: {} }) }));
vi.mock('@/lib/hooks/useSearchParam', () => ({ useLocationSearch: () => '' }));
vi.mock('@/lib/os/usePhone', () => ({ usePhoneLayout: () => ({ phone: true, landscape: false, keyboard: phone.typing ? 300 : 0, typing: phone.typing, height: 500, offset: 0 }) }));
vi.mock('./Capture', () => ({ CaptureSheet: () => null, fromShare: () => null, useOutbox: () => [] }));

import MobileTabBar from './MobileTabBar';

const bar = (c: HTMLElement) => c.querySelector('[data-mobile-tabbar]') as HTMLElement;

describe('MobileTabBar and the keyboard', () => {
  beforeEach(() => { cleanup(); phone.typing = false; });

  it('is shown, reachable and announced while the keyboard is down', () => {
    const { container } = render(<MobileTabBar />);
    const nav = bar(container);
    expect(nav.getAttribute('data-keyboard')).toBe('down');
    expect(nav.getAttribute('aria-hidden')).toBeNull();
    expect(nav.hasAttribute('inert')).toBe(false);
    expect(nav.className).not.toMatch(/hidden/);
  });

  it('steps aside while the keyboard is up: slid away, inert and hidden from screen readers', () => {
    phone.typing = true;
    const { container } = render(<MobileTabBar />);
    const nav = bar(container);
    expect(nav.getAttribute('data-keyboard')).toBe('up');
    expect(nav.getAttribute('aria-hidden')).toBe('true');
    expect(nav.hasAttribute('inert')).toBe(true);
    expect(nav.className).toMatch(/hidden/);
  });

  it('comes back when the keyboard closes', () => {
    phone.typing = true;
    const { container, rerender } = render(<MobileTabBar />);
    expect(bar(container).hasAttribute('inert')).toBe(true);
    phone.typing = false;
    rerender(<MobileTabBar />);
    const nav = bar(container);
    expect(nav.hasAttribute('inert')).toBe(false);
    expect(nav.getAttribute('aria-hidden')).toBeNull();
    expect(nav.className).not.toMatch(/hidden/);
  });
});
