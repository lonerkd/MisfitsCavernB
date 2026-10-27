'use client';

import React, { useState } from 'react';
import { useLoad } from '@/lib/hooks/useLoad';
import { useCanShape } from '@/lib/brief';
import { addAdReference, addBrandRule, approveAdReference, deleteAdReference, deleteBrandRule, listAdReferences, listBrandRules } from '@/lib/ad/api';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/Confirm';
import { useStudio } from '@/components/studio/StudioContext';
import s from '@/components/studio/studio.module.css';

const RULE_KINDS = [
  ['must_include', 'Must include'],
  ['never_say', 'Never say'],
  ['tone_note', 'Tone note'],
  ['legal_line', 'Legal line'],
] as const;

export function BrandKitPanel() {
  const { project, isOwner } = useStudio();
  const { toast } = useToast();
  const confirm = useConfirm();
  const canShape = useCanShape(project.id, isOwner);
  const canManage = isOwner;
  const references = useLoad(`ad-references:${project.id}`, () => listAdReferences(project.id));
  const rules = useLoad(canShape ? `ad-rules:${project.id}` : null, () => listBrandRules(project.id));
  const [referenceKind, setReferenceKind] = useState<'brief' | 'brand_guidelines'>('brief');
  const [referenceTitle, setReferenceTitle] = useState('');
  const [referenceContent, setReferenceContent] = useState('');
  const [ruleKind, setRuleKind] = useState<(typeof RULE_KINDS)[number][0]>('must_include');
  const [ruleSeverity, setRuleSeverity] = useState<'blocker' | 'warning' | 'note'>('blocker');
  const [ruleText, setRuleText] = useState('');
  const [busy, setBusy] = useState(false);

  const addReference = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const error = await addAdReference({ project_id: project.id, kind: referenceKind, title: referenceTitle, content: referenceContent });
    setBusy(false);
    if (error) { toast(`Could not save the reference: ${error}`, 'error'); return; }
    setReferenceTitle('');
    setReferenceContent('');
    references.reload();
    toast('Reference saved as a draft.', 'success');
  };
  const approve = async (id: string) => {
    setBusy(true);
    const error = await approveAdReference(id);
    setBusy(false);
    if (error) { toast(`Could not approve the reference: ${error}`, 'error'); return; }
    references.reload();
    toast('Reference approved for the campaign.', 'success');
  };
  const removeReference = async (id: string) => {
    const ok = await confirm({ title: 'Remove this draft reference?', message: 'It will no longer be available to campaign deliverables.', confirmLabel: 'Remove' });
    if (!ok) return;
    const error = await deleteAdReference(id);
    if (error) toast(`Could not remove the reference: ${error}`, 'error');
    else { references.reload(); toast('Draft reference removed.', 'success'); }
  };
  const addRule = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const error = await addBrandRule({ project_id: project.id, kind: ruleKind, text: ruleText, severity: ruleSeverity });
    setBusy(false);
    if (error) { toast(`Could not save the brand rule: ${error}`, 'error'); return; }
    setRuleText('');
    rules.reload();
    toast('Brand rule added.', 'success');
  };
  const removeRule = async (id: string) => {
    const ok = await confirm({ title: 'Remove this brand rule?', message: 'The copy checker will stop applying it to every piece.', confirmLabel: 'Remove' });
    if (!ok) return;
    const error = await deleteBrandRule(id);
    if (error) toast(`Could not remove the brand rule: ${error}`, 'error');
    else { rules.reload(); toast('Brand rule removed.', 'success'); }
  };

  if (!canShape) return null;

  return (
    <section className={s.panel} aria-labelledby="ad-brand-kit-title">
      <div className={s.panelTitle} id="ad-brand-kit-title">Brief and brand rules</div>
      <p className={s.hint}>Add the client brief and brand guidance as drafts, then approve them. Approved references can be attached to each piece; include/avoid rules are checked as copy is written.</p>

      {canManage && (
        <form onSubmit={(event) => void addReference(event)} className={s.stack} style={{ gap: 8, marginTop: 12 }}>
          <strong className={s.hint}>Add a reference</strong>
          <div className={s.linkBox}>
            <label className={s.srOnly} htmlFor="ad-reference-kind">Reference type</label>
            <select id="ad-reference-kind" className={s.input} value={referenceKind} onChange={(event) => setReferenceKind(event.target.value as typeof referenceKind)}>
              <option value="brief">Client brief</option>
              <option value="brand_guidelines">Brand guidelines</option>
            </select>
            <label className={s.srOnly} htmlFor="ad-reference-title">Reference title</label>
            <input id="ad-reference-title" className={s.input} placeholder="Reference title" maxLength={160} value={referenceTitle} onChange={(event) => setReferenceTitle(event.target.value)} />
          </div>
          <label className={s.srOnly} htmlFor="ad-reference-content">Reference content</label>
          <textarea id="ad-reference-content" className={s.input} placeholder="Write the approved brief or brand guidance…" maxLength={20000} rows={4} value={referenceContent} onChange={(event) => setReferenceContent(event.target.value)} />
          <button type="submit" className={s.btn} disabled={busy || !referenceTitle.trim() || !referenceContent.trim()}>Save draft reference</button>
        </form>
      )}

      {references.data && references.data.length > 0 && (
        <div className={s.stack} style={{ gap: 8, marginTop: 14 }}>
          {references.data.map((reference) => (
            <div key={reference.id} className={s.publishRow} style={{ alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className={s.cardTitle}>{reference.title} · {reference.kind === 'brief' ? 'Brief' : 'Brand guidelines'}</div>
                <div className={s.hint}>{reference.status === 'approved' ? 'Approved reference' : 'Draft reference'}</div>
                <p className={s.hint} style={{ whiteSpace: 'pre-wrap' }}>{reference.content}</p>
              </div>
              {canManage && reference.status === 'draft' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className={s.btnPrimary} disabled={busy} onClick={() => void approve(reference.id)}>Approve</button>
                  <button type="button" className={s.btn} onClick={() => void removeReference(reference.id)}>Remove</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ height: 1, background: 'rgba(var(--ink-rgb), 0.1)', margin: '18px 0' }} />
      <strong className={s.hint}>Rules checked on each piece</strong>
      {canManage && (
        <form onSubmit={(event) => void addRule(event)} className={s.stack} style={{ gap: 8, marginTop: 8 }}>
          <div className={s.linkBox}>
            <label className={s.srOnly} htmlFor="ad-rule-kind">Rule type</label>
            <select id="ad-rule-kind" className={s.input} value={ruleKind} onChange={(event) => setRuleKind(event.target.value as typeof ruleKind)}>
              {RULE_KINDS.map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}
            </select>
            <label className={s.srOnly} htmlFor="ad-rule-severity">Severity</label>
            <select id="ad-rule-severity" className={s.input} value={ruleSeverity} onChange={(event) => setRuleSeverity(event.target.value as typeof ruleSeverity)}>
              <option value="blocker">Must fix</option>
              <option value="warning">Warning</option>
              <option value="note">Note</option>
            </select>
          </div>
          <label className={s.srOnly} htmlFor="ad-rule-text">Brand rule</label>
          <input id="ad-rule-text" className={s.input} placeholder="Required phrase, restricted phrase or tone note" maxLength={500} value={ruleText} onChange={(event) => setRuleText(event.target.value)} />
          <button type="submit" className={s.btn} disabled={busy || !ruleText.trim()}>Add rule</button>
        </form>
      )}

      {rules.data && rules.data.length > 0 && (
        <div className={s.stack} style={{ gap: 6, marginTop: 12 }}>
          {rules.data.map((rule) => (
            <div key={rule.id} className={s.publishRow}>
              <div style={{ minWidth: 0 }}>
                <div className={s.cardTitle}>{rule.text}</div>
                <div className={s.hint}>{rule.kind.replace(/_/g, ' ')} · {rule.severity}</div>
              </div>
              {canManage && <button type="button" className={s.btn} onClick={() => void removeRule(rule.id)}>Remove</button>}
            </div>
          ))}
        </div>
      )}
      {!canManage && <p className={s.hint} style={{ marginTop: 12 }}>Only the project owner can change references and rules.</p>}
    </section>
  );
}
