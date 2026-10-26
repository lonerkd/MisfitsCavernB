'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useFlag } from '@/components/Flag';
import { getConsent, setConsent } from '@/lib/hub/caseStudies';
import { Toggle } from '../ui';
import s from '../studio.module.css';

/**
 * The owner's say on whether Misfits Cavern may write a case study about this
 * production in the hub. Off unless the owner turns it on; turning it off
 * pulls any case study about it back to draft.
 */
export function CaseStudyConsent({ projectId, isOwner }: { projectId: string; isOwner: boolean }) {
  const on = useFlag('hub_case_studies');
  const { toast } = useToast();
  const [ok, setOk] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!on) return;
    let live = true;
    getConsent(projectId).then((v) => { if (live) setOk(v); }).catch(() => { if (live) toast('Could not load the case-study setting', 'error'); });
    return () => { live = false; };
  }, [on, projectId, toast]);

  if (!on || ok === null) return null;

  const change = async (next: boolean) => {
    setBusy(true);
    const error = await setConsent(projectId, next);
    setBusy(false);
    if (error) { toast(`Could not change it: ${error}`, 'error'); return; }
    setOk(next);
    toast(next ? 'Misfits Cavern may now ask to feature this production' : 'Withdrawn — any case study about it is back to draft', 'success');
  };

  return (
    <div className={s.panel}>
      <div className={s.panelTitle}>Case study</div>
      <div className={s.publishRow}>
        <div style={{ minWidth: 0 }}>
          <div className={s.cardTitle}>Allow a case study about this production</div>
          <div className={s.hint}>The team at Misfits Cavern may write about it in the hub, showing its title and logline to signed-in members. Nothing else is shared. Turn it off any time and it comes down.{!isOwner && ' Only the owner can change this.'}</div>
        </div>
        <Toggle on={ok} disabled={!isOwner || busy} label="Allow a case study about this production" onChange={(next) => void change(next)} />
      </div>
    </div>
  );
}
