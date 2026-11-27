'use client';

import React from 'react';
import { UserCheck, UserX } from 'lucide-react';
import type { ScriptKnowledge } from '@/lib/scriptos/knowledge';
import { PERSON_SOURCE_LABEL, hasSuiteUse, type SuiteUse } from '@/lib/scriptos/suite-priors';
import { SCRIPT_FORMAT_REGISTRY, isScriptFormat } from '@/lib/formats/script-formats';
import { readingFormat } from '@/lib/scriptos/reading-format';
import { useToast } from '@/components/ui/Toast';
import { studio, type ReadingCorrection } from '@/lib/studio';

const label: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 'max(8px, var(--mc-min-font, 0px))', color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)' as never, margin: '0 0 6px' };
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12, color: 'var(--fg)', padding: '3px 0', overflowWrap: 'anywhere' };
const dim: React.CSSProperties = { color: 'var(--fg-muted)', fontSize: 11 };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const btn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, minHeight: 32, padding: '4px 9px', borderRadius: 8, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(var(--ink-rgb), 0.14)', color: 'var(--fg)', fontSize: 12 };
const formatLabel = (f: string) => (isScriptFormat(f) ? SCRIPT_FORMAT_REGISTRY[f].label : f);

/**
 * What the rest of the suite told the reader (lib/scriptos/suite-priors.ts), and what it did with it: the names it believed and
 * where each came from, the lines it kept from being read as speakers because the production names the thing, the names where the
 * script and the breakdown disagree, and what a person's own word overruled. A name can be settled here for the whole project,
 * the same verdict the doubtful-reads list saves.
 */
function FromTheProject({ suite, projectId, onCorrected, format }: { suite?: SuiteUse; projectId?: string | null; onCorrected?: (row: ReadingCorrection) => void; format?: string | null }) {
  const { toast } = useToast();
  const [saving, setSaving] = React.useState<string | null>(null);
  const settle = async (name: string, kind: 'character' | 'not_character') => {
    if (!projectId || saving) return;
    setSaving(name);
    try {
      const row = await studio.setReadingCorrection(projectId, name, kind);
      onCorrected?.(row);
      toast(kind === 'character' ? `${name} is read as a character` : `${name} is not read as a character any more`, 'success');
    } catch (e) {
      toast((e as { message?: string } | null)?.message || 'Could not save that', 'error');
    } finally {
      setSaving(null);
    }
  };
  const read = format ? readingFormat(format) : null;
  return (
    <section aria-label="From the project">
      <h4 style={label}>From the project</h4>
      {format && (
        <div style={row}>
          <span>Written as {formatLabel(format)}{read && read !== format && <span style={dim}> · read with the {formatLabel(read).toLowerCase()} rules</span>}</span>
        </div>
      )}
      {suite?.vouched.map((v) => (
        <div key={`v-${v.name}`} style={row}>
          <span>{v.name} <span style={dim}>· {v.said.join(', ')}</span></span>
          <span style={dim}>{plural(v.cues, 'cue')}</span>
        </div>
      ))}
      {suite?.heldBack.map((h) => (
        <div key={`h-${h.name}`} style={{ ...row, flexWrap: 'wrap' }}>
          <span>{h.name} <span style={dim}>· {h.category} in the breakdown, so not read as a speaker</span></span>
          <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <span style={dim}>{plural(h.lines, 'line')}</span>
            {projectId && <button type="button" style={btn} disabled={saving === h.name} onClick={() => void settle(h.name, 'character')}><UserCheck size={12} aria-hidden /> It’s a character</button>}
          </span>
        </div>
      ))}
      {suite?.disagreements.map((d) => (
        <div key={`d-${d.name}`} style={{ ...row, flexWrap: 'wrap' }}>
          <span>{d.name} <span style={dim}>· {d.category} in the breakdown, but the script has it speak: which is it?</span></span>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={dim}>{plural(d.cues, 'cue')}</span>
            {projectId && <button type="button" style={btn} disabled={saving === d.name} onClick={() => void settle(d.name, 'character')}><UserCheck size={12} aria-hidden /> A character</button>}
            {projectId && <button type="button" style={btn} disabled={saving === d.name} onClick={() => void settle(d.name, 'not_character')}><UserX size={12} aria-hidden /> Not a character</button>}
          </span>
        </div>
      ))}
      {suite?.overruled.map((o) => (
        <div key={`o-${o.name}-${o.said}`} style={{ ...row, ...dim }}>
          <span>
            {o.name}: {o.said === 'thing' ? 'the breakdown lists it as a thing' : `the project has it ${PERSON_SOURCE_LABEL[o.said]}`}, but {o.because === 'not_character' ? 'a person said it is not a character' : 'it is a character'}, and that stands
          </span>
        </div>
      ))}
      {suite && suite.told.people + suite.told.things > 0 && (
        <div style={{ ...row, ...dim }}>The reader weighed {plural(suite.told.people, 'name')} and {plural(suite.told.things, 'thing')} the suite knows. A person’s own word always wins.</div>
      )}
    </section>
  );
}

/** True when the script holds anything this panel would show. */
export const hasKnowledge = (k: ScriptKnowledge): boolean =>
  k.languages.length > 0 || k.eras.length > 0 || k.frames.length > 0 || k.timeJumpsBack > 0 || k.vocabulary.cueTags.length > 0 || k.vocabulary.headingTails.length > 0;

/**
 * What the reader has learned about this script that goes beyond its cast: the languages spoken and by whom, the years the headings name,
 * the layers of a story told in layers, the places it keeps returning to, and what it wrote that the reader did not recognise (so a person
 * can see what was set aside). Shown only where the script has something to show. Nothing here is written anywhere.
 */
export function ScriptKnowledgePanel({ knowledge: k, previousDraft, suite, projectId, onCorrected, format }: {
  knowledge: ScriptKnowledge;
  previousDraft?: { same: number; differs: number };
  /** What the rest of the suite added to the reading (suite-priors.ts suiteUse). */
  suite?: SuiteUse;
  projectId?: string | null;
  onCorrected?: (row: ReadingCorrection) => void;
  /** The script's own format. */
  format?: string | null;
}) {
  const earlier = previousDraft && previousDraft.same + previousDraft.differs > 0 ? previousDraft : null;
  const fromProject = !!format || (!!suite && hasSuiteUse(suite));
  if (!hasKnowledge(k) && k.places.length === 0 && !earlier && !fromProject) return null;
  const places = k.places.slice(0, 8);
  return (
    <details aria-label="What the reader knows" style={{ margin: '0 0 24px' }}>
      <summary style={{ ...label, cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}>What the reader knows</summary>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6 }}>
        {fromProject && <FromTheProject suite={suite} projectId={projectId} onCorrected={onCorrected} format={format} />}
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
