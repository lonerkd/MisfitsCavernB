'use client';

import { useEffect } from 'react';
import { usePhoneLayout } from '@/lib/os/usePhone';

/** Is this a thing you type into? */
export const isTypable = (el: Element | null): boolean => {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  return el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image'].includes(el.type);
};

/**
 * Pure: how far to scroll so a field is clear of the keyboard and the top edge. The visible area is [top, top + height]; a field
 * above or below it (or too close to either edge) is brought to the middle of it. 0 when it is already comfortably in view.
 */
export function scrollToReveal(field: { top: number; bottom: number }, visible: { top: number; height: number }, margin = 16): number {
  const lo = visible.top + margin, hi = visible.top + visible.height - margin;
  if (field.top >= lo && field.bottom <= hi) return 0;
  const mid = visible.top + visible.height / 2;
  return Math.round((field.top + field.bottom) / 2 - mid);
}

/**
 * Makes every page keyboard-safe on a phone. iOS never shrinks the layout viewport for the keyboard, so a field near the bottom
 * ends up under it and the page cannot scroll far enough. While the keyboard is up this (1) marks the page (`html[data-typing]`,
 * which the island and tab bar read) and publishes its height as `--kb`, which the page's scroll area uses as bottom padding
 * (globals.css), and (2) scrolls a field you tap into the middle of what is visible once the keyboard has finished rising.
 */
export function PhoneKeyboard() {
  const phone = usePhoneLayout();

  useEffect(() => {
    const root = document.documentElement;
    if (phone.typing) root.setAttribute('data-typing', 'true'); else root.removeAttribute('data-typing');
    root.style.setProperty('--kb', phone.typing ? `${phone.keyboard}px` : '0px');
    return () => { root.removeAttribute('data-typing'); root.style.removeProperty('--kb'); };
  }, [phone.typing, phone.keyboard]);

  useEffect(() => {
    if (!phone.phone) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reveal = () => {
      const el = document.activeElement;
      if (!isTypable(el)) return;
      const vv = window.visualViewport;
      const r = (el as HTMLElement).getBoundingClientRect();
      // Rects are in layout-viewport coordinates; the visible area starts at the visual viewport's offset.
      const by = scrollToReveal({ top: r.top, bottom: r.bottom }, { top: vv?.offsetTop ?? 0, height: vv?.height ?? window.innerHeight });
      if (by !== 0) window.scrollBy({ top: by, behavior: 'smooth' });
      // Pages that scroll inside a container: bring the field to the middle of that.
      else if (r.bottom > (vv?.height ?? window.innerHeight)) (el as HTMLElement).scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    const onFocus = (e: FocusEvent) => { if (!isTypable(e.target as Element)) return; clearTimeout(timer); timer = setTimeout(reveal, 350); };
    document.addEventListener('focusin', onFocus);
    // The keyboard finishing its rise (or a rotation while typing) re-checks the field.
    const vv = window.visualViewport;
    const onResize = () => { clearTimeout(timer); timer = setTimeout(reveal, 150); };
    vv?.addEventListener('resize', onResize);
    return () => { document.removeEventListener('focusin', onFocus); vv?.removeEventListener('resize', onResize); clearTimeout(timer); };
  }, [phone.phone]);

  return null;
}
