'use client';

import dynamic from 'next/dynamic';

const CustomCursor = dynamic(() => import('@/components/CustomCursor'), { ssr: false });
const EcosystemTaskbar = dynamic(() => import('@/components/EcosystemTaskbar'), { ssr: false });
const CommandPalette = dynamic(() => import('@/components/CommandPalette'), { ssr: false });
const ShortcutsOverlay = dynamic(() => import('@/components/ShortcutsOverlay'), { ssr: false });
const ThemeInitializer = dynamic(() => import('@/components/ThemeInitializer'), { ssr: false });

import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

export default function ClientShell() {
  return (
    <>
      <ServiceWorkerRegister />
      <CustomCursor />
      <CommandPalette />
      <ShortcutsOverlay />
      <ThemeInitializer />
      <EcosystemTaskbar />
    </>
  );
}
