export default function SoundtrackLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 180, height: 180, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ width: 200, height: 16, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ width: 140, height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
      </div>
    </div>
  );
}