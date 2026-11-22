'use client';

import { useEffect, useRef } from 'react';

/**
 * One island popover at a time. Each menu that opens above the island (notifications, Sound, projects) calls this with its
 * own id: opening announces it on `window`, every other menu closes on hearing a different id, Escape and a press outside
 * close it, and Escape gives focus back to the button that opened it. No central state: a menu added later only calls this.
 */
const EVENT = 'mc-island-popover';

export function useIslandPopover<R extends HTMLElement = HTMLElement, B extends HTMLElement = HTMLButtonElement>(id: string, open: boolean, close: () => void) {
  const rootRef = useRef<R>(null);
  const buttonRef = useRef<B>(null);
  const closeRef = useRef(close);
  useEffect(() => { closeRef.current = close; });

  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
    const onOther = (e: Event) => { if ((e as CustomEvent<string>).detail !== id) closeRef.current(); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation(); // the menu closes; the island stays as it is
      closeRef.current();
      buttonRef.current?.focus();
    };
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) closeRef.current(); };
    window.addEventListener(EVENT, onOther);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener(EVENT, onOther);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open, id]);

  return { rootRef, buttonRef };
}
