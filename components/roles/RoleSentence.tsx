'use client';

import React from 'react';
import { useRoleSentence } from '@/lib/roles/capabilities';
import type { CrewTier } from '@/lib/roles/core';

/** What a craft at an access level can and cannot do on a project, in words: shown to the owner inviting and to the person invited. */
export function RoleSentence({ craft, tier, label = 'What this role can do' }: { craft: string | null; tier: CrewTier; label?: string }) {
  const text = useRoleSentence(craft, tier);
  if (!text) return null;
  return (
    <p role="note" aria-label={label} style={{ margin: '8px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--fg-dim)' }}>{text}</p>
  );
}
