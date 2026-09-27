'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { postToSplit, splitHref } from '@/lib/split/pane';

/**
 * In a pane: tell the split page where this pane is, so its bar can name it
 * and a reload restores it. Tabs and views change the URL with
 * history.replaceState, which fires no event, so the URL is also checked on
 * a short interval (panes only).
 */
export function PaneReporter() {
  useEffect(() => {
    let last = '';
    const report = () => {
      const href = window.location.pathname + window.location.search;
      if (href === last) return;
      last = href;
      postToSplit({ type: 'navigated', href, title: document.title });
    };
    report();
    const t = setInterval(report, 400);
    window.addEventListener('popstate', report);
    return () => { clearInterval(t); window.removeEventListener('popstate', report); };
  }, []);
  return null;
}

/** Ctrl+\ (⌘\ on a Mac) splits the screen: this page, and its companion beside it. */
export function SplitShortcut() {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '\\' || !(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      if (pathname === '/split' || pathname === '/auth' || /^\/(shared|p|s)\//.test(pathname)) return;
      e.preventDefault();
      router.push(splitHref(window.location.pathname + window.location.search));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, pathname]);
  return null;
}
