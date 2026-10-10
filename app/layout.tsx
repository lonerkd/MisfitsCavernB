import type { Metadata, Viewport } from 'next';
import { startupImages } from '@/lib/pwa/splash';
import localFont from 'next/font/local';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/Confirm';
import MotionPreference from '@/components/ui/MotionPreference';
import { EARLY_THEME_SCRIPT } from '@/lib/themes/themes';

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

const courierPrime = localFont({
  src: [
    { path: './fonts/courier-prime-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/courier-prime-latin-400-italic.woff2', weight: '400', style: 'italic' },
    { path: './fonts/courier-prime-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: './fonts/courier-prime-latin-700-italic.woff2', weight: '700', style: 'italic' },
  ],
  display: 'swap',
  variable: '--font-script',
});

export const metadata: Metadata = {
  title: 'The Cavern — by Misfits Cavern',
  description: 'The production suite for independent filmmakers — script, pre-production, the shoot, post and release in one connected system.',
  applicationName: 'The Cavern',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  // Launch screens: one per iPhone screen (lib/pwa/splash.ts, public/splash/).
  appleWebApp: { capable: true, title: 'The Cavern', statusBarStyle: 'black-translucent', startupImage: startupImages() },
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
    <html lang="en" data-theme="default" suppressHydrationWarning className={`${bebasNeue.variable} ${dmMono.variable} ${cormorant.variable} ${courierPrime.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: EARLY_THEME_SCRIPT }} />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to content</a>
        <MotionPreference>
        <ToastProvider>
          <ConfirmProvider>
            {/* The signed-in suite (app/(suite)/layout.tsx) adds the session,
                the island and the tab bar; public pages (app/(public)) add
                only <main>, so a share link doesn't load the suite. */}
            {children}
          </ConfirmProvider>
        </ToastProvider>
        </MotionPreference>
        {/* Which pages people use and how fast they load — cookieless, and only
            on Vercel builds (local and CI builds have no /_vercel endpoints). */}
        {process.env.NEXT_PUBLIC_VERCEL_ENV && <><Analytics /><SpeedInsights /></>}
      </body>
    </html>
  );
}
