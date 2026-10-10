// Sun times for a place and a date, computed here (the sunrise equation) —
// no service, so it works offline and on set. Good to about a minute, which
// is finer than anyone schedules a shoot.

export interface SunTimes {
  /** UTC instants. Null when the sun doesn't cross that elevation on this date. */
  dawn: Date | null;
  sunrise: Date | null;
  /** Morning magic hour ends: the sun reaches 6° up. */
  goldenEnds: Date | null;
  solarNoon: Date;
  /** Evening magic hour starts: the sun falls to 6°. */
  goldenStarts: Date | null;
  sunset: Date | null;
  dusk: Date | null;
  /** 'day' = the sun never sets, 'night' = it never rises, null = a normal day. */
  polar: 'day' | 'night' | null;
  /** Minutes between sunrise and sunset (0 in polar night, 1440 under the midnight sun). */
  daylightMinutes: number;
}

const RAD = Math.PI / 180;
const J2000 = 2451545;
const UNIX_EPOCH_JD = 2440587.5;
const DAY_MS = 86_400_000;

/** The sun's centre is this far below the horizon at rise and set (refraction + its radius). */
const HORIZON = -0.833;
const CIVIL = -6;
const GOLDEN = 6;

export function isCoordinate(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === 'number' && typeof longitude === 'number'
    && Number.isFinite(latitude) && Number.isFinite(longitude)
    && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

const fromJulian = (jd: number) => new Date((jd - UNIX_EPOCH_JD) * DAY_MS);

/** `date` is the calendar day at the place (YYYY-MM-DD); longitude is positive east. */
export function sunTimes(date: string, latitude: number, longitude: number): SunTimes {
  const [y, m, d] = date.split('-').map(Number);
  // Noon UTC of that date is a whole Julian day; the place's own noon is a
  // fraction of a day earlier (east) or later (west).
  const n = Date.UTC(y, m - 1, d, 12) / DAY_MS + UNIX_EPOCH_JD - J2000 + 0.0008;
  const meanNoon = n - longitude / 360;
  const anomaly = ((357.5291 + 0.98560028 * meanNoon) % 360 + 360) % 360;
  const M = anomaly * RAD;
  const centre = 1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M);
  const lambda = (((anomaly + centre + 180 + 102.9372) % 360) + 360) % 360 * RAD;
  const transit = J2000 + meanNoon + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * lambda);
  const sinDec = Math.sin(lambda) * Math.sin(23.4397 * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  const phi = latitude * RAD;

  /** Degrees of hour angle at which the sun is at `elevation`; null if it never is that day. */
  const hourAngle = (elevation: number): number | null => {
    const cos = (Math.sin(elevation * RAD) - Math.sin(phi) * sinDec) / (Math.cos(phi) * cosDec);
    return cos > 1 || cos < -1 ? null : Math.acos(cos) / RAD;
  };
  const before = (elevation: number) => { const w = hourAngle(elevation); return w == null ? null : fromJulian(transit - w / 360); };
  const after = (elevation: number) => { const w = hourAngle(elevation); return w == null ? null : fromJulian(transit + w / 360); };

  const day = hourAngle(HORIZON);
  // No crossing: at noon the sun is either above the horizon all day or below it.
  const noonElevation = Math.asin(Math.sin(phi) * sinDec + Math.cos(phi) * cosDec) / RAD;
  const polar = day != null ? null : noonElevation > HORIZON ? 'day' : 'night';

  return {
    dawn: before(CIVIL),
    sunrise: before(HORIZON),
    goldenEnds: before(GOLDEN),
    solarNoon: fromJulian(transit),
    goldenStarts: after(GOLDEN),
    sunset: after(HORIZON),
    dusk: after(CIVIL),
    polar,
    daylightMinutes: day != null ? Math.round((day / 180) * 1440) : polar === 'day' ? 1440 : 0,
  };
}

/** "07:52" in the given IANA zone ("" for null); UTC if the zone isn't one this device knows. */
export function formatInZone(at: Date | null, timeZone: string): string {
  if (!at) return '';
  const format = (zone: string) => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: zone }).format(at);
  try { return format(timeZone); } catch { return format('UTC'); }
}
