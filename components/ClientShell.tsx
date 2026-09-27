'use client';

import dynamic from 'next/dynamic';

const CustomCursor = dynamic(() => import('@/components/CustomCursor'), { ssr: false });
const EcosystemTaskbar = dynamic(() => import('@/components/EcosystemTaskbar'), { ssr: false });
const CommandPalette = dynamic(() => import('@/components/CommandPalette'), { ssr: false });
const ShortcutsOverlay = dynamic(() => import('@/components/ShortcutsOverlay'), { ssr: false });
const ThemeInitializer = dynamic(() => import('@/components/ThemeInitializer'), { ssr: false });

import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { PaneReporter, SplitShortcut } from '@/components/split/PaneShell';
import { useInPane } from '@/lib/split/pane';

export default function ClientShell() {
  // In a split-screen pane the split page is the chrome; the page is just its surface.
  if (useInPane()) return <PaneReporter />;
  return (
    <>
      <SplitShortcut />
      <ServiceWorkerRegister />
      <CustomCursor />
      <CommandPalette />
      <ShortcutsOverlay />
      <ThemeInitializer />
      <EcosystemTaskbar />
    </>
  );
}
