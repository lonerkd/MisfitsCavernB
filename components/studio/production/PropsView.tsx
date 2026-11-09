'use client';

import React, { useMemo } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';
import { Check, ClipboardList, PenLine } from 'lucide-react';
import { useBreakdown } from '@/lib/breakdown';
import { useStudio } from '../StudioContext';
import { ToolHeader } from '../ToolHeader';
import s from '../studio.module.css';

// 'makeup' is the key the breakdown seeds for "Hair & makeup"; 'hair-makeup' is what a custom category of that name would get.
const PROP_CATS = new Set(['props', 'wardrobe', 'makeup', 'hair-makeup', 'set-dressing', 'vehicles']);

export function PropsView() {
  const { project, scenes, scriptId } = useStudio();
  const bd = useBreakdown(project.id);

  const elements = bd.elements.rows;
  const categories = bd.categories.rows;
  const tags = bd.tags.rows;

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const catByKey = useMemo(() => new Map(categories.map((c) => [c.key, c])), [categories]);

  // Elements in prop/wardrobe categories
  const propElements = useMemo(() => elements.filter((e) => {
    const cat = catById.get(e.category_id);
    return cat && PROP_CATS.has(cat.key);
  }), [elements, catById]);

  // Scene lookup
  const sceneById = useMemo(() => new Map(scenes.rows.map((sc) => [sc.id, sc])), [scenes.rows]);

  // Group elements by scene
  const byScene = useMemo(() => {
    const m = new Map<string, typeof propElements>();
    for (const el of propElements) {
      const sceneTags = tags.filter((t) => t.element_id === el.id);
      for (const t of sceneTags) {
        const list = m.get(t.scene_id) ?? [];
        if (!list.includes(el)) list.push(el);
        m.set(t.scene_id, list);
      }
    }
    return m;
  }, [propElements, tags]);

  const sortedScenes = useMemo(() => [...scenes.rows].sort((a, b) => (a.shoot_day ?? 999) - (b.shoot_day ?? 999) || a.scene_number - b.scene_number), [scenes.rows]);

  if (bd.status === 'loading') {
    return <div className={s.stack}><p className={s.hint}>Loading breakdown…</p></div>;
  }

  if (propElements.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList size={26} />}
        title="No props or wardrobe yet"
        subtitle="Tag elements in the breakdown (Props, Wardrobe, Hair & makeup, Set dressing) and they appear here."
        action={scriptId ? <Link href="/studio?tab=production&view=breakdown" className={s.btnPrimary}><PenLine size={12} /> Open breakdown</Link> : undefined}
      />
    );
  }

  const total = propElements.length;
  const ready = propElements.filter((e) => e.status === 'ready').length;

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <ToolHeader icon={<ClipboardList size={16} />} eyebrow="Departments" title="Props & wardrobe" purpose="Props and wardrobe by scene, and whether each is ready." accent={project.accent_color} summary={<>{ready} of {total} ready</>} />

      <div className={s.progress} aria-hidden><div style={{ width: total ? (ready / total) * 100 + '%' : '0%' }} /></div>

      {sortedScenes.map((sc) => {
        const els = byScene.get(sc.id);
        if (!els || els.length === 0) return null;
        return (
          <section key={sc.id} className={s.panel} style={{ padding: 12 }}>
            <div className={s.row} style={{ gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--display)', fontSize: '1.05rem' }}>Sc {sc.scene_number}</span>
              <span className={s.hint}>{sc.heading ?? sc.title}</span>
              {sc.shoot_day && <span className={s.hint} style={{ marginLeft: 'auto' }}>Day {sc.shoot_day}</span>}
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {els.map((el) => {
                const cat = catById.get(el.category_id);
                const isReady = el.status === 'ready';
                return (
                  <li key={el.id} className={s.row} style={{ gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ width: 18, height: 18, borderRadius: 4, border: '1px solid var(--border)', display: 'grid', placeItems: 'center', background: isReady ? 'var(--ok)' : undefined, flexShrink: 0 }}>
                      {isReady && <Check size={12} />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, textDecoration: isReady ? 'line-through' : undefined, opacity: isReady ? 0.6 : 1 }}>{el.name}</span>
                    {cat && <span className={s.hint} style={{ fontSize: 11 }}>{cat.label}</span>}
                    {el.notes && <span className={s.hint} style={{ fontSize: 11 }}>{el.notes}</span>}
                    {el.assigned_to && <span className={s.hint} style={{ fontSize: 11 }}>→ {el.assigned_to}</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <p className={s.hint} style={{ fontSize: 11 }}>
        Status is managed in Production › Breakdown. This view is a read-only checklist for the props & wardrobe department.
      </p>
    </div>
  );
}
