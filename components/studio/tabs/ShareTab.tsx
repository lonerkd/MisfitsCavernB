'use client';

import React, { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Globe, Lock, Users, Link2 } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { refreshActiveProject } from '@/lib/os';
import { PROJECT_VISIBILITY, updateProjectVisibility, type ProjectVisibility } from '@/lib/supabase/projects';
import { studio, useSignedUrls, mediaSrc, type Media } from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { SectionHeader, Toggle, cx } from '../ui';
import { MediaThumbVisual } from '../media/MediaThumb';
import s from '../studio.module.css';

const ICON: Record<ProjectVisibility, React.ReactNode> = {
  private: <Lock size={13} />,
  team: <Users size={13} />,
  link: <Link2 size={13} />,
  public: <Globe size={13} />,
};

/**
 * Who can see the project, the link to send, and exactly what a viewer gets:
 * the title and logline, plus the library items the owner publishes, grouped
 * under the scenes they belong to. Notes are never shared.
 */
export function ShareTab() {
  const { project, isOwner, media, scenesByMedia } = useStudio();
  const { toast } = useToast();
  const [changing, setChanging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const visibility = (project.visibility ?? 'team') as ProjectVisibility;
  const linkLive = visibility === 'link' || visibility === 'public';
  const url = project.share_token && typeof window !== 'undefined' ? `${window.location.origin}/shared/${project.share_token}` : '';

  const published = media.rows.filter((m) => m.shared);
  const linkedUnpublished = media.rows.filter((m) => !m.shared && (scenesByMedia.get(m.id)?.length ?? 0) > 0);
  const signed = useSignedUrls(media.rows.map((m) => (m.kind === 'image' || m.kind === 'video' ? m.storage_path : null)));
  const ordered = useMemo(() => [...media.rows].sort((a, b) => Number(b.shared) - Number(a.shared) || a.title.localeCompare(b.title)), [media.rows]);

  const setVisibility = async (v: ProjectVisibility) => {
    if (!isOwner || v === visibility || changing) return;
    setChanging(true);
    try {
      await updateProjectVisibility(project.id, v);
      await refreshActiveProject(project.id);
      toast(PROJECT_VISIBILITY.find((x) => x.id === v)?.hint ?? 'Updated', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not change who can see this', 'error');
    } finally {
      setChanging(false);
    }
  };

  const setShared = async (items: Media[], shared: boolean) => {
    const ids = new Set(items.map((m) => m.id));
    setBusyIds((prev) => new Set([...Array.from(prev), ...Array.from(ids)]));
    let failed = 0;
    for (const m of items) {
      try { media.upsertLocal(await studio.updateMedia(m.id, { shared })); }
      catch { failed++; }
    }
    setBusyIds((prev) => new Set(Array.from(prev).filter((id) => !ids.has(id))));
    if (failed) toast(`${failed} item${failed === 1 ? '' : 's'} could not be updated`, 'error');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast('Could not copy — select the link and copy it manually.', 'error');
    }
  };

  return (
    <section aria-labelledby="share-title" className={s.stack} style={{ gap: 28 }}>
      <SectionHeader
        id="share-title"
        eyebrow="Share"
        title="Share & Pitch"
        subtitle="Send a lookbook to cast, crew or funders. Viewers see the title, logline and the references you choose — grouped by scene. Notes and everything else stay private."
      />

      <div className={s.panel}>
        <div className={s.panelTitle}>Who can see this project</div>
        <div className={s.options} role="radiogroup" aria-label="Project visibility">
          {PROJECT_VISIBILITY.map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={visibility === v.id}
              disabled={!isOwner || changing}
              className={cx(s.option, visibility === v.id && s.optionOn)}
              onClick={() => void setVisibility(v.id)}
            >
              <span className={s.optionName}>{ICON[v.id]} {v.label}</span>
              <span className={s.optionHint}>{v.hint}</span>
            </button>
          ))}
        </div>
        {!isOwner && <p className={s.hint} style={{ marginTop: 10 }}>Only the project owner can change this.</p>}
      </div>

      <div className={s.panel}>
        <div className={s.panelTitle}>Share link</div>
        {linkLive && url ? (
          <div className={s.stack} style={{ gap: 10 }}>
            <div className={s.linkBox}>
              <label className={s.srOnly} htmlFor="share-url">Share link</label>
              <input id="share-url" className={s.input} readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className={s.btnPrimary} onClick={copy}>{copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}</button>
              <a className={s.btn} href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} /> Preview</a>
            </div>
            <p className={s.hint}>Anyone holding this link sees the lookbook below. Switch to Team or Private and the link stops working immediately.</p>
          </div>
        ) : (
          <p className={s.hint}>The link is off. Choose “{PROJECT_VISIBILITY.find((v) => v.id === 'link')?.label}” or “Public” above to turn it on{isOwner ? '' : ' (owner only)'}.</p>
        )}
      </div>

      <div className={s.panel}>
        <div className={s.toolbar} style={{ marginBottom: 14 }}>
          <div className={s.panelTitle} style={{ marginBottom: 0 }}>
            In the lookbook · {published.length} of {media.rows.length}
          </div>
          {isOwner && linkedUnpublished.length > 0 && (
            <button type="button" className={cx(s.btn, s.small)} onClick={() => void setShared(linkedUnpublished, true)}>
              Include all {linkedUnpublished.length} scene reference{linkedUnpublished.length === 1 ? '' : 's'}
            </button>
          )}
        </div>
        {media.rows.length === 0 ? (
          <EmptyState icon={<Globe size={24} />} title="Nothing to share yet" subtitle="Add references in the Library, link them to scenes, then choose what goes in the lookbook here." />
        ) : (
          <div className={s.stack} style={{ gap: 6 }}>
            {!isOwner && <p className={s.hint}>Only the project owner chooses what goes in the lookbook.</p>}
            {ordered.map((m) => {
              const n = scenesByMedia.get(m.id)?.length ?? 0;
              return (
                <div key={m.id} className={s.publishRow}>
                  <div className={s.publishThumb}><MediaThumbVisual media={m} src={mediaSrc(m, signed)} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div className={s.cardTitle}>{m.title || 'Untitled'}</div>
                    <div className={s.hint}>{n ? `Linked to ${n} scene${n === 1 ? '' : 's'}` : 'Not linked to a scene — appears under “More references”'}</div>
                  </div>
                  <Toggle on={m.shared} disabled={!isOwner || busyIds.has(m.id)} label={`Include ${m.title || 'item'} in the lookbook`} onChange={(next) => void setShared([m], next)} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
