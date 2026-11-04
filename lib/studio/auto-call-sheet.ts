// Auto-populate a call sheet from a shoot day's stripboard.
// Pure: given a BoardDay (scenes, cast, locations) and the project's crew,
// produces the data a call sheet needs — cast calls, scene list, location.
// The Studio's CallSheetsPanel uses this to seed a new sheet instead of
// starting from an empty form.

import { pages } from './stripboard';
import type { BoardDay } from './stripboard';

export interface AutoCallSheet {
  /** The shoot day number. */
  day: number;
  /** Scenes shooting that day, in order. */
  scenes: Array<{ scene_number: number; heading: string | null; location: string | null; time_of_day: string | null; est_duration: string | null }>;
  /** Cast members called (upper-case names). */
  cast: string[];
  /** Distinct locations (company moves). */
  locations: string[];
  /** Total pages for the day. */
  pages: string;
  /** Whether the day is over capacity. */
  over: boolean;
  /** How many scenes had a doubtful read. */
  doubtful: number;
}

export function autoCallSheet(day: BoardDay): AutoCallSheet {
  return {
    day: day.day,
    scenes: day.scenes.map((s) => ({
      scene_number: s.scene_number,
      heading: s.heading ?? s.title ?? null,
      location: s.location,
      time_of_day: s.time_of_day,
      est_duration: s.est_duration,
    })),
    cast: day.cast,
    locations: day.locations,
    pages: pages(day.eighths),
    over: day.over,
    doubtful: day.doubtful,
  };
}