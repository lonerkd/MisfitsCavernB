// @vitest-environment jsdom
import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

const phone = vi.hoisted(() => ({ typing: false }));
vi.mock('@/lib/os/usePhone', () => ({
  usePhoneLayout: () => ({ phone: true, landscape: false, keyboard: phone.typing ? 300 : 0, typing: phone.typing, height: 500, offset: 0 }),
}));

import { PhoneKeyboard } from '@/components/phone/PhoneKeyboard';
import { ThreadPanel } from '@/components/lounge/ThreadPanel';
import { MessageBubble } from '@/components/lounge/MessageParts';
import type { Lounge } from '@/components/lounge/useLounge';

const css = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8');
const root = document.documentElement;

const thread = {
  threadParent: { id: 'p', user: 'Sam', text: 'Hello', timestamp: new Date() },
  setThreadParent: () => {}, threadInput: '', setThreadInput: () => {}, currentUser: { id: 'u' }, threadReplies: [], handleThreadSend: () => {},
} as unknown as Lounge;

describe('the Lounge under the phone keyboard', () => {
  beforeEach(() => { cleanup(); phone.typing = false; root.removeAttribute('data-typing'); root.style.removeProperty('--kb'); });

  it('keyboard down: nothing is published, the panel is not lifted', () => {
    render(<PhoneKeyboard />);
    expect(root.hasAttribute('data-typing')).toBe(false);
    expect(root.style.getPropertyValue('--kb')).toBe('0px');
  });

  it('keyboard up: its height is published as --kb for the composer and the thread panel', () => {
    phone.typing = true;
    render(<PhoneKeyboard />);
    expect(root.getAttribute('data-typing')).toBe('true');
    expect(root.style.getPropertyValue('--kb')).toBe('300px');
  });

  it('the thread panel and its reply bar carry the classes the keyboard rules lift', () => {
    const { container } = render(<ThreadPanel l={thread} />);
    expect(container.querySelector('.mc-lounge-thread-panel')).not.toBeNull();
    expect(container.querySelector('.mc-lounge-thread-reply input')).not.toBeNull();
  });

  it('the CSS lifts the panel by --kb only while typing, and keeps the home indicator clear otherwise', () => {
    expect(css).toMatch(/html\[data-typing='true'\] \.mc-lounge-thread-panel \{ bottom: var\(--kb, 0px\) !important; \}/);
    expect(css).toMatch(/\.mc-lounge-thread-reply \{ padding-bottom: calc\(14px \+ env\(safe-area-inset-bottom\)\) !important; \}/);
    expect(css).toMatch(/html\[data-typing='true'\] \.mc-lounge-thread-reply \{ padding-bottom: 14px !important; \}/);
  });

  it('message actions are classed so a touch screen shows them and the picker stays on screen', () => {
    const msg = { id: 'm', user: 'Sam', text: 'hi', timestamp: new Date(), sender_id: 'u', mine: true, reactions: {} } as never;
    const { container } = render(<MessageBubble msg={msg} currentUserId="u" onReact={() => {}} onOpenThread={() => {}} onEdit={async () => true} />);
    expect(container.querySelectorAll('.mc-lounge-action').length).toBeGreaterThanOrEqual(3);
    expect(css).toMatch(/@media \(hover: none\) \{\s*\.mc-lounge-action \{ opacity: 1 !important; \}/);
    expect(css).toMatch(/\.mc-lounge-reactpicker \{[^}]*max-width: calc\(100vw - 32px\)/);
  });
});
