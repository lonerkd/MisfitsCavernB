'use client';

import { useEffect, useRef, useState } from 'react';
import { PARENT, planBack, type BackPlan } from './back';

interface NavigationLike {
  entries(): { url: string | null }[];
  currentEntry: { index: number } | null;
  addEventListener(type: 'currententrychange', cb: () => void): void;
  removeEventListener(type: 'currententrychange', cb: () => void): void;
}

/** What the island's back chevron should do on this page (`planBack`); re-read whenever the page or the history changes. */
export function useBackPlan(pathname: string): BackPlan {
  const [plan, setPlan] = useState<BackPlan>(PARENT);
  const previous = useRef<string | null>(null);
  const current = useRef(pathname);

  useEffect(() => {
    if (current.current !== pathname) { previous.current = current.current; current.current = pathname; }
    const nav = (window as unknown as { navigation?: NavigationLike }).navigation;
    const read = () => {
      const index = nav?.currentEntry?.index ?? -1;
      setPlan(planBack({
        currentPath: window.location.pathname,
        entries: nav && index >= 0 ? nav.entries().map((e) => e.url) : null,
        index,
        origin: window.location.origin,
        previousPath: previous.current,
      }));
    };
    read();
    nav?.addEventListener('currententrychange', read);
    return () => nav?.removeEventListener('currententrychange', read);
  }, [pathname]);

  return plan;
}
