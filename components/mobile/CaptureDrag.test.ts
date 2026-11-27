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
