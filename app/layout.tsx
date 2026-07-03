import type { Metadata, Viewport } from 'next';
import dynamic from 'next/dynamic';
import { Bebas_Neue, DM_Mono, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/Toast';
import { ConfirmProvider } from '@/components/Confirm';
import { ProjectProvider } from '@/lib/context/ProjectContext';
import { AuthProvider } from '@/lib/context/AuthContext';
import { PillProvider } from '@/lib/context/PillContext';

const CustomCursor = dynamic(() => import('@/components/CustomCursor'), { ssr: false });
const EcosystemTaskbar = dynamic(() => import('@/components/EcosystemTaskbar'), { ssr: false });
const CommandPalette = dynamic(() => import('@/components/CommandPalette'), { ssr: false });
const ShortcutsOverlay = dynamic(() => import('@/components/ShortcutsOverlay'), { ssr: false });

// Self-hosted via next/font: no render-blocking request to Google, no FOUT,
// and no client-side hit to fonts.googleapis.com (privacy/GDPR-friendly).
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
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <ProjectProvider>
                <PillProvider>
                  <CustomCursor />
                  <CommandPalette />
                  <ShortcutsOverlay />
                  <EcosystemTaskbar />
                  {children}
                </PillProvider>
              </ProjectProvider>
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
