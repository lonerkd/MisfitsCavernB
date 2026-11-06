'use client';

import React, { useEffect, useMemo, useState } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';
import { Cloud, CloudRain, CloudSun, Loader2, MapPin, PenLine, Sun, Wind } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useProjectLocations, useShootDays, studio, type ShootDay } from '@/lib/studio';
import { useStudio } from '../StudioContext';
import { cx } from '../ui';
import s from '../studio.module.css';

interface DayWeather {
  date: string;
  tempMax: number | null;
  tempMin: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  weatherCode: number | null;
  description: string;
}

const WMO: Record<number, string> = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Depositing rime fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  66: 'Light freezing rain', 67: 'Heavy freezing rain',
  71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
  77: 'Snow grains', 80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
  85: 'Slight snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
};

function weatherIcon(code: number | null) {
  if (code === null) return <Cloud size={16} />;
  if (code === 0) return <Sun size={16} />;
  if (code <= 3) return <CloudSun size={16} />;
  if (code >= 51 && code <= 67) return <CloudRain size={16} />;
  if (code >= 80 && code <= 82) return <CloudRain size={16} />;
  if (code >= 95) return <CloudRain size={16} />;
  return <Cloud size={16} />;
}

function isBad(code: number | null, precip: number | null, wind: number | null): boolean {
  if (code !== null && (code >= 61 || code >= 95 || code === 45 || code === 48)) return true;
  if (precip !== null && precip > 5) return true;
  if (wind !== null && wind > 40) return true;
  return false;
}

