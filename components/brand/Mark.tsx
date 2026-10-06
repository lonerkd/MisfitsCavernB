'use client';

import { useId } from 'react';

// The Cavern's mark (R13, chosen 2026-10-06 — .cavern-intelligence/brand/):
// a pyramid and a tilted slab of the Front Ranges make the M, lit by the
// crescent — the C. Drawn from the brand SVGs with the theme's own colours
// (--fg, --accent), so it follows every theme. `small` is the cut for
// 16–48 px: two tones, a larger crescent.
const FULL = {"polys":[{"points":"2,94 9,86 13,87 18,76 21,77 26,62 29,62 32,48 34,49 36,30 37.6,40 38,44 37,56 40,68 37,82 39,94","fill":"var(--accent)"},{"points":"2,94 9,86 13,87 18,76 21,77 26,62 29,62 30,74 26,86 24,94","fill":"color-mix(in srgb, var(--accent) 78%, #000)"},{"points":"36,30 40,40 42,39 46,50 49,49 53,58 56,62 55,74 57,86 56,94 39,94 37,82 40,68 37,56 38,44 37.6,40","fill":"var(--fg)"},{"points":"40,68 45,74 55,74 57,86 56,94 39,94 37,82","fill":"color-mix(in srgb, var(--fg) 82%, var(--bg))"},{"points":"56,62 60,56 63,57 68,47 71,47 76,38 79,38 84,28 86,28 90,20 89,34 92,48 88,62 91,76 88,94 56,94 57,86 55,74","fill":"var(--accent)"},{"points":"57,86 70,80 91,76 88,94 56,94","fill":"color-mix(in srgb, var(--accent) 78%, #000)"},{"points":"90,20 93,30 95,29 98,44 101,46 104,60 108,62 112,78 118,94 88,94 91,76 88,62 92,48 89,34","fill":"var(--fg)"},{"points":"92,48 104,60 108,62 112,78 118,94 88,94 91,76 88,62","fill":"color-mix(in srgb, var(--fg) 82%, var(--bg))"},{"points":"34.5,44 36,30 37.6,40 36.8,42 36,39.8 35.2,43","fill":"color-mix(in srgb, var(--accent) 50%, #fff)"},{"points":"36,30 40,40 42,39 43.2,42.4 42,44 41,41.5 39.6,44.5 38.5,42.5 37.6,40","fill":"color-mix(in srgb, var(--fg) 55%, #fff)"},{"points":"40.4,45 41.4,45 43.4,57 42.4,57.4","fill":"color-mix(in srgb, var(--fg) 55%, #fff)","opacity":".9"},{"points":"38.4,45.5 39.2,45.5 39.6,53 38.9,53.2","fill":"color-mix(in srgb, var(--fg) 55%, #fff)","opacity":".9"},{"points":"68,47 71,47 76,38 79,38 84,28 86,28 90,20 89.7,24.5 88,27.6 86.4,31.6 84.6,31.2 83,33.4 79.8,41.6 77.6,41 76.2,42.4 71.6,50.8 70,50 68.6,51","fill":"color-mix(in srgb, var(--accent) 50%, #fff)"},{"points":"90,20 93,30 95,29 96.2,34 94.4,33 92.6,35.6 91.2,33 89.7,34.8 89,34","fill":"color-mix(in srgb, var(--fg) 55%, #fff)"},{"points":"92.5,44 99,46 98.4,47","fill":"color-mix(in srgb, var(--fg) 55%, #fff)","opacity":".9"},{"points":"90.4,58 103,62 102,63.2","fill":"color-mix(in srgb, var(--fg) 55%, #fff)","opacity":".9"},{"points":"90.8,70 108,74 107,75.2","fill":"color-mix(in srgb, var(--fg) 55%, #fff)","opacity":".9"}],"bite":[109.7,16.08,5.04],"moon":[107,18,6],"moonFill":"color-mix(in srgb, var(--fg) 55%, #fff)"} as const;
const SMALL = {"polys":[{"points":"2,94 9,86 13,87 18,76 21,77 26,62 29,62 32,48 34,49 36,30 37.6,40 38,44 37,56 40,68 37,82 39,94","fill":"var(--accent)"},{"points":"36,30 40,40 42,39 46,50 49,49 53,58 56,62 55,74 57,86 56,94 39,94 37,82 40,68 37,56 38,44 37.6,40","fill":"var(--fg)"},{"points":"56,62 60,56 63,57 68,47 71,47 76,38 79,38 84,28 86,28 90,20 89,34 92,48 88,62 91,76 88,94 56,94 57,86 55,74","fill":"var(--accent)"},{"points":"90,20 93,30 95,29 98,44 101,46 104,60 108,62 112,78 118,94 88,94 91,76 88,62 92,48 89,34","fill":"var(--fg)"}],"bite":[110.05,15.12,7.56],"moon":[106,18,9],"moonFill":"color-mix(in srgb, var(--fg) 55%, #fff)"} as const;

export function Mark({ size = 28, variant = 'small', title = 'The Cavern' }: {
  size?: number;
  variant?: 'full' | 'small';
  /** Accessible name; pass '' when a visible label sits beside it. */
  title?: string;
}) {
  const id = useId();
  const m = variant === 'full' ? FULL : SMALL;
  return (
    <svg width={size} height={size} viewBox="0 -7 120 120" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title || undefined} style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <mask id={id}>
          <rect width="120" height="120" fill="#fff" />
          <circle cx={m.bite[0]} cy={m.bite[1]} r={m.bite[2]} fill="#000" />
        </mask>
      </defs>
      <circle cx={m.moon[0]} cy={m.moon[1]} r={m.moon[2]} mask={`url(#${id})`} style={{ fill: m.moonFill }} />
      {m.polys.map((p, i) => (
        <polygon key={i} points={p.points} style={{ fill: p.fill, opacity: 'opacity' in p ? Number(p.opacity) : undefined }} />
      ))}
    </svg>
  );
}
