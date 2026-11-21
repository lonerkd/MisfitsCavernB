'use client';

// The script supervisor's tool: the take log (scene, shot, take, slate, lens, the lines it covers, circled when it is the one to
// print), the lined script (the scene's lines with a vertical bar for each take that covers them, and the lines no selected take
// covers), and the selected takes the editor should use. Records are `production_records` of kind scriptNotes; no table of its own.
import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Plus, Trash2, Star } from 'lucide-react';
import { useSettingsList } from './useSettingsList';
import { SceneLinkField, useRecordTargets } from './RecordLinks';
import { sceneChip } from '@/lib/studio/record-links';
import { circleTake, coverage, formatDuration, selectedTakes, shotRunTime, takeSpan, type ScriptTake } from '@/lib/studio/lined-script';
import { liningLines, type LiningLine } from '@/lib/film/lining-lines';
import { linesByScene } from '@/lib/film/my-sides';
import { fetchScriptForReading } from '@/lib/studio';
import { loadReadingContext } from '@/lib/studio/reading-context';
import { parseScript } from '@/lib/scriptos/parser';
import { readingFormat } from '@/lib/scriptos/reading-format';
import { useSignedUrls } from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { ToolHeader } from '../ToolHeader';
import s from '../studio.module.css';

type Draft = Omit<ScriptTake, 'id'> & { slate: string; lens: string; notes: string; scene: string };
const EMPTY: Draft = { scene: '', take: '', slate: '', lens: '', notes: '', circle: false, shot_id: null, from_line: null, to_line: null, off_camera: false, media_id: null, duration_s: null };
const num = (v: string): number | null => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : null; };

