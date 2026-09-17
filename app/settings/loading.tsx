export default function SettingsLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '80px 24px 40px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ width: 140, height: 26, borderRadius: 6, background: 'rgba(255,255,255,0.06)', marginBottom: 28 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 52, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}