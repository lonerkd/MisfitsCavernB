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
import DOMPurify from 'dompurify';

// The suite's typefaces ship with it (app/fonts, SIL Open Font License), so a
// build never depends on reaching Google Fonts — the one thing that failed CI.
const bebasNeue = localFont({
  src: [{ path: './fonts/bebas-neue-latin-400-normal.woff2', weight: '400', style: 'normal' }],
});
