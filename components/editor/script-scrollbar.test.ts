import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// The script textarea is the editor's scroller, and the global scrollbar rule drew its track as a pale
// line down the right edge of the phone, running past the bars at the foot of the screen (the owner's
// shots, Nov 26, 2026). On a phone the script scrolls barless — the island names the scene he is in.
// These pins keep the class on the textarea and the phone rule in the stylesheet.
const view = readFileSync(join(process.cwd(), 'components', 'editor', 'WriteView.tsx'), 'utf8');
const css = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8');

describe('the script scrolls barless on a phone', () => {
  it('the script textarea carries the class', () => {
    expect(view).toContain('className="mc-script-area"');
  });

  it('the phone rule hides its bar, in portrait and landscape alike', () => {
    const block = css.slice(css.indexOf('@media (max-width: 820px), (pointer: coarse) and (max-height: 500px)'));
    expect(block).toContain('.mc-script-area { scrollbar-width: none; }');
    expect(block).toContain('.mc-script-area::-webkit-scrollbar { display: none; }');
  });
});
