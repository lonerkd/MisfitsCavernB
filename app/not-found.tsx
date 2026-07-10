import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', color: 'var(--fg)', padding: 24, textAlign: 'center', gap: 18,
    }}>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 3, color: 'var(--accent)', textTransform: 'uppercase' }}>
        404
      </span>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: '1.6rem', letterSpacing: 2, margin: 0, maxWidth: 480 }}>
        This page doesn&apos;t exist.
      </h1>
      <p style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--fg-muted)', maxWidth: 440 }}>
        Check the link, or head back home.
      </p>
      <Link
        href="/"
        style={{
          padding: '10px 22px', borderRadius: 9999, background: 'var(--accent)', color: '#040710',
          border: 'none', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2,
          textTransform: 'uppercase', fontWeight: 600, textDecoration: 'none', marginTop: 8,
        }}
      >
        Go Home
      </Link>
    </div>
  );
}
