import React from 'react';
import f from './film.module.css';

/** The state of a document, said once, like ink on a form (Draft, Issued v2). */
export function Stamp({ children, tone = 'limit', onSky = false, role }: {
  children: React.ReactNode;
  /** limit = needs attention, ink = neutral (on paper), quiet = neutral (on dark), ok = done. */
  tone?: 'limit' | 'ink' | 'ok' | 'quiet';
  /** On the sky header, where a darker red doesn't read. */
  onSky?: boolean;
  role?: 'status';
}) {
  const cls = [f.stamp, onSky ? f.stampSky : tone === 'ink' ? f.stampInk : tone === 'quiet' ? f.stampQuiet : tone === 'ok' ? f.stampOk : ''].filter(Boolean).join(' ');
  return <span className={cls} role={role}>{children}</span>;
}
