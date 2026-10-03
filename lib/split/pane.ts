'use client';

// Split screen: two surfaces of the suite side by side (app/split). Each
// pane is the real page in a same-origin frame, so everything works in it
// exactly as it does full-screen. Panes talk only through the split page
// (window.parent), which relays between them while they're linked — the
// script's caret can bring the Studio to the same scene, and the Studio can
// send the script to a scene.

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { DEFAULT_LAYOUT, companionOf, isSplitMessage, layoutToSearch, SPLIT_KEY, type SplitMessage } from './core';

export * from './core';

/** In a frame of this same site — i.e. a split-screen pane. */
export function inPane(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top && window.parent.location.origin === window.location.origin;
  } catch {
    return false; // framed by another site (the headers forbid it anyway)
  }
}

/**
 * Whether this page is in a pane. Known on the client's first render, so only
 * branch on it where both branches render the same server markup — e.g.
 * chrome that is client-only anyway.
 */
export function useInPane(): boolean {
  // Fixed for the page's life, so there's nothing to subscribe to.
  return useSyncExternalStore(noSubscribe, inPane, inPane);
}
const noSubscribe = () => () => {};

/** Open a split screen with `href` in the first pane and its natural companion beside it. */
export function splitHref(href: string): string {
  return `/split${layoutToSearch({ ...DEFAULT_LAYOUT, a: href, b: companionOf(href) })}`;
}

/** Tell the split page (and, through it, the other pane). False outside a split. */
export function postToSplit(msg: SplitMessage): boolean {
  if (!inPane()) return false;
  window.parent.postMessage({ [SPLIT_KEY]: true, ...msg }, window.location.origin);
  return true;
}

/** Messages relayed from the other pane. */
export function useSplitMessages(handler: (msg: SplitMessage) => void) {
  const ref = useRef(handler);
  useLayoutEffect(() => { ref.current = handler; });
  useEffect(() => {
    if (!inPane()) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      if (isSplitMessage(e.data)) ref.current(e.data);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
}
