'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// The cavern draws into the page's own body and the screen, so it is only ever made in the browser.
const CavernVisualizer = dynamic(() => import('@/components/shell/CavernVisualizer').then((m) => m.CavernVisualizer), { ssr: false });

/** The cavern as its own page, to leave open on a second screen (a wallpaper you can steer). Esc or the button goes back to Sound. */
export default function CavernPage() {
  const router = useRouter();
  return <CavernVisualizer onClose={() => router.push('/soundtrack')} />;
}