/** The lines of one scene as the supervisor numbers them (blank lines and the heading are not numbered). */
function useSceneLines(scene: { id: string; script_id: string | null; heading: string | null; title: string | null; scene_number: number; ordinal: number | null } | null) {
  const [read, setRead] = useState<{ key: string; lines: LiningLine[]; error: boolean } | null>(null);
  const key = scene ? `${scene.id}:${scene.script_id}` : null;
  useEffect(() => {
    if (!scene?.script_id || !key) return;
    let live = true;
    Promise.all([fetchScriptForReading(scene.script_id), loadReadingContext(scene.script_id)]).then(([{ content, format }, context]) => {
      if (!live) return;
      const parsed = parseScript(content, readingFormat(format), undefined, { context });
      const sceneLines = parsed.scenes.map((sc) => ({ heading: sc.heading, lines: parsed.lines.slice(sc.startIndex, sc.endIndex + 1).map((l) => ({ type: l.type, text: l.text })) }));
      const found = linesByScene([{ id: scene.id, heading: scene.heading, title: scene.title, scene_number: scene.scene_number, ordinal: scene.ordinal }], sceneLines);
      setRead({ key, lines: liningLines(found.get(scene.id) ?? []), error: false });
    }).catch(() => { if (live) setRead({ key, lines: [], error: true }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (!scene || !key) return { lines: null as LiningLine[] | null, error: false };
  if (!scene.script_id) return { lines: [] as LiningLine[], error: false };
  // Until this scene's own read arrives the previous scene's lines must not show under it.
  return read && read.key === key ? { lines: read.lines, error: read.error } : { lines: null as LiningLine[] | null, error: false };
}

export function ScriptSupView() {
  const { project, shots, media } = useStudio();
  const { items, shown, save, remove } = useSettingsList('scriptNotes');
  const t = useRecordTargets();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [lined, setLined] = useState<string>('');

  const takes = items as unknown as Array<ScriptTake & { id: string }>;
  const shownTakes = shown as unknown as Array<ScriptTake & { id: string }>; // the take rows the person sees (search-narrowed)
  const shotsOf = (sceneId: string | undefined) => (sceneId ? shots.rows.filter((x) => x.scene_id === sceneId) : []);
  const shotName = (id: string) => shots.rows.find((x) => x.id === id)?.shot_number ?? null;
  const draftScene = draft.scene_ids?.[0];
  // Continuity photos come from the project's library (images only), and show on the take that carries one.
  const images = useMemo(() => media.rows.filter((m) => m.kind === 'image'), [media.rows]);
  const photoOf = (id: string | null | undefined) => (id ? images.find((m) => m.id === id) : undefined);
  const signed = useSignedUrls(shownTakes.map((n) => photoOf(n.media_id)?.storage_path));

  const add = async () => {
    if (!draft.take.trim()) return;
    // Logged circled: it takes the selection of its shot from any earlier take (one selected take per shot).
    const row = { ...draft, circle: false, id: `ss-${Date.now()}` };
    const next = [...takes, row] as Array<ScriptTake & { id: string }>;
    if (!(await save((draft.circle ? circleTake(next, row.id) : next) as unknown as typeof items))) return;
    setDraft({ ...EMPTY, scene: draft.scene, scene_ids: draft.scene_ids });
  };
  const toggleCircle = async (id: string) => { await save(circleTake(takes, id) as unknown as typeof items); };

  // The lined script is of one scene: the one picked, else the first scene that has takes.
  const scenesWithTakes = useMemo(() => t.scenes.filter((sc) => takes.some((k) => k.scene_ids?.includes(sc.id))), [t.scenes, takes]);
  const linedScene = t.scenes.find((sc) => sc.id === lined) ?? scenesWithTakes[0] ?? null;
  const { lines, error } = useSceneLines(linedScene);
  const sceneTakes = linedScene ? takes.filter((k) => k.scene_ids?.includes(linedScene.id)) : [];
  const cover = lines ? coverage(lines.length, sceneTakes) : null;
  const picks = useMemo(() => selectedTakes(takes, t.sceneById, shotName), [takes, t.sceneById, shots.rows]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 960 }}>
      <ToolHeader icon={<FileText size={16} />} eyebrow="Reports & logs" title="Script supervisor" purpose="Takes by scene and shot, the lined script, and the takes the editor should use." accent={project.accent_color} summary={<>{takes.length} takes · {takes.filter((i) => i.circle).length} circled</>} />

      <div className={s.panel} style={{ padding: 12 }}>
        <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <SceneLinkField scenes={t.scenes} sceneById={t.sceneById} ids={draft.scene_ids ?? []} text={draft.scene} onChange={(n) => setDraft({ ...draft, scene: n.text, scene_ids: n.ids, shot_id: null })} placeholder="12" />
          <label className={s.field} style={{ flex: '0 0 140px' }}>
            <span className={s.label}>Shot</span>
            <select className={s.input} aria-label="Shot" value={draft.shot_id ?? ''} onChange={(e) => setDraft({ ...draft, shot_id: e.target.value || null })} disabled={shotsOf(draftScene).length === 0}>
              <option value="">{shotsOf(draftScene).length === 0 ? 'No shots planned' : 'No shot'}</option>
              {shotsOf(draftScene).map((x) => <option key={x.id} value={x.id}>{x.shot_number}{x.description ? ` · ${x.description.slice(0, 24)}` : ''}</option>)}
            </select>
          </label>
          <label className={s.field} style={{ flex: '0 0 90px' }}>
            <span className={s.label}>Take</span>
            <input className={s.input} value={draft.take} onChange={(e) => setDraft({ ...draft, take: e.target.value })} placeholder="1A" />
          </label>
          <label className={s.field} style={{ flex: '1 1 110px' }}>
            <span className={s.label}>Slate</span>
            <input className={s.input} value={draft.slate} onChange={(e) => setDraft({ ...draft, slate: e.target.value })} placeholder="A-1" />
          </label>
          <label className={s.field} style={{ flex: '1 1 90px' }}>
            <span className={s.label}>Lens</span>
            <input className={s.input} value={draft.lens} onChange={(e) => setDraft({ ...draft, lens: e.target.value })} placeholder="35mm" />
          </label>
          <label className={s.field} style={{ flex: '0 0 110px' }}>
            <span className={s.label}>Duration (seconds)</span>
            <input className={s.input} inputMode="numeric" value={draft.duration_s ?? ''} onChange={(e) => setDraft({ ...draft, duration_s: num(e.target.value) })} placeholder="42" />
          </label>
          <label className={s.field} style={{ flex: '0 0 80px' }}>
            <span className={s.label}>From line</span>
            <input className={s.input} inputMode="numeric" value={draft.from_line ?? ''} onChange={(e) => setDraft({ ...draft, from_line: num(e.target.value) })} placeholder="1" />
          </label>
          <label className={s.field} style={{ flex: '0 0 80px' }}>
            <span className={s.label}>To line</span>
            <input className={s.input} inputMode="numeric" value={draft.to_line ?? ''} onChange={(e) => setDraft({ ...draft, to_line: num(e.target.value) })} placeholder="4" />
          </label>
          <label className={s.row} style={{ gap: 4, alignItems: 'center', paddingBottom: 6 }}>
            <input type="checkbox" checked={!!draft.off_camera} onChange={(e) => setDraft({ ...draft, off_camera: e.target.checked })} />
            <span className={s.label}>Off camera</span>
          </label>
          <label className={s.row} style={{ gap: 4, alignItems: 'center', paddingBottom: 6 }}>
            <input type="checkbox" checked={draft.circle} onChange={(e) => setDraft({ ...draft, circle: e.target.checked })} />
            <span className={s.label}>Circle</span>
          </label>
          <button className={s.btnPrimary} onClick={add} disabled={!draft.take.trim()}>
            <Plus size={12} /> Log
          </button>
        </div>
        <label className={s.field} style={{ marginTop: 8 }}>
          <span className={s.label}>Continuity photo (from the library)</span>
          <select className={s.select} value={draft.media_id ?? ''} onChange={(e) => setDraft({ ...draft, media_id: e.target.value || null })}>
            <option value="">No photo</option>
            {images.map((m) => <option key={m.id} value={m.id}>{m.title || 'Untitled photo'}</option>)}
          </select>
        </label>
        <label className={s.field} style={{ marginTop: 8 }}>
          <span className={s.label}>Notes</span>
          <textarea className={s.textarea} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} />
        </label>
      </div>

      <ul aria-label="Takes" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {shownTakes.map((n) => {
          const span = n.from_line ? takeSpan(n, 9999) : null;
          return (
            <li key={n.id} className={s.panel} style={{ padding: 12 }}>
              <div className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {sceneChip(n, t.sceneById) && <span className={s.chip}>Sc {sceneChip(n, t.sceneById)}</span>}
                {n.shot_id && <span className={s.chip}>Shot {shotName(n.shot_id) ?? '?'}</span>}
                <span style={{ fontWeight: 600 }}>{n.take}</span>
                {n.slate && <span className={s.hint}>{n.slate}</span>}
                {n.lens && <span className={s.hint}>{n.lens}</span>}
                {formatDuration(n.duration_s) && <span className={s.hint}>{formatDuration(n.duration_s)}</span>}
                {span && <span className={s.hint}>{span.from === span.to ? `line ${span.from}` : `lines ${span.from}–${span.to}`}{n.off_camera ? ' · off camera' : ''}</span>}
                <button className={s.btn} onClick={() => toggleCircle(n.id)} aria-pressed={n.circle} title={n.circle ? 'Uncircle' : 'Circle (print this take)'} aria-label={n.circle ? `Uncircle take ${n.take}` : `Circle take ${n.take}`} style={n.circle ? { color: 'var(--warn)' } : {}}>
                  <Star size={12} fill={n.circle ? 'currentColor' : 'none'} />
                </button>
                <button className={s.btn} onClick={() => remove(n.id)} title="Delete" aria-label={`Delete take ${n.take}`}>
                  <Trash2 size={12} />
                </button>
              </div>
              {n.notes && <p className={s.hint} style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{n.notes}</p>}
              {(() => {
                const m = photoOf(n.media_id);
                const src = m ? (m.storage_path ? signed[m.storage_path] : m.external_url ?? undefined) : undefined;
                // eslint-disable-next-line @next/next/no-img-element
                return src ? <img src={src} alt={`Continuity photo for take ${n.take}: ${m?.title ?? 'photo'}`} style={{ marginTop: 6, width: 96, height: 64, objectFit: 'cover', borderRadius: 8 }} /> : null;
              })()}
            </li>
          );
        })}
      </ul>
      {takes.length > 0 && shownTakes.length === 0 && <p className={s.hint}>No records match your search.</p>}

      <section className={s.panel} style={{ padding: 12 }} aria-labelledby="ss-lined">
        <div className={s.row} style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 id="ss-lined" className={s.panelTitle} style={{ margin: 0 }}>Lined script</h3>
          {t.scenes.length > 0 && (
            <select className={s.input} aria-label="Scene to line" value={linedScene?.id ?? ''} onChange={(e) => setLined(e.target.value)} style={{ maxWidth: 260 }}>
              {t.scenes.map((sc) => <option key={sc.id} value={sc.id}>{sc.scene_number} · {(sc.heading || sc.title || '').slice(0, 32)}</option>)}
            </select>
          )}
        </div>
        {!linedScene ? <p className={s.hint}>Add a scene to the project, then log takes with their lines, to see them lined.</p>
          : error ? <p className={s.hint} role="alert">Could not read this scene’s script.</p>
          : !lines ? <p className={s.hint}>Reading the scene…</p>
          : lines.length === 0 ? <p className={s.hint}>This scene has no lines in its script yet.</p>
          : (
            <>
              {cover && (
                <p role="status" className={s.hint} style={{ margin: '8px 0', color: cover.uncovered.length ? 'var(--warn)' : undefined }}>
                  {cover.uncovered.length === 0
                    ? 'Every line is covered by a selected take.'
                    : `Not covered by a selected take: ${cover.uncovered.map((r) => (r.from === r.to ? `line ${r.from}` : `lines ${r.from}–${r.to}`)).join(', ')}.`}
                </p>
              )}
              <div role="table" aria-label={`Lined script, scene ${linedScene.scene_number}`} style={{ display: 'grid', gridTemplateColumns: `36px repeat(${sceneTakes.length}, 28px) 1fr`, fontSize: 13, lineHeight: 1.5 }}>
                <div role="row" style={{ display: 'contents' }}>
                  <span role="columnheader" aria-label="Line" />
                  {sceneTakes.map((k) => <span key={k.id} role="columnheader" title={`${k.shot_id ? `Shot ${shotName(k.shot_id) ?? '?'} · ` : ''}Take ${k.take}${k.circle ? ' (circled)' : ''}`} style={{ fontSize: 'var(--text-2xs)', textAlign: 'center', color: k.circle ? 'var(--warn)' : 'var(--fg-muted)' }}>{k.take}</span>)}
                  <span role="columnheader" aria-label="Script" />
                </div>
                {lines.map((ln, i) => (
                  <div role="row" key={i} style={{ display: 'contents' }}>
                    <span role="cell" style={{ color: 'var(--fg-muted)', textAlign: 'right', paddingRight: 8 }}>{i + 1}</span>
                    {sceneTakes.map((k) => {
                      const span = takeSpan(k, lines.length);
                      const on = !!span && i + 1 >= span.from && i + 1 <= span.to;
                      return (
                        <span key={k.id} role="cell" aria-label={on ? `Take ${k.take} covers line ${i + 1}${k.off_camera ? ', off camera' : ''}` : undefined} style={{ display: 'flex', justifyContent: 'center' }}>
                          {on && <span style={{ width: 0, height: '100%', borderLeft: `2px ${k.off_camera ? 'dotted' : 'solid'} ${k.circle ? 'var(--warn)' : 'var(--fg-muted)'}`, opacity: k.circle ? 1 : 0.6 }} />}
                        </span>
                      );
                    })}
                    <span role="cell" style={{ whiteSpace: 'pre-wrap', fontWeight: ln.type === 'character' ? 600 : undefined, paddingLeft: ln.type === 'dialogue' ? 16 : 0, color: cover && cover.uncovered.some((r) => i + 1 >= r.from && i + 1 <= r.to) ? 'var(--warn)' : undefined }}>{ln.text}</span>
                  </div>
                ))}
              </div>
            </>
          )}
      </section>

      <section className={s.panel} style={{ padding: 12 }} aria-labelledby="ss-picks">
        <h3 id="ss-picks" className={s.panelTitle} style={{ margin: '0 0 8px' }}>Takes for the editor</h3>
        {picks.length === 0 ? <p className={s.hint}>Circle a take to select it. The circled takes are listed here, by scene and shot.</p> : (
          <ul aria-label="Selected takes" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {picks.map((g) => (
              <li key={g.scene_id ?? g.scene}>
                <strong>Scene {g.scene || '—'}</strong>
                {shotRunTime(g.shots.flatMap((sh) => sh.takes)) > 0 && <span className={s.hint}> · Run time {formatDuration(shotRunTime(g.shots.flatMap((sh) => sh.takes)))}</span>}
                <ul style={{ listStyle: 'none', margin: '2px 0 0', padding: 0 }}>
                  {g.shots.map((sh) => (
                    <li key={sh.shot_id ?? 'none'} className={s.hint}>
                      {sh.shot}: {sh.takes.length === 0 ? <span style={{ color: 'var(--warn)' }}>no take circled yet</span> : sh.takes.map((k) => `take ${k.take}${k.slate ? ` (${k.slate})` : ''}`).join(', ')}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
