import Link from 'next/link';
import { LEGAL } from '@/lib/legal/legal';

// The frame both legal pages share: a readable column, the date they took
// effect, and a way to the other page and back into the suite.
export function LegalPage({ title, other, children }: {
  title: string;
  other: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="mc-legal">
      <nav className="mc-legal-nav" aria-label="Legal">
        <Link href="/">← {LEGAL.product}</Link>
        <Link href={other.href}>{other.label}</Link>
      </nav>
      <article>
        <h1>{title}</h1>
        <p className="mc-legal-meta">In effect from {LEGAL.effective} · {LEGAL.operator}, {LEGAL.province}, {LEGAL.country}</p>
        {children}
      </article>
    </div>
  );
}

export function Contact() {
  return (
    <>
      <a href={LEGAL.contactUrl} target="_blank" rel="noopener noreferrer">{LEGAL.contactLabel}</a>
      {' or '}
      <a href={LEGAL.contactAltUrl} target="_blank" rel="noopener noreferrer">{LEGAL.contactAltLabel}</a>
    </>
  );
}
