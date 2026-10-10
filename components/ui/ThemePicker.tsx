'use client';

// Settings › Appearance: the look of the whole suite. Each card is a small
// preview of the theme; the choice applies at once and is saved to the
// account (ui_prefs.theme) so every device follows it. System follows the
// device's light/dark setting; Custom takes a background and an accent and
// works out readable text from them.

import React, { useEffect, useState } from 'react';
import { Check, Monitor } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { saveUiPrefs } from '@/lib/os/uiPrefs';
import { THEMES, THEME_EVENT, applyTheme, readLocalTheme, writeLocalTheme, type ThemeChoice } from '@/lib/themes/themes';
import t from './themePicker.module.css';

function Preview({ swatch }: { swatch: [string, string, string] }) {
  const [bg, fg, accent] = swatch;
  return (
    <span className={t.preview} style={{ background: bg, color: fg }} aria-hidden>
      <span className={t.previewText}>Aa</span>
      <span className={t.previewBar} style={{ background: accent }} />
      <span className={t.previewLine} style={{ background: fg }} />
    </span>
  );
}

export function ThemePicker({ signedIn }: { signedIn: boolean }) {
  const { toast } = useToast();
  const [choice, setChoice] = useState<ThemeChoice>({ id: 'default' });
  const [bg, setBg] = useState('#101010');
  const [accent, setAccent] = useState('#e8431a');

  useEffect(() => {
    const sync = () => {
      const c = readLocalTheme();
      setChoice(c);
      if (c.id === 'custom') { setBg(c.bg); setAccent(c.accent); }
    };
    sync();
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  const choose = (next: ThemeChoice) => {
    setChoice(next);
    writeLocalTheme(next);
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
    if (signedIn) {
      saveUiPrefs({ theme: next }).catch((e) => toast(e instanceof Error ? e.message : 'Could not save the theme to your account', 'error'));
    }
  };
  const custom = (nextBg: string, nextAccent: string) => {
    setBg(nextBg); setAccent(nextAccent);
    if (/^#[0-9a-f]{6}$/i.test(nextBg) && /^#[0-9a-f]{6}$/i.test(nextAccent)) choose({ id: 'custom', bg: nextBg.toLowerCase(), accent: nextAccent.toLowerCase() });
  };

  const card = (id: string, label: string, hint: string, visual: React.ReactNode, onPick: () => void) => {
    const on = choice.id === id;
    return (
      <button key={id} type="button" role="radio" aria-checked={on} className={t.card} onClick={onPick}>
        {visual}
        <span className={t.label}>{label}{on && <Check size={12} aria-hidden className={t.check} />}</span>
        <span className={t.hint}>{hint}</span>
      </button>
    );
  };

  return (
    <div className={t.wrap}>
      <div className={t.grid} role="radiogroup" aria-label="Theme">
        {card('system', 'System', 'Cavern in the dark, Paper in the light — follows your device',
          <span className={t.preview} aria-hidden style={{ background: 'linear-gradient(135deg, #040710 50%, #f6f1e7 50%)' }}><Monitor size={16} className={t.systemIcon} /></span>,
          () => choose({ id: 'system' }))}
        {THEMES.map((th) => card(th.id, th.label, th.hint, <Preview swatch={th.swatch} />, () => choose({ id: th.id })))}
        {card('custom', 'Custom', 'Your background and accent', <Preview swatch={[bg, '#888888', accent]} />, () => custom(bg, accent))}
      </div>
      {choice.id === 'custom' && (
        <div className={t.custom}>
          <label className={t.field}>
            <span>Background</span>
            <input type="color" value={bg} onChange={(e) => custom(e.target.value, accent)} aria-label="Custom background colour" />
            <code>{bg}</code>
          </label>
          <label className={t.field}>
            <span>Accent</span>
            <input type="color" value={accent} onChange={(e) => custom(bg, e.target.value)} aria-label="Custom accent colour" />
            <code>{accent}</code>
          </label>
          <span className={t.hint}>Text and lines follow the background — dark text on a light one, light on a dark one.</span>
        </div>
      )}
      {!signedIn && <p className={t.hint}>Sign in to keep your theme on every device.</p>}
    </div>
  );
}
