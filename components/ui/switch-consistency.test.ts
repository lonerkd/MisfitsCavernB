import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// Every on/off in the suite is the disc (components/ui/DiscSwitch): the owner found pill switches sitting
// beside round ones in the editor's Tools panel and called it — "make em consistently the round ones,
// globally" (Nov 26, 2026). These pins keep the converts converted: the four places that drew their own
// switch (one pill, three hand-copied discs) now draw the Lamp, and the copies stay deleted.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

const sidePanels = read('components/editor/EditorSidePanels.tsx');
const breakdown = read('components/editor/breakdown/BreakdownPanel.tsx');
const phase = read('components/progress/PhasePanel.tsx');
const theme = read('components/ui/ThemePicker.tsx');
const breakdownCss = read('components/breakdown/breakdown.module.css');
const progressCss = read('components/progress/progress.module.css');
const themeCss = read('components/ui/themePicker.module.css');

describe('every switch is the disc', () => {
  it('the four converts draw the Lamp', () => {
    for (const src of [sidePanels, breakdown, phase, theme]) {
      expect(src).toContain("from '@/components/ui/DiscSwitch'");
      expect(src).toContain('<Lamp on={');
    }
  });

  it('the editor’s pill is gone', () => {
    expect(sidePanels).not.toContain('width: 44, height: 28');
    expect(sidePanels).not.toContain('borderRadius: 14, position: \'relative\'');
  });

  it('the hand-copied discs stay deleted', () => {
    expect(breakdown).not.toContain('b.track');
    expect(breakdownCss).not.toContain('.track {');
    expect(phase).not.toContain('switchTrack');
    expect(progressCss).not.toContain('.switchTrack');
    expect(theme).not.toContain('frostTrack');
    expect(themeCss).not.toContain('.frostTrack');
  });
});
