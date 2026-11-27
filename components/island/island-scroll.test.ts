import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// The island's strip on a phone wrapped to two rows to fit — and a second row is screen the page
// never gets back (the owner's call, Nov 26, 2026: pinned ends, a scrollable middle). The strip
// now stays one row and scrolls sideways everywhere the deck-fit rules used to wrap it: the
// compact surface and the sideways phone. These pins keep the scroll in place, and keep the
// split-screen button the device's choice beside it.
const css = readFileSync(join(process.cwd(), 'components', 'island', 'island.module.css'), 'utf8');
const taskbar = readFileSync(join(process.cwd(), 'components', 'shell', 'EcosystemTaskbar.tsx'), 'utf8');
const settings = readFileSync(join(process.cwd(), 'app', '(suite)', 'settings', 'page.tsx'), 'utf8');

describe('the island strip scrolls instead of wrapping', () => {
  it('the compact strip is one scrollable row', () => {
    expect(css).toContain(".dock[data-compact='true'] .nav { flex-wrap: nowrap; justify-content: flex-start; overflow-x: auto;");
    expect(css).toContain(".dock[data-compact='true'] .nav::-webkit-scrollbar { display: none; }");
  });

  it('the landscape strip is one scrollable row too', () => {
    expect(css).toContain('.dock .nav { flex-wrap: nowrap; justify-content: flex-start; overflow-x: auto;');
    expect(css).toContain('.dock .nav::-webkit-scrollbar { display: none; }');
  });

  it('no rule wraps the strip anymore', () => {
    expect(css).not.toMatch(/\.nav \{[^}]*flex-wrap: wrap/);
  });

  it('the current app is centred in the strip when the route changes', () => {
    expect(taskbar).toContain("nav.querySelector('[aria-current=\"page\"]')");
  });
});

describe('the split-screen button is a choice', () => {
  it('the deck shows it only when the device’s choice says so', () => {
    expect(taskbar).toContain('splitButtonVisible(splitPref, compact)');
    expect(taskbar).toContain('{splitShown && (');
  });

  it('Settings carries the switch', () => {
    expect(settings).toContain('label="Split screen button"');
    expect(settings).toContain('writeSplitButtonPref');
  });
});
