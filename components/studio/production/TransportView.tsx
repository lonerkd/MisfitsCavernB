'use client';

import React, { useMemo } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';
import { Car, MapPin, PenLine, Route } from 'lucide-react';
import { useProjectLocations, useShootDays } from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';

export function TransportView() {
  const { project, scenes, scriptId } = useStudio();
  const locations = useProjectLocations(project.id);
  const shootDays = useShootDays(project.id);

  const locByName = useMemo(() => new Map(locations.rows.map((l) => [l.name, l])), [locations.rows]);

  const scenesByDay = useMemo(() => {
    const m = new Map<number, typeof scenes.rows>();
    for (const sc of scenes.rows) {
      if (sc.shoot_day == null) continue;
      const list = m.get(sc.shoot_day) ?? [];
      list.push(sc);
      m.set(sc.shoot_day, list);
    }
    return m;
  }, [scenes]);

  if (shootDays.status !== 'loading' && shootDays.rows.filter((d) => d.shoot_date).length === 0) {
    return (
      <EmptyState
        icon={<Car size={26} />}
        title="No dated shoot days yet"
        subtitle="Set dates on the schedule to plan transport."
        action={scriptId ? <Link href="/studio?tab=production&view=schedule" className={s.btnPrimary}><PenLine size={12} /> Open schedule</Link> : undefined}
      />
    );
  }

  const datedDays = shootDays.rows.filter((d) => d.shoot_date).sort((a, b) => (a.shoot_date ?? '').localeCompare(b.shoot_date ?? ''));

    return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <Car size={14} /> Transport & travel
          <span className={s.hint}> · {datedDays.length} dated day{datedDays.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {datedDays.map((day) => {
          const dayScenes = scenesByDay.get(day.day_number) ?? [];
          // Unique locations for this day
          const dayLocs = Array.from(new Set(dayScenes.map((sc) => sc.location).filter(Boolean))) as string[];
          const locRecords = dayLocs.map((name) => locByName.get(name)).filter(Boolean);
          const hasAddresses = locRecords.some((l) => l?.address);

          return (
            <li key={day.id} className={s.panel} style={{ padding: 12 }}>
              <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--display)', fontSize: '1.05rem' }}>Day {day.day_number}</span>
                <span className={s.hint}>{day.shoot_date ? new Date(day.shoot_date + 'T00:00').toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) : ''}</span>
                <span className={s.hint} style={{ marginLeft: 'auto' }}>{dayScenes.length} scene{dayScenes.length === 1 ? '' : 's'} · {dayLocs.length} location{dayLocs.length === 1 ? '' : 's'}</span>
              </div>

              {dayLocs.length === 0 ? (
                <p className={s.hint}>No scenes scheduled on this day.</p>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {dayLocs.map((name, i) => {
                      const rec = locByName.get(name);
                      return (
                        <div key={name} className={s.row} style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                          <MapPin size={12} style={{ marginTop: 2, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span>
                            {rec?.address && <span className={s.hint} style={{ display: 'block' }}>{rec.address}</span>}
                            {rec?.contact && <span className={s.hint} style={{ display: 'block' }}>Contact: {rec.contact}</span>}
                            {!rec && <span className={s.hint} style={{ display: 'block', color: 'var(--warn)' }}>No location record — add one in Locations</span>}
                          </div>
                          {rec?.address && (
                            <a href={'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(rec.address)} target="_blank" rel="noopener noreferrer" className={cx(s.btnGhost, s.small)}>
                              <Route size={11} /> Map
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {dayLocs.length > 1 && (
                    <p className={s.hint} style={{ margin: '8px 0 0', fontSize: 12 }}>
                      ⚠ {dayLocs.length} locations — company move{dayLocs.length === 1 ? '' : 's'} between them. Check the stripboard for move distances.
                    </p>
                  )}

                  {!hasAddresses && dayLocs.length > 0 && (
                    <p className={s.hint} style={{ margin: '8px 0 0', color: 'var(--warn)', fontSize: 12 }}>
                      No addresses on file — add them in Locations so the crew can navigate.
                    </p>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>

      <p className={s.hint} style={{ fontSize: 11 }}>
        Travel logistics derived from the schedule and locations. Add addresses and contacts in Production › Locations.
      </p>
    </div>
  );
}
