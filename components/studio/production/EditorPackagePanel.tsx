'use client';

// The shoot, packaged for the editor: which take of each shot to use, the sound and camera records, the cards, and what the editor
// cannot use yet. Read from the records the crew already keep (script supervisor, camera, sound, media offload); nothing is entered
// here. Prints or saves as a PDF or CSV.
import React, { useMemo, useState } from 'react';
import { Download, Printer, PackageCheck, Send } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { getProjectCrew } from '@/lib/supabase/crew-management';
import { loadCrafts } from '@/lib/crafts/crafts';
import { notify } from '@/lib/supabase/notifications';
import { editorialRecipients, handoffMessage } from '@/lib/studio/editor-handoff';
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
  const { project, shots, userId } = useStudio();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [sending, setSending] = useState(false);
  const t = useRecordTargets();
  const takes = useSettingsList('scriptNotes', { find: false }).items as unknown as ScriptTake[];
  const camera = useSettingsList('cameraReports', { find: false }).items as unknown as PackageInput['camera'];
  const sound = useSettingsList('soundReports', { find: false }).items as unknown as PackageInput['sound'];
  const offloads = useSettingsList('mediaOffloads', { find: false }).items as unknown as PackageInput['offloads'];

  const pkg = useMemo(() => editorPackage({
    scenes: t.scenes, shots: shots.rows.map((x) => ({ id: x.id, scene_id: x.scene_id, shot_number: x.shot_number, description: x.description })),
    takes, camera, sound, offloads, scriptNotes: takes,
  }), [t.scenes, shots.rows, takes, camera, sound, offloads]);

  const doc = () => editorPackageDoc(pkg, { project: project.title, accent: project.accent_color, logo: project.logo_url, generated: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) });

  const send = async () => {
    if (sending) return;
    setSending(true);
    try {
      const [crew, crafts] = await Promise.all([getProjectCrew(project.id), loadCrafts()]);
      const to = editorialRecipients(crew.map((c) => ({ user_id: c.user_id, username: c.username, craft: c.craft, status: c.status })), crafts, userId);
      if (to.length === 0) { toast('No confirmed editor on the crew yet. Add one in Cast & crew (an Editorial craft).', 'error'); return; }
      const ok = await confirm({
        title: `Send to ${to.length} ${to.length === 1 ? 'person' : 'people'}?`,
        message: `${to.map((r) => `${r.name} (${r.craft})`).join(', ')} get a notification with what is ready and what is not, linked to this package.${pkg.ready ? '' : ` ${pkg.attention.length} thing${pkg.attention.length === 1 ? ' is' : 's are'} not ready yet; they are told.`}`,
        confirmLabel: 'Send',
      });
      if (!ok) return;
      const m = handoffMessage(pkg, project.title);
      let sent = 0;
      let failed = 0;
      for (const r of to) {
        const err = await notify(r.user_id, { type: 'crew', title: m.title, body: m.body, link: `/studio?project=${project.id}&tab=production&view=editorial` }, userId);
        if (err) failed++; else sent++;
      }
      toast(failed ? `Sent to ${sent}; could not reach ${failed}. Try again for the rest.` : `Sent to ${sent} ${sent === 1 ? 'person' : 'people'}.`, failed ? 'error' : 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not send the package.', 'error');
    } finally { setSending(false); }
  };

  return (
    <section className={s.panel} style={{ padding: 12 }} aria-labelledby="ed-package">
      <div className={s.row} style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <h3 id="ed-package" className={s.panelTitle} style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}><PackageCheck size={14} aria-hidden /> Package for the editor</h3>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
          {pkg.scenes.length > 0 && <button type="button" className={cx(s.btn, s.small)} onClick={() => void send()} disabled={sending} aria-label="Send the package to the editor"><Send size={11} aria-hidden /> Send to editor</button>}
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
