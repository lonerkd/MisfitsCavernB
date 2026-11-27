'use client';

import { useId } from 'react';

// The loading family (owner, Nov 26, 2026): the brand mark as a pixel-art loader. The mountains are the
// Mark's own small cut (components/brand/Mark.tsx) with crisp edges; the star rides an orbit around the
// peaks, twinkling as it goes. Every motion is STEPPED (steps() timing, never smooth) — pixel feel is a
// timing choice as much as a shape one. Variants: 'orbit' for full waits, 'twinkle' beside a skeleton,
// 'spin' — the stamp in an 8-frame stepped turn — for inline waits. Theme tokens only, so it follows every
// theme; under prefers-reduced-motion it stands still.

const POLYS = [
  { points: '2,94 9,86 13,87 18,76 21,77 26,62 29,62 32,48 34,49 36,30 37.6,40 38,44 37,56 40,68 37,82 39,94', fill: 'var(--accent)' },
  { points: '36,30 40,40 42,39 46,50 49,49 53,58 56,62 55,74 57,86 56,94 39,94 37,82 40,68 37,56 38,44 37.6,40', fill: 'var(--fg)' },
  { points: '56,62 60,56 63,57 68,47 71,47 76,38 79,38 84,28 86,28 90,20 89,34 92,48 88,62 91,76 88,94 56,94 57,86 55,74', fill: 'var(--accent)' },
  { points: '90,20 93,30 95,29 98,44 101,46 104,60 108,62 112,78 118,94 88,94 91,76 88,62 92,48 89,34', fill: 'var(--fg)' },
] as const;

// A four-point sparkle centred on (0,0).
const STAR = 'M0,-7 L1.8,-1.8 L7,0 L1.8,1.8 L0,7 L-1.8,1.8 L-7,0 L-1.8,-1.8 Z';
const STAR_FILL = 'color-mix(in srgb, var(--fg) 55%, #fff)';

const CSS = `
  @keyframes mc-pixel-orbit { to { transform: rotate(360deg); } }
  @keyframes mc-pixel-twinkle { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(0.55); opacity: 0.6; } }
  @keyframes mc-pixel-spin { to { transform: rotate(360deg); } }
  .mc-pixel-orbit { transform-box: view-box; transform-origin: 60px 52px; animation: mc-pixel-orbit 3.2s steps(16) infinite; }
  .mc-pixel-twinkle { transform-box: fill-box; transform-origin: center; animation: mc-pixel-twinkle 0.8s steps(2, jump-none) infinite; }
  .mc-pixel-spin { animation: mc-pixel-spin 0.9s steps(8) infinite; }
  @media (prefers-reduced-motion: reduce) {
    .mc-pixel-orbit, .mc-pixel-twinkle, .mc-pixel-spin { animation: none !important; }
  }
`;

export function PixelLoader({ size = 64, variant = 'orbit', label = 'Loading' }: {
  size?: number;
  variant?: 'orbit' | 'spin' | 'twinkle';
  /** Accessible name for the wait; pass a route's own words where it has them. */
  label?: string;
}) {
  const id = useId();
  return (
    <span role="progressbar" aria-label={label} className={variant === 'spin' ? 'mc-pixel-spin' : undefined}
      style={{ display: 'inline-flex', flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 -7 120 120" aria-hidden style={{ display: 'block' }} shapeRendering="crispEdges">
        <defs>
          <mask id={id}>
            <rect width="120" height="120" fill="#fff" />
            <circle cx={110.05} cy={15.12} r={7.56} fill="#000" />
          </mask>
        </defs>
        <circle cx={106} cy={18} r={9} mask={`url(#${id})`} style={{ fill: STAR_FILL }} />
        {POLYS.map((p, i) => (
          <polygon key={i} points={p.points} style={{ fill: p.fill }} />
        ))}
        {variant === 'orbit' && (
          <g className="mc-pixel-orbit">
            <g transform="translate(60 12)">
              <g className="mc-pixel-twinkle">
                <path d={STAR} style={{ fill: STAR_FILL }} />
              </g>
            </g>
          </g>
        )}
        {variant === 'twinkle' && (
          <g transform="translate(88 6)">
            <g className="mc-pixel-twinkle">
              <path d={STAR} style={{ fill: STAR_FILL }} />
            </g>
          </g>
        )}
      </svg>
      <style>{CSS}</style>
    </span>
  );
}
