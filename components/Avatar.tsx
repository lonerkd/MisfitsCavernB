'use client';

import React, { useState, useEffect } from 'react';
import { textOn } from '@/lib/color';

export default function Avatar({ src, name, size = 40, radius, accent = 'var(--accent)', style }: {
  src?: string | null;
  name?: string | null;
  size?: number;
  radius?: number | string;
  accent?: string;
  style?: React.CSSProperties;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [src]);
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  const br = radius ?? '50%';

  if (src && !broken) {
    return (
      // Avatars can be any URL a person pastes in; next/image only serves listed
      // hosts, so a plain img (with an initial as the fallback) is the honest choice.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name || ''}
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        style={{ width: size, height: size, borderRadius: br, objectFit: 'cover', flexShrink: 0, ...style }}
      />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: br, background: accent, color: accent.startsWith('#') ? textOn(accent) : 'var(--on-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: size * 0.42, flexShrink: 0, ...style }}>
      {initial}
    </div>
  );
}
