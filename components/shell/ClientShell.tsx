'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const CustomCursor = dynamic(() => import('@/components/shell/CustomCursor'), { ssr: false });
const EcosystemTaskbar = dynamic(() => import('@/components/shell/EcosystemTaskbar'), { ssr: false });
const CommandPalette = dynamic(() => import('@/components/shell/CommandPalette'), { ssr: false });
const ShortcutsOverlay = dynamic(() => import('@/components/shell/ShortcutsOverlay'), { ssr: false });
const UndoKeys = dynamic(() => import('@/components/shell/UndoKeys'), { ssr: false });
const ErrorReporter = dynamic(() => import('@/components/shell/ErrorReporter'), { ssr: false });
const ThemeInitializer = dynamic(() => import('@/components/shell/ThemeInitializer'), { ssr: false });
const PhoneKeyboard = dynamic(() => import('@/components/phone/PhoneKeyboard').then((x) => x.PhoneKeyboard), { ssr: false });
const MobileTabBar = dynamic(() => import('@/components/mobile/MobileTabBar'), { ssr: false });
const PlaceTracker = dynamic(() => import('@/components/mobile/Continue').then((x) => x.PlaceTracker), { ssr: false });
const OutboxFlusher = dynamic(() => import('@/components/mobile/Capture').then((x) => x.OutboxFlusher), { ssr: false });
const ContinueOffer = dynamic(() => import('@/components/mobile/Continue').then((x) => x.ContinueOffer), { ssr: false });

import { ServiceWorkerRegister } from '@/components/shell/ServiceWorkerRegister';
import { PaneReporter, SplitShortcut } from '@/components/split/PaneShell';
import { useInPane } from '@/lib/split/pane';

export default function ClientShell() {
  const isSplit = usePathname() === '/split';
  // In a split-screen pane the split page is the chrome; the page is just its surface.
  // Each pane gets its own custom cursor (the parent's overlay cannot track inside a frame).
  if (useInPane()) return <><PaneReporter /><UndoKeys /><CustomCursor /></>;
  return (
    <>
      <ErrorReporter />
      <SplitShortcut />
      <UndoKeys />
      <ServiceWorkerRegister />
      {!isSplit && <CustomCursor />}
      <CommandPalette />
      <ShortcutsOverlay />
      <ThemeInitializer />
      <EcosystemTaskbar />
      <MobileTabBar />
      <PhoneKeyboard />
      <PlaceTracker />
      <OutboxFlusher />
      <ContinueOffer />
    </>
  );
}
