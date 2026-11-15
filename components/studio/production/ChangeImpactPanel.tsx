'use client';

// "Who does this touch?" for a director's note that changes the plan: the departments linked to its scenes (breakdown elements, the
// role tools' records, planned shots, the shoot day) and the confirmed crew in them, and a confirmed button that tells them. Nothing
// is sent until the director presses it, and it says plainly how many people it told and whether any failed.
import React, { useState } from 'react';
import { Send, Users } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { breakdown } from '@/lib/breakdown';
import { loadCrafts } from '@/lib/crafts/crafts';
import { getProjectCrew } from '@/lib/supabase/crew-management';
import { listRecords } from '@/lib/supabase/productionRecords';
import { notify } from '@/lib/supabase/notifications';
import { changeImpact, changeMessage, RECORD_DEPARTMENT, type Impact } from '@/lib/studio/change-impact';
import { useStudio } from '../StudioContext';
import { useRecordTargets } from './RecordLinks';
import { sceneChip } from '@/lib/studio/record-links';
import { cx } from '../ui';
import s from '../studio.module.css';

interface Note { id: string; scene_ids?: string[]; scene: string; title: string; notes: string; notified_at?: string | null; notified_count?: number | null }

export function ChangeImpactPanel({ note, onSent }: { note: Note; onSent: (count: number) => Promise<void> }) {
  const { project, shots, userId } = useStudio();
  const { toast } = useToast();
  const confirm = useConfirm();
  const t = useRecordTargets();
  const [impact, setImpact] = useState<Impact | null>(null);
  const [busy, setBusy] = useState(false);

  const check = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const kinds = Object.keys(RECORD_DEPARTMENT);
      const [categories, elements, tags, crew, crafts, ...lists] = await Promise.all([
        breakdown.listCategories(project.id), breakdown.listElements(project.id), breakdown.listTags(project.id),
        getProjectCrew(project.id), loadCrafts(), ...kinds.map((k) => listRecords(project.id, k as never)),
      ]);
      const records = lists.flatMap((rows, idx) => rows.map((r) => ({ kind: kinds[idx], scene_ids: (r.scene_ids as string[] | undefined) ?? [] })));
      setImpact(changeImpact({
        sceneIds: note.scene_ids ?? [],
        scenes: t.scenes.map((sc) => ({ id: sc.id, scene_number: sc.scene_number, shoot_day: (sc as { shoot_day?: number | null }).shoot_day ?? null })),
        tags, elements, categories, records,
        shots: shots.rows.map((x) => ({ scene_id: x.scene_id })),
        crew: crew.map((c) => ({ user_id: c.user_id, username: c.username, craft: c.craft, status: c.status })),
        crafts, senderId: userId, ownerId: project.creator_id,
      }));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not work out who this touches.', 'error');
    } finally { setBusy(false); }
  };

  const send = async () => {
    if (!impact || impact.recipients.length === 0 || busy) return;
    const again = !!note.notified_at;
    const ok = await confirm({
      title: again ? 'Tell them again?' : `Tell ${impact.recipients.length} ${impact.recipients.length === 1 ? 'person' : 'people'}?`,
      message: again ? `You told ${note.notified_count ?? 'some people'} about this on ${new Date(note.notified_at as string).toLocaleDateString()}. This sends it again.` : 'Each of them gets a notification with this change and what it touches for them.',
      confirmLabel: 'Send',
    });
    if (!ok) return;
    setBusy(true);
    const numbers = sceneChip(note as never, t.sceneById);
    let sent = 0;
    let failed = 0;
    for (const r of impact.recipients) {
      const m = changeMessage({ title: note.title, notes: note.notes, sceneNumbers: numbers, why: r.why });
      const err = await notify(r.user_id, { type: 'crew', title: m.title, body: m.body, link: `/studio?project=${project.id}&tab=production&view=director` }, userId);
      if (err) failed++; else sent++;
    }
    setBusy(false);
    if (sent > 0) await onSent(sent);
    toast(failed ? `Told ${sent}; could not tell ${failed}. Try again for the rest.` : `Told ${sent} ${sent === 1 ? 'person' : 'people'}.`, failed ? 'error' : 'success');
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div className={s.row} style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className={cx(s.btn, s.small)} onClick={() => void check()} disabled={busy} aria-label={`Who does this touch? “${note.title}”`}><Users size={11} aria-hidden /> Who does this touch?</button>
        {note.notified_at && <span className={s.hint}>Told {note.notified_count ?? 'some'} {note.notified_count === 1 ? 'person' : 'people'} on {new Date(note.notified_at).toLocaleDateString()}</span>}
      </div>
      {impact && (
        <div role="region" aria-label={`Who “${note.title}” touches`} style={{ marginTop: 8 }}>
          {impact.departments.length === 0 ? (
            <p className={s.hint}>Nothing in the breakdown, the department tools, the shot list or the schedule is linked to these scenes yet, so no department is named.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
              {impact.departments.map((d) => (
                <li key={d.department}>
                  <strong>{d.department}</strong>
                  <span className={s.hint}> · {d.why.join(' · ')}</span>
                  <div className={s.hint}>{d.people.length ? d.people.map((p) => `${p.name} (${p.craft})`).join(', ') : 'No one on the crew in this department yet.'}</div>
                </li>
              ))}
            </ul>
          )}
          {impact.recipients.length > 0 && (
            <button type="button" className={cx(s.btnPrimary)} style={{ marginTop: 8 }} onClick={() => void send()} disabled={busy}><Send size={12} aria-hidden /> {note.notified_at ? 'Tell them again' : `Tell ${impact.recipients.length} ${impact.recipients.length === 1 ? 'person' : 'people'}`}</button>
          )}
        </div>
      )}
    </div>
  );
}
