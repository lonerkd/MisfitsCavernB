'use client';

import React, { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { addLaurel, listLaurels, removeLaurel, type Laurel, type LaurelKind } from '@/lib/supabase/portfolio';
import { LAUREL_KINDS, LAUREL_KIND_LABEL, laurelLine, parseYear } from '@/lib/portfolio/laurels';
import { useToast } from '@/components/ui/Toast';

/** A person's own festivals and awards on one piece. Shown on the public page labelled as their own word; a film's verified
 *  laurels come from the film itself (its festival submissions) and are not typed here. */
export function LaurelsEditor({ pieceId, title }: { pieceId: string; title: string }) {
  const { toast } = useToast();
  const [items, setItems] = useState<Laurel[] | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<LaurelKind>('selection');
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    listLaurels(pieceId).then((rows) => { if (live) setItems(rows); }).catch((err) => {
      if (!live) return;
      setItems([]);
      toast(err instanceof Error ? err.message : 'Could not load the laurels', 'error');
    });
    return () => { live = false; };
  }, [pieceId, toast]);

  const add = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const row = await addLaurel(pieceId, { name, kind, year: parseYear(year) });
      setItems((prev) => [...(prev ?? []), row]);
      setName(''); setYear('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add the laurel', 'error');
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    try { await removeLaurel(id); setItems((prev) => (prev ?? []).filter((l) => l.id !== id)); }
    catch (err) { toast(err instanceof Error ? err.message : 'Could not remove the laurel', 'error'); }
  };

  const field: React.CSSProperties = { padding: 8, background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--fg)', fontFamily: 'var(--mono)', fontSize: 11 };
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--fg-dim)', marginBottom: 8 }}>Festivals and awards <span>(shown as your own word)</span></div>
      <ul style={{ listStyle: 'none', margin: '0 0 8px', padding: 0, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(items ?? []).map((l) => (
          <li key={l.id} style={{ ...field, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {laurelLine(l)}
            <button type="button" onClick={() => void remove(l.id)} aria-label={`Remove ${l.name} from ${title}`} style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', display: 'flex', padding: 0 }}><X size={12} /></button>
          </li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input aria-label={`Festival or award on ${title}`} placeholder="Festival or award" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} style={{ ...field, flex: '1 1 180px' }} />
        <select aria-label="Kind" value={kind} onChange={(e) => setKind(e.target.value as LaurelKind)} style={field}>
          {LAUREL_KINDS.map((k) => <option key={k} value={k}>{LAUREL_KIND_LABEL[k]}</option>)}
        </select>
        <input aria-label="Year" placeholder="Year" inputMode="numeric" value={year} maxLength={4} onChange={(e) => setYear(e.target.value)} style={{ ...field, width: 70 }} />
        <button type="button" onClick={() => void add()} disabled={!name.trim() || busy} style={{ ...field, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Plus size={12} /> Add</button>
      </div>
    </div>
  );
}
