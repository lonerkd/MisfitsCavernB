'use client';

import { useState } from 'react';

/**
 * The time this component first rendered, as epoch ms. Use it for "3 days ago"
 * labels instead of calling Date.now() while rendering, which gives a different
 * answer on every render (and on the server versus the browser).
 */
export function useNow(): number {
  const [now] = useState(() => Date.now());
  return now;
}
