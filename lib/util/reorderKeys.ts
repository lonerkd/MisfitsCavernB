// Moving an item in a list with the keyboard: Alt + ↑/↓ (or ←/→) moves it one place;
// Alt + Home/End sends it to the start or end. Returns where it should go, or null
// when the key is not a move or the item cannot go that way.
export function moveTarget(key: string, alt: boolean, index: number, count: number): number | null {
  if (!alt || count < 2) return null;
  let to: number;
  if (key === 'ArrowUp' || key === 'ArrowLeft') to = index - 1;
  else if (key === 'ArrowDown' || key === 'ArrowRight') to = index + 1;
  else if (key === 'Home') to = 0;
  else if (key === 'End') to = count - 1;
  else return null;
  return to < 0 || to >= count || to === index ? null : to;
}

/**
 * After a list re-renders, focus the item now at `index` on the given surface. The list
 * changes a moment after the key press (the script is rewritten first) and may rebuild the
 * items, which drops focus, so keep putting it back for about a second. It stops as soon as
 * focus sits on something other than the list item or the page itself.
 */
export function focusMoved(surface: string, index: number): void {
  const until = Date.now() + 1000;
  const attempt = () => {
    const active = document.activeElement;
    const el = document.querySelector<HTMLElement>(`[data-reorder="${surface}"][data-index="${index}"]`);
    const moved = active && active !== document.body && !(active as HTMLElement).dataset?.reorder;
    if (moved) return;
    if (el && active !== el) el.focus();
    if (Date.now() < until) setTimeout(attempt, 50);
  };
  setTimeout(attempt, 20);
}
