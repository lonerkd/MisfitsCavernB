'use client';

import React, { useEffect, useRef, useState } from 'react';
import { sky as skyGeometry } from '@/lib/film/sky';
import type { DayLight } from '@/lib/film/days';
import f from './film.module.css';

const hm = (n: number) => (n >= 60 ? `${Math.floor(n / 60)} h ${String(n % 60).padStart(2, '0')}` : `${n} min`);

/**
 * A day's light, drawn: the sun's path from sunrise to sunset, the sun at magic
 * hour, the working day laid along it, and any time past the light run out
 * along the horizon in the limit colour. Without a light (no date, or nowhere
 * with coordinates) it is a plain heading band, so the title is always there.
 */
export function Sky({ light, shootFrom = null, wrapAt = null, title, titleId, subtitle, aside, width = 390, height = 236, compact = false }: {
  light: DayLight | null | undefined;
  shootFrom?: string | null;
  wrapAt?: string | null;
  title: React.ReactNode;
  titleId?: string;
  subtitle?: React.ReactNode;
  /** Top right: a stamp, a date. */
  aside?: React.ReactNode;
  /** The drawing's own width, in the units its type is set in: pass the card's pixel width so the type stays a readable size. */
  width?: number;
  height?: number;
  /** A smaller title, for a card on a board. */
  compact?: boolean;
}) {
  // Draw at the width it is shown at, so a time stays a readable size on a phone and on a desk.
  const box = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(width);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(([entry]) => { const w = Math.round(entry.contentRect.width); if (w >= 200) setDrawn(Math.min(w, 760)); });
    watch.observe(el);
    return () => watch.disconnect();
  }, []);
  const g = skyGeometry(light ? { sunrise: light.sunrise, sunset: light.sunset, goldenStarts: compact ? '' : light.goldenStarts, shootFrom, wrapAt } : null, { width: drawn, height, climb: compact ? 0.3 : undefined });
  const heading = (
    <div className={compact ? `${f.skyOver} ${f.skyOverSmall}` : f.skyOver}>
      <div>
        <h3 id={titleId} className={compact ? `${f.skyTitle} ${f.skyTitleSmall}` : f.skyTitle}>{title}</h3>
        {subtitle != null && <p className={f.skySub}>{subtitle}</p>}
      </div>
      {aside}
    </div>
  );

  if (!g || !light) {
    return <div ref={box} className={`${f.sky} ${f.skyPlain}`} style={{ minHeight: compact ? 72 : 112 }}>{heading}</div>;
  }

  const summary = `Sunrise ${light.sunrise}, sunset ${light.sunset}${shootFrom && wrapAt ? `, shooting ${shootFrom} to ${wrapAt}` : ''}${g.lateMinutes ? `, ${hm(g.lateMinutes)} past sunset` : ''}`;
  return (
    <div ref={box} className={f.sky}>
      <svg className={f.skyArt} viewBox={`0 0 ${g.width} ${g.height}`} role="img" aria-label={summary}>
        <path d={g.arc} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.5" strokeDasharray="2 6" strokeLinecap="round" />
        <path d={`M0 ${g.horizon}H${g.width}`} stroke="rgba(255,255,255,.32)" strokeWidth="1" />
        {g.work && <path d={g.work} fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
        {g.early && <path d={`M${g.early.from} ${g.early.y}H${g.early.to}`} stroke="var(--limit)" strokeWidth="4" strokeLinecap="round" />}
        {g.late && <path d={`M${g.late.from} ${g.late.y}H${g.late.to}`} stroke="var(--limit)" strokeWidth="4" strokeLinecap="round" />}
        <circle cx={g.sunrise.x} cy={g.horizon} r="4.5" fill="#fff" />
        <circle cx={g.sunset.x} cy={g.horizon} r="4.5" fill="#fff" />
        <circle cx={g.sun.x} cy={g.sun.y} r={compact ? 15 : 24} fill="rgba(255,230,173,.22)" />
        <circle cx={g.sun.x} cy={g.sun.y} r={compact ? 8 : 13} fill="#ffe6ad" />
        <g fill="#fff" fontSize="13">
          <text x={g.sunrise.x} y={g.horizon - 11} textAnchor="middle">{light.sunrise}</text>
          <text x={g.sunset.x} y={g.horizon - 11} textAnchor="middle">{light.sunset}</text>
        </g>
        {!compact && <text x={g.sun.x} y={g.sun.y - 30} textAnchor="middle" fill="rgba(255,255,255,.9)" fontSize="12.5" fontWeight="500">{`magic ${light.goldenStarts}`}</text>}
        {g.late && g.lateMinutes > 0 && (
          <g>
            <rect x={g.late.to - 52} y={g.late.y + 7} width="52" height="20" rx="4" fill="var(--limit)" />
            <text x={g.late.to - 26} y={g.late.y + 21.5} textAnchor="middle" fill="#fff" fontSize="12">{`+${hm(g.lateMinutes)}`}</text>
          </g>
        )}
        {g.early && g.earlyMinutes > 0 && (
          <g>
            <rect x={g.early.to} y={g.early.y + 7} width="52" height="20" rx="4" fill="var(--limit)" />
            <text x={g.early.to + 26} y={g.early.y + 21.5} textAnchor="middle" fill="#fff" fontSize="12">{`−${hm(g.earlyMinutes)}`}</text>
          </g>
        )}
      </svg>
      {heading}
    </div>
  );
}
