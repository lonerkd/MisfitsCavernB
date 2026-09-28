'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, CircleDashed, Lightbulb } from 'lucide-react';
import { useProgressContext } from '@/components/progress/LockedTool';
import { accentVars } from '@/components/progress/Bricks';
import { rolePost, rolePostHref, useProjectBrief, type Move } from '@/lib/brief';
import b from './brief.module.css';

const ICON = { warn: AlertTriangle, gap: CircleDashed, tip: Lightbulb, ask: Lightbulb } as const;

/**
 * The brief's next moves that concern one tool (by move id), where the work
 * is done: roles to fill beside the crew, categories to tag in the breakdown.
 * Shows nothing when there's nothing to say.
 */
export function BriefHints({ projectId, projectTitle, ids, accent, style }: { projectId: string; projectTitle: string; ids: string[]; accent?: string | null; style?: React.CSSProperties }) {
  const progress = useProgressContext();
  const format = progress?.signals?.project_type ?? null;
  const phase = progress?.progress?.current.id ?? null;
  const brief = useProjectBrief(phase ? projectId : null, format, phase);
  const moves = brief.moves.filter((m: Move) => ids.includes(m.id));
  if (!moves.length) return null;

  return (
    <aside className={b.panel} style={{ ...accentVars(accent), padding: 14, ...style }} aria-label="From the project brief">
      <ul className={b.moves}>
        {moves.map((m) => {
          const Icon = ICON[m.kind];
          return (
            <li key={m.id} className={`${b.move} ${b[m.kind]}`}>
              <Icon size={15} className={b.moveIcon} aria-hidden />
              <div>
                <p className={b.moveTitle}>{m.title}</p>
                <p className={b.moveDetail}>{m.detail}</p>
                <div className={b.moveActions}>
                  {m.crafts?.map((craft) => (
                    <Link key={craft} className={b.link} aria-label={`Post a job for a ${craft}`}
                      href={rolePostHref(rolePost(craft, { projectTitle, questions: brief.questions, answers: brief.answers, format, context: brief.context, script: brief.script }))}>
                      Post: {craft}
                    </Link>
                  ))}
                  <Link className={b.link} href={`/projects/${projectId}#brief`}>Project brief</Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
