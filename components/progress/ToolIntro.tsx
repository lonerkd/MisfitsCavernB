'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useUiPrefs } from '@/lib/os/uiPrefs';
import type { ToolState } from '@/lib/os/progress';
import { TOOL_ICON, accentVars } from './Bricks';
import p from './progress.module.css';

/**
 * One line the first time someone opens a tool that arrived after the
 * start — what it's for, and why it's here now. Dismissed once, for good
 * (profiles.ui_prefs.seen_tools).
 */
export function ToolIntro({ tool, accent, style }: { tool: ToolState | null; accent?: string | null; style?: React.CSSProperties }) {
  const { prefs, loaded, save } = useUiPrefs();
  const [gone, setGone] = useState(false);
  if (!tool || !loaded || gone || !tool.unlocked || tool.phaseIndex === 0 || prefs.seen_tools.includes(tool.id)) return null;
  const Icon = TOOL_ICON[tool.id];
  const dismiss = () => {
    setGone(true);
    void save({ seen_tools: [...prefs.seen_tools.filter((t) => t !== tool.id), tool.id].slice(-200) }).catch(() => setGone(false));
  };
  return (
    <aside className={p.intro} style={{ ...accentVars(accent), ...style }} aria-label={`New: ${tool.label}`}>
      <Icon size={15} aria-hidden className={p.introIcon} />
      <p className={p.introText}>
        <strong>New here: {tool.label}.</strong> {tool.blurb}{' '}
        <span className={p.introWhy}>{tool.early ? 'It opened early because the work has started.' : `It arrived with ${tool.phaseLabel}.`}</span>
      </p>
      <button type="button" className={p.introClose} onClick={dismiss} aria-label={`Got it — hide the note about ${tool.label}`}>
        Got it <X size={11} aria-hidden />
      </button>
    </aside>
  );
}
