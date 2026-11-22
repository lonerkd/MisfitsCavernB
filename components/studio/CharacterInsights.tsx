'use client';

// What the script itself says about its characters, beside the bible: the consistency warnings, who talks to whom (a list first, then a
// diagram of the top twelve that scrolls inside its own box), and the character bible as a PDF. Everything is derived from the parse the
// bible already loaded; nothing new is stored. Loaded on demand (next/dynamic) so the Studio's first load does not grow.
import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Network } from 'lucide-react';
import { analyzeCharacters } from '@/lib/scriptos/characters';
import { checkCharacters, warningsFor } from '@/lib/scriptos/character-checks';
import { relationships, talksToMost, topCharacters, type RelationshipPair } from '@/lib/scriptos/relationships';
import { characterBibleDoc } from '@/lib/studio/character-bible-print';
import { PrintButton } from '@/components/ui/PrintButton';
import { CharacterWarnings } from '@/components/editor/CharacterWarnings';
import { useStudio } from './StudioContext';
import type { ScriptCharacter } from './production/useScriptCharacters';
import type { ScriptLine, Scene } from '@/lib/scriptos/types';
import s from './studio.module.css';

const SHOWN = 15;

export function CharacterInsights({ chars, reading }: { chars: ScriptCharacter[]; reading: { lines: ScriptLine[]; scenes: Scene[]; rejectedNames: string[] } }) {
  const { project, scriptId } = useStudio();
  const router = useRouter();
  const { lines, scenes, rejectedNames } = reading;
  const pairs = useMemo(() => relationships(lines, scenes, { rejectedNames }), [lines, scenes, rejectedNames]);
  const [all, setAll] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const top = useMemo(() => topCharacters(pairs, 12), [pairs]);
  const max = pairs[0]?.strength ?? 1;

  const buildDoc = () => {
    const stats = new Map(analyzeCharacters(lines, scenes).map((c) => [c.name.toUpperCase(), c]));
    const warnings = checkCharacters(lines, scenes, { rejectedNames });
    const rows = chars.map((c) => {
      const st = stats.get(c.name.toUpperCase());
      return {
        name: c.name, fullName: c.row?.full_name, age: c.row?.age, description: c.row?.description, backstory: c.row?.backstory,
        motivation: c.row?.motivation, arc: c.row?.arc, notes: c.row?.notes,
        scenes: st?.scenesIn.length ?? 0, lines: st?.dialogueLines ?? 0,
        talksTo: talksToMost(pairs, c.name, 3),
        warnings: warningsFor(warnings, c.name).map((w) => w.message),
      };
    }).sort((a, b) => b.lines - a.lines || a.name.localeCompare(b.name));
    return characterBibleDoc({
      project: project.title, accent: project.accent_color, logo: project.logo_url, characters: rows,
      generated: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
    });
  };

  return (
    <div data-testid="character-insights" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
      <div className={s.row} style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div className={s.panelTitle} style={{ margin: 0 }}><Network size={14} aria-hidden /> Who talks to whom</div>
        {chars.length > 0 && <PrintButton label="the character bible" build={buildDoc} />}
      </div>
      <p className={s.hint} style={{ margin: '6px 0 12px' }}>A turn is one character answering another; a shared scene is two of them speaking in it. Strength is two points a turn and one a shared scene.</p>

      {pairs.length === 0 ? (
        <p className={s.hint}>No two characters have spoken in the same scene yet.</p>
      ) : (
        <>
          <div role="region" aria-label="Relationships, strongest first" tabIndex={0} style={{ overflowX: 'auto' }}>
            <table data-testid="relationship-list" style={{ width: '100%', minWidth: 360, borderCollapse: 'collapse', fontSize: 12, color: 'var(--fg)' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--fg-muted)' }}>
                  <th scope="col" style={th}>Pair</th><th scope="col" style={{ ...th, textAlign: 'right' }}>Turns</th><th scope="col" style={{ ...th, textAlign: 'right' }}>Scenes</th><th scope="col" style={{ ...th, width: '34%' }}>Strength</th>
                </tr>
              </thead>
              <tbody>
                {(all ? pairs : pairs.slice(0, SHOWN)).map((p) => (
                  <tr key={`${p.a}|${p.b}`} data-testid="relationship-row" style={{ borderTop: '1px solid var(--border)' }}>
                    <th scope="row" style={{ ...th, textAlign: 'left', fontWeight: 500, color: 'var(--fg)' }}>{p.a} <span style={{ color: 'var(--fg-muted)' }}>&amp;</span> {p.b}</th>
                    <td style={{ ...td, textAlign: 'right' }}>{p.turns}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{p.scenes}</td>
                    <td style={td}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: '100%' }}>
                        <span aria-hidden style={{ display: 'block', height: 6, width: `${Math.max(6, Math.round((p.strength / max) * 100))}%`, maxWidth: 'calc(100% - 28px)', borderRadius: 4, background: 'var(--accent)' }} />
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.strength}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pairs.length > SHOWN && (
            <button type="button" className={`${s.btn} ${s.small}`} style={{ marginTop: 8 }} onClick={() => setAll((v) => !v)}>
              {all ? 'Show the strongest only' : `Show all ${pairs.length}`}
            </button>
          )}
          <Diagram pairs={pairs} top={top} picked={picked} onPick={setPicked} />
        </>
      )}

      <CharacterWarnings
        lines={lines} scenes={scenes} rejectedNames={rejectedNames} storageKey={scriptId ?? ''}
        jumpLabel="Open in the editor, line"
        onJump={(line) => { if (scriptId) router.push(`/editor?script=${scriptId}&line=${line}`); }}
      />
    </div>
  );
}

