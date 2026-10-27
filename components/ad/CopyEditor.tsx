'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { listAdReferences, listBrandRules, listDeliverables, listReferenceLinks, setReferenceLink, type AdReference, type Deliverable, type StoredBrandRule } from '@/lib/ad/api';
import { checkBrandRules, type BrandRule, type BrandRuleKind, type BrandRuleSeverity } from '@/lib/ad/brand-rules';
import { characterCount, copyText, estimateSeconds, parseCopy, serializeCopy, spokenWords, type CopySection } from '@/lib/ad/copy';

const FIELD_LABEL: Record<CopySection, string> = {
  HEADLINE: 'Headline',
  VISUAL: 'Picture',
  VO: 'Voice-over',
  SFX: 'Sound effects',
  BODY: 'Body copy',
  CTA: 'Call to action',
};

const fieldStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 76,
  resize: 'vertical',
  padding: 10,
  border: '1px solid rgba(var(--ink-rgb), 0.12)',
  borderRadius: 8,
  background: 'var(--bg-2)',
  color: 'var(--fg-strong)',
  font: 'inherit',
};

export function CopyEditor({ projectId, scriptId, content, onChange }: {
  projectId: string;
  scriptId: string;
  content: string;
  onChange: (content: string) => void;
}) {
  const { toast } = useToast();
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null);
  const [rules, setRules] = useState<StoredBrandRule[]>([]);
  const [references, setReferences] = useState<AdReference[]>([]);
  const [linked, setLinked] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    Promise.all([
      listDeliverables(projectId),
      listBrandRules(projectId),
      listAdReferences(projectId),
      listReferenceLinks(scriptId),
    ]).then(([deliverables, brandRules, refs, links]) => {
      if (!active) return;
      setDeliverable(deliverables.find((row) => row.script_id === scriptId) ?? null);
      setRules(brandRules);
      setReferences(refs.filter((reference) => reference.status === 'approved'));
      setLinked(new Set(links.map((link) => link.to_entity)));
    }).catch((error: unknown) => {
      if (active) toast(error instanceof Error ? error.message : 'Could not load the copy brief', 'error');
    });
    return () => { active = false; };
  }, [projectId, scriptId, toast]);

  const blocks = useMemo(() => parseCopy(content), [content]);
  const plainText = useMemo(() => copyText(blocks), [blocks]);
  const checkedRules = useMemo(() => rules.map((rule) => ({
    id: rule.id,
    kind: rule.kind as BrandRuleKind,
    text: rule.text,
    severity: rule.severity as BrandRuleSeverity,
  } satisfies BrandRule)), [rules]);
  const breaches = useMemo(() => checkBrandRules(plainText, checkedRules), [plainText, checkedRules]);
  const seconds = estimateSeconds(spokenWords(blocks), deliverable?.words_per_second ?? 2.5);
  const characters = characterCount(plainText);

  const edit = (section: CopySection, value: string) => {
    onChange(serializeCopy({ ...blocks, [section]: value }));
  };
  const toggleReference = async (reference: AdReference) => {
    const shouldLink = !linked.has(reference.id);
    const error = await setReferenceLink(projectId, scriptId, reference.id, shouldLink);
    if (error) { toast(`Could not update the reference: ${error}`, 'error'); return; }
    setLinked((current) => {
      const next = new Set(current);
      if (shouldLink) next.add(reference.id);
      else next.delete(reference.id);
      return next;
    });
  };

  const renderField = (section: CopySection) => (
    <label key={section} style={{ display: 'grid', gap: 6, color: 'var(--fg-muted)', fontSize: 13 }}>
      <span>{FIELD_LABEL[section]}</span>
      <textarea
        aria-label={FIELD_LABEL[section]}
        value={blocks[section]}
        onChange={(event) => edit(section, event.target.value)}
        style={fieldStyle}
      />
    </label>
  );

  return (
    <section aria-label="Copy editor" style={{ width: '100%', maxWidth: 1000, margin: '0 auto', padding: '32px 24px', display: 'grid', gap: 20 }}>
      <header>
        <h2 style={{ margin: 0, color: 'var(--fg-strong)', fontSize: 20 }}>Copy</h2>
        <p style={{ margin: '6px 0 0', color: 'var(--fg-muted)', fontSize: 13 }}>
          Edit picture and sound side by side. Each section is stored as marked text, so versions and client review keep the exact copy.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        {renderField('VISUAL')}
        <div style={{ display: 'grid', gap: 12 }}>
          {renderField('VO')}
          {renderField('SFX')}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {renderField('HEADLINE')}
        {renderField('BODY')}
        {renderField('CTA')}
      </div>

      <div role="status" aria-live="polite" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, color: 'var(--fg-muted)', fontSize: 13 }}>
        <span>{characters} characters{deliverable?.max_chars ? ` / ${deliverable.max_chars}` : ''}</span>
        <span>{seconds} seconds spoken{deliverable?.max_seconds ? ` / ${deliverable.max_seconds}` : ''}</span>
        {deliverable?.max_chars != null && characters > deliverable.max_chars && <strong style={{ color: 'var(--danger)' }}>Character limit exceeded</strong>}
        {deliverable?.max_seconds != null && seconds > deliverable.max_seconds && <strong style={{ color: 'var(--danger)' }}>Spot runs long</strong>}
      </div>

      {(breaches.length > 0 || checkedRules.some((rule) => rule.kind === 'tone_note')) && (
        <section aria-label="Brand checks" style={{ display: 'grid', gap: 6, padding: 12, border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 8 }}>
          <strong style={{ color: 'var(--fg-strong)', fontSize: 13 }}>Brand checks</strong>
          {breaches.map((breach) => <span key={breach.ruleId} style={{ color: breach.severity === 'blocker' ? 'var(--danger)' : 'var(--fg-muted)', fontSize: 13 }}>{breach.message}</span>)}
          {checkedRules.filter((rule) => rule.kind === 'tone_note').map((rule) => (
            <span key={rule.id} style={{ color: 'var(--fg-muted)', fontSize: 13 }}>Tone note: {rule.text}</span>
          ))}
          {breaches.length === 0 && !checkedRules.some((rule) => rule.kind === 'tone_note') && <span>All checks passed.</span>}
        </section>
      )}

      <section aria-label="Approved references" style={{ display: 'grid', gap: 8, padding: 12, border: '1px solid rgba(var(--ink-rgb), 0.1)', borderRadius: 8 }}>
        <strong style={{ color: 'var(--fg-strong)', fontSize: 13 }}>Approved brief and brand references</strong>
        {references.length === 0
          ? <span style={{ color: 'var(--fg-muted)', fontSize: 13 }}>No approved references yet. Add them in Studio › Share.</span>
          : references.map((reference) => (
            <label key={reference.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--fg-muted)', fontSize: 13 }}>
              <input type="checkbox" checked={linked.has(reference.id)} onChange={() => void toggleReference(reference)} />
              <span><strong>{reference.title}</strong>{linked.has(reference.id) && <span> — {reference.content}</span>}</span>
            </label>
          ))}
      </section>
    </section>
  );
}
