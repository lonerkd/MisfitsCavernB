'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, ImagePlus, X } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { CARD_COLORS } from '@/lib/scriptos/sceneVisuals';
import { studio, useProjectMedia, useSceneMedia, useSignedUrls, mediaSrc, sceneMediaKey, type Media, type SceneRow, type SyncState } from '@/lib/studio';
import { MediaPicker } from '@/components/studio/media/MediaPicker';
import { MediaThumbVisual } from '@/components/studio/media/MediaThumb';
import { MediaViewer } from '@/components/studio/media/MediaViewer';
import { Modal } from '@/components/studio/ui';

const label: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--fg-dim)', marginBottom: 8 };
const hint: React.CSSProperties = { fontFamily: 'var(--mono)', fontSize: 10.5, lineHeight: 1.6, color: 'var(--fg-muted)' };

/**
 * The current scene's visual references, note and colour — the same data the
 * Studio shows, live. Add from the project library, or upload on the spot.
 */
export function SceneReferencesPanel({
  projectId, userId, sceneNumber, heading, row, note, color, onNote, onTag, syncState,
}: {
  projectId: string | null;
  userId: string | null;
  sceneNumber: number | null;
  heading: string | null;
  row: SceneRow | null;
  note: string;
  color: string | null;
  onNote: (note: string) => void;
  onTag: (color: string) => void;
  syncState: SyncState;
}) {
  const { toast } = useToast();
  const media = useProjectMedia(projectId);
  const links = useSceneMedia(projectId);
  const [picking, setPicking] = useState(false);
  const [viewing, setViewing] = useState<Media | null>(null);
  const [draft, setDraft] = useState<string | null>(null);

  const refs = useMemo(() => {
    if (!row) return [];
    const byId = new Map(media.rows.map((m) => [m.id, m]));
    return links.rows.filter((l) => l.scene_id === row.id).map((l) => byId.get(l.media_id)).filter(Boolean) as Media[];
  }, [row, links.rows, media.rows]);
  const signed = useSignedUrls([...refs.map((m) => m.storage_path), viewing?.storage_path]);

  if (!projectId || !userId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={label}>Scene references</div>
        <p style={hint}>References live in a project’s library, shared with its crew. Open this script from a project to attach photos, clips and notes to its scenes.</p>
        <Link href="/projects" style={{ ...hint, color: 'var(--accent)', textDecoration: 'none' }}>Your projects →</Link>
      </div>
    );
  }
  if (sceneNumber === null) {
    return <p style={hint}>Put the cursor in a scene (a heading like INT. KITCHEN - NIGHT) to see its references.</p>;
  }

  const unlink = async (m: Media) => {
    if (!row) return;
    try {
      await studio.unlinkMedia(row.id, m.id);
      links.removeLocal(sceneMediaKey({ scene_id: row.id, media_id: m.id }));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not unlink', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={label}>Scene {sceneNumber}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--fg)', textTransform: 'uppercase', lineHeight: 1.4 }}>{heading}</div>
        {!row && (
          <div style={{ ...hint, marginTop: 6 }}>{syncState === 'error' ? 'Couldn’t save the scene list — check your connection.' : 'Saving this scene…'}</div>
        )}
      </div>

      <div>
        <div style={label}>References</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {refs.map((m) => (
            <div key={m.id} style={{ position: 'relative', aspectRatio: '16 / 10', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(224,221,174,0.12)', background: 'rgba(0,0,0,0.35)' }}>
              <button type="button" onClick={() => setViewing(m)} title={m.title} aria-label={`Open ${m.title || 'reference'}`} style={{ width: '100%', height: '100%', padding: 0, border: 0, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-dim)' }}>
                <MediaThumbVisual media={m} src={mediaSrc(m, signed)} />
              </button>
              <button type="button" onClick={() => void unlink(m)} aria-label={`Unlink ${m.title || 'reference'}`} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', border: 0, background: 'rgba(0,0,0,0.7)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={11} />
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={!row}
            onClick={() => setPicking(true)}
            style={{ aspectRatio: '16 / 10', borderRadius: 8, border: '1px dashed rgba(99,102,241,0.45)', background: 'transparent', color: '#a5b4fc', cursor: row ? 'pointer' : 'not-allowed', opacity: row ? 1 : 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1 }}
          >
            <ImagePlus size={15} /> Add
          </button>
        </div>
      </div>

      <div>
        <div style={label}>Note</div>
        <textarea
          value={draft ?? note}
          disabled={!row}
          placeholder="What this scene needs — tone, intent, what the references are for"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if (draft !== null) { onNote(draft); setDraft(null); } }}
          rows={3}
          style={{ width: '100%', resize: 'vertical', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(224,221,174,0.12)', borderRadius: 8, padding: '8px 10px', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.5, outline: 'none' }}
        />
      </div>

      <div>
        <div style={label}>Colour</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {CARD_COLORS.map((c) => (
            <button key={c} type="button" disabled={!row} onClick={() => onTag(c)} aria-label={`Colour ${c}`} aria-pressed={color === c}
              style={{ width: 16, height: 16, borderRadius: '50%', background: c, padding: 0, cursor: row ? 'pointer' : 'not-allowed', border: color === c ? '2px solid var(--fg)' : '2px solid transparent' }} />
          ))}
        </div>
      </div>

      <Link href="/studio?tab=scenes" style={{ ...hint, color: '#a5b4fc', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <ExternalLink size={11} /> All scenes in the Studio
      </Link>

      {picking && row && (
        <MediaPicker
          title={`References for scene ${sceneNumber}`}
          projectId={projectId}
          userId={userId}
          media={media}
          excludeIds={new Set(refs.map((m) => m.id))}
          onPick={async (ids) => {
            for (const id of ids) links.upsertLocal(await studio.linkMedia(projectId, userId, row.id, id));
          }}
          onClose={() => setPicking(false)}
        />
      )}
      {viewing && (
        <Modal title={viewing.title || 'Reference'} onClose={() => setViewing(null)}>
          <MediaViewer media={viewing} src={mediaSrc(viewing, signed)} />
          {viewing.notes && <p style={{ ...hint, marginTop: 12 }}>{viewing.notes}</p>}
        </Modal>
      )}
    </div>
  );
}