const th: React.CSSProperties = { padding: '6px 8px 6px 0', fontWeight: 500, fontSize: 11 };
const td: React.CSSProperties = { padding: '6px 8px 6px 0', fontVariantNumeric: 'tabular-nums' };

/** The top characters on a ring, joined by lines as thick as the pair is strong. Each node is a button: it shows that character's ties. */
function Diagram({ pairs, top, picked, onPick }: { pairs: RelationshipPair[]; top: string[]; picked: string | null; onPick: (n: string | null) => void }) {
  const size = 360, c = size / 2, r = 135;
  const pos = new Map(top.map((n, i) => { const a = (i / top.length) * Math.PI * 2 - Math.PI / 2; return [n, { x: c + r * Math.cos(a), y: c + r * Math.sin(a) }]; }));
  const edges = pairs.filter((p) => pos.has(p.a) && pos.has(p.b));
  const max = edges[0]?.strength ?? 1;
  const ties = picked ? talksToMost(pairs, picked, 5) : [];
  if (top.length < 2) return null;
  return (
    <div style={{ marginTop: 18 }}>
      <div className={s.hint} style={{ marginBottom: 6 }}>The {top.length} most connected. Choose a name to see who they talk to.</div>
      <div role="region" aria-label="Relationship diagram, scrolls sideways" tabIndex={0} style={{ overflow: 'auto', maxWidth: '100%', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--sunken)' }}>
        <svg data-testid="relationship-diagram" viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="group" aria-label="Who talks to whom: the list above has the same information" style={{ display: 'block', margin: '0 auto', minWidth: size }}>
          {edges.map((p) => {
            const a = pos.get(p.a)!, b = pos.get(p.b)!;
            const on = !picked || p.a === picked || p.b === picked;
            return <line key={`${p.a}|${p.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--fg-muted)" strokeWidth={0.75 + (p.strength / max) * 4} strokeLinecap="round" opacity={on ? 0.7 : 0.12} />;
          })}
          {top.map((n) => {
            const p = pos.get(n)!;
            const sel = picked === n;
            return (
              <g key={n} role="button" tabIndex={0} aria-pressed={sel} aria-label={`${n}: ${talksToMost(pairs, n, 1)[0] ? `talks most to ${talksToMost(pairs, n, 1)[0].name}` : 'no one yet'}`}
                onClick={() => onPick(sel ? null : n)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(sel ? null : n); } }}
                style={{ cursor: 'pointer', outline: 'none' }}>
                <title>{n}</title>
                <circle cx={p.x} cy={p.y} r={sel ? 9 : 7} fill={sel ? 'var(--accent)' : 'var(--surface)'} stroke="var(--accent)" strokeWidth={2} />
                <text x={p.x} y={p.y + (p.y < c ? -13 : 20)} textAnchor="middle" fontSize={10} fill="var(--fg)" style={{ fontFamily: 'var(--mono)' }}>{n.length > 11 ? `${n.slice(0, 10)}…` : n}</text>
              </g>
            );
          })}
        </svg>
      </div>
      {picked && (
        <p className={s.hint} style={{ marginTop: 8 }} role="status">
          {picked} talks to {ties.length ? ties.map((t) => `${t.name} (${t.strength})`).join(', ') : 'no one yet'}.
        </p>
      )}
    </div>
  );
}
