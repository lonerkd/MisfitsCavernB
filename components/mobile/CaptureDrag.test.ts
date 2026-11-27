import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// The Capture sheet's grip used to be decoration: the sheet had no drag at all, and a sheet that will not
// move feels stuck (owner, Nov 26, 2026). It now carries the More sheet's pointer drag — these pins keep
// the wiring in place. The dismiss maths itself is covered by sheetDrag.test.ts.
const src = readFileSync(join(process.cwd(), 'components', 'mobile', 'Capture.tsx'), 'utf8');

describe('the Capture sheet drags', () => {
  it('decides dismissal with the shared sheet-drag maths', () => {
    expect(src).toContain("import { shouldDismiss } from './sheetDrag';");
    expect(src).toContain('shouldDismiss(Math.max(0, e.clientY - d.y), e.timeStamp - d.t)');
  });

  it('the grip and title form one drag zone, wired to the sheet', () => {
    expect(src).toContain('className={m.dragZone}');
    expect(src).toContain('data-testid="sheet-drag"');
    expect(src).toContain('ref={sheetRef}');
    expect(src).toContain('translateY(${pull(e)}px)');
  });
});

describe('the Capture sheet leaves the way it should', () => {
  // The sheet used to unmount on the spot: only a drag-close moved, because the finger carried it
  // down first, while the X, the scrim and Escape cut instantly (owner, Nov 26, 2026). Now every
  // close path takes the one animated close — these pins keep them all on it.
  it('every dismissal goes through the one close path', () => {
    expect(src).toContain('useOverlayLayer(true, requestClose)');
    expect(src).toContain("if (e.key === 'Escape') requestClose()");
    expect(src).toContain('{ requestClose(); return; }');
    expect(src).toContain('onClick={requestClose}');
  });

  it('the close slides the sheet down, then the host unmounts it', () => {
    expect(src).toContain("sheet.style.transform = 'translateY(105%)'");
    expect(src).toContain('window.setTimeout(onClose, reduce ? 0 : 240)');
    expect(src).toContain("window.matchMedia('(prefers-reduced-motion: reduce)')");
  });

  it('the scrim fades with the sheet', () => {
    expect(src).toContain('ref={scrimRef}');
    expect(src).toContain("scrim.style.opacity = '0'");
  });
});
