'use client';

import React from 'react';
import { ToolHeader } from './ToolHeader';

/** A Studio tab's opening: the shared tool header as an h2 the section labels itself by. (Separate from `SectionHeader` in ui.tsx, which the editor's panels also use, so the editor's bundle does not carry the card.) */
export function TabHeader({ id, title, subtitle, actions, tool }: {
  id?: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  tool: { icon: React.ReactNode; eyebrow?: string; accent?: string | null; purpose?: React.ReactNode };
}) {
  return <ToolHeader as="h2" id={id} icon={tool.icon} eyebrow={tool.eyebrow} title={title} purpose={tool.purpose ?? subtitle} accent={tool.accent} actions={actions} />;
}
