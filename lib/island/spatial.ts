// Spatial navigation under Caps Lock: the arrows move the page's focus, not
// just the caret. When the deck is open, ArrowLeft/Right/Up/Down find the
// nearest focusable thing in that direction and focus it — so the whole suite
// can be worked without a mouse, not only the script.
//
// Text fields keep their own arrows (the caret, or the script's Caps Lock
// selection — lib/scriptos/selection), so this runs everywhere else.

/** A focusable element's box, with the element itself. */
interface Box { el: HTMLElement; left: number; top: number; right: number; bottom: number; cx: number; cy: number }

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"], summary';

/** Every focusable element in the document, in DOM order. */
function focusables(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE))
    .filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');
}

function boxOf(el: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  return { el, left: r.left, top: r.top, right: r.right, bottom: r.bottom, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
}

/**
 * The best element to move to from `from` in `dir`, or null.
 *
 * "Best" is the nearest one that is genuinely in that direction and roughly
 * aligned with the current element (so ArrowRight doesn't jump to a button far
 * above the one you are on). Distance is measured from the near edge, with a
 * penalty for being off-axis.
 */
export function spatialMove(from: HTMLElement, dir: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'): HTMLElement | null {
  const a = boxOf(from);
  const candidates = focusables().filter((el) => el !== from);
  let best: { el: HTMLElement; score: number } | null = null;

  for (const el of candidates) {
    const b = boxOf(el);
    // Is it in the direction? (with a small tolerance so a same-row neighbour counts)
    const TOL = 4;
    if (dir === 'ArrowRight' && b.left < a.right - TOL) continue;
    if (dir === 'ArrowLeft' && b.right > a.left + TOL) continue;
    if (dir === 'ArrowDown' && b.top < a.bottom - TOL) continue;
    if (dir === 'ArrowUp' && b.bottom > a.top + TOL) continue;

    // Alignment: how far off the axis (vertical for left/right, horizontal for up/down)
    const offAxis = dir === 'ArrowRight' || dir === 'ArrowLeft'
      ? Math.abs(b.cy - a.cy)
      : Math.abs(b.cx - a.cx);
    // Distance along the axis: the gap between the boxes
    const along = dir === 'ArrowRight' ? b.left - a.right
      : dir === 'ArrowLeft' ? a.left - b.right
      : dir === 'ArrowDown' ? b.top - a.bottom
      : a.top - b.bottom;
    if (along < 0) continue;

    // A heavy penalty for being far off-axis, so the nearest aligned thing wins.
    const score = along + offAxis * 2.5;
    if (!best || score < best.score) best = { el, score };
  }
  return best?.el ?? null;
}

/** Whether an element is a text field (its arrows are the caret's, not focus's). */
export function isTextField(el: HTMLElement | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') return !['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'file', 'color'].includes((el as HTMLInputElement).type);
  if (tag === 'SELECT') return false;
  return !!el.isContentEditable;
}

/**
 * Move the focus under Caps Lock. Returns true when the move was made (the
 * caller should preventDefault), false when the page should keep its own arrows.
 */
export function capsArrowNav(from: HTMLElement | null, dir: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'): boolean {
  if (isTextField(from)) return false;
  const target = spatialMove(from ?? document.body, dir);
  if (!target) return false;
  target.focus({ preventScroll: false });
  target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  return true;
}
