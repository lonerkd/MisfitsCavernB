'use client';

// The shoot, packaged for the editor: which take of each shot to use, the sound and camera records, the cards, and what the editor
// cannot use yet. Read from the records the crew already keep (script supervisor, camera, sound, media offload); nothing is entered
// here. Prints or saves as a PDF or CSV.
import React, { useMemo } from 'react';
import { Download, Printer, PackageCheck } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useSettingsList } from './useSettingsList';
import { useRecordTargets } from './RecordLinks';
import { editorPackage, type PackageInput } from '@/lib/studio/editor-package';
import { editorPackageDoc } from '@/lib/studio/editor-package-print';
import type { ScriptTake } from '@/lib/studio/lined-script';
import { takeSpan } from '@/lib/studio/lined-script';
import { printDocument } from '@/lib/print/print';
import { downloadCsv } from '@/lib/print/download';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';

export function EditorPackagePanel() {
  const { project, shots } = useStudio();
  const { toast } = useToast();
  const t = useRecordTargets();
  const takes = useSettingsList('scriptNotes').items as unknown as ScriptTake[];
  const camera = useSettingsList('cameraReports').items as unknown as PackageInput['camera'];
  const sound = useSettingsList('soundReports').items as unknown as PackageInput['sound'];
  const offloads = useSettingsList('mediaOffloads').items as unknown as PackageInput['offloads'];

  const pkg = useMemo(() => editorPackage({
    scenes: t.scenes, shots: shots.rows.map((x) => ({ id: x.id, scene_id: x.scene_id, shot_number: x.shot_number, description: x.description })),
    takes, camera, sound, offloads,
  }), [t.scenes, shots.rows, takes, camera, sound, offloads]);

  const doc = () => editorPackageDoc(pkg, { project: project.title, accent: project.accent_color, generated: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) });

  return (
    <section className={s.panel} style={{ padding: 12 }} aria-labelledby="ed-package">
      <div className={s.row} style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <h3 id="ed-package" className={s.panelTitle} style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}><PackageCheck size={14} aria-hidden /> Package for the editor</h3>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
          <button type="button" className={cx(s.btn, s.small)} onClick={() => { if (!printDocument(doc())) toast('Could not open the print dialog.', 'error'); }} aria-label="Print / PDF: the editor's package"><Printer size={11} aria-hidden /> Print / PDF</button>
          <button type="button" className={cx(s.btn, s.small)} onClick={() => { if (!downloadCsv(doc())) toast('Could not save the file.', 'error'); }} aria-label="CSV: the editor's package"><Download size={11} aria-hidden /> CSV</button>
        </span>
      </div>

      {pkg.scenes.length === 0 ? (
        <p className={s.hint} style={{ marginTop: 8 }}>Nothing has been logged on set yet. Takes (Script supervisor), camera reports and sound reports show up here, scene by scene, as the crew log them.</p>
      ) : (
        <>
          <p role="status" className={s.hint} style={{ margin: '8px 0', color: pkg.ready ? undefined : 'var(--warn)' }}>
            {pkg.ready ? 'Everything logged is ready for editorial.' : `${pkg.attention.length} thing${pkg.attention.length === 1 ? '' : 's'} the editor cannot use yet.`}
          </p>
          {pkg.attention.length > 0 && <ul aria-label="Not ready" style={{ margin: '0 0 8px', paddingLeft: 18 }}>{pkg.attention.map((a) => <li key={a} className={s.hint} style={{ color: 'var(--warn)' }}>{a}</li>)}</ul>}
          <ul aria-label="Scenes in the package" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {pkg.scenes.map((sc) => (
              <li key={sc.scene_id}>
                <strong>Scene {sc.scene_number}{sc.heading ? ` · ${sc.heading}` : ''}</strong>
                <span className={s.hint}> · {sc.takes} take{sc.takes === 1 ? '' : 's'} · {sc.soundReports} sound · {sc.cameraReports} camera{sc.soundReports && sc.roomTone ? ' · room tone' : ''}{sc.wildTrack ? ' · wild track' : ''}</span>
                <ul style={{ listStyle: 'none', margin: '2px 0 0', padding: 0 }}>
                  {sc.shots.map((sh) => {
                    const span = sh.selected?.from_line ? takeSpan(sh.selected, 99999) : null;
                    return (
                      <li key={sh.shot_id ?? 'none'} className={s.hint}>
                        {sh.shot}: {sh.selected ? <>use take {sh.selected.take}{sh.selected.slate ? ` (${sh.selected.slate})` : ''}{span ? ` · lines ${span.from === span.to ? span.from : `${span.from}–${span.to}`}` : ''}</> : <span style={{ color: 'var(--warn)' }}>none selected</span>}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
          <p className={s.hint} style={{ marginTop: 8 }}>Cards: {pkg.offloads.total} logged · {pkg.offloads.verified} verified · {pkg.offloads.archived} archived{pkg.offloads.pending.length ? ` · not verified: ${pkg.offloads.pending.join(', ')}` : ''}</p>
        </>
      )}
    </section>
  );
}
