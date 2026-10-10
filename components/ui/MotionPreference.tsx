'use client';

import { MotionConfig } from 'framer-motion';
import { useEffect, useState } from 'react';

export const REDUCE_MOTION_KEY = 'mc_reduce_motion';
export const MOTION_PREF_EVENT = 'mc-motion-pref-change';

// "Reduce motion" (Settings, per device) applies everywhere: the body class
// stops CSS animations/transitions, MotionConfig stops framer-motion ones.
// No choice made → follow the OS setting.
export default function MotionPreference({ children }: { children: React.ReactNode }) {
  const [pref, setPref] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      let p: string | null = null;
      try { p = localStorage.getItem(REDUCE_MOTION_KEY); } catch {}
      setPref(p);
      const reduce = p === 'on' || (p == null && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      document.body.classList.toggle('reduce-motion', reduce);
    };
    read();
    window.addEventListener(MOTION_PREF_EVENT, read);
    return () => window.removeEventListener(MOTION_PREF_EVENT, read);
  }, []);

  return <MotionConfig reducedMotion={pref === 'on' ? 'always' : 'user'}>{children}</MotionConfig>;
}
