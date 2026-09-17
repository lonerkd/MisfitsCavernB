export default function PortfolioLoading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--fg)', padding: '80px 24px 40px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={{ width: 200, height: 30, borderRadius: 6, background: 'rgba(255,255,255,0.06)', margin: '0 auto 32px' }} />
        <div style={{ columns: '280px 3', columnGap: 20 }}>
          {[...Array(9)].map((_, i) => (
            <div key={i} style={{ breakInside: 'avoid', marginBottom: 20, height: 120 + (i % 3) * 60, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}