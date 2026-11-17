'use client';

import { useEffect } from 'react';

/** Scroll to the element a URL's `#hash` names and put focus in its first field. The browser does this by itself on a plain page, but a page
    that draws its sections after its data arrives has no such element at load, so the link (`/projects/<id>#brief`, the toolkit's Budget,
    a milestone's "Set a budget") landed at the top of a 5,000 px page. Returns whether the element was found. */
export function scrollToHash(doc: Pick<Document, 'getElementById'>, hash: string): boolean {
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  if (!id) return false;
  const el = doc.getElementById(id) as HTMLElement | null;
  if (!el) return false;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  el.querySelector<HTMLElement>('textarea, input, button')?.focus({ preventScroll: true });
  return true;
}

/** Once `ready`, scroll to the address's hash, waiting up to `waitMs` for a section that draws late, and keeping the section in place
    for `settleMs` while content above it finishes drawing (it pushes the target down after the first scroll), unless the person
    scrolls or touches the page first. Again whenever the hash changes. */
export function useScrollToHash(ready: boolean, waitMs = 4000, settleMs = 2500) {
  useEffect(() => {
    if (!ready) return;
    let stop: (() => void) | null = null;
    const go = () => {
      stop?.();
      const hash = window.location.hash;
      if (!hash) return;
      let found = scrollToHash(document, hash);
      let touched = false;
      const mark = () => { touched = true; };
      const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
      events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
      const id = decodeURIComponent(hash.replace(/^#/, ''));
      const obs = new MutationObserver(() => {
        if (touched) return;
        if (!found) { found = scrollToHash(document, hash); return; }
        const el = document.getElementById(id);
        if (el && Math.abs(el.getBoundingClientRect().top) > 8) el.scrollIntoView({ block: 'start' });
      });
      obs.observe(document.body, { childList: true, subtree: true });
      const timer = setTimeout(() => stop?.(), found ? settleMs : waitMs + settleMs);
      stop = () => { obs.disconnect(); clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, mark)); stop = null; };
    };
    go();
    window.addEventListener('hashchange', go);
    return () => { window.removeEventListener('hashchange', go); stop?.(); };
  }, [ready, waitMs, settleMs]);
}
