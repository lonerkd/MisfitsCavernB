import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

// The deck's panels were anchored to their buttons at desktop widths. On a phone the strip wraps, the
// buttons land near the edges, and the panels ran off the screen — notifications, projects and the
// sound player all opened half-clipped (the owner's shots, Nov 26, 2026). On the compact surface each
// panel spans the screen above the island instead. These pins keep that fit in place; the island's own
// top is measured through --island-room, which the taskbar publishes.
const css = readFileSync(join(process.cwd(), 'components', 'island', 'island.module.css'), 'utf8');
const bell = readFileSync(join(process.cwd(), 'components', 'shell', 'NotificationBell.tsx'), 'utf8');
const nav = readFileSync(join(process.cwd(), 'components', 'shell', 'Navigation.tsx'), 'utf8');
const audio = readFileSync(join(process.cwd(), 'components', 'shell', 'GlobalAudioWidget.tsx'), 'utf8');
const taskbar = readFileSync(join(process.cwd(), 'components', 'shell', 'EcosystemTaskbar.tsx'), 'utf8');

const FIT = 'calc(100dvh - var(--island-room, 70vh) - 14px)';

describe('the deck fits a phone', () => {
  it('each panel takes the screen-spanning fit on the compact surface', () => {
    for (const src of [bell, audio, taskbar]) {
      expect(src).toContain(FIT);
      expect(src).toContain("position: 'fixed', left: 12, right: 12");
    }
    expect(bell).toContain("useIslandSurface() === 'compact-dock'");
    expect(audio).toContain("useIslandSurface() === 'compact-dock'");
    expect(taskbar).toContain('compact={compact}');
  });

  it('the top bar’s bell drops its panel instead of rising off the screen', () => {
    expect(nav).toContain('<NotificationBell placement="down" />');
    expect(bell).toContain("placement = 'up'");
    expect(bell).toContain("top: '100%', right: 0, marginTop: 12");
    expect(bell).toContain("top: 'calc(58px + env(safe-area-inset-top, 0px))'");
  });

  it('the project list gives up centring on its button when it takes the fit', () => {
    expect(taskbar).toContain("x: compact ? 0 : '-50%'");
  });

  it('name pills never stand on the strip on a phone', () => {
    expect(css).toContain(".dock[data-compact='true'] .slot[data-tip]::after { display: none; }");
  });

  it('a phone on its side gets the compact manners at any surface', () => {
    const landscape = css.slice(css.indexOf('@media (pointer: coarse) and (max-height: 500px)'));
    expect(landscape).toContain('.dock .nav { flex-wrap: wrap; }');
    expect(landscape).toContain('.dock .slot[data-tip]::after { display: none; }');
    expect(landscape).toContain('.dock .onsetLink { max-width: 44vw;');
  });
});
