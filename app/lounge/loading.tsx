export default function LoungeLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        color: 'var(--fg)',
        gap: 24,
        padding: 40,
      }}
    >
      {/* Pulse indicator */}
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#10b981',
          boxShadow: '0 0 12px #10b981',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      {/* Skeleton chat channels */}
      <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 900 }}>
        <div
          style={{
            width: 200,
            height: 420,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
            flexShrink: 0,
          }}
        />
        <div
          style={{
            flex: 1,
            height: 420,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            padding: 16,
          }}
        >
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 40,
                width: `${40 + Math.random() * 50}%`,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 6,
              }}
            />
          ))}
        </div>
      </div>
      {/* Skeleton input bar */}
      <div
        style={{
          width: '100%',
          maxWidth: 900,
          height: 48,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      />
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          opacity: 0.4,
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}
      >
        ENTERING LOUNGE...
      </span>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}