export default function StudioLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '80px 24px 40px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
          <div>
            <div style={{ width: 90, height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.05)', marginBottom: 10 }} />
            <div style={{ width: 220, height: 28, borderRadius: 6, background: 'rgba(255,255,255,0.06)' }} />
          </div>
          <div style={{ width: 120, height: 32, borderRadius: 9999, background: 'rgba(255,255,255,0.05)' }} />
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 36, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 12 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ width: 84, height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 160, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes mc-pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }`}</style>
    </div>
  );
}