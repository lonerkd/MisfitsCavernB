import type { Metadata, Viewport } from 'next';
import dynamic from 'next/dynamic';
import { Bebas_Neue, DM_Mono, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/Toast';
import { ConfirmProvider } from '@/components/Confirm';
import { OSProvider } from '@/lib/os';
import { PresenceProvider } from '@/lib/context/PresenceContext';
import { PillProvider } from '@/lib/context/PillContext';
import { SpotifyProvider } from '@/lib/context/SpotifyContext';

const CustomCursor = dynamic(() => import('@/components/CustomCursor'), { ssr: false });
const EcosystemTaskbar = dynamic(() => import('@/components/EcosystemTaskbar'), { ssr: false });
const CommandPalette = dynamic(() => import('@/components/CommandPalette'), { ssr: false });
const ShortcutsOverlay = dynamic(() => import('@/components/ShortcutsOverlay'), { ssr: false });
const ThemeInitializer = dynamic(() => import('@/components/ThemeInitializer'), { ssr: false });

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});
const dmMono = DM_Mono({
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});
const cormorant = Cormorant_Garamond({
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'Misfits Cavern — Creative Collaboration Platform',
  description: 'The ultimate creative platform for screenwriting, portfolio showcase, and immersive digital collaboration.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${dmMono.variable} ${cormorant.variable}`}>
      <body>
        <ToastProvider>
          <ConfirmProvider>
            <OSProvider>
              <PresenceProvider>
                  <PillProvider>
                  <SpotifyProvider>
                    <CustomCursor />
                    <CommandPalette />
                    <ShortcutsOverlay />
                    <ThemeInitializer />
                    <EcosystemTaskbar />
                    <div className="main-content-container">{children}</div>
                  </SpotifyProvider>
                  </PillProvider>
              </PresenceProvider>
            </OSProvider>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
