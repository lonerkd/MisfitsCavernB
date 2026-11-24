/**
 * One shared lock for "the page behind a dialog does not scroll".
 *
 * Several surfaces (the studio modal, the phone menu sheet, Capture, the board slideshow) each used to save
 * `body.style.overflow`, set it to `hidden` and restore the saved value on close. When two overlapped, the second one
 * saved `hidden` and put it back after the first had closed, leaving the whole page unable to scroll. A count fixes
 * that: the page is locked while any holder is open and restored once, when the last one lets go.
 */
let holders = 0;
let saved = '';

/** Lock page scrolling; returns the release function (safe to call twice). */
export function lockScroll(): () => void {
  if (typeof document === 'undefined') return () => {};
  if (holders === 0) {
    saved = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  holders += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders = Math.max(0, holders - 1);
    if (holders === 0) document.body.style.overflow = saved;
  };
}
