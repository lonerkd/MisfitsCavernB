import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// A page that is exactly one screen tall (100dvh) and reserves its own room for the island must not also get the page container's 76 px foot:
// the two added up to a document 76 px taller than the window, so the whole window scrolled (measured on an iPhone-sized browser, 2026-11-27).
const css = readFileSync('app/globals.css', 'utf8');
const editor = readFileSync('app/(suite)/editor/page.tsx', 'utf8');

describe('one-screen pages do not also take the page foot', () => {
  it.each(['.mc-lounge', '.mc-editor-center'])('%s: the container drops its padding-bottom', (cls) => {
    expect(css).toMatch(new RegExp(`\\.main-content-container:has\\(\\${cls}\\)\\s*\\{\\s*padding-bottom:\\s*0;`));
  });
  it('the editor keeps the island\'s room inside itself on a phone, portrait and landscape', () => {
    expect(editor).toMatch(/isMobile \? \{ paddingBottom: phone\.landscape \? 'calc\(64px/);
    expect(editor).toMatch(/'calc\(76px \+ env\(safe-area-inset-bottom\)\)'/);
  });
});
