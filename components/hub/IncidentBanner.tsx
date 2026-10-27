'use client';

// A thin strip across the suite while an incident is open: the most severe one,
// a link to its Status page, and a way to dismiss it for this session.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useCurrentUser } from '@/lib/os';
import { useFlag } from '@/components/Flag';
import { bannerIncident, listOpenIncidents, SEVERITY_LABEL } from '@/lib/hub/status';
import type { HubPost } from '@/lib/hub/posts';

const DISMISSED = 'mc_incident_dismissed';
const COLOR = { minor: 'var(--warn)', major: 'var(--accent)', critical: 'var(--danger)' } as const;

function dismissed(): string[] {
  try { return JSON.parse(sessionStorage.getItem(DISMISSED) ?? '[]'); } catch { return []; }
}

export function IncidentBanner() {
  const { user } = useCurrentUser();
  const on = useFlag('hub_status');
  const userId = user?.id ?? null;
  const [incident, setIncident] = useState<HubPost | null>(null);
  const [hidden, setHidden] = useState<string[]>(() => (typeof window === 'undefined' ? [] : dismissed()));

  useEffect(() => {
    if (!on || !userId) return;
    let live = true;
    const load = () => {
      listOpenIncidents()
        .then((list) => { if (live) setIncident(bannerIncident(list)); })
        .catch((e) => console.error('Incident banner failed:', e));
    };
    load();
    const t = window.setInterval(load, 60_000);
    return () => { live = false; window.clearInterval(t); };
  }, [on, userId]);

  if (!on || !userId || !incident || hidden.includes(incident.id)) return null;
  const sev = incident.severity ?? 'minor';
  const close = () => {
    const next = [...hidden, incident.id];
    setHidden(next);
    try { sessionStorage.setItem(DISMISSED, JSON.stringify(next)); } catch { /* private mode */ }
  };

  return (
    <div role="status" style={{ position: 'relative', zIndex: 40, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', fontSize: 13, background: 'var(--bg-3)', borderBottom: `2px solid ${COLOR[sev]}`, color: 'var(--fg)' }}>
      <span style={{ color: COLOR[sev], fontWeight: 700 }}>{SEVERITY_LABEL[sev]} incident</span>
      <Link href={`/hub/${incident.id}`} style={{ color: 'var(--fg-strong)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{incident.title}</Link>
      <button type="button" onClick={close} aria-label="Dismiss incident banner" style={{ display: 'inline-flex', background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 4 }}><X size={14} aria-hidden /></button>
    </div>
  );
}
