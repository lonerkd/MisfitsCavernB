'use client';

import dynamic from 'next/dynamic';

const CustomCursor = dynamic(() => import('@/components/shell/CustomCursor'), { ssr: false });
const EcosystemTaskbar = dynamic(() => import('@/components/shell/EcosystemTaskbar'), { ssr: false });
const CommandPalette = dynamic(() => import('@/components/shell/CommandPalette'), { ssr: false });
const ShortcutsOverlay = dynamic(() => import('@/components/shell/ShortcutsOverlay'), { ssr: false });
const ErrorReporter = dynamic(() => import('@/components/shell/ErrorReporter'), { ssr: false });
const ThemeInitializer = dynamic(() => import('@/components/shell/ThemeInitializer'), { ssr: false });
const MobileTabBar = dynamic(() => import('@/components/mobile/MobileTabBar'), { ssr: false });
const PlaceTracker = dynamic(() => import('@/components/mobile/Continue').then((x) => x.PlaceTracker), { ssr: false });
const OutboxFlusher = dynamic(() => import('@/components/mobile/Capture').then((x) => x.OutboxFlusher), { ssr: false });
const ContinueOffer = dynamic(() => import('@/components/mobile/Continue').then((x) => x.ContinueOffer), { ssr: false });

import { ServiceWorkerRegister } from '@/components/shell/ServiceWorkerRegister';
import { PaneReporter, SplitShortcut } from '@/components/split/PaneShell';
import { useInPane } from '@/lib/split/pane';

export default function ClientShell() {
  // In a split-screen pane the split page is the chrome; the page is just its surface.
  if (useInPane()) return <PaneReporter />;
  return (
    <>
      <ErrorReporter />
      <SplitShortcut />
      <ServiceWorkerRegister />
      <CustomCursor />
      <CommandPalette />
      <ShortcutsOverlay />
      <ThemeInitializer />
      <EcosystemTaskbar />
      <MobileTabBar />
      <PlaceTracker />
      <OutboxFlusher />
      <ContinueOffer />
    </>
  );
}
