'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCavern } from '@/lib/cavern/CavernContext';

/**
 * The cavern as its own page, to leave open on a second screen (a wallpaper you can steer). The cave itself is the suite's one
 * cavern (components/shell/CavernHost): this page asks for it full screen, and when it is minimised or closed goes back to Sound.
 */
export default function CavernPage() {
  const { mode, open } = useCavern();
  const router = useRouter();
  const seen = useRef(false);
  useEffect(() => { open(); }, [open]);
  useEffect(() => {
    if (mode === 'full') seen.current = true;
    else if (seen.current) router.push('/soundtrack');
  }, [mode, router]);
  return null;
}
