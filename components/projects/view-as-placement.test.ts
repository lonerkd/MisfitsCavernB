import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// View-as is an on-demand owner tool, not a bar pinned to the top of every screen
// (owner, Nov 27, 2026: "only when u need it... unless you're the one setting it up").
// The switch and the preview state live together on the project page, in a block the
// preview itself cannot hide (it is gated on the real owner, not the previewed view),
// and no other surface renders the banner. The outsider screen is the one exception:
// it is a dead end, so it keeps its own way back.
const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');
const hub = read('app/(suite)/projects/[id]/page.tsx');
const viewAs = read('components/projects/ViewAs.tsx');

describe('view-as lives where it is set up', () => {
  it('the banner is not a sticky top bar anymore', () => {
    expect(viewAs).not.toContain("position: 'sticky'");
    expect(viewAs).not.toContain("background: 'var(--warn)'"); // the solid yellow fill went with the bar (the tint uses color-mix)
  });

  it('the hub keeps the switch and the state together, gated on the real owner', () => {
    const block = hub.indexOf('{project.isOwner && (');
    expect(block).toBeGreaterThan(-1);
    expect(hub.indexOf('<ViewAsSwitch', block)).toBeGreaterThan(block);
    expect(hub.indexOf('<ViewAsBanner', block)).toBeGreaterThan(block);
    expect(hub.match(/<ViewAsBanner/g)).toHaveLength(1); // and nowhere else on the page
  });

  it('Studio, Lounge and Call no longer render the banner', () => {
    for (const p of ['app/(suite)/studio/page.tsx', 'app/(suite)/lounge/page.tsx', 'app/(suite)/call/[id]/page.tsx']) {
      expect(read(p), p).not.toContain('ViewAsBanner');
    }
  });

  it('the outsider screen keeps its own way back', () => {
    const outsider = viewAs.slice(viewAs.indexOf('export function OutsiderPreview'));
    expect(outsider).toContain('<ViewAsBanner projectId={projectId} />');
  });
});
