'use client';

import { useEffect, useState } from 'react';

/**
 * What the phone is doing right now: whether this is a phone layout at all, which way it is held, and how much of the screen the
 * keyboard covers. iOS does not shrink the layout viewport for the keyboard; only `visualViewport` tells. A phone layout is a
 * narrow window, or a touch screen that is short (a phone held sideways, 393 pt high on an iPhone 15 Pro).
 */
export interface PhoneState {
  /** Use the phone layout (bottom sheets, a slim bar, big targets) instead of the desk layout. */
  phone: boolean;
  /** Wider than tall: the phone is held sideways. */
  landscape: boolean;
  /** Pixels of the screen the keyboard (or any browser chrome) covers at the bottom. */
  keyboard: number;
  /** The keyboard is up. */
  typing: boolean;
  /** Height of what is actually visible, in px. */
  height: number;
  /** How far the visible part has scrolled down inside the page (iOS scrolls it when the keyboard opens). */
  offset: number;
}

export const PHONE_QUERY = '(max-width: 820px), (pointer: coarse) and (max-height: 500px)';
const KEYBOARD_MIN = 120;

/** Pure: the numbers a `visualViewport` and a window give, as a PhoneState (tested without a browser). */
export function phoneState(inner: { width: number; height: number }, visual: { height: number; offsetTop: number } | null, matchesPhone: boolean): PhoneState {
  const height = visual ? visual.height : inner.height;
  const covered = visual ? Math.max(0, inner.height - visual.height - visual.offsetTop) : 0;
  return { phone: matchesPhone, landscape: inner.width > inner.height, keyboard: covered, typing: matchesPhone && covered > KEYBOARD_MIN, height, offset: visual ? visual.offsetTop : 0 };
}

const SERVER: PhoneState = { phone: false, landscape: false, keyboard: 0, typing: false, height: 0, offset: 0 };

export function usePhoneLayout(): PhoneState {
  const [state, setState] = useState<PhoneState>(SERVER);
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const vv = window.visualViewport;
    const read = () => setState((prev) => {
      const next = phoneState({ width: window.innerWidth, height: window.innerHeight }, vv ? { height: vv.height, offsetTop: vv.offsetTop } : null, mq.matches);
      return prev.phone === next.phone && prev.landscape === next.landscape && prev.keyboard === next.keyboard && prev.height === next.height && prev.offset === next.offset ? prev : next;
    });
    read();
    mq.addEventListener?.('change', read);
    vv?.addEventListener('resize', read);
    vv?.addEventListener('scroll', read);
    window.addEventListener('orientationchange', read);
    window.addEventListener('resize', read);
    return () => {
      mq.removeEventListener?.('change', read);
      vv?.removeEventListener('resize', read);
      vv?.removeEventListener('scroll', read);
      window.removeEventListener('orientationchange', read);
      window.removeEventListener('resize', read);
    };
  }, []);
  return state;
}

const KEYBOARD_GONE = 60;

/** The bottom bar's step-aside for the keyboard: at rest, rising with a fresh focus, or confirmed up. */
export type BarAside = 'off' | 'rising' | 'up';

/**
 * Pure: the step-aside as a small state machine, shared by the pill, the island (through `data-typing`) and the
 * rooms that resize around the keyboard. Focus leads: the moment a field takes focus the bar steps aside
 * ('rising'), before the keyboard has moved — measuring the covered height alone made the bar ride up with the
 * keyboard's rise and only drop once the rise passed 120 px, the drag-then-fall the owner filmed (Nov 26, 2026).
 * The measurement confirms ('up' past a keyboard's height) and releases: once the keyboard has mostly gone
 * (under 60 px) the bar returns even if the field keeps focus, and blur always releases. Browser chrome growing
 * and shrinking while the page scrolls can never flip it: without focus it is always 'off'.
 */
export function barAside(prev: BarAside, covered: number, editableFocused: boolean): BarAside {
  if (!editableFocused) return 'off';
  // Focus with the keyboard already measured up (a fast rise, a field tapped while it was up) lands in 'up'.
  if (prev === 'off') return covered > KEYBOARD_MIN ? 'up' : 'rising';
  if (prev === 'rising') return covered > KEYBOARD_MIN ? 'up' : 'rising';
  return covered > KEYBOARD_GONE ? 'up' : 'off';
}
