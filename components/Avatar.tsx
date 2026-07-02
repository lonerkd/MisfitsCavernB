'use client';

import React, { useState, useEffect } from 'react';

// Avatar that falls back to an initial monogram when there's no image URL or
// the image fails to load (a 404'd avatar no longer shows a broken icon).
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
      <img
        src={src}
        alt={name || ''}
        onError={() => setBroken(true)}
        style={{ width: size, height: size, borderRadius: br, objectFit: 'cover', flexShrink: 0, ...style }}
      />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: br, background: accent, color: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: size * 0.42, flexShrink: 0, ...style }}>
      {initial}
    </div>
  );
}
