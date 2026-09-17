export default function ProfileLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '80px 24px 40px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div>
            <div style={{ width: 160, height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }} />
            <div style={{ width: 100, height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 70, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}