'use client';

import React from 'react';

// Simple seeded RNG for consistent pseudo-random placement
function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface PhotoScatterProps {
  opacity?: number;
  count?: number;
}

export default function PhotoScatter({ opacity = 0.08, count = 22 }: PhotoScatterProps) {
  const rng = seededRng(777);
  const items = Array.from({ length: count }).map((_, i) => ({
    id: i,
    x: rng() * 86 + 3,
    y: rng() * 86 + 3,
    rot: (rng() - 0.5) * 28,
    w: 85 + rng() * 105,
    z: Math.floor(rng() * 15),
    d: i * 0.05,
  }));

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity,
      }}
    >
      {items.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.w,
            height: p.w * 0.7,
            transform: `rotate(${p.rot}deg)`,
            zIndex: p.z,
            animation: `sceneSlideIn 1s ease-out ${p.d}s both`,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: '#141414',
              border: '3px solid rgba(240, 236, 228, 0.22)',
              boxShadow: '3px 5px 16px rgba(0, 0, 0, 0.8)',
              padding: 3,
              overflow: 'hidden',
            }}
          >
            {/* Placeholder for images - will add gradients as placeholders */}
            <div
              style={{
                width: '100%',
                height: '100%',
                background: `linear-gradient(135deg, rgba(255, 60, 0, 0.1) 0%, rgba(240, 236, 228, 0.05) 100%)`,
                display: 'block',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
