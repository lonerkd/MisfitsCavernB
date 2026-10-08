'use client';

// "Put The Cavern on your Home Screen." iOS has no install prompt, so on an
// iPhone in Safari this says how (Share → Add to Home Screen); where the
// browser offers its own prompt (Chrome, Edge) it's an Install button. Not
// shown once installed, and "Not now" holds for this device.

import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { installHint, type InstallHint as Hint } from '@/lib/pwa/install';
import { useDeviceValue, writeDeviceValue } from '@/lib/hooks/useDeviceValue';
import { useHydrated } from '@/lib/hooks/useSearchParam';
import m from './mobile.module.css';

const DISMISSED = 'mc_install_hint_dismissed';

interface PromptEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

function currentHint(canPrompt: boolean): Hint {
  const nav = navigator as Navigator & { standalone?: boolean };
  return installHint({
    userAgent: nav.userAgent,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    standalone: nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches,
    canPrompt,
  });
}

export function InstallHint({ className = '' }: { className?: string }) {
  const hydrated = useHydrated();
  const dismissed = useDeviceValue(DISMISSED) === '1';
  const [prompt, setPrompt] = useState<PromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as PromptEvent); };
    const onInstalled = () => setPrompt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  if (!hydrated || dismissed) return null;
  const hint = currentHint(!!prompt);
  if (!hint) return null;

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null);
    if (outcome === 'dismissed') writeDeviceValue(DISMISSED, '1');
  };

  return (
    <aside className={`${m.continueCard} ${className}`} aria-label="Put The Cavern on your Home Screen">
      {hint === 'ios-share' ? <Share size={18} className={m.continueIcon} aria-hidden /> : <Download size={18} className={m.continueIcon} aria-hidden />}
      {hint === 'ios-share' ? (
        <div className={m.continueBody}>
          <span className={m.continueFrom}>Use it like an app</span>
          <span className={m.continueLabel}>Tap Share, then “Add to Home Screen” — full screen, works on set offline.</span>
        </div>
      ) : (
        <button type="button" className={m.continueBody} onClick={() => void install()}>
          <span className={m.continueFrom}>Use it like an app</span>
          <span className={m.continueLabel}>Install The Cavern</span>
        </button>
      )}
      <button type="button" className={m.continueX} onClick={() => writeDeviceValue(DISMISSED, '1')} aria-label="Not now"><X size={15} /></button>
    </aside>
  );
}
