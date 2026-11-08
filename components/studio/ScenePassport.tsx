'use client';

import React, { useMemo } from 'react';
import { Camera, Clapperboard, ClipboardList, DollarSign, Layers, MapPin, AlertTriangle } from 'lucide-react';
import { recordTotal } from '@/lib/studio/record-links';
import { useStudio } from '@/components/studio/StudioContext';
import s from '@/components/studio/studio.module.css';

interface ScenePassportProps {
  sceneId: string;
  /** Compact mode: single row of chips. Full mode: labeled sections. */
  compact?: boolean;
}

/**
 * Scene passport — a compact cross-tool summary for a single scene.
 * Shows media refs, shot count, breakdown elements, schedule day, and
 * budget linkage so the user can see at a glance what each scene needs
 * and jump to the right tool.
 */
export function ScenePassport({ sceneId, compact = true }: ScenePassportProps) {
  const { scenes, mediaByScene, shots, project, doubtfulSceneOrdinals, recordsByScene } = useStudio();

  const scene = scenes.rows.find((sc) => sc.id === sceneId);
  const mediaCount = (mediaByScene.get(sceneId) ?? []).length;
  const shotCount = shots.rows.filter((sh) => sh.scene_id === sceneId).length;
  const shootDay = scene?.shoot_day ?? null;
  const isDoubtful = scene?.ordinal != null && doubtfulSceneOrdinals.has(scene.ordinal);

  // Breakdown elements count — not available on SceneRow (stored in breakdown_elements table)
  // Budget: count of budget_items whose description mentions this scene number
  const budgetLinked = useMemo(() => {
    if (!scene) return 0;
    const sceneNum = String(scene.scene_number);
    return (project.budget_items ?? []).filter((b) =>
      (b.description ?? '').includes(`scene ${sceneNum}`) ||
      (b.description ?? '').includes(`Scene ${sceneNum}`) ||
      (b.category ?? '').includes(`Scene ${sceneNum}`)
    ).length;
  }, [scene, project.budget_items]);

  if (!scene) return null;

  const chips: Array<{ icon: React.ReactNode; label: string; value: string | number; tone?: string; title?: string }> = [
    { icon: <Layers size={11} />, label: 'Refs', value: mediaCount },
    { icon: <Camera size={11} />, label: 'Shots', value: shotCount },
  ];

  // Camera / sound reports, costumes, makeup, notes and rehearsals the crew linked to this scene.
  const records = recordsByScene?.get(sceneId);
  const recordCount = recordTotal(records);
  if (recordCount > 0) {
    chips.push({ icon: <ClipboardList size={11} />, label: 'Records', value: recordCount, title: (records ?? []).map((r) => `${r.count} ${r.label.toLowerCase()}`).join(', ') });
  }

  if (shootDay != null) {
    chips.push({ icon: <MapPin size={11} />, label: 'Day', value: shootDay });
  }
  if (budgetLinked > 0) {
    chips.push({ icon: <DollarSign size={11} />, label: 'Budget', value: budgetLinked });
  }
  if (isDoubtful) {
    chips.push({ icon: <AlertTriangle size={11} />, label: 'Review', value: '⚠' });
  }

  if (compact) {
    return (
      <div
        className={s.row}
        style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}
        aria-label={`Scene ${scene.scene_number} status: ${mediaCount} refs, ${shotCount} shots`}
      >
        {chips.map((c) => (
          <span
            key={c.label}
            title={c.title ?? c.label}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              padding: '2px 7px',
              borderRadius: 4,
              background: 'rgba(var(--ink-rgb), 0.04)',
              border: '1px solid rgba(var(--ink-rgb), 0.06)',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              color: 'var(--fg-muted)',
              letterSpacing: 'var(--caps-track)',
            }}
          >
            {c.icon} {c.value}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 8, marginTop: 8 }}>
      {chips.map((c) => (
        <div
          key={c.label}
          title={c.title ?? c.label}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            padding: '8px 4px',
            borderRadius: 4,
            background: 'rgba(var(--ink-rgb), 0.03)',
            border: '1px solid rgba(var(--ink-rgb), 0.06)',
          }}
        >
          <span style={{ color: 'var(--fg-muted)' }}>{c.icon}</span>
          <span style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>{c.value}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', letterSpacing: 'var(--caps-track)', textTransform: 'var(--caps)' }}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}
