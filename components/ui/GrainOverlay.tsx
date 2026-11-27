'use client';

import { useEffect, useState } from 'react';
import { GRAIN_AMOUNT_DEFAULT, GRAIN_EVENT, GRAIN_SPEED_DEFAULT, grainCycleSeconds, readGrain } from '@/lib/ui/grain';

export default function GrainOverlay() {
  // The dials are this device's (Settings › Appearance); the defaults render
  // first — the look the suite has always shipped — then the stored choice
  // lands, and a drag in Settings answers here at once.
  const [grain, setGrain] = useState({ amount: GRAIN_AMOUNT_DEFAULT, speed: GRAIN_SPEED_DEFAULT });

  useEffect(() => {
    const read = () => {
      const next = readGrain();
      setGrain(next);
      // The .grain-overlay class in globals.css follows the same dials.
      const root = document.documentElement.style;
      root.setProperty('--mc-grain-opacity', String(next.amount));
      root.setProperty('--mc-grain-duration', `${grainCycleSeconds(next.speed)}s`);
    };
    read();
    window.addEventListener(GRAIN_EVENT, read);
    window.addEventListener('storage', read);
    return () => { window.removeEventListener(GRAIN_EVENT, read); window.removeEventListener('storage', read); };
  }, []);

  return (
    <div aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        pointerEvents: 'none',
        opacity: grain.amount,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        animation: `grain ${grainCycleSeconds(grain.speed)}s steps(6) infinite`,
      }}
    />
  );
}
