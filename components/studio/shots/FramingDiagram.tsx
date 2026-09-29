'use client';

import React, { useId } from 'react';
import { angleOf, sizeOf, viewBoxFor } from '@/lib/studio/framing';

/**
 * What a shot size frames, drawn: a window onto a standing figure (see
 * lib/studio/framing). Used as the picker's swatches and as a shot's frame
 * until it has a storyboard image. A Dutch angle tilts the frame; an
 * overhead angle looks down on the figure.
 */
export function FramingDiagram({ size, angle, className, title }: {
  size: string | null;
  angle?: string | null;
  className?: string;
  /** Accessible name; omit when a visible label says the same. */
  title?: string;
}) {
  const vignette = `pov-${useId().replace(/:/g, '')}`;
  const s = sizeOf(size);
  const a = angleOf(angle)?.id;
  const vb = viewBoxFor(s);
  const [x, y, w, h] = vb.split(' ').map(Number);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const stroke = { vectorEffect: 'non-scaling-stroke' as const, strokeWidth: 1.25 };

  const figure = (dx: number, key: string, dim = false) => (
    <g key={key} transform={`translate(${dx} 0)`} opacity={dim ? 0.55 : 1}>
      <path d="M-24 36 Q0 28 24 36 L21 102 L-21 102 Z" fill="rgba(var(--fg-rgb), 0.28)" stroke="rgba(var(--fg-rgb), 0.75)" {...stroke} />
      <path d="M-12 102 L-10 180 M12 102 L10 180" stroke="rgba(var(--fg-rgb), 0.75)" fill="none" {...stroke} />
      <circle cx={0} cy={14} r={12} fill="rgba(var(--fg-rgb), 0.42)" stroke="rgba(var(--fg-rgb), 0.85)" {...stroke} />
      <circle cx={-4.3} cy={13} r={1.1} fill="#0b0e18" />
      <circle cx={4.3} cy={13} r={1.1} fill="#0b0e18" />
    </g>
  );

  let content: React.ReactNode;
  if (a === 'overhead') {
    // Looking straight down: shoulders and the top of the head.
    content = (
      <g transform={`translate(${cx} ${cy}) scale(${h / 90})`}>
        <ellipse cx={0} cy={0} rx={24} ry={10} fill="rgba(var(--fg-rgb), 0.28)" stroke="rgba(var(--fg-rgb), 0.75)" {...stroke} />
        <circle cx={0} cy={0} r={9} fill="rgba(var(--fg-rgb), 0.45)" stroke="rgba(var(--fg-rgb), 0.85)" {...stroke} />
      </g>
    );
  } else if (s?.extra === 'insert') {
    content = (
      <g>
        <rect x={-18} y={-10} width={36} height={20} rx={3} fill="rgba(245,197,66,0.3)" stroke="rgba(245,197,66,0.85)" {...stroke} />
        <path d="M-12 -3 H8 M-12 3 H2" stroke="rgba(245,197,66,0.85)" {...stroke} />
      </g>
    );
  } else if (s?.extra === 'two') {
    content = [figure(-34, 'l'), figure(34, 'r')];
  } else if (s?.extra === 'ots') {
    content = (
      <>
        {figure(14, 'subject')}
        {/* The near character's shoulder and head, out of focus in the foreground. */}
        <ellipse cx={-44} cy={70} rx={30} ry={46} fill="var(--surface)" stroke="rgba(var(--fg-rgb), 0.3)" {...stroke} />
        <circle cx={-40} cy={16} r={17} fill="var(--surface)" stroke="rgba(var(--fg-rgb), 0.3)" {...stroke} />
      </>
    );
  } else {
    content = figure(0, 'f');
  }

  const showGround = !s || ['EWS', 'WS', 'FS', 'POV'].includes(s.id);
  return (
    <svg viewBox={vb} className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true} preserveAspectRatio="xMidYMid slice">
      <rect x={x - w} y={y - h} width={w * 3} height={h * 3} fill="#0b0e18" />
      <g transform={a === 'dutch' ? `rotate(-12 ${cx} ${cy})` : undefined}>
        {showGround && a !== 'overhead' && <line x1={x - w} x2={x + 2 * w} y1={180} y2={180} stroke="rgba(var(--fg-rgb), 0.2)" {...stroke} />}
        {content}
      </g>
      {s?.extra === 'pov' && (
        <>
          <defs>
            <radialGradient id={vignette}>
              <stop offset="60%" stopColor="#0b0e18" stopOpacity={0} />
              <stop offset="100%" stopColor="#0b0e18" stopOpacity={0.9} />
            </radialGradient>
          </defs>
          <rect x={x} y={y} width={w} height={h} fill={`url(#${vignette})`} />
        </>
      )}
      {(a === 'high' || a === 'low') && (
        // The camera's side of the frame: an arrow pointing the way it looks.
        <path d={a === 'high' ? `M${x + w - w * 0.08} ${y + h * 0.1} l${-w * 0.04} ${h * 0.08} l${w * 0.08} 0 z` : `M${x + w - w * 0.08} ${y + h * 0.9} l${-w * 0.04} ${-h * 0.08} l${w * 0.08} 0 z`}
          fill="rgba(232,67,26,0.8)" />
      )}
    </svg>
  );
}
