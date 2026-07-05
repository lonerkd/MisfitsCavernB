'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

// Every route currently swaps instantly — the one seam in the whole suite
// that doesn't share its own motion language. Reuse the exact easing/timing
// already established everywhere else (the Pill's MORPH, card hovers, modal
// enters all use this cubic-bezier) rather than introducing a new one.
const EASE_EXPO = [0.16, 1, 0.3, 1] as const;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches || document.body.classList.contains('reduce-motion'));
    sync();
    media.addEventListener?.('change', sync);
    // The Settings page toggles this class at runtime, independent of the
    // OS-level media query, so watch for it too.
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => { media.removeEventListener?.('change', sync); observer.disconnect(); };
  }, []);
  return reduced;
}

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = usePrefersReducedMotion();

  if (reducedMotion) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35, ease: EASE_EXPO }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
