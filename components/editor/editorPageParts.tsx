'use client';

import React from 'react';
import type { ScriptLine, LineType } from '@/types/screenplay';
import { TYPE_COLORS } from '@/components/editor/editorConstants';

export const PRINT_COLORS: Record<string, string> = {
  slug: '#000',
  character: '#000',
  dialogue: '#000',
  parenthetical: '#000',
  transition: '#000',
  action: '#000',
  note: '#888'
};

export const TEMPLATES: Record<string, string> = {
  'blank': '',
  'feature': `FADE IN:

EXT. CITY SKYLINE - DAWN

The sun barely crests the horizon. A new day. A new beginning.

INT. APARTMENT - CONTINUOUS

PROTAGONIST (30s, determined) sits at the edge of a bed.

PROTAGONIST
Today is the day.

CUT TO:

EXT. STREET - DAY

Protagonist walks with purpose. The world moves around them.
`,
  'short': `FADE IN:

INT. ROOM - NIGHT

A single lamp illuminates a desk. Papers everywhere.

CHARACTER sits, staring at something we can't see.

CHARACTER
(whispers)
It was always going to end this way.

FADE OUT.
`,
  'tv-cold-open': `COLD OPEN

FADE IN:

EXT. LOCATION - NIGHT

Establishing shot. Tension in the air.

INT. LOCATION - CONTINUOUS

CHARACTER A enters. Stops dead.

CHARACTER A
What happened here?

CHARACTER B (O.S.)
You don't want to know.

SMASH CUT TO:

MAIN TITLES

END COLD OPEN
`,
};

export const PLACEHOLDER = `Start writing — try "FADE IN:" or "INT. LOCATION - DAY"`;

export const TRANSITIONS = ['CUT TO:', 'FADE IN:', 'FADE OUT.', 'FADE TO BLACK.', 'DISSOLVE TO:', 'SMASH CUT TO:', 'MATCH CUT TO:', 'INTERCUT WITH:', 'JUMP CUT TO:', 'TIME CUT:'];

export const ELEMENT_STATUS: Record<string, { label: string; hint: string }> = {
  slug: { label: 'Scene Heading', hint: 'Enter → Action' },
  action: { label: 'Action', hint: 'Enter → Action · Tab → Character' },
  character: { label: 'Character', hint: 'Enter → Dialogue' },
  dialogue: { label: 'Dialogue', hint: 'Enter → Character · Tab → Parenthetical' },
  parenthetical: { label: 'Parenthetical', hint: 'Enter → Dialogue' },
  transition: { label: 'Transition', hint: 'Enter → Scene Heading' },
  shot: { label: 'Shot', hint: 'Enter → Action' },
  empty: { label: 'New Line', hint: 'Tab → cycle element type' },
};

export const MAX_HISTORY = 50;

export const TAB_TYPE_CYCLE: LineType[] = ['action', 'character', 'parenthetical', 'dialogue', 'transition'];

export function stripLineDecoration(text: string): string {
  return text.trim().replace(/^\(/, '').replace(/\)$/, '').replace(/\s+TO:$/i, '').trim();
}

export function toSentenceCase(text: string): string {
  const wasAllCaps = text === text.toUpperCase() && /[A-Z]/.test(text);
  return wasAllCaps ? text.charAt(0) + text.slice(1).toLowerCase() : text;
}

export function transformLineForType(text: string, type: LineType): string {
  const bare = stripLineDecoration(text);
  switch (type) {
    case 'character':
      return bare.toUpperCase();
    case 'parenthetical':
      return `(${bare.toLowerCase()})`;
    case 'transition':
      return /\bTO:$/i.test(bare) ? bare.toUpperCase() : `${bare.toUpperCase()} TO:`;
    case 'dialogue':
    case 'action':
    default:
      return toSentenceCase(bare);
  }
}

export function LinePreview({ line, index, nightModePreview, sceneNumber, showSceneNumbers }: { line: ScriptLine; index: number; nightModePreview: boolean; sceneNumber?: number; showSceneNumbers?: boolean }) {
  const style: React.CSSProperties = {
    fontFamily: 'Courier Prime, Courier, monospace',
    fontSize: 14,
    lineHeight: '1.7',
    color: nightModePreview
      ? (line.type === 'slug' || line.type === 'character' ? '#fff' : '#ccc')
      : (PRINT_COLORS[line.type] || '#000'),
    fontWeight: (line.type === 'slug' || line.type === 'character') ? 700 : 400,
    textTransform: (line.type === 'slug' || line.type === 'character' || line.type === 'transition') ? 'uppercase' : 'none',
    marginBottom: 2,
    padding: '2px 0',
    whiteSpace: 'pre-wrap',
  };

  let displayContent = line.text;

  if (displayContent.includes('[[') && displayContent.includes(']]')) {
    style.color = TYPE_COLORS.note;
    style.background = 'rgba(234, 179, 8, 0.1)';
    style.padding = '4px 8px';
    style.borderRadius = '4px';
    style.borderLeft = '2px solid #eab308';
  }

  const contd = line.meta?.isContinued;

  if (line.type === 'slug') {
    return (
      <div style={{ ...style, position: 'relative', fontWeight: 700, textTransform: 'uppercase', marginTop: index > 0 ? 24 : 0, marginBottom: 8, background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: 4 }}>
        {showSceneNumbers && sceneNumber != null && (
          <>
            <span style={{ position: 'absolute', left: -44, fontSize: 12, fontWeight: 400, color: nightModePreview ? '#888' : '#999' }}>{sceneNumber}</span>
            <span style={{ position: 'absolute', right: -44, fontSize: 12, fontWeight: 400, color: nightModePreview ? '#888' : '#999' }}>{sceneNumber}</span>
          </>
        )}
        {displayContent}
      </div>
    );
  }
  if (line.type === 'character') {
    const name = line.meta?.isDualDialogue ? displayContent.replace(/^\^/, '') : displayContent;
    return <div style={{ ...style, marginLeft: '22ch', textTransform: 'uppercase', fontWeight: 600, marginTop: 16, marginBottom: 0 }}>{name}{contd ? " (CONT'D)" : ''}</div>;
  }
  if (line.type === 'dialogue') {
    return <div style={{ ...style, marginLeft: '10ch', marginRight: '15ch', marginBottom: 12 }}>{displayContent}</div>;
  }
  if (line.type === 'parenthetical') {
    return <div style={{ ...style, marginLeft: '16ch', marginRight: '20ch', fontStyle: 'italic', opacity: 0.6, marginBottom: 0 }}>{displayContent}</div>;
  }
  if (line.type === 'transition') {
    return <div style={{ ...style, textAlign: 'right', fontWeight: 700, textTransform: 'uppercase', marginTop: 16, marginBottom: 16 }}>{displayContent}</div>;
  }

  return <div style={style}>{displayContent || <span style={{ opacity: 0.2 }}>—</span>}</div>;
}
