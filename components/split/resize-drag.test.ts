import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// Dragging the split's divider committed every pointer move to React state — which re-rendered
// both framed pages per move and rewrote the address bar and local storage with each one, until
// the page died under the drag on the phone and at a desk alike (the owner, Nov 26, 2026). The
// drag now only paints the wrap's grid directly and commits the ratio once, when it ends. These
// pins keep the storm from coming back.
const page = readFileSync(join(process.cwd(), 'app', '(suite)', 'split', 'page.tsx'), 'utf8');

describe('the split divider drag', () => {
  it('a move paints the grid and never commits', () => {
    expect(page).not.toContain('update({ ratio: ratioAt(e.clientX, e.clientY) })');
    expect(page).toContain('wrap.style.gridTemplateColumns');
    expect(page).toContain('wrap.style.gridTemplateRows');
    expect(page).toContain('dragRatio.current = r;');
  });

  it('the ratio is committed once, when the drag ends', () => {
    expect(page).toContain('update({ ratio: dragRatio.current })');
    expect(page).toContain('onPointerUp=');
    expect(page).toContain('onPointerCancel={() => finishDrag()}');
  });

  it('the separator keeps the person informed while it moves', () => {
    expect(page).toContain("setAttribute('aria-valuenow'");
  });
});
