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
  // The suite's floating island steps aside while a phone is typing (CSS: html[data-typing]).
  useEffect(() => {
    const root = document.documentElement;
    if (state.typing) root.setAttribute('data-typing', 'true'); else root.removeAttribute('data-typing');
    return () => root.removeAttribute('data-typing');
  }, [state.typing]);
  return state;
}
