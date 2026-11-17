'use client';

import { useEffect, useState } from 'react';

/** True once `active` has stayed true for `ms`; false again the moment it ends. For "still loading" hints under a skeleton. */
export function useSlowWhile(active: boolean, ms = 6000): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setSlow(true), ms);
    return () => { clearTimeout(t); setSlow(false); };
  }, [active, ms]);
  return active && slow;
}
