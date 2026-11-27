import { PixelLoader } from '@/components/brand/PixelLoader';
export default function Loading() {
  return (
    <main id="main-content" tabIndex={-1} style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <PixelLoader variant="orbit" size={84} />
    </main>
  );
}
