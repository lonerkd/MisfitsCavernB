'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CraftPicker } from '@/components/crafts/CraftPicker';
import { useToast } from '@/components/ui/Toast';
import {
  addCrewCraft, capabilitySource, groupByArea, loadCapabilityCatalog, removeCrewCraft, setCapabilityOverride,
  type CapabilityCatalog, type CrewTier,
} from '@/lib/roles/capabilities';

const SOURCE_NOTE: Record<string, string> = {
  craft: 'from their craft',
  granted: 'added by you',
  removed: 'removed by you',
  tier: 'view-only access cannot edit',
};

/**
 * The owner's view of one crew member's rights: the crafts they hold besides their main one, and what each
 * capability comes from, with a switch for each. The database decides; this is the control and the explanation.
 */
export function CrewRights({ projectId, userId, name, tier, primaryCraft, extraCrafts, overrides, currentUserId, onChanged }: {
  projectId: string;
  userId: string;
  name: string;
  tier: CrewTier;
  primaryCraft: string | null;
  extraCrafts: string[];
  overrides: Record<string, boolean>;
  currentUserId: string;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<CapabilityCatalog | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    loadCapabilityCatalog().then((c) => { if (alive) setCatalog(c); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const crafts = [...(primaryCraft ? [primaryCraft] : []), ...extraCrafts];
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); onChanged(); } catch (e) { toast((e as { message?: string } | null)?.message || 'Could not save that', 'error'); } finally { setBusy(false); }
  };

  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }} onClick={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        {extraCrafts.length > 0 && <span style={{ fontSize: 11, color: 'var(--fg-dim)' }}>Also</span>}
        {extraCrafts.map((c) => (
          <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '3px 4px 3px 8px', borderRadius: 9999, background: 'var(--surface-2)', color: 'var(--fg-strong)' }}>
            {c}
            <button type="button" disabled={busy} aria-label={`Remove ${c} from ${name}`} onClick={() => void run(() => removeCrewCraft(projectId, userId, c, currentUserId))}
              style={{ display: 'inline-flex', background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer', padding: 2 }}><X size={11} aria-hidden /></button>
          </span>
        ))}
        <div style={{ minWidth: 180 }}>
          <CraftPicker label={`Add another craft for ${name}`} value={null} placeholder="Add another craft" onChange={(c) => { if (c && !crafts.includes(c)) void run(() => addCrewCraft(projectId, userId, c, currentUserId)); }} />
        </div>
      </div>

      <details>
        <summary style={{ fontSize: 12, color: 'var(--fg-muted)', cursor: 'pointer' }}>What {name} can do</summary>
        {!catalog ? <p style={{ fontSize: 12, color: 'var(--fg-dim)' }}>Loading…</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {groupByArea(catalog.defs).map((g) => (
              <fieldset key={g.area} style={{ border: 'none', margin: 0, padding: 0 }}>
                <legend style={{ fontSize: 11, textTransform: 'var(--caps)', letterSpacing: 'var(--caps-track)', color: 'var(--fg-dim)', marginBottom: 4 }}>{g.area}</legend>
                {g.defs.map((d) => {
                  const source = capabilitySource(d, { tier, crafts, overrides }, catalog.templates);
                  const held = source === 'craft' || source === 'granted';
                  const fromCraft = crafts.some((c) => catalog.templates.get(c)?.has(d.key));
                  return (
                    <label key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, minHeight: 28, color: source === 'tier' ? 'var(--fg-dim)' : 'var(--fg)' }}>
                      <input type="checkbox" checked={held} disabled={busy || source === 'tier'} style={{ width: 16, height: 16, margin: 0 }}
                        onChange={() => {
                          const want = !held;
                          // Back to what the crafts give clears the override; anything else is recorded.
                          void run(() => setCapabilityOverride(projectId, userId, d.key, want === fromCraft ? null : want, currentUserId));
                        }} />
                      <span>{d.label}</span>
                      {source && <span style={{ fontSize: 11, color: 'var(--fg-dim)' }}>{SOURCE_NOTE[source]}</span>}
                    </label>
                  );
                })}
              </fieldset>
            ))}
          </div>
        )}
      </details>
    </div>
  );
}
