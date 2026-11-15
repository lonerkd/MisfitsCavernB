'use client';

// My calls: every call sheet that has been issued on the productions the person is on, with their own call on each. The page a
// performer (or anyone on a crew) opens to answer "where do I need to be, and when", instead of waiting for a notification.
// Each row opens the call sheet (`/call/[id]`), where they confirm and read their sides.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useOSGate } from '@/lib/os';
import { withTimeout } from '@/lib/supabase/withTimeout';
import { hhmm, studio, type MyCall } from '@/lib/studio';
import { localDay } from '@/lib/today/core';
import c from './[id]/call.module.css';

const shortDate = (d: string | null) => (d ? new Date(`${d}T00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Date to be set');

function Row({ call }: { call: MyCall }) {
  const { sheet, mine, project, acked } = call;
  const time = hhmm(mine?.call_time) || hhmm(sheet.general_call) || '—';
  const confirmed = acked === sheet.version;
  return (
    <li>
      <Link href={`/call/${sheet.id}`} className={c.callRow}>
        <span className={c.callWhen}>{time}</span>
        <span className={c.callMeta}>
          <span className={c.callDay}>{shortDate(sheet.shoot_date)} · Day {sheet.shoot_day}</span>
          <span className={c.callTitle}>{project.title}</span>
          <span className={c.dim}>
            {mine?.call_time ? (mine.as ? `Your call, as ${mine.as}` : 'Your own call') : 'General call'}
            {sheet.location_address ? ` · ${sheet.location_address}` : ''}
          </span>
        </span>
        <span className={`${c.callBadge} ${confirmed ? c.callBadgeOk : c.callBadgeAsk}`}>{confirmed ? 'Confirmed' : acked ? 'Revised: confirm' : 'Confirm'}</span>
      </Link>
    </li>
  );
}

export default function MyCallsPage() {
  const { user } = useOSGate();
  const [calls, setCalls] = useState<MyCall[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    let alive = true;
    withTimeout(studio.listMyCalls(uid), 15000, 'Loading your calls timed out.').then(
      (rows) => { if (alive) setCalls(rows); },
      (e) => { console.error('Failed to load your calls:', e); if (alive) setFailed(true); },
    );
    return () => { alive = false; };
  }, [user?.id]);

  const today = localDay();
  const upcoming = (calls ?? []).filter((x) => !x.sheet.shoot_date || x.sheet.shoot_date >= today);
  const earlier = (calls ?? []).filter((x) => x.sheet.shoot_date && x.sheet.shoot_date < today).reverse();

  return (
    <main className={c.page}>
      <div className={c.frame}>
        <p className={c.eyebrow}>The shoot</p>
        <h1 className={c.title}>My calls</h1>
        <p className={c.lead}>Where you need to be, and when. Open a day to confirm it and read your pages.</p>

        {failed && <p className={c.banner} role="alert">Couldn’t load your calls. Check your connection and reload the page.</p>}
        {!failed && calls === null && <div className="skeleton" style={{ height: 120, borderRadius: 14 }} aria-busy="true" />}
        {calls && calls.length === 0 && (
          <p className={c.banner} role="status">No call sheets yet. When a production you’re on issues one, your call appears here, and you’ll be told.</p>
        )}

        {upcoming.length > 0 && (
          <section aria-labelledby="calls-next">
            <h2 id="calls-next" className={c.h2}>Coming up ({upcoming.length})</h2>
            <ul className={c.list}>{upcoming.map((x) => <Row key={x.sheet.id} call={x} />)}</ul>
          </section>
        )}
        {earlier.length > 0 && (
          <section aria-labelledby="calls-past">
            <h2 id="calls-past" className={c.h2}>Earlier ({earlier.length})</h2>
            <ul className={c.list}>{earlier.map((x) => <Row key={x.sheet.id} call={x} />)}</ul>
          </section>
        )}
      </div>
    </main>
  );
}
