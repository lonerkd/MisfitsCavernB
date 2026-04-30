import type { Metadata, Viewport } from 'next';
import dynamic from 'next/dynamic';
import './globals.css';
import { ToastProvider } from '@/components/Toast';
import { ProjectProvider } from '@/lib/context/ProjectContext';

const CustomCursor = dynamic(() => import('@/components/CustomCursor'), { ssr: false });
const EcosystemTaskbar = dynamic(() => import('@/components/EcosystemTaskbar'), { ssr: false });

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ToastProvider>
          <ProjectProvider>
            <CustomCursor />
            <EcosystemTaskbar />
            {children}
          </ProjectProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
