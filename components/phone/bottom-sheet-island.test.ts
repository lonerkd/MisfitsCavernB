import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// A modal sheet must clear the island as it stands, not as it rests (owner shot,
// Nov 27, 2026: the editor Tools sheet's track list trapped under the open deck).
// Pages keep reserving only the resting footprint — the deck opening must not
// reflow them — so the island publishes both numbers and the sheet takes the max.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const sheet = read('components/phone/BottomSheet.tsx');
const taskbar = read('components/shell/EcosystemTaskbar.tsx');

describe('the bottom sheet clears the island as it stands', () => {
  it('the sheet reserves the taller of the resting reserve and the current island height', () => {
    expect(sheet).toContain('max(var(--taskbar-height, 0px), var(--island-height, 0px) + 14px)');
  });

  it('the island publishes its current height, open deck included, from the measured rect', () => {
    expect(taskbar).toContain("root.style.setProperty('--island-height'");
    expect(taskbar).toContain('Math.ceil(rect.height)');
  });

  it('the resting reserve is untouched: pages still do not reflow when the deck opens', () => {
    expect(taskbar).toContain("root.style.setProperty('--taskbar-height', `${el.offsetHeight ? islandReserve(scale) : 0}px`)");
  });
});
