import { PixelLoader } from '@/components/brand/PixelLoader';

export default function EditorLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <PixelLoader variant="orbit" size={72} label="Loading ScriptOS" />
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 'var(--caps-track)', color: 'var(--fg-muted)', textTransform: 'var(--caps)' }}>Loading ScriptOS...</div>
    </div>
  );
}