export function WeatherView() {
  const { project, scriptId } = useStudio();
  const locations = useProjectLocations(project.id);
  const shootDays = useShootDays(project.id);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [weather, setWeather] = useState<Record<string, DayWeather>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const located = useMemo(() => locations.rows.filter((l) => l.latitude != null && l.longitude != null), [locations.rows]);

  const loc = useMemo(() => {
    if (selectedLocation) return located.find((l) => l.id === selectedLocation) ?? null;
    return located.length > 0 ? located[0] : null;
  }, [located, selectedLocation]);

  useEffect(() => {
    if (loc?.latitude == null || loc?.longitude == null) return;
    const dated = shootDays.rows.filter((d) => d.shoot_date);
    if (dated.length === 0) return;

    const dates = dated.map((d) => d.shoot_date as string);
    const minDate = dates.reduce((a, b) => (a < b ? a : b));
    const maxDate = dates.reduce((a, b) => (a > b ? a : b));

    const controller = new AbortController();
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + loc.latitude + '&longitude=' + loc.longitude + '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code&start_date=' + minDate + '&end_date=' + maxDate + '&timezone=auto';
    const doFetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error('Weather API returned ' + res.status);
        const data = await res.json();
        const daily = data.daily;
        const map: Record<string, DayWeather> = {};
        for (let i = 0; i < daily.time.length; i++) {
          const code = daily.weather_code?.[i] ?? null;
          map[daily.time[i]] = {
            date: daily.time[i],
            tempMax: daily.temperature_2m_max?.[i] ?? null,
            tempMin: daily.temperature_2m_min?.[i] ?? null,
            precipitation: daily.precipitation_sum?.[i] ?? null,
            windSpeed: daily.wind_speed_10m_max?.[i] ?? null,
            weatherCode: code,
            description: code !== null ? (WMO[code] ?? 'Unknown') : 'No data',
          };
        }
        setWeather(map);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e instanceof Error ? e.message : 'Could not fetch weather');
      } finally {
        setLoading(false);
      }
    };
    void doFetch();

    return () => controller.abort();
  }, [loc, shootDays.rows]);

  if (shootDays.status !== 'loading' && shootDays.rows.filter((d) => d.shoot_date).length === 0) {
    return (
      <EmptyState
        icon={<Cloud size={26} />}
        title="No dated shoot days yet"
        subtitle="Set dates on the schedule to see the weather."
        action={scriptId ? <Link href="/studio?tab=production&view=schedule" className={s.btnPrimary}><PenLine size={12} /> Open schedule</Link> : undefined}
      />
    );
  }

  if (located.length === 0) {
    return (
      <EmptyState
        icon={<MapPin size={26} />}
        title="No locations with coordinates"
        subtitle="Add coordinates to your locations to see the weather."
        action={<Link href="/studio?tab=production&view=locations" className={s.btnPrimary}><MapPin size={12} /> Open locations</Link>}
      />
    );
  }

  const datedDays = shootDays.rows.filter((d) => d.shoot_date).sort((a, b) => (a.shoot_date ?? '').localeCompare(b.shoot_date ?? ''));

  const copyToCallSheet = async (day: ShootDay, w: DayWeather) => {
    try {
      const rows = await studio.listCallSheets(project.id);
      const sheet = rows.find((r) => r.shoot_day === day.day_number);
      if (!sheet) { toast('No call sheet for this day yet', 'info'); return; }
      await studio.saveCallSheet(project.id, day.day_number, { weather: w.description + ', ' + w.tempMin + '\u2013' + w.tempMax + '\u00b0C, ' + w.precipitation + 'mm rain, wind ' + w.windSpeed + 'km/h' });
      toast('Weather copied to the call sheet', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update the call sheet', 'error');
    }
  };

  return (
    <div className={s.stack} style={{ gap: 24, maxWidth: 900 }}>
      <div className={s.toolbar}>
        <div className={s.panelTitle} style={{ marginBottom: 0 }}>
          <Cloud size={14} /> Weather & conditions
          <span className={s.hint}> · {datedDays.length} dated day{datedDays.length === 1 ? '' : 's'}</span>
        </div>
        {located.length > 1 && (
          <select className={s.select} value={loc?.id ?? ''} onChange={(e) => setSelectedLocation(e.target.value)} aria-label="Location">
            {located.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        )}
      </div>

      {loading && (
        <div className={s.row} style={{ gap: 8, color: 'var(--fg-dim)' }}>
          <Loader2 size={14} /> Fetching forecast…
        </div>
      )}
      {error && <p className={s.hint} style={{ color: 'var(--danger)' }}>{error}</p>}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {datedDays.map((day) => {
          const w = day.shoot_date ? weather[day.shoot_date] : null;
          const bad = w ? isBad(w.weatherCode, w.precipitation, w.windSpeed) : false;
          return (
            <li key={day.id} className={s.panel} style={{ padding: 12, borderLeft: bad ? '3px solid var(--danger, #fca5a5)' : undefined }}>
              <div className={s.row} style={{ gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--display)', fontSize: '1.05rem' }}>Day {day.day_number}</span>
                <span className={s.hint}>{day.shoot_date ? new Date(day.shoot_date + 'T00:00').toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) : ''}</span>
                {w && (
                  <>
                    <span className={s.row} style={{ gap: 4, marginLeft: 'auto' }}>
                      {weatherIcon(w.weatherCode)}
                      <span style={{ fontSize: 13 }}>{w.description}</span>
                    </span>
                    <span className={s.hint}>{w.tempMin}–{w.tempMax}°C</span>
                    <span className={s.hint}>{w.precipitation}mm rain</span>
                    <span className={s.hint}><Wind size={11} style={{ verticalAlign: -2 }} /> {w.windSpeed} km/h</span>
                    {bad && <span style={{ color: 'var(--danger, #fca5a5)', fontSize: 12, fontWeight: 600 }}>⚠ Risk</span>}
                    <button type="button" className={cx(s.btnGhost, s.small)} onClick={() => void copyToCallSheet(day, w)} title="Copy to call sheet">
                      Copy to call sheet
                    </button>
                  </>
                )}
                {!w && !loading && <span className={s.hint}>No forecast data</span>}
              </div>
              {w && bad && (
                <p className={s.hint} style={{ margin: '6px 0 0', color: 'var(--danger, #fca5a5)' }}>
                  Conditions may affect the shoot — consider a backup plan or a different day.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <p className={s.hint} style={{ fontSize: 11 }}>
        Forecast from Open-Meteo. Weather is also stored on each call sheet (Production › Schedule) and prints with it.
      </p>
    </div>
  );
}
