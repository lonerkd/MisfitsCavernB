'use client';

import { useEffect, useState } from 'react';
import { barAside, usePhoneLayout, type BarAside } from '@/lib/os/usePhone';

/** Is this a thing you type into? */
export const isTypable = (el: Element | null): boolean => {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  return el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image'].includes(el.type);
};

/** The nearest ancestor that scrolls vertically (a modal, the Lounge thread…), or null for the page itself. */
export function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p;
  }
  return null;
}

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
 * On a phone it also publishes `--vvh`: where the visible area actually ends, in layout-viewport coordinates (the visual
 * viewport's height plus its offset). Full-height rooms (the Lounge) are sized from it, so the room ends at the keyboard's top
 * edge however the browser reports the keyboard — overlaid on the layout viewport, or resizing it (an in-app webview, the
 * installed app), where a height derived from `100dvh` minus the covered amount can silently read as no keyboard at all.
 */
export function PhoneKeyboard() {
  const phone = usePhoneLayout();

  // Step-aside is led by focus, not by the measured keyboard (barAside): the covered height only exists once
  // the keyboard has risen, and waiting for it dragged the bottom bar up with the rise before it dropped
  // behind the keyboard — the drag-then-fall the owner filmed (Nov 26, 2026). The measurement still confirms
  // and releases through the same machine.
  const [aside, setAside] = useState<BarAside>('off');
  useEffect(() => {
    if (!phone.phone) return;
    const read = () => setAside((prev) => barAside(prev, phone.keyboard, isTypable(document.activeElement)));
    read();
    document.addEventListener('focusin', read);
    document.addEventListener('focusout', read);
    return () => { document.removeEventListener('focusin', read); document.removeEventListener('focusout', read); };
  }, [phone.phone, phone.keyboard]);

  useEffect(() => {
    const root = document.documentElement;
    const typing = aside !== 'off';
    if (typing) root.setAttribute('data-typing', 'true'); else root.removeAttribute('data-typing');
    root.style.setProperty('--kb', typing ? `${phone.keyboard}px` : '0px');
    if (phone.phone) root.style.setProperty('--vvh', `${phone.height + phone.offset}px`);
    else root.style.removeProperty('--vvh');
    return () => { root.removeAttribute('data-typing'); root.style.removeProperty('--kb'); root.style.removeProperty('--vvh'); };
  }, [aside, phone.keyboard, phone.phone, phone.height, phone.offset]);

  useEffect(() => {
    if (!phone.phone) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reveal = () => {
      const el = document.activeElement;
      if (!isTypable(el)) return;
      const vv = window.visualViewport;
      const r = (el as HTMLElement).getBoundingClientRect();
      // Rects are in layout-viewport coordinates; the visible area starts at the visual viewport's offset.
      // A tool strip riding above the keyboard takes room too: the field must clear it, not just the keyboard.
      const strip = document.querySelector('[role="toolbar"][aria-label="Writing tools"]');
      const stripH = strip ? strip.getBoundingClientRect().height : 0;
      const by = scrollToReveal({ top: r.top, bottom: r.bottom }, { top: vv?.offsetTop ?? 0, height: (vv?.height ?? window.innerHeight) - stripH });
      if (by === 0) return;
      // A field inside a scrolling container (a modal, a thread) scrolls that container; otherwise the page does.
      const box = scrollParent(el as HTMLElement);
      if (box) box.scrollBy({ top: by, behavior: 'smooth' }); else window.scrollBy({ top: by, behavior: 'smooth' });
    };
    const onFocus = (e: FocusEvent) => { if (!isTypable(e.target as Element)) return; clearTimeout(timer); timer = setTimeout(reveal, 350); };
    document.addEventListener('focusin', onFocus);
    // The keyboard finishing its rise (or a rotation while typing) re-checks the field — but only once the
    // visible height has settled: the rise fires a run of resizes, each reporting a different height, and
    // revealing against a moving target makes the page hunt up and down (worst in landscape, where the
    // visible strip is shortest — owner's report, Nov 26 2026).
    const vv = window.visualViewport;
    let settledH = -1;
    function armSettle() {
      const h = vv?.height ?? -1;
      if (h === settledH) { settledH = -1; reveal(); return; }
      settledH = h;
      timer = setTimeout(armSettle, 200);
    }
    const onResize = () => { clearTimeout(timer); settledH = vv?.height ?? -1; timer = setTimeout(armSettle, 200); };
    vv?.addEventListener('resize', onResize);
    return () => { document.removeEventListener('focusin', onFocus); vv?.removeEventListener('resize', onResize); clearTimeout(timer); };
  }, [phone.phone]);

  return null;
}
