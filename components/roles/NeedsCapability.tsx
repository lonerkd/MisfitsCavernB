'use client';

import React, { useState } from 'react';
import { requestCapability, useCapabilityLabel } from '@/lib/roles/capabilities';
import { useToast } from '@/components/ui/Toast';

/**
 * Why a role is refused something: says which permission it needs and lets the person ask the owner for it, instead of a silent
 * empty list. `lead` is the sentence that says what is held back; the permission's own name and the button follow it. Asking
 * grants nothing: the owner changes a person's rights on Cast & crew. `canAsk` is false when the person reading it IS the
 * owner (previewing as a role that lacks it): the explanation stays, the pointless "ask yourself" button goes.
 */
export function NeedsCapability({ projectId, capability, lead, className, canAsk = true }: { projectId: string; capability: string; lead: string; className?: string; canAsk?: boolean }) {
  const label = useCapabilityLabel(capability);
  const { toast } = useToast();
  const [state, setState] = useState<'idle' | 'asking' | 'asked'>('idle');

  const ask = async () => {
    setState('asking');
    try {
      await requestCapability(projectId, capability);
      setState('asked');
      toast('Asked the owner', 'success');
    } catch (e) {
      console.error('Could not ask the owner:', e);
      setState('idle');
      toast('Could not ask the owner. Try again.', 'error');
    }
  };

  return (
    <p className={className} role="note" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, margin: 0 }}>
      <span>{lead}{label ? ` It needs “${label}”.` : ''}</span>
      {canAsk && (<button
        type="button"
        onClick={() => void ask()}
        disabled={state !== 'idle'}
        style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(var(--ink-rgb), 0.2)', background: 'transparent', color: 'inherit', cursor: state === 'idle' ? 'pointer' : 'default' }}
      >
        {state === 'asked' ? 'Asked' : 'Ask the owner'}
      </button>)}
    </p>
  );
}
