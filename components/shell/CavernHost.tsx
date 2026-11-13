'use client';

import dynamic from 'next/dynamic';
import { useCavern } from '@/lib/cavern/CavernContext';
import { useInPane } from '@/lib/split/pane';

// The cavern draws into the page's own body and the screen, so it is only ever made in the browser, and only once it is wanted.
const CavernVisualizer = dynamic(() => import('./CavernVisualizer').then((m) => m.CavernVisualizer), { ssr: false });

/** The one cavern of the suite: full screen or in the corner, the same cave either way (it is one component whose `variant` changes). */
export default function CavernHost() {
  const { mode, close, minimise, open } = useCavern();
  const inPane = useInPane();
  if (mode === 'closed' || inPane) return null;
  return <CavernVisualizer variant={mode} onClose={close} onMinimise={minimise} onExpand={open} />;
}
