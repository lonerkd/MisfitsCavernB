'use client';

import React from 'react';
import type { ScriptKnowledge } from '@/lib/scriptos/knowledge';

const label: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)' as never, margin: '0 0 6px' };
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, color: 'var(--fg)', padding: '3px 0', overflowWrap: 'anywhere' };
const dim: React.CSSProperties = { color: 'var(--fg-muted)', fontSize: 11 };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** True when the script holds anything this panel would show. */
export const hasKnowledge = (k: ScriptKnowledge): boolean =>
  k.languages.length > 0 || k.eras.length > 0 || k.frames.length > 0 || k.timeJumpsBack > 0 || k.vocabulary.cueTags.length > 0 || k.vocabulary.headingTails.length > 0;

/**
 * What the reader has learned about this script that goes beyond its cast: the languages spoken and by whom, the years the headings name,
 * the layers of a story told in layers, the places it keeps returning to, and what it wrote that the reader did not recognise (so a person
 * can see what was set aside). Shown only where the script has something to show. Nothing here is written anywhere.
 */
export function ScriptKnowledgePanel({ knowledge: k, previousDraft }: { knowledge: ScriptKnowledge; previousDraft?: { same: number; differs: number } }) {
  const earlier = previousDraft && previousDraft.same + previousDraft.differs > 0 ? previousDraft : null;
  if (!hasKnowledge(k) && k.places.length === 0 && !earlier) return null;
  const places = k.places.slice(0, 8);
  return (
    <details aria-label="What the reader knows" style={{ margin: '0 0 24px' }}>
      <summary style={{ ...label, cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}>What the reader knows</summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6 }}>
        {earlier && (
          <section aria-label="Previous draft">
            <h4 style={label}>The previous draft</h4>
            <div style={row}><span>Lines read the same way as in the previous draft</span><span style={dim}>{earlier.same}</span></div>
            {earlier.differs > 0 && <div style={row}><span>Lines the previous draft read as something else</span><span style={dim}>{earlier.differs}</span></div>}
            <div style={{ ...row, ...dim }}>A line it was sure of is the better guess when this one is not.</div>
          </section>
        )}
        {k.languages.length > 0 && (
          <section aria-label="Languages">
            <h4 style={label}>Languages</h4>
            {k.languages.map((l) => (
              <div key={l.language} style={row}>
                <span>{l.language} <span style={dim}>· {l.speakers.join(', ')}</span></span>
                <span style={dim}>{plural(l.speeches, 'speech', 'speeches')}, {plural(l.scenes.length, 'scene')}</span>
              </div>
            ))}
            {k.untaggedSpeeches > 0 && <div style={{ ...row, ...dim }}>{plural(k.untaggedSpeeches, 'speech', 'speeches')} in the script’s own language</div>}
          </section>
        )}
        {k.eras.length > 0 && (
          <section aria-label="Eras">
            <h4 style={label}>Years in the headings</h4>
            {k.eras.map((e) => <div key={e.year} style={row}><span>{e.year}</span><span style={dim}>{plural(e.scenes, 'scene')}</span></div>)}
            {k.timeJumpsBack > 0 && <div style={{ ...row, ...dim }}>The story jumps back in time {plural(k.timeJumpsBack, 'time')}</div>}
          </section>
        )}
        {k.frames.length > 0 && (
          <section aria-label="Layers">
            <h4 style={label}>Layers</h4>
            {k.frames.map((f) => <div key={f.frame} style={row}><span>{f.frame}</span><span style={dim}>{plural(f.scenes.length, 'scene')}</span></div>)}
          </section>
        )}
        {places.length > 0 && (
          <section aria-label="Places">
            <h4 style={label}>Places</h4>
            {places.map((p) => (
              <div key={p.place} style={row}>
                <span>{p.place}{p.qualifiers.length > 0 && <span style={dim}> · {p.qualifiers.slice(0, 3).join(', ')}</span>}</span>
                <span style={dim}>{plural(p.scenes, 'scene')}</span>
              </div>
            ))}
            {k.places.length > places.length && <div style={{ ...row, ...dim }}>and {k.places.length - places.length} more</div>}
          </section>
        )}
        {(k.vocabulary.cueTags.length > 0 || k.vocabulary.headingTails.length > 0) && (
          <section aria-label="Not recognised">
            <h4 style={label}>The reader set these aside</h4>
            {k.vocabulary.cueTags.map((t) => <div key={`c-${t.tag}`} style={row}><span>({t.tag}) on a cue</span><span style={dim}>{t.count}×</span></div>)}
            {k.vocabulary.headingTails.map((t) => <div key={`h-${t.tail}`} style={row}><span>“{t.tail}” ending a heading <span style={dim}>(read as a {t.treatedAs})</span></span><span style={dim}>{t.count}×</span></div>)}
          </section>
        )}
      </div>
    </details>
  );
}
