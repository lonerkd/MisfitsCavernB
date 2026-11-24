'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, Folder, MessageSquare, Plus, StickyNote, Users } from 'lucide-react';
import { NotesPanel } from '@/components/notes/NotesPanel';
import { NotesChecklist } from './NotesChecklist';
import { useToast } from '@/components/ui/Toast';
import { defaultScriptFormat, findFormat, loadFormats } from '@/lib/formats/formats';
import { logAuditAction } from '@/lib/supabase/audit';
import { listChannels } from '@/lib/supabase/channels';
import { createProjectScript } from '@/lib/supabase/scripts';
import { useStudio } from '../StudioContext';
import s from '../studio.module.css';

type TabId = 'library' | 'scenes' | 'production' | 'share';

/**
 * The Overview of a project with no phases (a Notes project): write a note first, then the documents, what is in the Library,
 * who is on it and where it talks. Film and series projects keep the other Overview.
 */
export function NotesOverview({ onOpen }: { onOpen: (tab: TabId) => void }) {
  const { project, media, scripts, scriptsStatus, isOwner, userId } = useStudio();
  const { toast } = useToast();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [channelId, setChannelId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listChannels(project.id)
      .then((all) => { if (alive) setChannelId(all.find((c) => c.project_id === project.id && c.type === 'text')?.id ?? null); })
      .catch((e) => { if (alive) toast(e instanceof Error ? e.message : 'Could not look up the project’s channel', 'error'); });
    return () => { alive = false; };
  }, [project.id, toast]);

  const counts = useMemo(() => ({
    files: media.rows.filter((m) => m.kind !== 'link').length,
    links: media.rows.filter((m) => m.kind === 'link').length,
    boards: new Set(media.rows.map((m) => m.board).filter(Boolean)).size,
  }), [media.rows]);
  const crew = project.crew ?? [];

  const newDocument = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const format = findFormat(await loadFormats().catch(() => []), project.type);
      const created = await createProjectScript({
        projectId: project.id,
        title: title.trim() || 'Untitled document',
        format: defaultScriptFormat(format, project.settings?.defaultScriptFormat),
        userId,
      });
      logAuditAction(userId, 'script_created', 'script', created.id, { title: created.title, project_id: project.id });
      router.push(`/editor?script=${created.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not create the document', 'error');
      setCreating(false);
    }
  };

  return (
    <>
      <div className={s.panel}>
        <div className={s.panelTitle}><StickyNote size={14} /> Notes</div>
        <NotesPanel quick projectId={project.id} userId={userId} isProjectOwner={isOwner} />
      </div>

      <NotesChecklist projectId={project.id} />

      <div className={s.panel} aria-labelledby="notes-docs-title">
        <div className={s.panelTitle} id="notes-docs-title"><FileText size={14} /> Documents</div>
        <div className={s.stack} style={{ gap: 10 }}>
          {scriptsStatus === 'error' ? <p className={s.hint}>Could not load the documents. Reload to try again.</p>
            : scriptsStatus === 'loading' ? <p className={s.hint}>Loading documents…</p>
            : scripts.length === 0 ? <p className={s.hint}>No documents yet. Start one below; it opens in the editor.</p>
            : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {scripts.map((d) => (
                  <li key={d.id} className={s.row} style={{ justifyContent: 'space-between' }}>
                    <Link href={`/editor?script=${d.id}`} style={{ fontSize: 13, color: 'var(--fg)' }}>{d.title || 'Untitled document'}</Link>
                    <span className={s.hint}>{d.updated_at ? new Date(d.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          <div className={s.row} style={{ gap: 8 }}>
            <input aria-label="Document title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Document title"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void newDocument(); } }}
              style={{ flex: 1, minWidth: 0, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid rgba(var(--ink-rgb), 0.12)', borderRadius: 4, padding: '8px 10px', fontSize: 13 }} />
            <button type="button" onClick={() => void newDocument()} disabled={creating}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 4, border: 'none', background: 'var(--accent)', color: 'var(--on-accent)', fontSize: 13, cursor: creating ? 'default' : 'pointer', opacity: creating ? 0.55 : 1 }}>
              <Plus size={13} aria-hidden /> {creating ? 'Creating…' : 'New document'}
            </button>
          </div>
        </div>
      </div>

      <div className={s.stats}>
        {[
          { label: 'Files', value: counts.files },
          { label: 'Links', value: counts.links },
          { label: 'Boards', value: counts.boards },
        ].map((st) => (
          <button key={st.label} type="button" className={s.stat} style={{ textAlign: 'left', cursor: 'pointer', font: 'inherit' }} onClick={() => onOpen('library')}>
            <div className={s.statValue}>{st.value}</div>
            <div className={s.statLabel}><Folder size={11} aria-hidden /> {st.label} in Library</div>
          </button>
        ))}
      </div>

      <div className={s.panel}>
        <div className={s.panelTitle}><Users size={14} /> People</div>
        {crew.length ? (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {crew.map((c) => (
              <li key={c.id} className={s.row} style={{ justifyContent: 'space-between', fontSize: 13 }}>
                <span>{c.name}</span><span className={s.muted}>{c.role}</span>
              </li>
            ))}
          </ul>
        ) : <p className={s.hint}>Just you so far. Add people from the project page.</p>}
        {channelId && (
          <p style={{ margin: '12px 0 0' }}>
            <Link href={`/lounge?channel=${channelId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--accent)' }}>
              <MessageSquare size={13} aria-hidden /> Open the project’s channel in the Lounge
            </Link>
          </p>
        )}
      </div>
    </>
  );
}
