'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { setCapabilityOverride, useCapabilityLabel } from '@/lib/roles/capabilities';
import { cx } from '../ui';
import s from '../studio.module.css';

/** `<user id>.<capability>` from a request's link: a user id has no dot, a capability key has one. */
export function parseGrant(value: string | null): { userId: string; capability: string } | null {
  if (!value) return null;
  const i = value.indexOf('.');
  if (i < 1 || i === value.length - 1) return null;
  return { userId: value.slice(0, i), capability: value.slice(i + 1) };
}

/**
 * The owner's answer to "asks for access": the notification opens the crew screen with the request in the link, and
 * this bar offers to grant it in one click. Granting is the same owner-only write as the switch on the person's card.
 */
export function GrantRequestBar({ projectId, ownerId, crew, overrides, onGranted }: {
  projectId: string;
  ownerId: string;
  crew: { user_id: string; profiles?: { username?: string | null } | null }[];
  overrides: Record<string, Record<string, boolean>>;
  onGranted: () => void;
}) {
  const params = useSearchParams();
  const ask = parseGrant(params.get('grant'));
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const label = useCapabilityLabel(ask?.capability ?? '');
  const member = ask ? crew.find((m) => m.user_id === ask.userId) : undefined;
  if (!ask || !member || !label) return null;
  const name = member.profiles?.username || 'They';
  const already = done || overrides[ask.userId]?.[ask.capability] === true;

  const grant = async () => {
    setBusy(true);
    try {
      await setCapabilityOverride(projectId, ask.userId, ask.capability, true, ownerId);
      setDone(true);
      toast(`${name} can now ${label.toLowerCase()}`, 'success');
      onGranted();
    } catch (e) {
      toast((e as { message?: string } | null)?.message || 'Could not grant that', 'error');
    } finally { setBusy(false); }
  };

  return (
    <div role="status" aria-label="Request for access" style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
      <span style={{ flex: 1, minWidth: 200, fontSize: 13, color: 'var(--fg-strong)' }}>
        {already ? <>{name} can {label.toLowerCase()}.</> : <>{name} asked for access: <strong>{label.toLowerCase()}</strong>.</>}
      </span>
      {already
        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-muted)' }}><Check size={12} aria-hidden /> Granted</span>
        : <button type="button" className={cx(s.btn, s.small)} disabled={busy} onClick={() => void grant()}>{busy ? 'Granting…' : `Grant ${label.toLowerCase()}`}</button>}
    </div>
  );
}
