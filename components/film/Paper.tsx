import React from 'react';
import f from './film.module.css';

/** A form: cream, ruled, heavy type. For the documents people fill in and send. */
export function Paper({ children, underSky = false, className, ...rest }: React.HTMLAttributes<HTMLDivElement> & { underSky?: boolean }) {
  return <div {...rest} className={[f.paper, underSky ? f.paperUnderSky : '', className].filter(Boolean).join(' ')}>{children}</div>;
}

/** A form's section label, with an optional right-hand figure (e.g. "2/8 pg"). */
export function PaperHead({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return <div className={`${f.label} ${f.head}`}><span>{children}</span>{aside != null && <span>{aside}</span>}</div>;
}
