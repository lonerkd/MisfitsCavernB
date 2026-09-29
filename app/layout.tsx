import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { ToastProvider } from '@/components/Toast';
import { ConfirmProvider } from '@/components/Confirm';
import { OSProvider } from '@/lib/os';
import { PresenceProvider } from '@/lib/context/PresenceContext';
import { PillProvider } from '@/lib/context/PillContext';
import { SpotifyProvider } from '@/lib/context/SpotifyContext';

import ClientShell from '@/components/ClientShell';
import MotionPreference from '@/components/MotionPreference';
import { EARLY_THEME_SCRIPT } from '@/lib/themes';

// The suite's typefaces ship with it (app/fonts, SIL Open Font License), so a
// build never depends on reaching Google Fonts — the one thing that failed CI.
const bebasNeue = localFont({
  src: [{ path: './fonts/bebas-neue-latin-400-normal.woff2', weight: '400', style: 'normal' }],
  display: 'swap',
  variable: '--font-display',
});
const dmMono = localFont({
  src: [
    { path: './fonts/dm-mono-latin-300-normal.woff2', weight: '300', style: 'normal' },
    { path: './fonts/dm-mono-latin-300-italic.woff2', weight: '300', style: 'italic' },
    { path: './fonts/dm-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/dm-mono-latin-400-italic.woff2', weight: '400', style: 'italic' },
    { path: './fonts/dm-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './fonts/dm-mono-latin-500-italic.woff2', weight: '500', style: 'italic' },
  ],
  display: 'swap',
  variable: '--font-mono',
});
const cormorant = localFont({
  src: [
    { path: './fonts/cormorant-garamond-latin-300-normal.woff2', weight: '300', style: 'normal' },
    { path: './fonts/cormorant-garamond-latin-300-italic.woff2', weight: '300', style: 'italic' },
    { path: './fonts/cormorant-garamond-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/cormorant-garamond-latin-400-italic.woff2', weight: '400', style: 'italic' },
    { path: './fonts/cormorant-garamond-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './fonts/cormorant-garamond-latin-600-italic.woff2', weight: '600', style: 'italic' },
  ],
  display: 'swap',
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'Misfits Cavern — Creative Collaboration Platform',
  description: 'The ultimate creative platform for screenwriting, portfolio showcase, and immersive digital collaboration.',
  applicationName: 'Misfits Cavern',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg' },
  appleWebApp: { capable: true, title: 'Misfits Cavern', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#040710',
  colorScheme: 'dark light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set before paint by the script below (the chosen theme on
    // this device), so the attribute differs from the server's on purpose.
    <html lang="en" data-theme="default" suppressHydrationWarning className={`${bebasNeue.variable} ${dmMono.variable} ${cormorant.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: EARLY_THEME_SCRIPT }} />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <MotionPreference>
        <ToastProvider>
          <ConfirmProvider>
            <OSProvider>
              <PresenceProvider>
                  <PillProvider>
                  <SpotifyProvider>
                    <ClientShell />
                    <main id="main-content" className="main-content-container" tabIndex={-1}>{children}</main>
                  </SpotifyProvider>
                  </PillProvider>
              </PresenceProvider>
            </OSProvider>
          </ConfirmProvider>
        </ToastProvider>
        </MotionPreference>
      </body>
    </html>
  );
}
