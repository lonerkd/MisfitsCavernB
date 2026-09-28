'use client';

// Pick a project format (public.project_formats) — as cards, with the
// selected format's phases laid out underneath so the choice shows what the
// project will go through, not just a name.

import React, { useRef } from 'react';
import { Clapperboard, Film, Globe, Megaphone, Mic, Music, Sparkles, Tv, Video, type LucideIcon } from 'lucide-react';
import { type ProjectFormat, findFormat, formatPhases, useFormats } from '@/lib/formats';
import { SCRIPT_FORMAT_LABELS } from '@/lib/types/settings';
import styles from './formatPicker.module.css';

const ICONS: Record<string, LucideIcon> = {
  film: Film, clapperboard: Clapperboard, tv: Tv, globe: Globe, music: Music,
  video: Video, megaphone: Megaphone, mic: Mic, sparkles: Sparkles,
};

export function FormatIcon({ icon, size = 16 }: { icon: string | null | undefined; size?: number }) {
  const Icon = (icon && ICONS[icon]) || Film;
  return <Icon size={size} aria-hidden />;
}

/** Icon for a format by name, once the list has loaded. */
export function useFormatIcon(name: string | null | undefined): string | null {
  const { formats } = useFormats();
  return findFormat(formats, name)?.icon ?? null;
}

export function FormatPicker({ value, onChange, label = 'Format', disabled }: {
  value: string;
  onChange: (name: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  const { formats, loading } = useFormats();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = findFormat(formats, value);
  const index = formats.findIndex((f) => f.name === selected?.name);

  // Arrow keys move between cards (roving tab index, as a radio group does).
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + formats.length) % formats.length;
    onChange(formats[next].name);
    refs.current[next]?.focus();
  };

  return (
    <div className={styles.wrap}>
      <div id="format-picker-label" className={styles.label}>{label}</div>
      {loading && !formats.length ? (
        <div className={styles.loading}>Loading formats…</div>
      ) : (
        <div role="radiogroup" aria-labelledby="format-picker-label" className={styles.grid}>
          {formats.map((f, i) => {
            const on = f.name === selected?.name;
            return (
              <button
                key={f.name}
                ref={(el) => { refs.current[i] = el; }}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on || (index === -1 && i === 0) ? 0 : -1}
                disabled={disabled}
                className={`${styles.card} ${on ? styles.cardOn : ''}`}
                onClick={() => onChange(f.name)}
                onKeyDown={(e) => onKeyDown(e, i)}
              >
                <span className={styles.icon}><FormatIcon icon={f.icon} /></span>
                <span className={styles.name}>{f.name}</span>
              </button>
            );
          })}
        </div>
      )}
      {selected && <FormatJourney format={selected} />}
    </div>
  );
}

/** What a project in this format goes through: its phases and the script it starts with. */
export function FormatJourney({ format }: { format: ProjectFormat }) {
  const phases = formatPhases(format);
  return (
    <div className={styles.journey} aria-live="polite">
      {format.blurb && <p className={styles.blurb}>{format.blurb}</p>}
      <ol className={styles.phases} aria-label={`${format.name} phases`}>
        {phases.map((p, i) => (
          <li key={p.id} className={styles.phase}>
            <span className={styles.phaseNum}>{i + 1}</span>
            {p.label}
          </li>
        ))}
      </ol>
      <p className={styles.meta}>Scripts start as a {SCRIPT_FORMAT_LABELS[format.script_format].toLowerCase()}.</p>
    </div>
  );
}
